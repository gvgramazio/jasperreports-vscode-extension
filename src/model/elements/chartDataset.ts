import type { ElementDef } from "../types";
import { DatasetResetTypeEnum, IncrementTypeEnum } from "../enums";
import { registerElement } from "../registry";

const chartDatasetDef: ElementDef = {
  tag: "dataset",
  kind: "chart",
  label: "Chart Dataset",
  attributeGroups: [
    {
      label: "Chart Dataset",
      attributes: [
        { name: "kind", type: "string" },
        {
          name: "resetType",
          type: "enum",
          enumValues: DatasetResetTypeEnum,
        },
        { name: "resetGroup", type: "string" },
        {
          name: "incrementType",
          type: "enum",
          enumValues: IncrementTypeEnum,
        },
        { name: "incrementGroup", type: "string" },
      ],
    },
  ],
  expressions: [{ tag: "incrementWhenExpression", label: "Increment When" }],
  children: [
    { tag: "datasetRun", maxOccurs: 1 },
    { tag: "series", maxOccurs: undefined },
  ],
};

registerElement(chartDatasetDef);

export { chartDatasetDef };
