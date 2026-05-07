import { AttributeDef, AttributeGroup } from "../types";
import { LineStyleEnum } from "../enums";

export const PEN_ATTRIBUTES: readonly AttributeDef[] = [
  { name: "lineWidth", type: "decimal" },
  { name: "lineStyle", type: "enum", enumValues: LineStyleEnum },
  { name: "lineColor", type: "color" },
] as const;

export const penGroup: AttributeGroup = {
  label: "Pen",
  attributes: PEN_ATTRIBUTES,
};
