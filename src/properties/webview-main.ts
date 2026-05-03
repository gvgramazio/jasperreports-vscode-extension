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

function validateValue(input: HTMLInputElement): boolean {
  const value = input.value;
  const type = input.dataset.type;
  if (!type || value === "") return true;

  switch (type) {
    case "integer":
      return /^-?\d+$/.test(value);
    case "decimal":
      return /^-?\d+(\.\d+)?$/.test(value);
    case "boolean":
      return value === "true" || value === "false";
    case "color":
      return /^#[0-9a-fA-F]{6}$/.test(value);
    case "enum": {
      try {
        const allowed: string[] = JSON.parse(input.dataset.enum || "[]");
        return allowed.length === 0 || allowed.includes(value);
      } catch {
        return true;
      }
    }
    default:
      return true;
  }
}

function setupEditListeners(): void {
  if (!vscode) return;

  document
    .querySelectorAll<HTMLInputElement>(".edit-input")
    .forEach((input) => {
      const originalValue = input.value;

      input.addEventListener("input", () => {
        const isDirty = input.value !== originalValue;
        input.classList.toggle("dirty", isDirty);
        input.classList.remove("applied");
        input.classList.toggle("invalid", !validateValue(input));
      });

      const commit = () => {
        const newValue = input.value;
        if (newValue === originalValue) {
          input.classList.remove("dirty", "invalid");
          return;
        }

        if (!validateValue(input)) return;

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
          input.classList.remove("dirty");
          input.classList.add("applied");
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
          input.classList.remove("dirty", "applied", "invalid");
          input.blur();
        }
      });
    });

  // Handle stale banner
  const overlay = document.getElementById("stale-overlay");
  if (overlay) {
    overlay.addEventListener("click", () => {
      vscode.postMessage({ type: "refresh" });
    });
  }

  // Listen for markStale messages from extension
  window.addEventListener("message", (event: MessageEvent) => {
    if (event.data?.type === "markStale") {
      const staleOverlay = document.getElementById("stale-overlay");
      if (staleOverlay) {
        staleOverlay.classList.add("visible");
      }
    }
  });
}

// Run after DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupEditListeners);
} else {
  setupEditListeners();
}
