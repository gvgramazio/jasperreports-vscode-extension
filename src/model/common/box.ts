import { AttributeDef, AttributeGroup } from "../types";
import { PEN_ATTRIBUTES } from "./pen";

const BOX_PADDING_ATTRIBUTES: readonly AttributeDef[] = [
  { name: "padding", type: "integer" },
  { name: "topPadding", type: "integer" },
  { name: "leftPadding", type: "integer" },
  { name: "bottomPadding", type: "integer" },
  { name: "rightPadding", type: "integer" },
] as const;

/** Pen attributes prefixed for a specific box side. */
function boxPenAttributes(side: string): readonly AttributeDef[] {
  return PEN_ATTRIBUTES.map((attr) => ({
    ...attr,
    name: `${side}.${attr.name}`,
  }));
}

export const BOX_ATTRIBUTES: readonly AttributeDef[] = [
  ...BOX_PADDING_ATTRIBUTES,
  ...PEN_ATTRIBUTES.map((attr) => ({
    ...attr,
    name: `pen.${attr.name}`,
  })),
  ...boxPenAttributes("topPen"),
  ...boxPenAttributes("leftPen"),
  ...boxPenAttributes("bottomPen"),
  ...boxPenAttributes("rightPen"),
] as const;

export const boxGroup: AttributeGroup = {
  label: "Box",
  attributes: BOX_ATTRIBUTES,
};
