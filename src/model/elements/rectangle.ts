import type { ElementDef } from "../types";
import {
  reportElementGroup,
  REPORT_ELEMENT_EXPRESSIONS,
} from "../common/reportElement";
import { graphicElementGroup } from "../common/graphicElement";
import { registerElement } from "../registry";

const rectangleDef: ElementDef = {
  tag: "element",
  kind: "rectangle",
  label: "Rectangle",
  attributeGroups: [
    reportElementGroup,
    graphicElementGroup,
    {
      label: "Rectangle",
      attributes: [{ name: "radius", type: "integer" }],
    },
  ],
  expressions: [...REPORT_ELEMENT_EXPRESSIONS],
  children: [
    { tag: "property", maxOccurs: undefined },
    { tag: "propertyExpression", maxOccurs: undefined },
    { tag: "pen", maxOccurs: 1 },
  ],
};

registerElement(rectangleDef);

export { rectangleDef };
