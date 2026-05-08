import { SECTION_TAGS } from "./types";
import { getElementDef } from "../model";

/** Default band heights for section templates. */
const SECTION_BAND_HEIGHTS: Record<string, number> = {
  title: 50,
  summary: 50,
  noData: 50,
  background: 50,
};
const DEFAULT_BAND_HEIGHT = 30;

/**
 * Generate XML for a new element based on its model definition.
 * Includes required attributes with defaults and commonly needed attributes.
 */
export function generateElementXml(
  tag: string,
  kind?: string,
  name?: string,
): string {
  // Section wrapper elements (title, pageHeader, etc.)
  if (SECTION_TAGS.includes(tag)) {
    const h = SECTION_BAND_HEIGHTS[tag] ?? DEFAULT_BAND_HEIGHT;
    return `  <${tag}>\n    <band height="${h}"/>\n  </${tag}>\n`;
  }

  // Group structure wrapper elements (not in registry)
  if (tag === "groupHeader" || tag === "groupFooter") {
    return `    <${tag}>\n      <band height="20"/>\n    </${tag}>\n`;
  }

  const def = getElementDef(tag, kind);
  if (!def) return "";

  // Build attribute string
  const attrs: string[] = [];
  if (kind) attrs.push(`kind="${kind}"`);
  for (const group of def.attributeGroups) {
    for (const attr of group.attributes) {
      if (attr.name === "name") {
        if (name) attrs.push(`name="${name}"`);
        continue;
      }
      // Skip uuid — auto-generated at runtime
      if (attr.name === "uuid") continue;
      // Include required attrs that have defaults, plus width/height always
      if (attr.defaultValue !== undefined && attr.required) {
        attrs.push(`${attr.name}="${attr.defaultValue}"`);
      }
    }
  }
  const attrStr = attrs.length > 0 ? " " + attrs.join(" ") : "";
  const indent = kind ? "      " : "  ";

  // Container elements that need content (elementGroup)
  if (kind === "elementGroup") {
    return `${indent}<${tag}${attrStr}>\n${indent}</${tag}>\n`;
  }

  // Group element gets default header/footer structure
  if (tag === "group" && !kind) {
    return `${indent}<${tag}${attrStr}>\n    <groupHeader>\n      <band height="20"/>\n    </groupHeader>\n    <groupFooter>\n      <band height="20"/>\n    </groupFooter>\n  </${tag}>\n`;
  }

  // Band element uses a practical default height
  if (tag === "band") {
    return `${indent}  <band height="20"/>\n`;
  }

  return `${indent}<${tag}${attrStr}/>\n`;
}
