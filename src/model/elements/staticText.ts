import type { ElementDef } from "../types";
import {
  reportElementGroup,
  REPORT_ELEMENT_EXPRESSIONS,
} from "../common/reportElement";
import { fontGroup, textAlignmentGroup } from "../common/textElement";
import { registerElement } from "../registry";

const staticTextDef: ElementDef = {
  tag: "element",
  kind: "staticText",
  label: "Static Text",
  attributeGroups: [reportElementGroup, fontGroup, textAlignmentGroup],
  expressions: [...REPORT_ELEMENT_EXPRESSIONS],
  children: [
    { tag: "property", maxOccurs: undefined },
    { tag: "propertyExpression", maxOccurs: undefined },
    { tag: "box", maxOccurs: 1 },
    { tag: "paragraph", maxOccurs: 1 },
    { tag: "text", maxOccurs: 1 },
  ],
};

registerElement(staticTextDef);

export { staticTextDef };
