import type { ElementDef } from "../types";
import { SortOrderEnum, SortFieldTypeEnum } from "../enums";
import { registerElement } from "../registry";

const sortFieldDef: ElementDef = {
  tag: "sortField",
  label: "Sort Field",
  attributeGroups: [
    {
      label: "Sort Field",
      attributes: [
        { name: "name", type: "string", required: true },
        { name: "order", type: "enum", enumValues: SortOrderEnum },
        { name: "type", type: "enum", enumValues: SortFieldTypeEnum },
      ],
    },
  ],
  expressions: [],
  children: [],
};

registerElement(sortFieldDef);

export { sortFieldDef };
