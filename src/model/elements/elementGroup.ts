import type { ElementDef } from "../types";
import { registerElement } from "../registry";

const elementGroupDef: ElementDef = {
  tag: "element",
  kind: "elementGroup",
  label: "Element Group",
  attributeGroups: [],
  expressions: [],
  children: [{ tag: "element", maxOccurs: undefined }],
};

registerElement(elementGroupDef);

export { elementGroupDef };
