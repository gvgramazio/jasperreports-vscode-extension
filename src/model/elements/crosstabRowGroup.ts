import type { ElementDef } from "../types";
import { CrosstabTotalPositionEnum, CrosstabRowPositionEnum } from "../enums";
import { registerElement } from "../registry";

const crosstabRowGroupDef: ElementDef = {
  tag: "rowGroup",
  label: "Row Group",
  attributeGroups: [
    {
      label: "Row Group",
      attributes: [
        { name: "name", type: "string", required: true },
        { name: "width", type: "integer" },
        {
          name: "totalPosition",
          type: "enum",
          enumValues: CrosstabTotalPositionEnum,
        },
        {
          name: "headerPosition",
          type: "enum",
          enumValues: CrosstabRowPositionEnum,
        },
        {
          name: "position",
          type: "enum",
          enumValues: CrosstabRowPositionEnum,
        },
      ],
    },
  ],
  expressions: [],
  children: [
    { tag: "bucket", maxOccurs: 1 },
    { tag: "header", maxOccurs: 1 },
    { tag: "totalHeader", maxOccurs: 1 },
  ],
};

registerElement(crosstabRowGroupDef);

export { crosstabRowGroupDef };
