import ruleset from './ruleset';
import {letters} from '/languages/levantine/alphabets/underlying';

export default ruleset(
  {
    spec: {},
    env: ({before}, {consonant}) => before(consonant(letters.plain.consonant.w.features)),
  },
  operations => ({
    // second is not used but FIXME why is consonant() making it w | {}
    default: ({features: first}, {next: {0: {spec: {features: second}}}}) => [
      operations.coalesce(
        {
          type: `diphthong`,
          features: {
            first: {...first, tense: false, color: null},
            second: {...letters.plain.vowel.u.features, tense: true, color: null},
          },
        }
      ),
    ],
  })
);