import ruleset from './ruleset';
import {withFlags} from 'src/languages/levantine/alphabets/templates/templates';
import {letters, underlying} from 'src/languages/levantine/alphabets/underlying';

export default ruleset(
  {
    spec: {
      features: {
        string: [
          {type: `consonant`, features: withFlags(underlying.types.consonant, `affected`, `weak`)},
          letters.plain.vowel.a,
          {type: `consonant`, features: withFlags(underlying.types.consonant, `affected`, `weak`)},
          letters.plain.vowel.a,
          {type: `consonant`, features: withFlags(underlying.types.consonant, `affected`, `weak`)},
        ],
      }},
    env: ({before}) => before(letters.plain.affix.f),
  },
  operations => ({
    default: ({features: {string: $}}) => [
      operations.mock.was.templates({
        type: `special`,
        features: {
          shape: `fa3ale`,
          root: [$[0].features, $[2].features, $[4].features],
        },
      }),
    ],
  })
);
