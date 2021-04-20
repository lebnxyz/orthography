const { parseWord, parseLetter, newSyllable } = require(`../utils/parseWord`);

const LAX_I = Object.freeze(parseLetter`i`);
const I = Object.freeze(parseLetter`I`);
const Y = Object.freeze({ ...parseLetter`y`, meta: { ...parseLetter`y`.meta, weak: true }});

function addPrefix(syllables, rest) {
  return base => {
    const firstSyllable = base[0].value;
    // yi+ktub => yik+tub
    // yi+stla2-2a => yist+la2-2a
    // (FIXME: idk what to do about noSchwa or whatever in that last case
    // -- in the future might have to do like _$`s._.t.blahblah` below
    // and then make noSchwa delete itself if not "/ CVC_C", but
    // that has to wait till i get the whole transformer system working)
    if (rest && rest[rest.length - 1].type === `vowel`) {
      while (firstSyllable[0].type === `consonant` && firstSyllable[1].type !== `vowel`) {
        rest.push(firstSyllable.shift());
      }
    }
    syllables.push(newSyllable(rest), ...base);
  };
}

function makePrefixers(...prefixes) {
  if (prefixes) {
    return prefixes.map(
      ({ syllables, rest }) => addPrefix(syllables.map(newSyllable), rest)
    );
  }
  return [null];
}

function verb({
  meta: { conjugation, form, tam },
  value: { root: [$F, $3, $L, $Q], augmentation }
}) {
  // either the 2nd segment of the form is a vowel
  // or the verb is form-1 with a weak medial consonant
  const isCV = `aeiou`.includes(form[1]) || (`aiu`.includes(form) && $3.meta.weak);

  let prefixers;
  let suffix;
  switch (tam) {
    case `sbjv`:
      if (isCV) {
        prefixers = makePrefixers(
          // tkuun
          { syllables: [], rest: conjugation.nonpast.prefix.subjunctive.cv },
          // t.kuun
          { syllables: [conjugation.nonpast.prefix.subjunctive.cv], rest: [] },
          // tikuun
          { syllables: [[...conjugation.nonpast.prefix.subjunctive.cv, LAX_I]], rest: [] }
        );
      } else {
        // tiktub
        prefixers = makePrefixers(
          { syllables: [], rest: conjugation.nonpast.prefix.subjunctive.cc }
        );
      }
      suffix = conjugation.nonpast.suffix;
      break;
    case `ind`:
      if (isCV) {
        prefixers = makePrefixers(
          // bitkuun
          {
            syllables: [[
              ...conjugation.nonpast.prefix.indicative,
              I,
              ...conjugation.nonpast.prefix.subjunctive.cv
            ]],
            rest: []
          },
          // btikuun (idk lol found it more than once online)
          {
            syllables: [[
              ...conjugation.nonpast.prefix.indicative,
              ...conjugation.nonpast.prefix.subjunctive.cv,
              LAX_I
            ]],
            rest: []
          }
        );
      } else {
        const cc = conjugation.nonpast.prefix.subjunctive.cc;
        if (cc[0].value === `2`) {
          // b + 2 + ktub = biktub, not b2iktub
          // the sbjv prefix in this case starts with 2 so the .slice(1) gets rid of it
          prefixers = makePrefixers(
            { syllables: [], rest: [...conjugation.nonpast.prefix.indicative, ...cc.slice(1)] }
          );
        } else {
          prefixers = makePrefixers(
            // btiktub
            { syllables: [], rest: [...conjugation.nonpast.prefix.indicative, ...cc] },
            // bitiktub (again idk found it online more than once lul)
            {
              syllables: [[...conjugation.nonpast.prefix.indicative, LAX_I]],
              rest: [[...cc, LAX_I]]
            }
          );
        }
      }
      suffix = conjugation.nonpast.suffix;
      break;
    case `imp`:
      prefixers = makePrefixers();
      suffix = conjugation.nonpast.suffix;
      break;
    case `pst`:
      prefixers = makePrefixers();
      suffix = conjugation.past.suffix;
      break;
    default:  // error?
      prefixers = undefined;
      suffix = undefined;
  }

  // the second two are just so i can see more-easily which ones add affixes and which don't
  const parsers = prefixers.map(prefixer => parseWord({
    prefixer,
    suffix,
    eraseStress: !!suffix,
    augmentation
  }));
  const $ = (...args) => parsers.map(f => f(...args));
  const $_ = $;
  const _$_ = $;

  // true if a verb is above form 1 and has no TAM prefix
  const noSuffix = tam === `pst`
    ? conjugation.person.third && conjugation.gender.masc
    : (!conjugation.gender.feminine || conjugation.number.third) && !conjugation.number.plural;
  const weakAA = $L.meta.weak && noSuffix;  // only cares abt the case where tam === `pst`
  // const $originalL = $L;
  if ($L.meta.weak) {
    $L = Y;
  }

  // TODO: finish this line
  // if (`aiu`.includes(form) && )  // 3atyit

  switch (form) {
    case `a`:
      if (tam === `pst`) {
        return $_`${$F}.a ${$3}.a.${$L}`;
      }
      if (tam === `imp`) {
        if ($L.meta.weak) {
          return [
            ...$_`2.i.${$F} ${$3}.aa`,
            ...$_`${$F}.${$3}.aa`
          ];
        }
        return [
          ...(conjugation.gender.masc ? $`${$F}.${$3}.aa.${$L}` : $_`${$F}.${$3}.a.${$L}`),
          $_`2.i.${$F} ${$3}.a.${$L}`
        ];
      }
      return _$_`${$F}.${$3}.a.${$L}`;
    case `i`:
      if (tam === `pst`) {
        return $_`${$F}.i ${$3}.I.${$L}`;
      }
      if (tam === `imp`) {
        return $_`2.i.${$F} ${$3}.I.${$L}`;
      }
      return _$_`${$F}.${$3}.I.${$L}`;
    case `u`:
      if (tam === `pst`) {
        throw new Error(`No past-tense conjugation in /u/ exists`);
      }
      if (tam === `imp`) {
        return [
          ...(conjugation.gender.masc ? $`${$F}.${$3}.oo.${$L}` : $_`${$F}.${$3}.U.${$L}`),
          $_`2.i.${$F} ${$3}.U.${$L}`
        ];
      }
      return _$_`${$F}.${$3}.U.${$L}`;
    case `fa33al`:
      if (tam === `pst`) {
        return weakAA
          ? [...$`${$F}.a.${$3} ${$3}.aa`, ...$`${$F}.i.${$3} ${$3}.aa`]
          : [...$_`${$F}.a.${$3} ${$3}.a.${$L}`, ...$_`${$F}.i.${$3} ${$3}.a.${$L}`];
      }
      // no need for "if imp" case bc this handles imperative too (right?)
      return $L.meta.weak
        ? [..._$_`${$F}.a.${$3} ${$3}.ii`, ..._$_`${$F}.i.${$3} ${$3}.ii`]
        : [..._$_`${$F}.a.${$3} ${$3}.I.${$L}`, ..._$_`${$F}.i.${$3} ${$3}.I.${$L}`];
    case `tfa33al`:
      if (tam === `pst`) {
        return weakAA
          ? [...$`t.${$F}.a.${$3} ${$3}.aa`, ...$`t.${$F}.i.${$3} ${$3}.aa`]
          : [...$_`t.${$F}.a.${$3} ${$3}.a.${$L}`, ...$_`t.${$F}.i.${$3} ${$3}.a.${$L}`];
      }
      return $L.meta.weak
        ? [..._$_`t.${$F}.a.${$3} ${$3}.ii`, ..._$_`t.${$F}.i.${$3} ${$3}.ii`]
        : [..._$_`t.${$F}.a.${$3} ${$3}.I.${$L}`, ..._$_`t.${$F}.i.${$3} ${$3}.I.${$L}`];
    case `stfa33al`:
      // stanna-yistanna
      if ($F.value === `2` && $F.weak) {
        if (tam === `pst`) {
          return weakAA
            ? [...$`s.t.a.${$3} ${$3}.aa`, ...$`s.t.i.${$3} ${$3}.aa`]
            : [...$_`s.t.a.${$3} ${$3}.a.${$L}`, ...$_`s.t.i.${$3} ${$3}.a.${$L}`];
        }
        return $L.meta.weak
          ? [..._$_`s.t.a.${$3} ${$3}.ii`, ..._$_`s.t.i.${$3} ${$3}.ii`]
          : [..._$_`s.t.a.${$3} ${$3}.I.${$L}`, ..._$_`s.t.i.${$3} ${$3}.I.${$L}`];
      }
      if (tam === `pst`) {
        return weakAA
          ? [...$`s.t.${$F}.a.${$3} ${$3}.aa`, ...$`s.t.${$F}.i.${$3} ${$3}.aa`]
          : [...$_`s.t.${$F}.a.${$3} ${$3}.a.${$L}`, ...$_`s.t.${$F}.i.${$3} ${$3}.a.${$L}`];
      }
      return $L.meta.weak
        ? [..._$_`s.t.${$F}.a.${$3} ${$3}.ii`, ..._$_`s.t.${$F}.i.${$3} ${$3}.ii`]
        : [..._$_`s.t.${$F}.a.${$3} ${$3}.I.${$L}`, ..._$_`s.t.${$F}.i.${$3} ${$3}.I.${$L}`];
    case `fe3al`:
      if (tam === `pst`) {
        return weakAA ? $`${$F}.aa ${$3}.aa` : $_`${$F}.aa ${$3}.a.${$L}`;
      }
      return $L.meta.weak ? _$_`${$F}.aa ${$3}.ii` : _$_`${$F}.aa ${$3}.I.${$L}`;
    case `tfe3al`:
      if (tam === `pst`) {
        return weakAA ? $`t.${$F}.aa ${$3}.aa` : $_`t.${$F}.aa ${$3}.a.${$L}`;
      }
      return $L.meta.weak ? _$_`t.${$F}.aa ${$3}.ii` : _$_`t.${$F}.aa ${$3}.I.${$L}`;
    case `stfe3al`:
      // stehal-yistehal
      if ($F.value === `2` && $F.weak) {
        if (tam === `pst`) {
          return weakAA ? $`s.t.aa ${$3}.aa` : $_`s.t.aa ${$3}.a.${$L}`;
        }
        return $L.meta.weak ? _$_`s.t.aa ${$3}.ii` : _$_`s.t.aa ${$3}.I.${$L}`;
      }
      if (tam === `pst`) {
        return weakAA ? $`s.t.${$F}.aa ${$3}.aa` : $_`s.t.${$F}.aa ${$3}.a.${$L}`;
      }
      return $L.meta.weak ? _$_`s.t.${$F}.aa ${$3}.ii` : _$_`s.t.${$F}.aa ${$3}.I.${$L}`;
    case `nfa3al`:
      if ($3.meta.weak) {
        return _$_`n.${$F}.aa.${$L}`;
      }
      if ($3.value === $L.value) {
        return $_`n.${$F}.a.${$3}.${$L}`;
      }
      if (tam === `pst`) {
        if (
          !noSuffix
          && $L.meta.weak
          && conjugation.number.third
          && (conjugation.gender.fem || conjugation.number.plural)
        ) {
          // lta2it, lta2yit (this is nfa3al not fta3al but same idea)
          // lta2u, lta2yu
          // XXX TODO: stuff like that ${$3}.${$Y}# prob means that parseWord
          // should do suffixes before weight-assignment...
          return [...$_`n.${$F}.a ${$3}.aa`, ...$_`n.${$F}.a ${$3}.${Y}`];
        }
        return weakAA ? $`n.${$F}.a ${$3}.aa` : $_`n.${$F}.a ${$3}.a.${$L}`;
      }
      if (tam === `imp`) {
        return $L.meta.weak
          ? [
            _$_`+n.${$F}.i -${3}.ii`,
            $_`2.i.n ${$F}.i ${3}.ii`,
            $_`2.i.n ${$F}.${3}.ii`
          ]
          : [
            _$_`+n.${$F}.i -${3}.I.${$L}`,
            $_`2.i.n ${$F}.i ${3}.I.${$L}`,
            $_`2.i.n ${$F}.${3}.I.${$L}`
          ];
      }
      // FIXME: there are verbs that never take yinfa3al, eg *yinshaghal "to become busy"
      // probably needs two new forms to be added, "nfa3al-i" and "fta3al-i" lol
      return $L.meta.weak
        ? [
          // about how the "+n." syllable interacts with prefixes:
          // the n will be taken by the prefix but the stress will remain on the Fi/Fa i think
          ..._$_`+n.${$F}.i -${3}.ii`,
          ..._$_`+n.${$F}.a -${3}.aa`,
          ..._$_`n.${$F}.i ${3}.ii`,
          ..._$_`n.${$F}.${3}.ii`
        ]
        : [
          ..._$_`+n.${$F}.i -${3}.I.${$L}`,
          ..._$_`+n.${$F}.a -${3}.a.${$L}`,
          ..._$_`n.${$F}.i ${3}.I.${$L}`,
          ..._$_`n.${$F}.${3}.I.${$L}`
        ];
    case `fta3al`:
      if ($3.meta.weak) {
        return _$_`${$F}.t.aa.${$L}`;
      }
      if ($3.value === $L.value) {
        return $_`${$F}.t.a.${$3}.${$L}`;
      }
      if (tam === `pst`) {
        if (
          !noSuffix
          && $L.meta.weak
          && conjugation.number.third
          && (conjugation.gender.fem || conjugation.number.plural)
        ) {
          // lta2it, lta2yit
          // lta2u, lta2yu
          // XXX TODO: stuff like that ${$3}.${$Y}# prob means that parseWord
          // should do suffixes before weight-assignment...
          return [...$_`${$F}.t.a ${$3}.aa`, ...$_`${$F}.t.a ${$3}.${Y}`];
        }
        return weakAA ? $`${$F}.t.a ${$3}.aa` : $_`${$F}.t.a ${$3}.a.${$L}`;
      }
      if (tam === `imp`) {
        return $L.meta.weak
          ? [
            _$_`+${$F}.t.i -${3}.ii`,
            $_`2.i.${$F} t.i ${3}.ii`,
            $_`2.i.${$F} t.${3}.ii`
          ]
          : [
            _$_`+${$F}.t.i -${3}.I.${$L}`,
            $_`2.i.${$F} t.i ${3}.I.${$L}`,
            $_`2.i.${$F} t.${3}.I.${$L}`
          ];
      }
      // FIXME: there are verbs that never take yifta3al, eg *yishtaghal "to work"
      // probably needs two new forms to be added, "nfa3al-i" and "fta3al-i" lol
      return $L.meta.weak
        ? [
          // about how the "+F." syllable interacts with prefixes:
          // the F will be taken by the prefix but the stress will remain on the ti/ta i think
          ..._$_`+${$F}.t.i -${3}.ii`,
          ..._$_`+${$F}.t.a -${3}.aa`,
          ..._$_`${$F}.t.i ${3}.ii`,
          ..._$_`${$F}.t.${3}.ii`
        ]
        : [
          ..._$_`+${$F}.t.i -${3}.I.${$L}`,
          ..._$_`+${$F}.t.a -${3}.a.${$L}`,
          ..._$_`${$F}.t.i ${3}.I.${$L}`,
          ..._$_`${$F}.t.${3}.I.${$L}`
        ];
    case `staf3al`:
      if ($3.meta.weak) {
        return (
          [$`m.u.s._.t ${$F}.ii.${$L}`],
          [$`m.u.s._.t ${$F}.aa.${$L}`]
        );
      }
      if ($3.value === $L.value) {
        return (
          [$`m.u.s._.t ${$F}.i.${$3}.${$L}`],
          [$`m.u.s._.t ${$F}.a.${$3}.${$L}`]
        );
      }
      return (
        [$`m.u.s t.a.${$F} ${$3}.I.${$L}`],
        [$`m.u.s t.a.${$F} ${$3}.a.${$L.meta.weak ? `` : $L}`]
      );
    case `stAf3al`:
      if ($3.meta.weak) {
        return (
          [$`m.u.s t.a ${$F}.ii.${$L}`],
          [$`m.u.s t.a ${$F}.aa.${$L}`]
        );
      }
      // geminate root
      if ($3.value === $L.value) {
        return (
          [$`m.u.s t.a ${$F}.i.${$3}.${$L}`],
          [$`m.u.s t.a ${$F}.a.${$3}.${$L}`]
        );
      }
      throw new Error(`Can't use stAf3al except with final-geminate and second-weak verbs`);
    case `f3all`:
      return $`m.u.${$F} ${$3}.a.${$L}.${$L}`;
    case `fa3la2`:
      return (
        [
          $`m.u ${$F}.a.${$3} ${$L}.I.${$Q}`,
          $`m.u ${$F}.a.${$3} ${$L}.a.${$Q.meta.weak ? `` : $Q}`
        ],
        [$`m.u ${$F}.a.${$3} ${$L}.a.${$Q.meta.weak ? `` : $Q}`]
      );
    case `tfa3la2`:
      return (
        [
          $`m.u ${$F}.a.${$3} ${$L}.a.${$Q.meta.weak ? `` : $Q}`,
          $`m.u.t ${$F}.a.${$3} ${$L}.I.${$Q}`
        ],
        [$`m.u.t ${$F}.a.${$3} ${$L}.a.${$Q.meta.weak ? `` : $Q}`]
      );
    case `stfa3la2`:
      if ($F.value === `2` && $F.weak) {
        // doesn't exist B)
        return (
          [
            $`m.u.s t.a.${$3} ${$L}.I.${$Q}`,
            $`m.u.s t.a.${$3} ${$L}.a.${$Q.meta.weak ? `` : $Q}`
          ],
          [$`m.u.s t.a.${$3} ${$L}.a.${$Q.meta.weak ? `` : $Q}`]
        );
      }
      return (
        [
          $`m.u.s._.t ${$F}.a.${$3} ${$L}.I.${$Q}`,
          $`m.u.s._.t ${$F}.a.${$3} ${$L}.a.${$Q.meta.weak ? `` : $Q}`
        ],
        [$`m.u.s._.t ${$F}.a.${$3} ${$L}.a.${$Q.meta.weak ? `` : $Q}`]
      );
    default:
      return null;
  }
}

module.exports = {
  pp: verb
};
