import * as crypto from "crypto";
import * as vscode from "vscode";
import { OutlineItem, nodeToFullLineRange } from "./outline";
import { SECTION_LABELS, SECTION_TAGS, tagToLabel } from "./outline-types";
import { NodePosition, parseJrxml } from "./jrxml-parser";
import { getElementDef, getAllElementDefs, jasperReportDef } from "./model";

/**
 * Canonical ordering of child elements under <jasperReport>,
 * derived from the jasperReport model definition.
 */
export const JRXML_ELEMENT_ORDER: readonly string[] =
  jasperReportDef.children.map((c) => c.tag);

/** Map outline group kinds to their JRXML tag name. */
const GROUP_KIND_TO_TAG: Record<string, string> = {
  "group-styles": "style",
  "group-parameters": "parameter",
  "group-fields": "field",
  "group-sortFields": "sortField",
  "group-variables": "variable",
  "group-groups": "group",
};

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

interface AddableChild {
  label: string;
  kind: string;
  needsName: boolean;
}

/**
 * Determine addable children for an outline item based on the element model.
 */
function getAddableChildren(itemKind: string): AddableChild[] {
  // Group containers (Fields, Parameters, etc.) → single child type
  const groupTag = GROUP_KIND_TO_TAG[itemKind];
  if (groupTag) {
    const def = getElementDef(groupTag);
    if (!def) return [];
    const needsName = def.attributeGroups.some((g) =>
      g.attributes.some((a) => a.name === "name" && a.required),
    );
    return [{ label: def.label, kind: groupTag, needsName }];
  }

  // Section → add band
  if (itemKind === "section") {
    return [{ label: "Band", kind: "band", needsName: false }];
  }

  // Band → add visual elements
  if (itemKind === "band") {
    return getAllElementDefs()
      .filter((d) => d.tag === "element" && d.kind !== undefined)
      .map((d) => ({
        label: d.label,
        kind: `element:${d.kind}`,
        needsName: false,
      }));
  }

  // Group → add groupHeader / groupFooter
  if (itemKind === "group") {
    const def = getElementDef("group");
    if (!def) return [];
    return def.children.map((c) => ({
      label: tagToLabel(c.tag),
      kind: c.tag,
      needsName: false,
    }));
  }

  return [];
}

export async function addElement(item: OutlineItem): Promise<void> {
  const children = getAddableChildren(item.kind);
  if (!children || children.length === 0) return;

  let selected: AddableChild;

  if (children.length === 1) {
    selected = children[0];
  } else {
    const picked = await vscode.window.showQuickPick(
      children.map((c) => ({ label: c.label, child: c })),
      { placeHolder: "Select type to add" },
    );
    if (!picked) return;
    selected = picked.child;
  }

  let name = "";
  if (selected.needsName) {
    const input = await vscode.window.showInputBox({
      prompt: `Enter name for new ${selected.label.toLowerCase()}`,
      placeHolder: `my${selected.label.replace(/\s/g, "")}`,
      validateInput: (v) => (v.trim() ? null : "Name is required"),
    });
    if (!input) return;
    name = input.trim();
  }

  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  let xml: string;
  if (selected.kind.startsWith("element:")) {
    const elementKind = selected.kind.split(":")[1];
    xml = generateElementXml("element", elementKind, name || undefined);
  } else {
    xml = generateElementXml(selected.kind, undefined, name || undefined);
  }
  if (!xml) return;

  const edit = new vscode.WorkspaceEdit();

  if (
    item.node?.position &&
    isSelfClosing(editor.document, item.node.position)
  ) {
    // Expand self-closing tag and insert child inside
    expandSelfClosingAndInsert(editor.document, item, xml, edit);
  } else {
    const insertPos = getInsertPosition(editor.document, item);
    if (!insertPos) return;
    edit.insert(editor.document.uri, insertPos, xml);
  }

  await vscode.workspace.applyEdit(edit);
}

export async function deleteElement(item: OutlineItem): Promise<void> {
  if (!item.node?.position) return;

  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const confirm = await vscode.window.showWarningMessage(
    `Delete "${item.label}"?`,
    { modal: true },
    "Delete",
  );
  if (confirm !== "Delete") return;

  const range = nodeToFullLineRange(editor.document, item.node.position);
  const edit = new vscode.WorkspaceEdit();
  edit.delete(editor.document.uri, range);
  await vscode.workspace.applyEdit(edit);
}

export async function duplicateElement(item: OutlineItem): Promise<void> {
  if (!item.node?.position) return;

  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const range = nodeToFullLineRange(editor.document, item.node.position);
  let text = editor.document.getText(range);

  // Replace all uuid attributes with new UUIDs
  text = text.replace(/uuid="[^"]*"/g, () => `uuid="${crypto.randomUUID()}"`);

  // Append _copy to name attribute (first occurrence only) for named items
  const namedKinds = new Set([
    "style",
    "parameter",
    "field",
    "variable",
    "sortField",
    "group",
  ]);
  if (namedKinds.has(item.kind)) {
    text = text.replace(/name="([^"]*)"/, (_, name) => `name="${name}_copy"`);
  }

  const insertPos = new vscode.Position(item.node.position.endLine, 0);
  const edit = new vscode.WorkspaceEdit();
  edit.insert(editor.document.uri, insertPos, text);
  await vscode.workspace.applyEdit(edit);
}

export async function addSection(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const doc = parseJrxml(editor.document.getText());
  if (!doc.root) return;

  const existingTags = new Set(doc.root.children.map((c) => c.tag));
  const missingSections = SECTION_TAGS.filter((tag) => !existingTags.has(tag));
  if (missingSections.length === 0) return;

  const picked = await vscode.window.showQuickPick(
    missingSections.map((tag) => ({
      label: SECTION_LABELS[tag] || tag,
      tag,
    })),
    { placeHolder: "Select section to add" },
  );
  if (!picked) return;

  const xml = generateElementXml(picked.tag);
  if (!xml) return;

  const insertPos = getOrderedInsertPosition(editor.document, picked.tag);
  if (!insertPos) return;

  const edit = new vscode.WorkspaceEdit();
  edit.insert(editor.document.uri, insertPos, xml);
  await vscode.workspace.applyEdit(edit);
}

function isSelfClosing(
  document: vscode.TextDocument,
  position: NodePosition,
): boolean {
  const lastLineIdx = position.endLine - 1; // 0-based
  if (lastLineIdx < 0 || lastLineIdx >= document.lineCount) return false;
  const lineText = document.lineAt(lastLineIdx).text;
  return lineText.trimEnd().endsWith("/>");
}

function expandSelfClosingAndInsert(
  document: vscode.TextDocument,
  item: OutlineItem,
  childXml: string,
  edit: vscode.WorkspaceEdit,
): void {
  const position = item.node!.position;
  const lastLineIdx = position.endLine - 1; // 0-based
  const lineText = document.lineAt(lastLineIdx).text;
  const slashPos = lineText.lastIndexOf("/>");
  if (slashPos === -1) return;

  // Determine indentation of the parent tag
  const indent = lineText.match(/^(\s*)/)?.[1] ?? "";
  const tag = item.node!.tag;

  // Replace "/>" with ">\n{child}\n{indent}</{tag}>"
  const replaceRange = new vscode.Range(
    new vscode.Position(lastLineIdx, slashPos),
    new vscode.Position(lastLineIdx, slashPos + 2),
  );
  const replacement = `>\n${childXml}${indent}</${tag}>`;
  edit.replace(document.uri, replaceRange, replacement);
}

function getInsertPosition(
  document: vscode.TextDocument,
  groupItem: OutlineItem,
): vscode.Position | undefined {
  // Find the last child with a node position
  const children = groupItem.children;
  if (children.length > 0) {
    const lastChild = children[children.length - 1];
    if (lastChild.node?.position) {
      // Insert after the last child's end line
      return new vscode.Position(lastChild.node.position.endLine, 0);
    }
  }

  // If group has a node (e.g. section), insert before its end
  if (groupItem.node?.position) {
    const endLine = groupItem.node.position.endLine - 1;
    return new vscode.Position(endLine, 0);
  }

  // For virtual groups (Parameters, Fields, etc.) with no children,
  // use canonical element ordering to find the correct insertion point.
  const tag = GROUP_KIND_TO_TAG[groupItem.kind];
  if (tag) {
    const pos = getOrderedInsertPosition(document, tag);
    if (pos) return pos;
  }

  // Last resort: insert near the beginning of the document (after root open tag)
  if (document.lineCount > 1) {
    return new vscode.Position(1, 0);
  }

  return undefined;
}

/**
 * Find the correct insertion position for a tag based on the canonical
 * JRXML element ordering. Scans root children to find the nearest
 * existing element that comes before or after in the sequence.
 */
function getOrderedInsertPosition(
  document: vscode.TextDocument,
  tag: string,
): vscode.Position | undefined {
  const doc = parseJrxml(document.getText());
  if (!doc.root) return undefined;

  const orderIndex = JRXML_ELEMENT_ORDER.indexOf(tag);
  if (orderIndex === -1) return undefined;

  const rootChildren = doc.root.children;

  // Find the last existing element that should come before this tag
  let insertAfter: NodePosition | undefined;
  for (let i = orderIndex - 1; i >= 0; i--) {
    const precedingTag = JRXML_ELEMENT_ORDER[i];
    // Find the last child with this tag
    for (let j = rootChildren.length - 1; j >= 0; j--) {
      if (rootChildren[j].tag === precedingTag && rootChildren[j].position) {
        insertAfter = rootChildren[j].position;
        break;
      }
    }
    if (insertAfter) break;
  }

  if (insertAfter) {
    return new vscode.Position(insertAfter.endLine, 0);
  }

  // No preceding element found — find the first element that comes after
  let insertBefore: NodePosition | undefined;
  for (let i = orderIndex + 1; i < JRXML_ELEMENT_ORDER.length; i++) {
    const followingTag = JRXML_ELEMENT_ORDER[i];
    for (const child of rootChildren) {
      if (child.tag === followingTag && child.position) {
        insertBefore = child.position;
        break;
      }
    }
    if (insertBefore) break;
  }

  if (insertBefore) {
    return new vscode.Position(insertBefore.startLine - 1, 0);
  }

  // No siblings at all — insert after root open tag
  if (doc.root.position && document.lineCount > 1) {
    return new vscode.Position(doc.root.position.startLine, 0);
  }

  return undefined;
}
