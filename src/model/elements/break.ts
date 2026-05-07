import type { ElementDef } from "../types";
import { BreakTypeEnum } from "../enums";
import {
  reportElementGroup,
  REPORT_ELEMENT_EXPRESSIONS,
} from "../common/reportElement";
import { registerElement } from "../registry";

const breakDef: ElementDef = {
  tag: "element",
  kind: "break",
  label: "Break",
  attributeGroups: [
    reportElementGroup,
    {
      label: "Break",
      attributes: [{ name: "type", type: "enum", enumValues: BreakTypeEnum }],
    },
  ],
  expressions: [...REPORT_ELEMENT_EXPRESSIONS],
  children: [
    { tag: "property", maxOccurs: undefined },
    { tag: "propertyExpression", maxOccurs: undefined },
  ],
};

registerElement(breakDef);

export { breakDef };
