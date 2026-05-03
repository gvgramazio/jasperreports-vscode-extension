import "@vscode-elements/elements/dist/vscode-collapsible/index.js";
import "@vscode-elements/elements/dist/vscode-label/index.js";
import "@vscode-elements/elements/dist/vscode-table/index.js";
import "@vscode-elements/elements/dist/vscode-table-header/index.js";
import "@vscode-elements/elements/dist/vscode-table-header-cell/index.js";
import "@vscode-elements/elements/dist/vscode-table-body/index.js";
import "@vscode-elements/elements/dist/vscode-table-row/index.js";
import "@vscode-elements/elements/dist/vscode-table-cell/index.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const vscode = (window as any).acquireVsCodeApi?.();

function setupEditListeners(): void {
  if (!vscode) return;

  document
    .querySelectorAll<HTMLInputElement>(".edit-input")
    .forEach((input) => {
      const originalValue = input.value;

      const commit = () => {
        const newValue = input.value;
        if (newValue === originalValue) return;

        const attr = input.dataset.attr;
        const posJson = input.dataset.pos;
        if (!attr || !posJson) return;

        try {
          const attributePosition = JSON.parse(posJson);
          vscode.postMessage({
            type: "edit",
            attribute: attr,
            value: newValue,
            attributePosition,
          });
        } catch {
          // ignore parse errors
        }
      };

      input.addEventListener("blur", commit);
      input.addEventListener("keydown", (e: KeyboardEvent) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        } else if (e.key === "Escape") {
          input.value = originalValue;
          input.blur();
        }
      });
    });
}

// Run after DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupEditListeners);
} else {
  setupEditListeners();
}
