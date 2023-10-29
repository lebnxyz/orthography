// do i need to add an 'affected A' option to this?

import ruleset from '../ruleset';
import {letters} from 'src/languages/levantine/alphabets/underlying';

export default ruleset(
  {
    spec: ({verb}) => verb({door: `stfaa3al`}),
    env: {},
  },
  operations => ({
    default: [
      operations.preject(letters.plain.consonant.s),
      operations.mock(({verb}) => verb({door: `tfaa3al`})),
    ],
  })
);
