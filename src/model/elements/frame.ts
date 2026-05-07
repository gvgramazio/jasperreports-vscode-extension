import type { ElementDef } from "../types";
import { BorderSplitType } from "../enums";
import {
  reportElementGroup,
  REPORT_ELEMENT_EXPRESSIONS,
} from "../common/reportElement";
import { registerElement } from "../registry";

const frameDef: ElementDef = {
  tag: "element",
  kind: "frame",
  label: "Frame",
  attributeGroups: [
    reportElementGroup,
    {
      label: "Frame",
      attributes: [
        {
          name: "borderSplitType",
          type: "enum",
          enumValues: BorderSplitType,
        },
      ],
    },
  ],
  expressions: [...REPORT_ELEMENT_EXPRESSIONS],
  children: [
    { tag: "property", maxOccurs: undefined },
    { tag: "propertyExpression", maxOccurs: undefined },
    { tag: "box", maxOccurs: 1 },
    { tag: "element", maxOccurs: undefined },
  ],
};

registerElement(frameDef);

export { frameDef };
