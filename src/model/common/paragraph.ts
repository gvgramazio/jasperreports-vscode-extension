import { AttributeDef, AttributeGroup } from "../types";
import { LineSpacingEnum, TabStopAlignEnum } from "../enums";

export const PARAGRAPH_ATTRIBUTES: readonly AttributeDef[] = [
  { name: "lineSpacing", type: "enum", enumValues: LineSpacingEnum },
  { name: "lineSpacingSize", type: "decimal" },
  { name: "leftIndent", type: "integer" },
  { name: "firstLineIndent", type: "integer" },
  { name: "rightIndent", type: "integer" },
  { name: "spacingBefore", type: "integer" },
  { name: "spacingAfter", type: "integer" },
  { name: "tabStopWidth", type: "integer" },
  { name: "tabStopAlign", type: "enum", enumValues: TabStopAlignEnum },
] as const;

export const paragraphGroup: AttributeGroup = {
  label: "Paragraph",
  attributes: PARAGRAPH_ATTRIBUTES,
};
