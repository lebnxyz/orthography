/* eslint-disable max-classes-per-file */

import * as ABC from "../../../../alphabets/common";
import * as Accents from "../../../../accents/common";
import {List, ListNode} from "./list";

type Null<T> = T | null;

export type Layers = {
  layers: Record<string, Accents.AnyLayer>
  links: Record<string, Null<string>>
};

type LayerValue = ABC.Base | List<Tracker>;

class LayerHistoryEntry implements ListNode<LayerHistoryEntry> {
  next: Null<LayerHistoryEntry> = null;

  append(node: LayerHistoryEntry) {
    node.next = this.next;
    this.next = node;
  }
}

export class Layer {
  private history: List<LayerHistoryEntry> = new List();
  private environmentCache: Record<any, any> = {};

  constructor(
    private value: LayerValue,
    private name: string,
    private parent: Tracker,
  ) {}

  private get next(): Null<Layer> {
    return this.parent.nextLayer(this.name);
  }

  private get prev(): Null<Layer> {
    return this.parent.prevLayer(this.name);
  }
}

export class Tracker {
  public prev: Null<Tracker> = null;
  public next: Null<Tracker> = null;
  private layers: Record<string, Null<Layer>>;
  private ogLayers: Layers;
  private minLayer: Null<string> = null;

  constructor(layers: Layers, prev: Null<Tracker> = null) {
    if (prev !== null) {
      this.prev = prev;
      prev.next = this;
    }
    this.layers = Object.fromEntries(
      Object.keys(layers.layers).map(name => [name, null]),
    );
    this.ogLayers = layers;
  }

  feed(layer: string, unit: ABC.Base): this {
    this.minLayer = layer;
    this.layers[layer] = new Layer(unit, layer, this);
    return this;
  }

  append(node: Tracker) {
    node.next = this.next;
    this.next = node;
    node.prev = this;
  }

  nextLayer(layer: string): Null<Layer> {
    return this.next?.findLayerForwards(layer) ?? null;
  }

  private findLayerForwards(layer: string): Null<Layer> {
    return this.layers[layer] ?? this.next?.findLayerForwards(layer) ?? null;
  }

  prevLayer(layer: string): Null<Layer> {
    return this.prev?.findLayerBackwards(layer) ?? null;
  }

  private findLayerBackwards(layer: string): Null<Layer> {
    return this.layers[layer] ?? this.prev?.findLayerBackwards(layer) ?? null;
  }
}
