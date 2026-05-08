import * as vscode from "vscode";
import { AttributePosition, JrxmlNode } from "../jrxml-parser";

export interface EditMessage {
  type: "edit";
  attribute: string;
  value: string;
  attributePosition: AttributePosition;
}

export interface RemoveAttributeMessage {
  type: "removeAttribute";
  attribute: string;
  attributePosition: AttributePosition;
}

export interface ExpressionEditMessage {
  type: "expressionEdit";
  expressionTag: string;
  value: string;
}

export interface AddAttributeMessage {
  type: "addAttribute";
  attribute: string;
  value: string;
}

/**
 * Applies an attribute value edit to the active JRXML document using
 * the exact byte offsets from the parser's attributePositions.
 */
export async function handleEditMessage(
  message: EditMessage,
): Promise<boolean> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return false;

  const document = editor.document;
  const text = document.getText();

  const { attributePosition, attribute, value } = message;

  // Validate offsets are within document bounds
  if (
    attributePosition.valueStart < 0 ||
    attributePosition.valueEnd > text.length ||
    attributePosition.valueStart > attributePosition.valueEnd
  ) {
    return false;
  }

  // Verify the attribute name at the recorded position still matches
  const nameAtPosition = text.substring(
    attributePosition.nameStart,
    attributePosition.nameEnd,
  );
  if (nameAtPosition !== attribute) {
    return false;
  }
  const startPos = document.positionAt(attributePosition.valueStart);
  const endPos = document.positionAt(attributePosition.valueEnd);
  const range = new vscode.Range(startPos, endPos);

  const edit = new vscode.WorkspaceEdit();
  edit.replace(document.uri, range, value);
  return vscode.workspace.applyEdit(edit);
}

/**
 * Removes an attribute entirely from the active JRXML document.
 * Deletes the attribute name, `=`, quotes, value, and surrounding whitespace.
 */
export async function handleRemoveAttribute(
  message: RemoveAttributeMessage,
): Promise<boolean> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return false;

  const document = editor.document;
  const text = document.getText();

  const { attributePosition, attribute } = message;

  // Validate offsets are within document bounds
  if (
    attributePosition.nameStart < 0 ||
    attributePosition.valueEnd > text.length
  ) {
    return false;
  }

  // Verify the attribute name at the recorded position still matches
  const nameAtPosition = text.substring(
    attributePosition.nameStart,
    attributePosition.nameEnd,
  );
  if (nameAtPosition !== attribute) {
    return false;
  }

  // Compute deletion range: from before the attribute name to after the closing quote.
  // attributePosition.valueEnd points to the end of the value content (inside quotes).
  // We need to include the closing quote character.
  let end = attributePosition.valueEnd;
  if (end < text.length && (text[end] === '"' || text[end] === "'")) {
    end++;
  }

  // Extend backward to consume leading whitespace before the attribute name
  let start = attributePosition.nameStart;
  while (start > 0 && (text[start - 1] === " " || text[start - 1] === "\t")) {
    start--;
  }

  // If we've consumed all whitespace back to a newline, consume that too
  // (attribute was on its own line)
  if (start > 0 && text[start - 1] === "\n") {
    start--;
    // Also consume a preceding \r for \r\n line endings
    if (start > 0 && text[start - 1] === "\r") {
      start--;
    }
  }

  const startPos = document.positionAt(start);
  const endPos = document.positionAt(end);

  const wsEdit = new vscode.WorkspaceEdit();
  wsEdit.delete(document.uri, new vscode.Range(startPos, endPos));
  return vscode.workspace.applyEdit(wsEdit);
}

/**
 * Inserts a new attribute into the opening tag of the given node.
 * Places ` attribute="value"` just before `>` or `/>`.
 */
export async function handleAddAttribute(
  node: JrxmlNode,
  attribute: string,
  value: string,
): Promise<boolean> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return false;

  const document = editor.document;
  const text = document.getText();

  const lines = text.split("\n");
  const approxOffset = lcOffset(
    lines,
    node.position.startLine,
    node.position.startColumn,
  );

  // Find '<' of the node's opening tag
  const openTag = `<${node.tag}`;
  const tagStart = text.lastIndexOf(openTag, approxOffset);
  if (tagStart === -1) return false;

  // Find the end of the opening tag ('>' or '/>')
  const openEnd = text.indexOf(">", tagStart);
  if (openEnd === -1) return false;

  // Insert point: just before '>' or '/>'
  const insertOffset = text[openEnd - 1] === "/" ? openEnd - 1 : openEnd;

  const insertion = ` ${attribute}="${value}"`;
  const pos = document.positionAt(insertOffset);

  const edit = new vscode.WorkspaceEdit();
  edit.insert(document.uri, pos, insertion);
  return vscode.workspace.applyEdit(edit);
}

/**
 * Handles adding, updating, or removing an expression child element.
 * Re-parses positions from the live document to avoid stale data.
 */
export async function handleExpressionEdit(
  node: JrxmlNode,
  expressionTag: string,
  value: string,
): Promise<boolean> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return false;

  const document = editor.document;
  const text = document.getText();

  const child = node.children.find((c) => c.tag === expressionTag);

  if (child && value) {
    return replaceExpression(document, text, child, value);
  } else if (child && !value) {
    return removeExpression(document, text, child);
  } else if (!child && value) {
    return insertExpression(document, text, node, expressionTag, value);
  }

  return false;
}

async function replaceExpression(
  document: vscode.TextDocument,
  text: string,
  child: JrxmlNode,
  value: string,
): Promise<boolean> {
  const range = findElementByteRange(text, child);
  if (!range) return false;

  const replacement = `<${child.tag}><![CDATA[${value}]]></${child.tag}>`;
  const startPos = document.positionAt(range.start);
  const endPos = document.positionAt(range.end);

  const edit = new vscode.WorkspaceEdit();
  edit.replace(document.uri, new vscode.Range(startPos, endPos), replacement);
  return vscode.workspace.applyEdit(edit);
}

async function removeExpression(
  document: vscode.TextDocument,
  text: string,
  child: JrxmlNode,
): Promise<boolean> {
  const range = findElementByteRange(text, child);
  if (!range) return false;

  // Extend backward to include leading whitespace and preceding newline
  let start = range.start;
  while (start > 0 && (text[start - 1] === " " || text[start - 1] === "\t")) {
    start--;
  }
  if (start > 0 && text[start - 1] === "\n") {
    start--;
  }

  const startPos = document.positionAt(start);
  const endPos = document.positionAt(range.end);

  const edit = new vscode.WorkspaceEdit();
  edit.delete(document.uri, new vscode.Range(startPos, endPos));
  return vscode.workspace.applyEdit(edit);
}

async function insertExpression(
  document: vscode.TextDocument,
  text: string,
  parent: JrxmlNode,
  expressionTag: string,
  value: string,
): Promise<boolean> {
  const lines = text.split("\n");
  const approxOffset = lcOffset(
    lines,
    parent.position.startLine,
    parent.position.startColumn,
  );

  // Find '<' of parent's opening tag
  const openTag = `<${parent.tag}`;
  const tagStart = text.lastIndexOf(openTag, approxOffset);
  if (tagStart === -1) return false;

  // Check if parent is self-closing
  const openEnd = text.indexOf(">", tagStart);
  if (openEnd === -1) return false;

  const parentIndent = getLineIndent(text, tagStart);
  const childIndent = parentIndent + "  ";
  const childElement = `<${expressionTag}><![CDATA[${value}]]></${expressionTag}>`;

  if (text[openEnd - 1] === "/") {
    // Self-closing: expand <tag .../> → <tag ...>\n  <child/>\n</tag>
    const replacement = `>\n${childIndent}${childElement}\n${parentIndent}</${parent.tag}>`;
    const startPos = document.positionAt(openEnd - 1);
    const endPos = document.positionAt(openEnd + 1);

    const edit = new vscode.WorkspaceEdit();
    edit.replace(document.uri, new vscode.Range(startPos, endPos), replacement);
    return vscode.workspace.applyEdit(edit);
  }

  // Normal case: insert after opening tag's '>'
  const newElement = `\n${childIndent}${childElement}`;
  const pos = document.positionAt(openEnd + 1);

  const edit = new vscode.WorkspaceEdit();
  edit.insert(document.uri, pos, newElement);
  return vscode.workspace.applyEdit(edit);
}

/** Find the byte range [start, end) of an element from `<tag...>` to `</tag>`. */
function findElementByteRange(
  text: string,
  node: JrxmlNode,
): { start: number; end: number } | null {
  const lines = text.split("\n");
  const approxOffset = lcOffset(
    lines,
    node.position.startLine,
    node.position.startColumn,
  );

  // Find '<tagName' by searching backward from the approximate offset
  const openTag = `<${node.tag}`;
  const start = text.lastIndexOf(openTag, approxOffset);
  if (start === -1) return null;

  // Verify exact tag match (not a prefix of a longer tag name)
  const charAfter = text[start + openTag.length];
  if (charAfter && /\w/.test(charAfter)) return null;

  // Find closing tag near the expected end position
  const closingTag = `</${node.tag}>`;
  const approxEnd = lcOffset(
    lines,
    node.position.endLine,
    node.position.endColumn,
  );
  const searchFrom = Math.max(start, approxEnd - closingTag.length - 1);
  let closingIdx = text.indexOf(closingTag, searchFrom);
  if (closingIdx === -1) {
    closingIdx = text.indexOf(closingTag, start);
    if (closingIdx === -1) return null;
  }

  return { start, end: closingIdx + closingTag.length };
}

function getLineIndent(text: string, offset: number): string {
  let lineStart = offset;
  while (lineStart > 0 && text[lineStart - 1] !== "\n") lineStart--;
  let indent = "";
  for (
    let i = lineStart;
    i < text.length && (text[i] === " " || text[i] === "\t");
    i++
  ) {
    indent += text[i];
  }
  return indent;
}

function lcOffset(lines: string[], line: number, col: number): number {
  let offset = 0;
  for (let i = 0; i < line - 1 && i < lines.length; i++) {
    offset += lines[i].length + 1;
  }
  return offset + col;
}
