import type { ElementDef } from "../types";
import { WhenResourceMissingTypeEnum } from "../enums";
import { registerElement } from "../registry";

const datasetDef: ElementDef = {
  tag: "dataset",
  label: "Dataset",
  attributeGroups: [
    {
      label: "Dataset",
      attributes: [
        { name: "name", type: "string", required: true },
        { name: "uuid", type: "string" },
        { name: "scriptletClass", type: "string" },
        { name: "resourceBundle", type: "string" },
        {
          name: "whenResourceMissingType",
          type: "enum",
          enumValues: WhenResourceMissingTypeEnum,
        },
      ],
    },
  ],
  expressions: [{ tag: "filterExpression", label: "Filter" }],
  children: [
    { tag: "property", maxOccurs: undefined },
    { tag: "propertyExpression", maxOccurs: undefined },
    { tag: "scriptlet", maxOccurs: undefined },
    { tag: "parameter", maxOccurs: undefined },
    { tag: "query", maxOccurs: 1 },
    { tag: "field", maxOccurs: undefined },
    { tag: "sortField", maxOccurs: undefined },
    { tag: "variable", maxOccurs: undefined },
    { tag: "group", maxOccurs: undefined },
  ],
};

registerElement(datasetDef);

export { datasetDef };
