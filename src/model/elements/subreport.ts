import type { ElementDef } from "../types";
import { OverflowType } from "../enums";
import {
  reportElementGroup,
  REPORT_ELEMENT_EXPRESSIONS,
} from "../common/reportElement";
import { registerElement } from "../registry";

const subreportDef: ElementDef = {
  tag: "element",
  kind: "subreport",
  label: "Subreport",
  attributeGroups: [
    reportElementGroup,
    {
      label: "Subreport",
      attributes: [
        { name: "usingCache", type: "boolean" },
        { name: "runToBottom", type: "boolean" },
        {
          name: "overflowType",
          type: "enum",
          enumValues: OverflowType,
        },
      ],
    },
  ],
  expressions: [
    ...REPORT_ELEMENT_EXPRESSIONS,
    { tag: "expression", label: "Subreport Expression" },
    { tag: "parametersMapExpression", label: "Parameters Map" },
    { tag: "connectionExpression", label: "Connection" },
    { tag: "dataSourceExpression", label: "Data Source" },
  ],
  children: [
    { tag: "property", maxOccurs: undefined },
    { tag: "propertyExpression", maxOccurs: undefined },
    { tag: "parameter", maxOccurs: undefined },
    { tag: "returnValue", maxOccurs: undefined },
  ],
};

registerElement(subreportDef);

export { subreportDef };
