import * as vscode from "vscode";
import { JrxmlNode, parseJrxml } from "../jrxml-parser";

export interface NodeIdentity {
  tag: string;
  name: string;
  uuid: string;
  label: string;
}

export class NodeIdentityTracker {
  private _current: NodeIdentity | null = null;

  get current(): NodeIdentity | null {
    return this._current;
  }

  set(node: JrxmlNode, label: string): void {
    this._current = {
      tag: node.tag,
      name: node.attributes["name"] ?? "",
      uuid: node.attributes["uuid"] ?? "",
      label,
    };
  }

  clear(): void {
    this._current = null;
  }

  findCurrentNode(): JrxmlNode | null {
    if (!this._current) return null;
    const editor = vscode.window.activeTextEditor;
    if (!editor) return null;
    const doc = parseJrxml(editor.document.getText());
    if (!doc.root) return null;
    return findNodeByIdentity(doc.root, this._current);
  }
}

export function findNodeByIdentity(
  root: JrxmlNode,
  id: NodeIdentity,
): JrxmlNode | null {
  const queue: JrxmlNode[] = [root];
  while (queue.length > 0) {
    const node = queue.shift()!;
    if (id.uuid && node.attributes["uuid"] === id.uuid) {
      return node;
    }
    if (
      !id.uuid &&
      node.tag === id.tag &&
      (node.attributes["name"] ?? "") === id.name
    ) {
      return node;
    }
    queue.push(...node.children);
  }
  return null;
}
