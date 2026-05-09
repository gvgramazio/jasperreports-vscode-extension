import * as vscode from "vscode";
import { JrxmlNode, parseJrxml } from "../jrxml-parser";
import { findNodeByIdentity, NodeIdentity } from "./nodeIdentity";
import { handleExpressionEdit } from "./editHandler";

export const EXPR_SCHEME = "jrexpr";

interface ExpressionDocState {
  identity: NodeIdentity;
  expressionTag: string;
  sourceUri: string;
  language: string;
}

function encodeUri(state: ExpressionDocState): vscode.Uri {
  const label = `${state.identity.label}.${state.expressionTag}`;
  return vscode.Uri.from({
    scheme: EXPR_SCHEME,
    path: `/${label}`,
    query: JSON.stringify(state),
  });
}

function decodeUri(uri: vscode.Uri): ExpressionDocState {
  return JSON.parse(uri.query) as ExpressionDocState;
}

function getExpressionText(
  node: JrxmlNode,
  expressionTag: string,
): string | undefined {
  const child = node.children.find((c) => c.tag === expressionTag);
  return child?.text;
}

function getReportLanguage(root: JrxmlNode): string {
  const lang = root.attributes["language"];
  if (!lang || lang === "java") return "java";
  if (lang === "groovy") return "groovy";
  if (lang === "javascript" || lang === "js") return "javascript";
  return "java";
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export class ExpressionEditorProvider implements vscode.FileSystemProvider {
  private _onDidChangeFile = new vscode.EventEmitter<
    vscode.FileChangeEvent[]
  >();
  readonly onDidChangeFile = this._onDidChangeFile.event;

  watch(): vscode.Disposable {
    return { dispose: () => {} };
  }

  stat(): vscode.FileStat {
    return {
      type: vscode.FileType.File,
      ctime: 0,
      mtime: Date.now(),
      size: 0,
    };
  }

  readFile(uri: vscode.Uri): Uint8Array {
    const state = decodeUri(uri);
    const node = this._findNode(state);
    if (!node) return encoder.encode("");
    const text = getExpressionText(node, state.expressionTag) ?? "";
    return encoder.encode(text);
  }

  async writeFile(uri: vscode.Uri, content: Uint8Array): Promise<void> {
    const state = decodeUri(uri);
    const newValue = decoder.decode(content);
    await this._applyToSource(state, newValue);
    this._onDidChangeFile.fire([{ type: vscode.FileChangeType.Changed, uri }]);
  }

  // Unsupported operations
  readDirectory(): [] {
    return [];
  }
  createDirectory(): void {}
  delete(): void {}
  rename(): void {}

  async openExpression(
    identity: NodeIdentity,
    expressionTag: string,
  ): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const doc = parseJrxml(editor.document.getText());
    if (!doc.root) return;

    const node = findNodeByIdentity(doc.root, identity);
    if (!node) return;

    const language = getReportLanguage(doc.root);

    const state: ExpressionDocState = {
      identity,
      expressionTag,
      sourceUri: editor.document.uri.toString(),
      language,
    };

    const uri = encodeUri(state);
    const virtualDoc = await vscode.workspace.openTextDocument(uri);
    await vscode.languages.setTextDocumentLanguage(virtualDoc, language);
    await vscode.window.showTextDocument(virtualDoc, {
      viewColumn: vscode.ViewColumn.Beside,
      preserveFocus: false,
      preview: true,
    });
  }

  dispose(): void {
    this._onDidChangeFile.dispose();
  }

  private async _applyToSource(
    state: ExpressionDocState,
    newValue: string,
  ): Promise<void> {
    const sourceUri = vscode.Uri.parse(state.sourceUri);
    const sourceDoc =
      vscode.workspace.textDocuments.find(
        (d) => d.uri.toString() === sourceUri.toString(),
      ) ?? (await vscode.workspace.openTextDocument(sourceUri));

    const parsed = parseJrxml(sourceDoc.getText());
    if (!parsed.root) return;

    const node = findNodeByIdentity(parsed.root, state.identity);
    if (!node) return;

    await handleExpressionEdit(node, state.expressionTag, newValue);
  }

  private _findNode(state: ExpressionDocState): JrxmlNode | null {
    const sourceUri = vscode.Uri.parse(state.sourceUri);
    const sourceDoc = vscode.workspace.textDocuments.find(
      (d) => d.uri.toString() === sourceUri.toString(),
    );
    if (!sourceDoc) return null;

    const parsed = parseJrxml(sourceDoc.getText());
    if (!parsed.root) return null;

    return findNodeByIdentity(parsed.root, state.identity);
  }
}
