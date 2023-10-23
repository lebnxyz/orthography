import {Alphabet, qualifiedPathsOf} from '../alphabet';
import {NestedRecordOr} from '../utils/typetools';
import {AddSpec, ContextFunc, Specs, SpecsFuncs, TypesFunc, TypesFuncs} from './types/environment';
import {ExtractDefaults, ProcessPack} from './types/finalize';
import {SpecOperations} from './types/func';
import {IntoToFunc, Packed, Ruleset, RulesetWrapper, Unfunc, UnfuncSpec} from './types/helpers';

type Blah<Arr> = {
  [Index in keyof Arr]: Arr[Index] extends ReadonlyArray<unknown>
    ? AddSpec<Arr[Index]>
    : Arr[Index] extends {spec: unknown}
    ? Arr[Index]
    : Arr[Index] extends {match: `array`, value: {fill: infer Fill, length: infer Length}}
    ? {match: `array`, value: {fill: AddSpec<[Fill]>[number], length: Length}}
    : Arr[Index] extends {match: infer M extends `any` | `all`, value: infer Value extends ReadonlyArray<unknown>}
    ? {match: M, value: AddSpec<Value>}
    : {spec: Arr[Index]}
}

function addSpec<Arr extends ReadonlyArray<unknown>>(arr: Arr): AddSpec<Arr> {
  return arr.map(item => {
    if (Array.isArray(item)) {
      return addSpec(item as ReadonlyArray<unknown>);
    }
    if (typeof item !== `object` || item === null) {
      return {spec: item};
    }
    if (`spec` in item) {
      return item;
    }
    if (
      `match` in item && item.match === `array`
      && `value` in item && item.value !== null && typeof item.value === `object`
      && `length` in item.value && `fill` in item.value
    ) {
      return {match: `array`, value: {length: item.value.length, fill: addSpec([item.value.fill])[0]}};
    }
    if (`match` in item && (item.match === `any` || item.match === `all`) && `value` in item && Array.isArray(item.value)) {
      return {match: item.match, value: addSpec(item.value as ReadonlyArray<unknown>)};
    }
    return {spec: item};
  }) as AddSpec<Arr>;
}

function generateSpecFuncs<ABC extends Alphabet>(alphabet: ABC): SpecsFuncs<ABC> {
  return {
    env: {
      before: (...arr) => ({prev: addSpec(arr)}),
      after: (...arr) => ({next: addSpec(arr)}),
    },
    types: Object.assign(
      (context: object | ((...args: unknown[]) => unknown)) => ({
        context: context instanceof Function
          ? context(qualifiedPathsOf(alphabet.context))
          : context,
      }),
      Object.fromEntries(Object.keys(alphabet.types).map(
        key => [
          key,
          (features, context) => ({
            type: key,
            features: features instanceof Function
              ? features(
                qualifiedPathsOf(alphabet.types[key] as ABC[`types`][typeof key]),
                alphabet.traits[key] as never
              )
              : features,
            context: context instanceof Function
              ? context(qualifiedPathsOf(alphabet.context))
              : context,
          } as any),  // `any` for NeverSayNever<etc>
        ]
      )) as {[K in keyof ABC[`types`]]: TypesFunc<ABC, K>},
    ) as TypesFuncs<ABC>,
  };
}

function callSpecFunc<Spec extends object>(spec: Spec, funcs: SpecsFuncs<Alphabet>): Unfunc<Spec, `spec`> {
  if (`match` in spec && `value` in spec && Array.isArray(spec[`value`])) {
    return {
      match: spec[`match`],
      value: spec[`value`].map(v => callSpecFunc(v, funcs)),
    } as unknown as Unfunc<Spec, `spec`>;
  }
  if (spec instanceof Function) {
    return spec(funcs.types);
  }
  return {} as Unfunc<Spec, `spec`>;
}

function callEnvFunc<Env extends object>(env: Env, funcs: SpecsFuncs<Alphabet>): Unfunc<Env, `env`> {
  if (`match` in env && `value` in env && Array.isArray(env[`value`])) {
    return {
      match: env[`match`],
      value: env[`value`].map(v => callEnvFunc(v, funcs)),
    } as unknown as Unfunc<Env, `env`>;
  }
  if (env instanceof Function) {
    return env(funcs.env, funcs.types);
  }
  return {} as Unfunc<Env, `env`>;
}

function _unfuncSpec<Specs>(specs: Specs, funcs: SpecsFuncs<Alphabet>): UnfuncSpec<Specs> {
  if (specs === undefined || specs === null || typeof specs !== `object`) {
    return specs as UnfuncSpec<Specs>;
  }
  if (`match` in specs && `value` in specs && Array.isArray(specs[`value`])) {
    return {
      match: specs[`match`],
      value: specs[`value`].map(v => _unfuncSpec(v, funcs)) as {
        [Index in keyof typeof specs[`value`]]: UnfuncSpec<typeof specs[`value`][Index]>
      },
    } as UnfuncSpec<Specs>;
  }
  if (`spec` in specs || `env` in specs) {
    return {
      ...(`spec` in specs ? callSpecFunc(specs.spec as object, funcs) : {}),
      ...(`env` in specs ? callEnvFunc(specs.env as object, funcs) : {}),
    } as UnfuncSpec<Specs>;
  }
  return Object.fromEntries(
    Object.entries(specs).map(
      ([k, v]) => [k, _unfuncSpec(v, funcs)]
    )
  ) as UnfuncSpec<Specs>;
}

export function unfuncSpec<Specs, ABC extends Alphabet>(specs: Specs, alphabet: ABC): UnfuncSpec<Specs> {
  return _unfuncSpec(specs, generateSpecFuncs(alphabet) as never);
}

export function operations<
  Source extends Alphabet,
  Target extends Alphabet,
  Dependencies extends ReadonlyArray<Alphabet>
>(
  source: Source,
  target: Target,
  dependencies: Dependencies
): SpecOperations<Source, Target, Dependencies> {
  return {
    mock: Object.assign(
      ((...specs) => ({operation: `mock`, argument: specs})) as SpecOperations<Source, Target, Dependencies>[`mock`],
      {
        was: Object.fromEntries(
          dependencies.map(abc => [
            abc.name,
            ((...specs: ReadonlyArray<unknown>) => ({operation: `mock`, argument: specs})),
          ])
        ),
      }
    ),
    preject: (...specs) => <never>{operation: `preject`, argument: specs},
    postject: (...specs) => <never>{operation: `postject`, argument: specs},
    coalesce: (specs, env) => <never>{operation: `coalesce`, argument: {specs, env}},
  };
}

function typesFuncs<ABC extends Alphabet>(alphabet: ABC): TypesFuncs<ABC> {
  return Object.assign(
    (segment => ({
      context: segment instanceof Function
        ? segment(qualifiedPathsOf(alphabet.context))
        : segment,
    })) as ContextFunc<ABC>,
    Object.fromEntries(Object.entries(alphabet.types).map(([k, v]) => {
      return [k, ((features, context) => ({
        type: k,
        features: features instanceof Function
          ? features(
            qualifiedPathsOf(v) as never,
            alphabet.traits[k] as never
          )
          : Object.keys(v).length === 1
            ? {[Object.keys(v)[0]]: features}
            : features,
        context: context instanceof Function
          ? context(qualifiedPathsOf(alphabet.context))
          : context,
      })) as TypesFunc<ABC, keyof ABC[`types`]>];
    })) as unknown as {[T in keyof ABC[`types`]]: TypesFunc<ABC, T>}
  );
}

function intoToFunc<
  Into extends NestedRecordOr<ReadonlyArray<unknown>>,
  Spec,
  Source extends Alphabet,
>(into: Into, spec: Spec, source: Source): IntoToFunc<Into, Spec> {
  if (Array.isArray(into)) {
    // XXX: what to do with odds :(
    return ((odds = 100) => ({for: unfuncSpec(spec, source), into})) as never;
  }
  return Object.fromEntries(Object.entries(into).map(([k, v]) => [k, intoToFunc(v, spec, source)])) as never;
}

export function processPack<
  RulePack extends Packed<
    Record<string,
      | RulesetWrapper<Record<string, Ruleset>, Record<string, Record<string, unknown>>>
      | Packed<Record<string, unknown>, unknown, unknown, Alphabet, Alphabet, ReadonlyArray<Alphabet>>
    >,
    unknown,
    unknown,
    Alphabet,
    Alphabet,
    ReadonlyArray<Alphabet>
  >
>(pack: RulePack): ProcessPack<RulePack> {
  const {env, types} = generateSpecFuncs(pack.source);
  return Object.fromEntries(Object.entries(pack.children).map(([k, v]) => {
    if (`rules` in v) {
      return [k,
        (fn: (...args: ReadonlyArray<unknown>) => unknown) => (
          fn(
            // is:
            Object.fromEntries(Object.entries(v.rules).map(([ruleName, rule]) => [
              ruleName,
              intoToFunc(
                rule.into,
                {match: `all`, value: [rule.for, pack.specs]},
                pack.source
              ),
            ])),
            // when:
            Object.assign(
              Object.fromEntries(Object.entries(v.constraints).map(([constraintName, constraint]) => [
                constraintName,
                (...args: ReadonlyArray<{for: unknown, into: unknown}>) => args.map(
                  arg => ({
                    for: {match: `all`, value: [
                      arg.for,
                      unfuncSpec(constraint, pack.source),
                    ]},
                    into: arg.into,
                  })
                ),
              ])),
              {
                custom: (
                  spec: Specs<RulePack[`source`], RulePack[`target`], RulePack[`dependencies`]>,
                  ...args: ReadonlyArray<{for: unknown, into: unknown}>
                ) => args.map(arg => ({
                  for: {match: `all`, value: [
                    arg.for,
                    unfuncSpec(spec, pack.source),
                  ]},
                  into: arg.into,
                })),
              }
            )
          )
        ) as any,
      ];
    } else {
      return [k, processPack(v as any)];
    }
  }));
}

function onlyOneTarget(into: object): boolean {
  if (Array.isArray(into)) {
    return true;
  }
  if (Object.keys(into).length !== 1) {
    return false;
  }
  return Object.values(into).every(onlyOneTarget);
}

export function extractDefaults<
  RulePack extends Packed<
    Record<string,
      | RulesetWrapper<Record<string, Ruleset>, Record<string, Record<string, unknown>>>
      | Packed<Record<string, unknown>, unknown, unknown, Alphabet, Alphabet, ReadonlyArray<Alphabet>>
    >,
    unknown,
    unknown,
    Alphabet,
    Alphabet,
    ReadonlyArray<Alphabet>
  >
>(
  pack: RulePack
): ExtractDefaults<RulePack> {
  return Object.fromEntries(
    Object.entries(pack.children)
      .filter(([_, v]) => `children` in v || Object.keys(v.constraints).length > 0)
      .map(([k, v]) => {
        if (`rules` in v) {
          return [
            k,
            Object.fromEntries(
              Object.entries(v.rules)
                .filter(([_, rule]) => onlyOneTarget(rule.into))
                .map(([ruleName, rule]) => [
                  ruleName,
                  intoToFunc(
                    rule.into,
                    {match: `all`, value: [rule.for, pack.specs]},
                    pack.source
                  ),
                ])) as any,
          ];
        } else {
          return [k, extractDefaults(v as never)];
        }
      })) as any;
}
