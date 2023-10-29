import {templates, underlying} from 'src/languages/levantine/alphabets';
import {rulePack} from 'src/lib/rules';

export default rulePack(
  templates,
  underlying,
  [],
  {
    spec: ({verb}) => verb(
      (features, traits) => ({
        match: `all`,
        value: [
          features.tam.past,
          {match: `any`, value: [
            features.door.fa3al,
            features.door.fa3il,
            features.door.f3vl,
          ]},
          {root: {length: 3}},
          traits.geminate,
        ],
      })
    ),
    env: {},
  }
);
