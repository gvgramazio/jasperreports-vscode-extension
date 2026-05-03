import * as vscode from "vscode";
import { JrxmlNode } from "../jrxml-parser";
import { formatNodeProperties } from "./formatNode";
import { getPropertiesHtml } from "./getPropertiesHtml";
import { handleEditMessage, EditMessage } from "./editHandler";

export class PropertiesViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "jasperreports-properties";

  private _view?: vscode.WebviewView;
  private _extensionUri: vscode.Uri;

  constructor(extensionUri: vscode.Uri) {
    this._extensionUri = extensionUri;
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, "dist")],
    };

    webviewView.webview.onDidReceiveMessage((message: EditMessage) => {
      if (message.type === "edit") {
        handleEditMessage(message);
      }
    });

    this.showEmpty();
  }

  update(node: JrxmlNode | null, label: string): void {
    if (!this._view) return;

    if (!node) {
      this.showEmpty();
      return;
    }

    const groups = formatNodeProperties(node);
    this._view.webview.html = getPropertiesHtml(
      this._view.webview,
      this._extensionUri,
      groups,
      label,
    );
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
