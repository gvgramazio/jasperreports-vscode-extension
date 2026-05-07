import type { ElementDef } from "../types";
import { RunDirectionEnum, HorizontalPosition } from "../enums";
import {
  reportElementGroup,
  REPORT_ELEMENT_EXPRESSIONS,
} from "../common/reportElement";
import { registerElement } from "../registry";

const crosstabDef: ElementDef = {
  tag: "element",
  kind: "crosstab",
  label: "Crosstab",
  attributeGroups: [
    reportElementGroup,
    {
      label: "Crosstab",
      attributes: [
        { name: "columnBreakOffset", type: "integer" },
        {
          name: "repeatColumnHeaders",
          type: "boolean",
          defaultValue: "true",
        },
        {
          name: "repeatRowHeaders",
          type: "boolean",
          defaultValue: "true",
        },
        {
          name: "runDirection",
          type: "enum",
          enumValues: RunDirectionEnum,
        },
        { name: "ignoreWidth", type: "boolean" },
        {
          name: "horizontalPosition",
          type: "enum",
          enumValues: HorizontalPosition,
        },
      ],
    },
  ],
  expressions: [...REPORT_ELEMENT_EXPRESSIONS],
  children: [
    { tag: "property", maxOccurs: undefined },
    { tag: "propertyExpression", maxOccurs: undefined },
    { tag: "parameter", maxOccurs: undefined },
    { tag: "rowGroup", maxOccurs: undefined },
    { tag: "columnGroup", maxOccurs: undefined },
    { tag: "measure", maxOccurs: undefined },
    { tag: "cell", maxOccurs: undefined },
  ],
};

registerElement(crosstabDef);

export { crosstabDef };
