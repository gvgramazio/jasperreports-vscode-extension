import type { AttributeDef, ChildDef, ElementDef } from "./types";

/**
 * Registry key for element definitions.
 * Elements with a `kind` use "tag:kind" (e.g. "element:textField").
 * Elements without a `kind` use the tag directly (e.g. "field").
 */
function registryKey(tag: string, kind?: string): string {
  return kind ? `${tag}:${kind}` : tag;
}

const registry = new Map<string, ElementDef>();

/**
 * Register an element definition in the global registry.
 */
export function registerElement(def: ElementDef): void {
  const key = registryKey(def.tag, def.kind);
  registry.set(key, def);
}

/**
 * Look up an element definition by tag name and optional kind.
 *
 * @param tag - The XML tag name (e.g. "element", "field", "band").
 * @param kind - For `<element kind="...">`, the kind value.
 * @returns The element definition, or undefined if not registered.
 */
export function getElementDef(
  tag: string,
  kind?: string,
): ElementDef | undefined {
  // Try tag:kind first, then tag-only
  if (kind) {
    return registry.get(registryKey(tag, kind)) ?? registry.get(tag);
  }
  return registry.get(tag);
}

/**
 * Get all valid children for an element identified by tag and optional kind.
 */
export function getValidChildren(
  tag: string,
  kind?: string,
): readonly ChildDef[] {
  return getElementDef(tag, kind)?.children ?? [];
}

/**
 * Find an attribute definition for a given element and attribute name.
 * Searches across all attribute groups.
 */
export function getAttributeDef(
  tag: string,
  attrName: string,
  kind?: string,
): AttributeDef | undefined {
  const def = getElementDef(tag, kind);
  if (!def) return undefined;
  for (const group of def.attributeGroups) {
    const attr = group.attributes.find((a) => a.name === attrName);
    if (attr) return attr;
  }
  return undefined;
}

/**
 * Get all registered element definitions.
 */
export function getAllElementDefs(): readonly ElementDef[] {
  return [...registry.values()];
}

/**
 * Get the number of registered element definitions.
 */
export function getRegistrySize(): number {
  return registry.size;
}

/**
 * Clear all registered element definitions.
 * Intended for testing only.
 */
export function clearRegistry(): void {
  registry.clear();
}
