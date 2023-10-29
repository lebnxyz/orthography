import ruleset from '../ruleset';
import {letters} from 'src/languages/levantine/alphabets/underlying';
import {separateContext} from 'src/lib/rules';

export default ruleset(
  {
    spec: ({participle}) => participle({shape: `fa3laan`, voice: `active`}),
  },
  {
    default: ({features: {root: $}}) => [
      separateContext($[0], `affected`),
      letters.plain.vowel.a,
      separateContext($[1], `affected`),
      separateContext($[2], `affected`),
      letters.plain.vowel.aa,
      letters.plain.consonant.n,
    ],
  }
);
