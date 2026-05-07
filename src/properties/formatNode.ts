import { JrxmlNode, AttributePosition } from "../jrxml-parser";
import { getAttributeType, AttributeTypeInfo } from "./attributeTypes";
import { getElementDef } from "../model/registry";
import type { ElementDef } from "../model/types";

export interface PropertyEntry {
  name: string;
  value: string;
  editable?: boolean;
  attributePosition?: AttributePosition;
  typeInfo?: AttributeTypeInfo;
  /** True when the attribute exists in the file. */
  present?: boolean;
  /** True for expression entries (edited via expressionEdit messages). */
  isExpression?: boolean;
}

export interface PropertyGroup {
  label: string;
  entries: PropertyEntry[];
}

const BOX_SIDES = ["top", "bottom", "left", "right"] as const;

const READONLY_ATTRS = new Set(["uuid"]);

/**
 * Build property groups for a JRXML node.
 *
 * When an element model definition is found, groups come from the model's
 * attributeGroups — every attribute defined in the model is included, with
 * the current value from the file (or empty for absent attributes).
 *
 * When no model definition exists, falls back to showing whatever
 * attributes and children are present in the file (legacy behavior).
 */
export function formatNodeProperties(node: JrxmlNode): PropertyGroup[] {
  const tag = node.tag;
  const kind = node.attributes["kind"];
  const def = getElementDef(tag, kind);

  if (def) {
    return formatWithModel(node, def);
  }
  return formatLegacy(node);
}

/**
 * Model-driven property grouping: iterate over the ElementDef's
 * attributeGroups and build entries for every attribute in the model.
 */
function formatWithModel(node: JrxmlNode, def: ElementDef): PropertyGroup[] {
  const groups: PropertyGroup[] = [];
  const tag = def.tag;
  const kind = def.kind;

  for (const group of def.attributeGroups) {
    const entries: PropertyEntry[] = [];
    for (const attr of group.attributes) {
      const value = node.attributes[attr.name] ?? "";
      const present = attr.name in node.attributes;
      entries.push({
        name: attr.name,
        value,
        editable: !READONLY_ATTRS.has(attr.name),
        attributePosition: node.attributePositions?.[attr.name],
        typeInfo: getAttributeType(tag, attr.name, kind),
        present,
      });
    }
    if (entries.length > 0) {
      groups.push({ label: group.label, entries });
    }
  }

  // Expressions from model
  if (def.expressions.length > 0) {
    const exprEntries: PropertyEntry[] = [];
    for (const expr of def.expressions) {
      const child = node.children.find((c) => c.tag === expr.tag);
      const text = child?.text?.trim() ?? "";
      exprEntries.push({
        name: expr.tag,
        value: text,
        present: !!child,
        editable: true,
        isExpression: true,
      });
    }
    groups.push({ label: "Expressions", entries: exprEntries });
  }

  // Box properties (if present in file)
  appendBoxGroup(node, groups);

  // Pen properties (if present in file)
  appendPenGroup(node, groups);

  return groups;
}

/**
 * Legacy format: show whatever is in the file, with no model guidance.
 * Used for elements not (yet) in the model registry.
 */
function formatLegacy(node: JrxmlNode): PropertyGroup[] {
  const groups: PropertyGroup[] = [];

  // Attributes
  const attrEntries = Object.entries(node.attributes).map(([name, value]) => ({
    name,
    value,
    editable: !READONLY_ATTRS.has(name),
    attributePosition: node.attributePositions?.[name],
    typeInfo: getAttributeType(node.tag, name, node.attributes["kind"]),
    present: true,
  }));
  if (attrEntries.length > 0) {
    groups.push({ label: "Attributes", entries: attrEntries });
  }

  // Expressions (scan for known expression tags)
  const exprEntries: PropertyEntry[] = [];
  for (const child of node.children) {
    if (child.tag.endsWith("Expression") || child.tag === "expression") {
      const text = child.text?.trim();
      if (text) {
        exprEntries.push({ name: child.tag, value: text, present: true });
      }
    }
  }
  if (exprEntries.length > 0) {
    groups.push({ label: "Expressions", entries: exprEntries });
  }

  // Style references
  const styleRef = node.attributes["style"];
  if (styleRef) {
    groups.push({
      label: "Style",
      entries: [{ name: "style", value: styleRef, present: true }],
    });
  }

  // Box and Pen
  appendBoxGroup(node, groups);
  appendPenGroup(node, groups);

  // reportElement child (common to all visual elements)
  const reportElement = node.children.find((c) => c.tag === "reportElement");
  if (reportElement) {
    const reEntries = Object.entries(reportElement.attributes).map(
      ([name, value]) => ({ name, value, present: true }),
    );
    if (reEntries.length > 0) {
      groups.push({ label: "Report Element", entries: reEntries });
    }
  }

  return groups;
}

function appendBoxGroup(node: JrxmlNode, groups: PropertyGroup[]): void {
  const box = node.children.find((c) => c.tag === "box");
  if (!box) return;
  const boxEntries: PropertyEntry[] = [];
  for (const [name, value] of Object.entries(box.attributes)) {
    boxEntries.push({ name, value, present: true });
  }
  for (const side of BOX_SIDES) {
    const pen = box.children.find((c) => c.tag === `${side}Pen`);
    if (pen) {
      for (const [name, value] of Object.entries(pen.attributes)) {
        boxEntries.push({ name: `${side}.${name}`, value, present: true });
      }
    }
  }
  if (boxEntries.length > 0) {
    groups.push({ label: "Box", entries: boxEntries });
  }
}

function appendPenGroup(node: JrxmlNode, groups: PropertyGroup[]): void {
  const pen = node.children.find((c) => c.tag === "pen");
  if (!pen) return;
  const penEntries = Object.entries(pen.attributes).map(([name, value]) => ({
    name,
    value,
    present: true,
  }));
  if (penEntries.length > 0) {
    groups.push({ label: "Pen", entries: penEntries });
  }
}
