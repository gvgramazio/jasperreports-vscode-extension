import "@vscode-elements/elements/dist/vscode-collapsible/index.js";
import "@vscode-elements/elements/dist/vscode-label/index.js";
import "@vscode-elements/elements/dist/vscode-table/index.js";
import "@vscode-elements/elements/dist/vscode-table-header/index.js";
import "@vscode-elements/elements/dist/vscode-table-header-cell/index.js";
import "@vscode-elements/elements/dist/vscode-table-body/index.js";
import "@vscode-elements/elements/dist/vscode-table-row/index.js";
import "@vscode-elements/elements/dist/vscode-table-cell/index.js";
import "@vscode-elements/elements/dist/vscode-checkbox/index.js";

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

  // Three-state boolean checkboxes: indeterminate → checked → unchecked → indeterminate
  document
    .querySelectorAll<HTMLElement>(".edit-checkbox")
    .forEach((checkbox) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cb = checkbox as any;

      // Track logical state: "true" | "false" | "" (indeterminate)
      let state: string = cb.indeterminate ? "" : cb.checked ? "true" : "false";

      checkbox.addEventListener("change", (ev) => {
        ev.stopPropagation();

        // Cycle: indeterminate → checked → unchecked → indeterminate
        if (state === "") {
          state = "true";
          cb.indeterminate = false;
          cb.checked = true;
        } else if (state === "true") {
          state = "false";
          cb.indeterminate = false;
          cb.checked = false;
        } else {
          state = "";
          cb.indeterminate = true;
          cb.checked = false;
        }

        const attr = checkbox.dataset.attr;
        const posJson = checkbox.dataset.pos;
        if (!attr || !posJson) return;

        try {
          const attributePosition = JSON.parse(posJson);
          if (state === "") {
            vscode.postMessage({
              type: "removeAttribute",
              attribute: attr,
              attributePosition,
            });
          } else {
            vscode.postMessage({
              type: "edit",
              attribute: attr,
              value: state,
              attributePosition,
            });
          }
          checkbox.classList.add("applied");
        } catch {
          // ignore parse errors
        }
      });
    });

  document
    .querySelectorAll<HTMLSelectElement>(".edit-select")
    .forEach((select) => {
      const originalValue = select.value;

      select.addEventListener("change", () => {
        const newValue = select.value;
        if (newValue === originalValue) {
          select.classList.remove("applied");
          return;
        }

        const attr = select.dataset.attr;
        const posJson = select.dataset.pos;
        if (!attr || !posJson) return;

        try {
          const attributePosition = JSON.parse(posJson);
          if (newValue === "") {
            vscode.postMessage({
              type: "removeAttribute",
              attribute: attr,
              attributePosition,
            });
          } else {
            vscode.postMessage({
              type: "edit",
              attribute: attr,
              value: newValue,
              attributePosition,
            });
          }
          select.classList.add("applied");
        } catch {
          // ignore parse errors
        }
      });
    });

  document
    .querySelectorAll<HTMLInputElement>(".edit-color")
    .forEach((picker) => {
      const textInput = picker
        .closest(".color-wrapper")
        ?.querySelector<HTMLInputElement>(".edit-input");
      if (!textInput) return;

      const originalValue = textInput.value;

      picker.addEventListener("input", () => {
        textInput.value = picker.value;
        textInput.classList.toggle("dirty", textInput.value !== originalValue);
        textInput.classList.remove("applied", "invalid");
      });

      picker.addEventListener("change", () => {
        const attr = picker.dataset.attr;
        const posJson = picker.dataset.pos;
        if (!attr || !posJson) return;

        try {
          const attributePosition = JSON.parse(posJson);
          vscode.postMessage({
            type: "edit",
            attribute: attr,
            value: picker.value,
            attributePosition,
          });
          textInput.classList.remove("dirty");
          textInput.classList.add("applied");
          picker.classList.add("applied");
        } catch {
          // ignore parse errors
        }
      });
    });

  document
    .querySelectorAll<HTMLInputElement>(".edit-input:not(.edit-expression)")
    .forEach((input) => {
      const originalValue = input.value;
      const colorPicker = input
        .closest(".color-wrapper")
        ?.querySelector<HTMLInputElement>(".edit-color");

      input.addEventListener("input", () => {
        const isDirty = input.value !== originalValue;
        input.classList.toggle("dirty", isDirty);
        input.classList.remove("applied");
        input.classList.toggle("invalid", !validateValue(input));
        if (colorPicker && /^#[0-9a-fA-F]{6}$/.test(input.value)) {
          colorPicker.value = input.value;
        }
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
          if (newValue === "") {
            vscode.postMessage({
              type: "removeAttribute",
              attribute: attr,
              attributePosition,
            });
          } else {
            vscode.postMessage({
              type: "edit",
              attribute: attr,
              value: newValue,
              attributePosition,
            });
          }
          input.classList.remove("dirty");
          input.classList.add("applied");
          if (colorPicker && /^#[0-9a-fA-F]{6}$/.test(newValue)) {
            colorPicker.value = newValue;
            colorPicker.classList.add("applied");
          }
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

  // Expression inputs: inline editing for expression child elements
  document
    .querySelectorAll<HTMLInputElement>(".edit-expression")
    .forEach((input) => {
      const originalValue = input.value;

      input.addEventListener("input", () => {
        input.classList.toggle("dirty", input.value !== originalValue);
        input.classList.remove("applied");
      });

      const commit = () => {
        const newValue = input.value;
        if (newValue === originalValue) {
          input.classList.remove("dirty");
          return;
        }

        const exprTag = input.dataset.exprTag;
        if (!exprTag) return;

        vscode.postMessage({
          type: "expressionEdit",
          expressionTag: exprTag,
          value: newValue,
        });
        input.classList.remove("dirty");
        input.classList.add("applied");
      };

      input.addEventListener("blur", commit);
      input.addEventListener("keydown", (e: KeyboardEvent) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        } else if (e.key === "Escape") {
          input.value = originalValue;
          input.classList.remove("dirty", "applied");
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
