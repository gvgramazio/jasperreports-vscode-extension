import type { ElementDef } from "../types";
import { SortOrderEnum } from "../enums";
import { registerElement } from "../registry";

const bucketDef: ElementDef = {
  tag: "bucket",
  label: "Bucket",
  attributeGroups: [
    {
      label: "Bucket",
      attributes: [
        { name: "class", type: "string" },
        { name: "order", type: "enum", enumValues: SortOrderEnum },
      ],
    },
  ],
  expressions: [
    { tag: "expression", label: "Expression" },
    { tag: "orderByExpression", label: "Order By" },
    { tag: "comparatorExpression", label: "Comparator" },
  ],
  children: [],
};

registerElement(bucketDef);

export { bucketDef };
