import * as vscode from "vscode";
import { OutlineItem, nodeToFullLineRange } from "./outline";
import { NodePosition } from "./jrxml-parser";

const ELEMENT_TEMPLATES: Record<string, (name: string) => string> = {
  field: (name) => `  <field name="${name}" class="java.lang.String"/>\n`,
  parameter: (name) =>
    `  <parameter name="${name}" class="java.lang.String"/>\n`,
  variable: (name) =>
    `  <variable name="${name}" class="java.lang.Integer" calculation="Nothing">\n    <initialValueExpression><![CDATA[0]]></initialValueExpression>\n  </variable>\n`,
  sortField: (name) => `  <sortField name="${name}"/>\n`,
  group: (name) =>
    `  <group name="${name}">\n    <groupHeader>\n      <band height="20"/>\n    </groupHeader>\n    <groupFooter>\n      <band height="20"/>\n    </groupFooter>\n  </group>\n`,
  style: (name) => `  <style name="${name}"/>\n`,
  band: () => `    <band height="20"/>\n`,
  groupHeader: () =>
    `    <groupHeader>\n      <band height="20"/>\n    </groupHeader>\n`,
  groupFooter: () =>
    `    <groupFooter>\n      <band height="20"/>\n    </groupFooter>\n`,
};

const ELEMENT_KIND_TEMPLATES: Record<string, (name: string) => string> = {
  textField: () =>
    `      <element kind="textField" x="0" y="0" width="100" height="20"/>\n`,
  staticText: () =>
    `      <element kind="staticText" x="0" y="0" width="100" height="20"/>\n`,
  image: () =>
    `      <element kind="image" x="0" y="0" width="100" height="20"/>\n`,
  line: () =>
    `      <element kind="line" x="0" y="0" width="100" height="1"/>\n`,
  rectangle: () =>
    `      <element kind="rectangle" x="0" y="0" width="100" height="20"/>\n`,
  ellipse: () =>
    `      <element kind="ellipse" x="0" y="0" width="100" height="20"/>\n`,
  frame: () =>
    `      <element kind="frame" x="0" y="0" width="100" height="20"/>\n`,
  break: () =>
    `      <element kind="break" x="0" y="0" width="100" height="1"/>\n`,
  elementGroup: () => `      <element kind="elementGroup">\n      </element>\n`,
};

interface AddableChild {
  label: string;
  kind: string;
  needsName: boolean;
}

const ADD_CHILDREN_MAP: Record<string, AddableChild[]> = {
  "group-fields": [{ label: "Field", kind: "field", needsName: true }],
  "group-parameters": [
    { label: "Parameter", kind: "parameter", needsName: true },
  ],
  "group-variables": [{ label: "Variable", kind: "variable", needsName: true }],
  "group-sortFields": [
    { label: "Sort Field", kind: "sortField", needsName: true },
  ],
  "group-groups": [{ label: "Group", kind: "group", needsName: true }],
  "group-styles": [{ label: "Style", kind: "style", needsName: true }],
  section: [{ label: "Band", kind: "band", needsName: false }],
  band: [
    { label: "Text Field", kind: "element:textField", needsName: false },
    { label: "Static Text", kind: "element:staticText", needsName: false },
    { label: "Image", kind: "element:image", needsName: false },
    { label: "Line", kind: "element:line", needsName: false },
    { label: "Rectangle", kind: "element:rectangle", needsName: false },
    { label: "Ellipse", kind: "element:ellipse", needsName: false },
    { label: "Frame", kind: "element:frame", needsName: false },
    { label: "Break", kind: "element:break", needsName: false },
    { label: "Element Group", kind: "element:elementGroup", needsName: false },
  ],
  group: [
    { label: "Group Header", kind: "groupHeader", needsName: false },
    { label: "Group Footer", kind: "groupFooter", needsName: false },
  ],
};

export async function addElement(item: OutlineItem): Promise<void> {
  const children = ADD_CHILDREN_MAP[item.kind];
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
    const tpl = ELEMENT_KIND_TEMPLATES[elementKind];
    if (!tpl) return;
    xml = tpl(name);
  } else {
    const tpl = ELEMENT_TEMPLATES[selected.kind];
    if (!tpl) return;
    xml = tpl(name);
  }

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

  // Fallback: for virtual groups (Parameters, Fields, etc.) that have no node,
  // look at the first child to determine the insertion region
  if (children.length > 0 && children[0].node?.position) {
    // Insert after the last child
    const lastChild = children[children.length - 1];
    if (lastChild.node?.position) {
      return new vscode.Position(lastChild.node.position.endLine, 0);
    }
  }

  // Last resort: insert near the beginning of the document (after root open tag)
  if (document.lineCount > 1) {
    return new vscode.Position(1, 0);
  }

  return undefined;
}
