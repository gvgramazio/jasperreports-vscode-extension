import type { ElementDef } from "../types";
import { SplitTypeEnum } from "../enums";
import { registerElement } from "../registry";

const bandDef: ElementDef = {
  tag: "band",
  label: "Band",
  attributeGroups: [
    {
      label: "Band",
      attributes: [
        { name: "height", type: "integer", defaultValue: "0" },
        { name: "splitType", type: "enum", enumValues: SplitTypeEnum },
      ],
    },
  ],
  expressions: [{ tag: "printWhenExpression", label: "Print When" }],
  children: [
    { tag: "property", maxOccurs: undefined },
    { tag: "propertyExpression", maxOccurs: undefined },
    { tag: "returnValue", maxOccurs: undefined },
    { tag: "element", maxOccurs: undefined },
  ],
};

registerElement(bandDef);

export { bandDef };
