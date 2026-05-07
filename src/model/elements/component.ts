import type { ElementDef } from "../types";
import {
  reportElementGroup,
  REPORT_ELEMENT_EXPRESSIONS,
} from "../common/reportElement";
import { registerElement } from "../registry";

const componentDef: ElementDef = {
  tag: "element",
  kind: "component",
  label: "Component",
  attributeGroups: [reportElementGroup],
  expressions: [...REPORT_ELEMENT_EXPRESSIONS],
  children: [
    { tag: "property", maxOccurs: undefined },
    { tag: "propertyExpression", maxOccurs: undefined },
  ],
};

registerElement(componentDef);

export { componentDef };
