class Choice {
  constructor(choices, context = new Set()) {
    this.choices = choices;
    this.context = context;
  }

  init(initializers) {
    this.choices = this.choices.map(obj => obj.init(initializers));
  }

  ctx(item) {
    /* this.choices.forEach(obj => obj.ctx(item)); */
    this.context.add(item);
  }

  // remove duplicates based on key func
  // prob inefficient lmfao
  dedup(toKey) {
    const map = {};
    // not doing fromEntries bc definitely inefficient
    // and this in turn is less efficient than a for loop but we'll see
    this.choices.forEach(c => { map[toKey(c)] = c; });
    /* return new Choice(map.values()); */
    this.choices = map.values();
  }
}

export default function choice(...objs) {
  if (objs.length === 1 && Array.isArray(objs[0])) {
    return new Choice(objs[0]);
  }
  return new Choice(objs);
}