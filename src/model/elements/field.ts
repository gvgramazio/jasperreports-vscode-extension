import type { ElementDef } from "../types";
import { registerElement } from "../registry";

const fieldDef: ElementDef = {
  tag: "field",
  label: "Field",
  attributeGroups: [
    {
      label: "Field",
      attributes: [
        { name: "name", type: "string", required: true },
        { name: "class", type: "string", defaultValue: "java.lang.String" },
      ],
    },
  ],
  expressions: [],
  children: [
    { tag: "property", maxOccurs: undefined },
    { tag: "propertyExpression", maxOccurs: undefined },
    { tag: "description", maxOccurs: 1 },
  ],
};

registerElement(fieldDef);

export { fieldDef };
