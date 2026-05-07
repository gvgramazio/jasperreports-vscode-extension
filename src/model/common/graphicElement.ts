import { AttributeDef, AttributeGroup } from "../types";
import { FillEnum } from "../enums";

export const GRAPHIC_ELEMENT_ATTRIBUTES: readonly AttributeDef[] = [
  { name: "fill", type: "enum", enumValues: FillEnum },
] as const;

export const graphicElementGroup: AttributeGroup = {
  label: "Graphic",
  attributes: GRAPHIC_ELEMENT_ATTRIBUTES,
};
