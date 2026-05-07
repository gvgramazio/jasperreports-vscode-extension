import type { ElementDef } from "../types";
import {
  reportElementGroup,
  REPORT_ELEMENT_EXPRESSIONS,
} from "../common/reportElement";
import { graphicElementGroup } from "../common/graphicElement";
import { registerElement } from "../registry";

const ellipseDef: ElementDef = {
  tag: "element",
  kind: "ellipse",
  label: "Ellipse",
  attributeGroups: [reportElementGroup, graphicElementGroup],
  expressions: [...REPORT_ELEMENT_EXPRESSIONS],
  children: [
    { tag: "property", maxOccurs: undefined },
    { tag: "propertyExpression", maxOccurs: undefined },
    { tag: "pen", maxOccurs: 1 },
  ],
};

registerElement(ellipseDef);

export { ellipseDef };
