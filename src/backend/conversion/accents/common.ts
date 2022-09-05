import * as ABC from "../alphabets/common";
import {Narrow as $} from "../utils/typetools";

export type Layer<A extends ABC.AnyAlphabet, R extends Record<string, Record<string, number> | Set<string>>> = {
  accents: R
} & A;

export type AnyLayer = {
  accents: Record<string, Record<string, number> | Set<string>>
} & ABC.AnyAlphabet;

type ToSets<R extends Record<string, string[] | Record<string, number>>> = {
  [K in keyof R]:
    R[K] extends string[]
      ? Set<R[K][number]>
      : R[K] extends Record<string, number>  // fails without this (thinks there are other possibilities...)
        ? R[K]
        : never
};

export type AccentFeatures<A extends AnyLayer> = keyof A[`accents`];
export type AccentFeature<A extends AnyLayer, F extends AccentFeatures<A>> =
  A[`accents`][F] extends Set<infer U extends string>
    ? U
    : never;

export function toLayer<
  A extends ABC.AnyAlphabet,
  R extends Record<string, string[] | Record<string, number>>,
>(abc: A, accents: $<R>): Layer<A, ToSets<R>> {
  return {
    ...abc,
    accents: Object.fromEntries(
      Object.entries(accents).map(
        ([k, v]) => [k, new Set(v)],
      ),
    ) as any,
  };
}