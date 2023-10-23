import {templates, underlying} from '/languages/levantine/alphabets';
import {rulePack} from '/lib/rules';

export default rulePack(
  underlying,
  underlying,
  [templates],
  {
    spec: {},
    env: {},
  }
);
