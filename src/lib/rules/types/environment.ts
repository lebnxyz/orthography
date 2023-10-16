import {MatchAsType, MatchSchema, MatchSchemaOf, SafeMatchSchemaOf} from "/lib/utils/match";
import {IsUnion, NestedArray, NestedArrayOr, ValuesOf} from "/lib/utils/typetools";
import {Alphabet, PartialMembersWithContext, QualifiedPathsOf} from "/lib/alphabet";

export type Spec<ABC extends Alphabet> = (
  | PartialMembersWithContext<ABC> | (keyof ABC[`types`] & string)
  | ((types: TypesFuncs<ABC>) => PartialMembersWithContext<ABC>)
);
export type Env<ABC extends Alphabet> = (
  | {[Dir in `next` | `prev`]?: NestedArray<PartialMembersWithContext<ABC>>}
  | EnvironmentFunc<ABC>
);

export type SpecsNoMatch<
  ABC extends Alphabet,
  ABCHistory extends ReadonlyArray<Alphabet> = readonly [],
  OmitKeys extends `spec` | `env` | `was` = never,
> = Omit<{
  spec: Spec<ABC>
  env: Env<ABC>
  was: {
    [A in ABCHistory[number] as A[`name`]]: {
      spec?: Spec<A>,
      env?: Env<A>
    }
  }
}, OmitKeys>;

export type Specs<
  ABC extends Alphabet,
  ABCHistory extends ReadonlyArray<Alphabet> = readonly [],
  OmitKeys extends `spec` | `env` | `was` = never,
> = MatchSchemaOf<SpecsNoMatch<ABC, ABCHistory, OmitKeys>>;// extends infer T extends MatchSchema ? T : never;

type _TypesFuncDefault<T, D extends MatchSchema> = SafeMatchSchemaOf<D> extends T ? never : T;
type _TypesFuncVF<in out Source extends Alphabet, in out T extends keyof Source[`types`]> = (
  (
    features: QualifiedPathsOf<Source[`types`][T]>,
    traits: T extends keyof Source[`traits`] ? Source[`traits`][T] : undefined
  ) => SafeMatchSchemaOf<Source[`types`][T]>
);
type _TypesFuncContextF<in out Source extends Alphabet> = (
  ((context: QualifiedPathsOf<Source[`context`]>) => SafeMatchSchemaOf<Source[`context`]>)
);
type _VCond<Source extends Alphabet, T extends keyof Source[`types`]> = (
  IsUnion<keyof Source[`types`][T]> extends true
    ? SafeMatchSchemaOf<Source[`types`][T]>
    : SafeMatchSchemaOf<ValuesOf<Source[`types`][T]>>
);

type _FeaturesCond<Source extends Alphabet, T extends keyof Source[`types`], V, VF extends (...args: never) => unknown> = _TypesFuncVF<Source, T> extends VF
  ? IsUnion<keyof Source[`types`][T]> extends true
    ? _TypesFuncDefault<V, Source[`types`][T]>
    : {[K in keyof Source[`types`][T]]: _TypesFuncDefault<V, ValuesOf<Source[`types`][T]>>}
  : ReturnType<VF>;
type _ContextCond<Source extends Alphabet, Context, ContextF extends (...args: never) => unknown> = _TypesFuncContextF<Source> extends ContextF
  ? _TypesFuncDefault<Context, Source[`context`]>
  : ReturnType<ContextF>;
// these two `in out` annotations are the O-rings that would've saved the challenger
// literally went from almost 13k lines of analyze-trace output to nil
export type TypesFunc<in out Source extends Alphabet, in out T extends keyof Source[`types`]> =
  <
    // typing V and Context as unions of (obj | func) was really hard on the compiler for some reason
    // it would sporadically decide that only the object half of that union was valid and reject
    // functions for not matching (maybe it had to do w/ the function's return type matching the expected
    // obj type = common bug heuristic for "did you mean to call this expression"? not sure)
    // anyway we can hijack inference to get around all that:
    // (update after 1 profiling session: predictably this is slow as shit LOL)
    const V extends (
      // if this type has only one feature (like how some alphabets only have {value: (some symbol)}) then
      // we can just allow that feature's value to be passed without the feature name as a key
      _VCond<Source, T>
      ),
    const VF extends _TypesFuncVF<Source, T>,
    const Context extends SafeMatchSchemaOf<Source[`context`]>,
    const ContextF extends _TypesFuncContextF<Source>
  >(features?: V | VF, context?: Context | ContextF) => NeverSayNever<{
    type: T
    // now we have to check which of V/VF, Context/ContextF was actually passed in
    // since the funcs are invariant on Source and T it won't matter what order we
    // do the `extends` check in, but since this order is used for covariant types
    // we can stick with it here too
    features: _FeaturesCond<Source, T, V, VF>
    context: _ContextCond<Source, Context, ContextF>
  }>
;

type NeverSayNever<T> = Pick<T, ValuesOf<{[K in keyof T]: T[K] extends never ? never : K}>>;

export type ContextFunc<Source extends Alphabet> = (
  <
    const Context extends SafeMatchSchemaOf<Source[`context`]>,
    const ContextF extends _TypesFuncContextF<Source>
  >(segment: Context | ContextF) => ({
    context: _ContextCond<Source, Context, ContextF>
  })
);

export type TypesFuncs<Source extends Alphabet> = {
  [T in keyof Source[`types`] & string]: TypesFunc<Source, T>
} & ContextFunc<Source>;

type _ArrType<Source extends Alphabet> = ReadonlyArray<SafeMatchSchemaOf<NestedArrayOr<PartialMembersWithContext<Source>>>>;
export type EnvironmentHelpers<ABC extends Alphabet> = {
  before: {
    <const Arr extends ReadonlyArray<unknown>>(...arr: Arr): {env: {prev: Arr}}
    // slow<const Arr extends _ArrType<ABC>>(...arr: Arr): {env: {prev: Arr}}
  },
  after: {
    <const Arr extends ReadonlyArray<unknown>>(...arr: Arr): {env: {next: Arr}}
    // slow<const Arr extends _ArrType<ABC>>(...arr: Arr): {env: {next: Arr}}
  }
};

export type EnvironmentHelpersNextLast<ABC extends Alphabet> = {
  next: {
    <const Arr extends ReadonlyArray<unknown>>(...arr: Arr): {env: {next: Arr}}
    slow<const Arr extends _ArrType<ABC>>(...arr: Arr): {env: {next: Arr}}
  },
  last: {
    <const Arr extends ReadonlyArray<unknown>>(...arr: Arr): {env: {prev: Arr}}
    slow<const Arr extends _ArrType<ABC>>(...arr: Arr): {env: {prev: Arr}}
  }
};

export type SpecsFuncs<Source extends Alphabet> = {
  env: EnvironmentHelpers<Source>,
  types: TypesFuncs<Source>,
};

// type _ArrType<Source extends Alphabet> = ReadonlyArray<unknown>;
export type EnvironmentFunc<
  Source extends Alphabet,
  Dependencies extends ReadonlyArray<Alphabet> = readonly []
> = (
  env: EnvironmentHelpers<Source>,
  types: TypesFuncs<Source>,
// if i change the def of MatchSchema's function variant to => MatchSchema instead of => unknown this errors lol
// bc recursive reference that apparently isn't an issue with => unknown??
) => Specs<Source, Dependencies>;


// !!! here lurketh something sinister !!!
// i think my entire type system is glued together by lies
// try it yourself: type Foo<T extends TypesFuncs<Alphabet>> = T; type Bar<T extends Alphabet> = Foo<TypesFuncs<T>>;
// opened the gates of hell chasing these errors down and got absolutely nowhere so i decided to just ignore the lie
// and find another way to do the thing i was trying to do :---) (i think this came up while trying to implement
// operations for the first time, see corroborating comment in func.ts)