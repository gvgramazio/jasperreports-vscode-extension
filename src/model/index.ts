export type {
  AttributeType,
  AttributeDef,
  ExpressionDef,
  ChildDef,
  AttributeGroup,
  ElementDef,
} from "./types";

export {
  registerElement,
  getElementDef,
  getValidChildren,
  getAttributeDef,
  getAllElementDefs,
  getRegistrySize,
  clearRegistry,
} from "./registry";
