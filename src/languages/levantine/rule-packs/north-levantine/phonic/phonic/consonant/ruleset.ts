import {phonic, templates, underlying} from 'src/languages/levantine/alphabets';
import {rulePack} from 'src/lib/rules';

export default rulePack(
  phonic,
  phonic,
  [templates, underlying],
  {spec: {type: `consonant`}, env: {}},
);
