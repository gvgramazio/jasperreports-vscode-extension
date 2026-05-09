import { getAttributeDef } from "../model/registry";

export type AttributeType =
  | "integer"
  | "decimal"
  | "boolean"
  | "color"
  | "enum";

export interface AttributeTypeInfo {
  type: AttributeType;
  enumValues?: readonly string[];
}

/**
 * Look up attribute type information from the element model registry.
 *
 * @param tag - The XML tag name (e.g. "element", "field").
 * @param name - The attribute name (e.g. "x", "hTextAlign").
 * @param kind - For `<element kind="...">`, the kind value.
 */
export function getAttributeType(
  tag: string,
  name: string,
  kind?: string,
): AttributeTypeInfo | undefined {
  const def = getAttributeDef(tag, name, kind);
  if (!def) return undefined;
  if (def.type === "boolean") {
    return { type: "boolean", enumValues: ["true", "false"] };
  }
  if (def.type === "enum" && def.enumValues) {
    return { type: "enum", enumValues: def.enumValues };
  }
  if (
    def.type === "integer" ||
    def.type === "decimal" ||
    def.type === "color"
  ) {
    return { type: def.type };
  }
  return undefined;
}
