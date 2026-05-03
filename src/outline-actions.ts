import * as vscode from "vscode";
import { OutlineItem } from "./outline";
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
  band: () => `    <band height="20"/>\n`,
};

type AddableKind = "field" | "parameter" | "variable" | "sortField" | "group";

const ADD_KIND_MAP: Record<string, AddableKind> = {
  "group-fields": "field",
  "group-parameters": "parameter",
  "group-variables": "variable",
  "group-sortFields": "sortField",
  "group-groups": "group",
};

export async function addElement(item: OutlineItem): Promise<void> {
  const kind = ADD_KIND_MAP[item.kind];
  if (!kind) return;

  const name = await vscode.window.showInputBox({
    prompt: `Enter name for new ${kind}`,
    placeHolder: `my${kind.charAt(0).toUpperCase() + kind.slice(1)}`,
    validateInput: (v) => (v.trim() ? null : "Name is required"),
  });
  if (!name) return;

  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const template = ELEMENT_TEMPLATES[kind];
  if (!template) return;

  const xml = template(name.trim());

  // Insert after the last child in the group, or at the group's position
  const insertPos = getInsertPosition(editor.document, item);
  if (!insertPos) return;

  const edit = new vscode.WorkspaceEdit();
  edit.insert(editor.document.uri, insertPos, xml);
  await vscode.workspace.applyEdit(edit);
}

export async function addBand(item: OutlineItem): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  if (!item.node?.position) return;

  const template = ELEMENT_TEMPLATES["band"];
  if (!template) return;

  const xml = template("");

  // Insert before the closing tag of the section
  const endLine = item.node.position.endLine - 1; // 0-based
  const insertPos = new vscode.Position(endLine, 0);

  const edit = new vscode.WorkspaceEdit();
  edit.insert(editor.document.uri, insertPos, xml);
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

  const range = nodeToRange(editor.document, item.node.position);
  const edit = new vscode.WorkspaceEdit();
  edit.delete(editor.document.uri, range);
  await vscode.workspace.applyEdit(edit);
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

function nodeToRange(
  document: vscode.TextDocument,
  position: NodePosition,
): vscode.Range {
  // Include the entire line(s) containing the element
  const startLine = position.startLine - 1; // 0-based
  const endLine = position.endLine; // Already the line after (we want to delete the full line)

  // Delete from start of line (include leading whitespace for clean deletion)
  const start = new vscode.Position(startLine, 0);

  // If endLine is within document, delete up to start of next line
  const end =
    endLine < document.lineCount
      ? new vscode.Position(endLine, 0)
      : new vscode.Position(
          document.lineCount - 1,
          document.lineAt(document.lineCount - 1).text.length,
        );

  return new vscode.Range(start, end);
}
