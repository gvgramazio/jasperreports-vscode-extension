import type { ElementDef } from "../types";
import { EvaluationTimeEnum } from "../enums";
import {
  reportElementGroup,
  REPORT_ELEMENT_EXPRESSIONS,
} from "../common/reportElement";
import { registerElement } from "../registry";

const genericElementDef: ElementDef = {
  tag: "element",
  kind: "generic",
  label: "Generic Element",
  attributeGroups: [
    reportElementGroup,
    {
      label: "Generic Element",
      attributes: [
        {
          name: "evaluationTime",
          type: "enum",
          enumValues: EvaluationTimeEnum,
        },
        { name: "evaluationGroup", type: "string" },
      ],
    },
  ],
  expressions: [...REPORT_ELEMENT_EXPRESSIONS],
  children: [
    { tag: "property", maxOccurs: undefined },
    { tag: "propertyExpression", maxOccurs: undefined },
    { tag: "genericType", maxOccurs: 1 },
    { tag: "parameter", maxOccurs: undefined },
  ],
};

registerElement(genericElementDef);

export { genericElementDef };
