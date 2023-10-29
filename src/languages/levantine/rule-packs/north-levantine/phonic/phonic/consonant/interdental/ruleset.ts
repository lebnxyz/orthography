import {phonic, templates, underlying} from 'src/languages/levantine/alphabets';
import {rulePack} from 'src/lib/rules';

export default rulePack(
  phonic,
  phonic,
  [templates, underlying],
  {
    spec: ({consonant}) => consonant({
      location: `teeth`,
      manner: `fricative`,
      articulator: `tongue`,
    }),
    env: {},
  },
);
