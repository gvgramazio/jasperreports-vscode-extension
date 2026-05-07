import type { ElementDef } from "../types";
import {
  CrosstabTotalPositionEnum,
  CrosstabColumnPositionEnum,
} from "../enums";
import { registerElement } from "../registry";

const crosstabColumnGroupDef: ElementDef = {
  tag: "columnGroup",
  label: "Column Group",
  attributeGroups: [
    {
      label: "Column Group",
      attributes: [
        { name: "name", type: "string", required: true },
        { name: "height", type: "integer" },
        {
          name: "totalPosition",
          type: "enum",
          enumValues: CrosstabTotalPositionEnum,
        },
        {
          name: "headerPosition",
          type: "enum",
          enumValues: CrosstabColumnPositionEnum,
        },
        {
          name: "position",
          type: "enum",
          enumValues: CrosstabColumnPositionEnum,
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

registerElement(crosstabColumnGroupDef);

export { crosstabColumnGroupDef };
