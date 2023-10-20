import {templates, underlying} from '/languages/levantine/alphabets';
import {rulePack} from '/lib/rules';

export default rulePack(
  templates,
  underlying,
  [],
  {
    spec: ({verb}) => verb({
      door: `fa3il`,
      tam: `past`,
      root: {length: 3},
    }),
  }
);