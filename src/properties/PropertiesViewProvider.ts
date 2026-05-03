import * as vscode from "vscode";
import { JrxmlNode, parseJrxml } from "../jrxml-parser";
import { formatNodeProperties } from "./formatNode";
import { getPropertiesHtml } from "./getPropertiesHtml";
import { handleEditMessage, EditMessage } from "./editHandler";

interface NodeIdentity {
  tag: string;
  name: string;
  label: string;
}

export class PropertiesViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "jasperreports-properties";

  private _view?: vscode.WebviewView;
  private _extensionUri: vscode.Uri;
  private _editInProgress = false;
  private _currentNodeId: NodeIdentity | null = null;

  constructor(extensionUri: vscode.Uri) {
    this._extensionUri = extensionUri;
  }

  get editInProgress(): boolean {
    return this._editInProgress;
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, "dist")],
    };

    webviewView.webview.onDidReceiveMessage(
      async (message: EditMessage | { type: "refresh" }) => {
        if (message.type === "edit") {
          this._editInProgress = true;
          try {
            const success = await handleEditMessage(message);
            if (success) {
              this.reParseAndRefresh();
            }
          } finally {
            this._editInProgress = false;
          }
        } else if (message.type === "refresh") {
          this.reParseAndRefresh();
        }
      },
    );

    this.showEmpty();
  }

  update(node: JrxmlNode | null, label: string): void {
    if (!this._view) return;

    if (!node) {
      this._currentNodeId = null;
      this.showEmpty();
      return;
    }

    this._currentNodeId = {
      tag: node.tag,
      name: node.attributes["name"] ?? "",
      label,
    };

    const groups = formatNodeProperties(node);
    this._view.webview.html = getPropertiesHtml(
      this._view.webview,
      this._extensionUri,
      groups,
      label,
    );
  }

  markStale(): void {
    if (!this._view || !this._currentNodeId) return;
    this._view.webview.postMessage({ type: "markStale" });
  }

  private reParseAndRefresh(): void {
    if (!this._view || !this._currentNodeId) return;

    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const doc = parseJrxml(editor.document.getText());
    if (!doc.root) return;

    const node = findNodeByIdentity(doc.root, this._currentNodeId);
    if (node) {
      const groups = formatNodeProperties(node);
      this._view.webview.html = getPropertiesHtml(
        this._view.webview,
        this._extensionUri,
        groups,
        this._currentNodeId.label,
      );
    }
  }

  private showEmpty(): void {
    if (!this._view) return;
    this._view.webview.html = getPropertiesHtml(
      this._view.webview,
      this._extensionUri,
      [],
      "",
    );
  }
}

function findNodeByIdentity(
  root: JrxmlNode,
  id: NodeIdentity,
): JrxmlNode | null {
  const queue: JrxmlNode[] = [root];
  while (queue.length > 0) {
    const node = queue.shift()!;
    if (node.tag === id.tag && (node.attributes["name"] ?? "") === id.name) {
      return node;
    }
    queue.push(...node.children);
  }
  return null;
}
