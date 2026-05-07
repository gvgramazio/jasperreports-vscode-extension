import { AttributeDef, AttributeGroup, ExpressionDef } from "../types";
import { ModeEnum, PositionTypeEnum, StretchTypeEnum } from "../enums";

export const REPORT_ELEMENT_ATTRIBUTES: readonly AttributeDef[] = [
  { name: "uuid", type: "string" },
  { name: "key", type: "string" },
  { name: "style", type: "string" },
  { name: "x", type: "integer", required: true, defaultValue: "0" },
  { name: "y", type: "integer", required: true, defaultValue: "0" },
  { name: "width", type: "integer", required: true },
  { name: "height", type: "integer", required: true },
  { name: "mode", type: "enum", enumValues: ModeEnum },
  { name: "forecolor", type: "color" },
  { name: "backcolor", type: "color" },
  { name: "positionType", type: "enum", enumValues: PositionTypeEnum },
  { name: "stretchType", type: "enum", enumValues: StretchTypeEnum },
  { name: "printRepeatedValues", type: "boolean", defaultValue: "true" },
  { name: "removeLineWhenBlank", type: "boolean", defaultValue: "false" },
  { name: "printInFirstWholeBand", type: "boolean", defaultValue: "false" },
  {
    name: "printWhenDetailOverflows",
    type: "boolean",
    defaultValue: "false",
  },
  { name: "printWhenGroupChanges", type: "string" },
] as const;

export const reportElementGroup: AttributeGroup = {
  label: "Report Element",
  attributes: REPORT_ELEMENT_ATTRIBUTES,
};

export const REPORT_ELEMENT_EXPRESSIONS: readonly ExpressionDef[] = [
  { tag: "printWhenExpression", label: "Print When" },
  { tag: "styleExpression", label: "Style Expression" },
] as const;
