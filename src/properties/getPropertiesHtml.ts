import * as vscode from "vscode";
import { PropertyGroup } from "./formatNode";

export function getPropertiesHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  groups: PropertyGroup[],
  nodeLabel: string,
): string {
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "dist", "webview-properties.js"),
  );
  const nonce = getNonce();

  const content =
    groups.length > 0
      ? groups.map((g) => renderGroup(g)).join("\n")
      : `<p class="empty">Select an element in the outline to view its properties.</p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; script-src 'nonce-${nonce}'; style-src ${webview.cspSource} 'unsafe-inline';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Properties</title>
  <style>
    body {
      padding: 8px;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
    }
    .node-label {
      font-weight: bold;
      margin-bottom: 8px;
      font-size: 1.1em;
    }
    .empty {
      color: var(--vscode-descriptionForeground);
      font-style: italic;
    }
    vscode-collapsible {
      margin-bottom: 4px;
    }
    vscode-table {
      width: 100%;
    }
    .value-cell {
      word-break: break-all;
    }
    .edit-input {
      width: 100%;
      box-sizing: border-box;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border, transparent);
      padding: 2px 4px;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: var(--vscode-font-size);
    }
    .edit-input:focus {
      outline: 1px solid var(--vscode-focusBorder);
    }
  </style>
</head>
<body>
  ${groups.length > 0 ? `<div class="node-label">${escapeHtml(nodeLabel)}</div>` : ""}
  ${content}
  <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}

function renderGroup(group: PropertyGroup): string {
  const rows = group.entries
    .map((e) => {
      const valueCell =
        e.editable && e.attributePosition
          ? `<vscode-table-cell class="value-cell">
              <input class="edit-input" type="text"
                value="${escapeAttr(e.value)}"
                data-attr="${escapeAttr(e.name)}"
                data-pos="${escapeAttr(JSON.stringify(e.attributePosition))}" />
            </vscode-table-cell>`
          : `<vscode-table-cell class="value-cell">${escapeHtml(e.value)}</vscode-table-cell>`;

      return `<vscode-table-row>
          <vscode-table-cell>${escapeHtml(e.name)}</vscode-table-cell>
          ${valueCell}
        </vscode-table-row>`;
    })
    .join("\n");

  return `<vscode-collapsible title="${escapeHtml(group.label)}" open>
  <vscode-table zebra bordered-columns responsive breakpoint="0">
    <vscode-table-header slot="header">
      <vscode-table-header-cell>Property</vscode-table-header-cell>
      <vscode-table-header-cell>Value</vscode-table-header-cell>
    </vscode-table-header>
    <vscode-table-body slot="body">
      ${rows}
    </vscode-table-body>
  </vscode-table>
</vscode-collapsible>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getNonce(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";
  for (let i = 0; i < 32; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}
