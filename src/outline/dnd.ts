import * as vscode from "vscode";
import { OutlineItem, nodeToFullLineRange } from "./provider";

const MIME_TYPE = "application/vnd.code.tree.jasperreports-outline";

const DRAGGABLE_KINDS = new Set([
  "field",
  "parameter",
  "variable",
  "sortField",
  "style",
  "group",
  "band",
  "element",
]);

export class OutlineDragAndDropController implements vscode.TreeDragAndDropController<OutlineItem> {
  readonly dropMimeTypes = [MIME_TYPE];
  readonly dragMimeTypes = [MIME_TYPE];

  private _draggedItem: OutlineItem | undefined;

  handleDrag(
    source: readonly OutlineItem[],
    dataTransfer: vscode.DataTransfer,
    _token: vscode.CancellationToken,
  ): void {
    const item = source[0];
    if (!item || !DRAGGABLE_KINDS.has(item.kind)) return;
    this._draggedItem = item;
    dataTransfer.set(MIME_TYPE, new vscode.DataTransferItem(item.kind));
  }

  async handleDrop(
    target: OutlineItem | undefined,
    dataTransfer: vscode.DataTransfer,
    _token: vscode.CancellationToken,
  ): Promise<void> {
    const transferItem = dataTransfer.get(MIME_TYPE);
    if (!transferItem) return;

    // Use the stashed reference — DataTransferItem.value may be deserialized
    const source = this._draggedItem;
    this._draggedItem = undefined;
    if (!source?.node?.position) return;
    if (!target) return;

    // Determine if target is the parent (move to end) or a sibling (move before)
    const sourceParent = source.parent;
    if (!sourceParent) return;

    let insertBeforeTarget: OutlineItem | null = null;

    if (target === sourceParent) {
      // Dropped on parent → move to end (insertBeforeTarget stays null)
    } else if (target.parent === sourceParent) {
      // Dropped on a sibling → move before the target
      insertBeforeTarget = target;
    } else {
      // Cross-parent drop → reject
      return;
    }

    // Don't drop onto self
    if (target === source) return;

    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const document = editor.document;
    const sourceRange = nodeToFullLineRange(document, source.node.position);
    const sourceText = document.getText(sourceRange);

    // Determine insert position
    let insertPos: vscode.Position;
    if (insertBeforeTarget?.node?.position) {
      // Insert before the target sibling (start of its line)
      insertPos = new vscode.Position(
        insertBeforeTarget.node.position.startLine - 1,
        0,
      );
    } else {
      // Move to end: insert after the last sibling in the parent
      const siblings = sourceParent.children;
      const lastSibling = siblings[siblings.length - 1];
      if (lastSibling === source) return; // Already at end
      if (lastSibling?.node?.position) {
        insertPos = new vscode.Position(lastSibling.node.position.endLine, 0);
      } else {
        return;
      }
    }

    const edit = new vscode.WorkspaceEdit();
    edit.delete(document.uri, sourceRange);
    edit.insert(document.uri, insertPos, sourceText);
    await vscode.workspace.applyEdit(edit);
  }
}
