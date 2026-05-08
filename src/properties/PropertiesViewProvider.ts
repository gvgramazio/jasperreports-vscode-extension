import * as vscode from "vscode";
import { JrxmlNode, parseJrxml } from "../jrxml-parser";
import { formatNodeProperties } from "./formatNode";
import { getPropertiesHtml } from "./getPropertiesHtml";
import { NodeIdentityTracker, findNodeByIdentity } from "./nodeIdentity";
import { handleWebviewMessage, WebviewMessage } from "./messageHandler";

export class PropertiesViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "jasperreports-properties";

  private _view?: vscode.WebviewView;
  private _extensionUri: vscode.Uri;
  private _editInProgress = false;
  private _tracker = new NodeIdentityTracker();

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

    webviewView.webview.onDidReceiveMessage(async (message: WebviewMessage) => {
      await handleWebviewMessage(message, {
        tracker: this._tracker,
        onRefresh: () => this.reParseAndRefresh(),
        setEditInProgress: (v) => {
          this._editInProgress = v;
        },
      });
    });

    this.showEmpty();
  }

  update(node: JrxmlNode | null, label: string): void {
    if (!this._view) return;

    if (!node) {
      this._tracker.clear();
      this.showEmpty();
      return;
    }

    this._tracker.set(node, label);

    const groups = formatNodeProperties(node);
    this._view.webview.html = getPropertiesHtml(
      this._view.webview,
      this._extensionUri,
      groups,
      label,
    );
  }

  markStale(): void {
    if (!this._view || !this._tracker.current) return;
    this._view.webview.postMessage({ type: "markStale" });
  }

  private reParseAndRefresh(): void {
    if (!this._view || !this._tracker.current) return;

    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const doc = parseJrxml(editor.document.getText());
    if (!doc.root) return;

    const node = findNodeByIdentity(doc.root, this._tracker.current);
    if (node) {
      const groups = formatNodeProperties(node);
      this._view.webview.html = getPropertiesHtml(
        this._view.webview,
        this._extensionUri,
        groups,
        this._tracker.current.label,
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
