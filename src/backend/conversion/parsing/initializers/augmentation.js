const {type} = require(`../type`);
const {parseLetter, parseString: $} = require(`../../parse-word`);
const {misc: {lastOf}} = require(`../../utils`);

const L = Object.freeze(parseLetter`l`);

// 0, 1, 2
const N_VALUES = [`yFor1sg`, `bothFor1sg`, `nFor1sg`];

const _ = {
  NI: $`n.ii`,
  I: $`ii`,
  YI: $`y.ii`,
  NA: $`n.aa`,
  IK: $`i.k`,
  KI: $`k.ii`,
  AK: $`a.k`,
  K: $`k`,
  KUN: $`k.u.n`,
  A: $`aa`,
  HA: $`h.aa`,
  YA: $`y.aa`,
  WA: $`w.aa`,
  O: $`o`,
  YO: $`y.o`,
  UN: $`u.n`,
  HUN: $`h.u.n`,
  YUN: $`y.u.n`,
  WUN: $`w.u.n`,
  _: $``,
};

// special = like in 'fiyyo'
function cliticInContext(
  {default: basic, vc},
  afterSemivowel,
  {ay, aw, ii, iy, uu, uw, aa} = {},
  special,
) {
  return {
    default: basic,
    after: {
      ay: ay || afterSemivowel || basic,
      aw: aw || afterSemivowel || basic,
      aa: aa || afterSemivowel || basic,
      ii: ii || iy || afterSemivowel || basic,
      iy: iy || ii || afterSemivowel || basic,
      uu: uu || uw || afterSemivowel || basic,
      uw: uw || uu || afterSemivowel || basic,
      cc: basic,
      vc: [...(vc || []), ...basic],
      special,
    },
    afterEndOf(segments) {
      const a = lastOf(segments);
      const b = lastOf(segments, 1);
      if (b.type === type.vowel && b.length === 2) {
        return this.after[b.value];
      }
      if (
        a.type === type.vowel && a.length === 1
        && b.type === type.consonant && !b.meta.intrinsic.ly.semivocalic
      ) {
        return this.after.vc;
      }
      // the `a === Fem` case is also handled here
      return this.after[`${a.value}${b.value}`] || this.default;
    },
  };
}

// forcibly stress previous syllable
function stress(syllable) {
  return {syllable, stress: true};
}

// don't forcibly stress previous syllable
function natural(syllable) {
  return {syllable, stress: false};
}

// stress: true=stress the syllable before (even if it wouldn't naturally be stressed)
// syllable: -1=attach to last syllable, 0=new syllable, 1=pull last consonant into new syllable
function clitic(person, gender, number, n) {
  if (person.first()) {
    if (number.singular()) {
      switch (n) {
        case 2:
          return cliticInContext(
            // -ni
            {default: [stress(_.NI)]},
          );
        case 1:
          return cliticInContext(
            // -i, ni
            {default: [natural(_.I), stress(_.NI)]},
            // -yi, (-wi?), -ni
            [stress(_.YI), stress(_.NI)],
          );
        default:
        case 0:
          return cliticInContext(
            // -i
            {default: [natural(_.I)]},
            // -yi, (-wi?)
            [stress(_.YI)],
          );
      }
    }
    return cliticInContext(
      // -na
      {default: [stress(_.NA)]},
    );
  }
  if (person.second()) {
    if (number.singular()) {
      if (gender.fem()) {
        return cliticInContext(
          // -ik
          {default: [natural(_.IK)]},
          // -ki
          [stress(_.KI)],
        );
      }
      return cliticInContext(
        // -ak
        {default: [natural(_.AK)]},
        // -k
        [stress(_.K)],
      );
    }
    return cliticInContext(
      // -kun/-kin
      {default: [natural(_.KUN)]},
    );
  }
  if (person.third()) {
    if (number.singular()) {
      if (gender.fem()) {
        return cliticInContext(
          {
            default: [
              // -a
              natural(_.A),  // aka stress
              // -ha
              natural(_.HA),  // aka stress
            ],
            // -a
            vc: [stress(_.A), natural(_.A)],
          },
          // -ya, -wa, -ha
          [stress(_.YA), stress(_.HA)],
          {
            // last one is e.g. "darabouyon" which is a thing
            uu: [stress(_.WA), stress(_.HA), stress(_.YA)],
          }
        );
      }
      return cliticInContext(
        // -o; -o
        {default: [natural(_.O)], vc: [natural(_.O), stress(_.O)]},
        // -null
        [stress(_._)],
        {},
        // e.g. fiyyo (probably gonna need a -wo variant in a few generations)
        [stress(_.YO)],
      );
    }
    return cliticInContext(
      {
        default: [
          // -un/-in
          natural(_.UN),
          // -hun/-hin
          natural(_.HUN),
        ],
        // -un/-in
        vc: [stress(_.UN), natural(_.UN), natural(_.HUN)],
      },
      // -yun/-yin, -wun/-win, -hun/-hin
      [stress(_.YUN), stress(_.HUN)],
      {
        // last one is e.g. "darabouyon" which is a thing
        uu: [stress(_.WUN), stress(_.HUN), stress(_.YUN)],
      }
    );
  }
  throw new Error(
    `Unrecognized augmented pronoun: ${person.value}${gender.value}${number.value}`,
  );
}

function makeAugmentor(delimiter, person, gender, number, makeEnd = null, allN = null) {
  return base => Object.fromEntries(N_VALUES.map((n, i) => [
    n,
    {
      delimiter,
      pronoun: {person, gender, number},
      clitics: clitic(person, gender, number, allN || i).afterEndOf(
        makeEnd
          ? makeEnd(base)
          : lastOf(base).value,
      ),
    },
  ]));
}

// not sure if this and pronouns.js should return { type, meta, value } objs or not
function augmentation({
  meta: {delimiter},
  value: {person, gender, number},
}) {
  if (delimiter.value === `dative`) {
    return makeAugmentor(
      delimiter,
      person,
      gender,
      number,
      base => [lastOf(lastOf(base).value), L],
      0,  // all N values are 0 because 1sg datives can't be -lni
    );
  }
  return makeAugmentor(
    delimiter,
    person,
    gender,
    number,
  );
}

module.exports = {
  augmentation,
};
