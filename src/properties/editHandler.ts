import * as vscode from "vscode";
import { AttributePosition } from "../jrxml-parser";

export interface EditMessage {
  type: "edit";
  attribute: string;
  value: string;
  attributePosition: AttributePosition;
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
