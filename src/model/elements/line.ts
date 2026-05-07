import type { ElementDef } from "../types";
import { LineDirectionEnum } from "../enums";
import {
  reportElementGroup,
  REPORT_ELEMENT_EXPRESSIONS,
} from "../common/reportElement";
import { graphicElementGroup } from "../common/graphicElement";
import { registerElement } from "../registry";

const lineDef: ElementDef = {
  tag: "element",
  kind: "line",
  label: "Line",
  attributeGroups: [
    reportElementGroup,
    graphicElementGroup,
    {
      label: "Line",
      attributes: [
        {
          name: "direction",
          type: "enum",
          enumValues: LineDirectionEnum,
        },
      ],
    },
  ],
  expressions: [...REPORT_ELEMENT_EXPRESSIONS],
  children: [
    { tag: "property", maxOccurs: undefined },
    { tag: "propertyExpression", maxOccurs: undefined },
    { tag: "pen", maxOccurs: 1 },
  ],
};

registerElement(lineDef);

export { lineDef };
