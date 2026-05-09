import * as vscode from "vscode";

export function setupMockEditor(text: string): void {
  const lines = text.split("\n");
  (vscode.window as { activeTextEditor: unknown }).activeTextEditor = {
    document: {
      getText: () => text,
      uri: { fsPath: "/test.jrxml", toString: () => "file:///test.jrxml" },
      lineCount: lines.length,
      lineAt: (line: number) => ({ text: lines[line] || "" }),
      positionAt: (offset: number) => new vscode.Position(0, offset),
      languageId: "jrxml",
    },
  };
}

export function clearMockEditor(): void {
  (vscode.window as { activeTextEditor: undefined }).activeTextEditor =
    undefined;
}
