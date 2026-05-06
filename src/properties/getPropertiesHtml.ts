import * as crypto from "crypto";
import * as vscode from "vscode";
import { PropertyEntry, PropertyGroup } from "./formatNode";

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
    .edit-input.dirty {
      border-left: 2px solid var(--vscode-focusBorder);
    }
    .edit-input.applied {
      background-color: var(--vscode-diffEditor-insertedTextBackground);
    }
    .edit-input.invalid {
      border-color: var(--vscode-inputValidation-errorBorder);
    }
    .color-wrapper {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .color-wrapper .edit-input {
      flex: 1;
      min-width: 0;
    }
    .edit-color {
      width: 24px;
      height: 24px;
      padding: 0;
      border: 1px solid var(--vscode-input-border, transparent);
      background: none;
      cursor: pointer;
      flex-shrink: 0;
    }
    .edit-color:focus {
      outline: 1px solid var(--vscode-focusBorder);
    }
    .edit-checkbox.applied {
      opacity: 0.8;
    }
    .edit-select {
      width: 100%;
      box-sizing: border-box;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border, transparent);
      padding: 2px 4px;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: var(--vscode-font-size);
    }
    .edit-select:focus {
      outline: 1px solid var(--vscode-focusBorder);
    }
    .edit-select.applied {
      background-color: var(--vscode-diffEditor-insertedTextBackground);
    }
    .stale-overlay {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: var(--vscode-editor-background);
      opacity: 0.85;
      z-index: 1000;
      justify-content: center;
      align-items: center;
      cursor: pointer;
    }
    .stale-overlay.visible {
      display: flex;
    }
    .stale-message {
      padding: 12px 20px;
      border: 1px solid var(--vscode-editorWarning-foreground);
      border-radius: 4px;
      color: var(--vscode-editorWarning-foreground);
      background: var(--vscode-editor-background);
      text-align: center;
      font-size: var(--vscode-font-size);
    }
  </style>
</head>
<body>
  <div id="stale-overlay" class="stale-overlay">
    <div class="stale-message">Document changed externally.<br/>Click to refresh.</div>
  </div>
  ${groups.length > 0 ? `<div class="node-label">${escapeHtml(nodeLabel)}</div>` : ""}
  ${content}
  <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}

function renderGroup(group: PropertyGroup): string {
  const rows = group.entries
    .map((e) => {
      let valueCell: string;
      if (e.editable && e.attributePosition) {
        if (e.typeInfo?.type === "enum" && e.typeInfo.enumValues) {
          valueCell = renderEnumCell(e);
        } else if (e.typeInfo?.type === "color") {
          valueCell = renderColorCell(e);
        } else if (e.typeInfo?.type === "boolean") {
          valueCell = renderBooleanCell(e);
        } else {
          valueCell = renderInputCell(e);
        }
      } else {
        valueCell = `<vscode-table-cell class="value-cell">${escapeHtml(e.value)}</vscode-table-cell>`;
      }

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

function renderInputCell(e: PropertyEntry): string {
  return `<vscode-table-cell class="value-cell">
              <input class="edit-input" type="text"
                value="${escapeHtml(e.value)}"
                data-attr="${escapeHtml(e.name)}"
                data-pos="${escapeHtml(JSON.stringify(e.attributePosition))}"${e.typeInfo ? ` data-type="${escapeHtml(e.typeInfo.type)}"` : ""}${e.typeInfo?.enumValues ? ` data-enum="${escapeHtml(JSON.stringify(e.typeInfo.enumValues))}"` : ""} />
            </vscode-table-cell>`;
}

function renderEnumCell(e: PropertyEntry): string {
  const values = e.typeInfo!.enumValues!;
  const options = values
    .map(
      (v) =>
        `<option value="${escapeHtml(v)}"${v === e.value ? " selected" : ""}>${escapeHtml(v)}</option>`,
    )
    .join("");
  const blankSelected = !values.includes(e.value) ? " selected" : "";
  return `<vscode-table-cell class="value-cell">
              <select class="edit-select"
                data-attr="${escapeHtml(e.name)}"
                data-pos="${escapeHtml(JSON.stringify(e.attributePosition))}">
                <option value=""${blankSelected}>\u2014</option>
                ${options}
              </select>
            </vscode-table-cell>`;
}

function renderBooleanCell(e: PropertyEntry): string {
  const checked = e.value === "true" ? " checked" : "";
  const indeterminate =
    e.value !== "true" && e.value !== "false" ? " indeterminate" : "";
  return `<vscode-table-cell class="value-cell">
              <vscode-checkbox class="edit-checkbox"
                data-attr="${escapeHtml(e.name)}"
                data-pos="${escapeHtml(JSON.stringify(e.attributePosition))}"${checked}${indeterminate}></vscode-checkbox>
            </vscode-table-cell>`;
}

function renderColorCell(e: PropertyEntry): string {
  const colorValue =
    e.value && /^#[0-9a-fA-F]{6}$/.test(e.value) ? e.value : "#000000";
  return `<vscode-table-cell class="value-cell">
              <div class="color-wrapper">
                <input class="edit-color" type="color"
                  value="${escapeHtml(colorValue)}"
                  data-attr="${escapeHtml(e.name)}"
                  data-pos="${escapeHtml(JSON.stringify(e.attributePosition))}" />
                <input class="edit-input" type="text"
                  value="${escapeHtml(e.value)}"
                  data-attr="${escapeHtml(e.name)}"
                  data-pos="${escapeHtml(JSON.stringify(e.attributePosition))}"
                  data-type="color" />
              </div>
            </vscode-table-cell>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getNonce(): string {
  return crypto.randomBytes(16).toString("hex");
}
