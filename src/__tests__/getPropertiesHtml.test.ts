import { describe, it, expect } from "vitest";
import * as vscode from "vscode";
import { getPropertiesHtml } from "../properties/getPropertiesHtml";
import { PropertyGroup } from "../properties/formatNode";

function makeWebview() {
  return {
    asWebviewUri: (uri: { fsPath: string }) =>
      `vscode-webview:///${uri.fsPath}`,
    cspSource: "https://webview.example",
  } as unknown as vscode.Webview;
}

const extensionUri = vscode.Uri.file("/ext");

describe("getPropertiesHtml", () => {
  it("renders empty state when no groups", () => {
    const html = getPropertiesHtml(makeWebview(), extensionUri, [], "");
    expect(html).toContain("Select an element");
    expect(html).not.toContain('<div class="node-label">');
  });

  it("renders groups with a node label", () => {
    const groups: PropertyGroup[] = [
      { label: "Attributes", entries: [{ name: "x", value: "10" }] },
    ];
    const html = getPropertiesHtml(
      makeWebview(),
      extensionUri,
      groups,
      "TextField",
    );
    expect(html).toContain("TextField");
    expect(html).toContain("Attributes");
    expect(html).toContain("x");
    expect(html).toContain("10");
  });

  it("renders editable cells with escapeAttr for attribute positions", () => {
    const groups: PropertyGroup[] = [
      {
        label: "Attributes",
        entries: [
          {
            name: "expr",
            value: '<test>&"val"',
            editable: true,
            attributePosition: {
              nameStart: 5,
              nameEnd: 9,
              valueStart: 11,
              valueEnd: 23,
            },
          },
        ],
      },
    ];
    const html = getPropertiesHtml(makeWebview(), extensionUri, groups, "Node");
    // escapeHtml should have escaped the value in the input's value attribute
    expect(html).toContain("edit-input");
    expect(html).toContain("&lt;test&gt;&amp;&quot;val&quot;");
  });

  it("includes CSP meta tag with nonce", () => {
    const html = getPropertiesHtml(makeWebview(), extensionUri, [], "");
    expect(html).toContain("Content-Security-Policy");
    expect(html).toContain("nonce-");
  });

  it("renders type info as data attributes on editable inputs", () => {
    const groups: PropertyGroup[] = [
      {
        label: "Attributes",
        entries: [
          {
            name: "width",
            value: "100",
            editable: true,
            attributePosition: {
              nameStart: 0,
              nameEnd: 5,
              valueStart: 7,
              valueEnd: 10,
            },
            typeInfo: {
              type: "integer",
            },
          },
        ],
      },
    ];
    const html = getPropertiesHtml(makeWebview(), extensionUri, groups, "Node");
    expect(html).toContain('data-type="integer"');
  });

  it("renders enum attributes as <select> dropdowns", () => {
    const groups: PropertyGroup[] = [
      {
        label: "Attributes",
        entries: [
          {
            name: "hTextAlign",
            value: "Center",
            editable: true,
            attributePosition: {
              nameStart: 0,
              nameEnd: 10,
              valueStart: 12,
              valueEnd: 18,
            },
            typeInfo: {
              type: "enum",
              enumValues: ["Left", "Center", "Right", "Justified"],
            },
          },
        ],
      },
    ];
    const html = getPropertiesHtml(makeWebview(), extensionUri, groups, "Node");
    expect(html).toContain("edit-select");
    expect(html).toContain("<select");
    expect(html).toContain('data-attr="hTextAlign"');
    expect(html).toContain('<option value="">');
    expect(html).toContain('<option value="Left">Left</option>');
    expect(html).toContain('<option value="Center" selected>Center</option>');
    expect(html).toContain('<option value="Right">Right</option>');
    expect(html).not.toContain('<input class="edit-input"');
  });

  it("selects blank option when enum value is not in the list", () => {
    const groups: PropertyGroup[] = [
      {
        label: "Attributes",
        entries: [
          {
            name: "hTextAlign",
            value: "Unknown",
            editable: true,
            attributePosition: {
              nameStart: 0,
              nameEnd: 10,
              valueStart: 12,
              valueEnd: 19,
            },
            typeInfo: {
              type: "enum",
              enumValues: ["Left", "Center", "Right"],
            },
          },
        ],
      },
    ];
    const html = getPropertiesHtml(makeWebview(), extensionUri, groups, "Node");
    expect(html).toContain('<option value="" selected>');
    expect(html).not.toContain('<option value="Left" selected>');
  });

  it("renders color attributes with a color picker and text input", () => {
    const groups: PropertyGroup[] = [
      {
        label: "Attributes",
        entries: [
          {
            name: "forecolor",
            value: "#FF0000",
            editable: true,
            attributePosition: {
              nameStart: 0,
              nameEnd: 9,
              valueStart: 11,
              valueEnd: 18,
            },
            typeInfo: {
              type: "color",
            },
          },
        ],
      },
    ];
    const html = getPropertiesHtml(makeWebview(), extensionUri, groups, "Node");
    expect(html).toContain("color-wrapper");
    expect(html).toContain('type="color"');
    expect(html).toContain('class="edit-color"');
    expect(html).toContain('value="#FF0000"');
    expect(html).toContain('class="edit-input"');
    expect(html).toContain('data-attr="forecolor"');
    expect(html).toContain('data-type="color"');
  });

  it("defaults color picker to #000000 when value is not a valid hex color", () => {
    const groups: PropertyGroup[] = [
      {
        label: "Attributes",
        entries: [
          {
            name: "forecolor",
            value: "red",
            editable: true,
            attributePosition: {
              nameStart: 0,
              nameEnd: 9,
              valueStart: 11,
              valueEnd: 14,
            },
            typeInfo: {
              type: "color",
            },
          },
        ],
      },
    ];
    const html = getPropertiesHtml(makeWebview(), extensionUri, groups, "Node");
    // color picker gets default #000000
    expect(html).toContain(
      'class="edit-color" type="color"\n                  value="#000000"',
    );
    // text input keeps the original value
    expect(html).toContain(
      'class="edit-input" type="text"\n                  value="red"',
    );
  });

  it("renders boolean true as a checked checkbox", () => {
    const groups: PropertyGroup[] = [
      {
        label: "Attributes",
        entries: [
          {
            name: "bold",
            value: "true",
            editable: true,
            attributePosition: {
              nameStart: 0,
              nameEnd: 4,
              valueStart: 6,
              valueEnd: 10,
            },
            typeInfo: {
              type: "boolean",
              enumValues: ["true", "false"],
            },
          },
        ],
      },
    ];
    const html = getPropertiesHtml(makeWebview(), extensionUri, groups, "Node");
    expect(html).toContain("edit-checkbox");
    expect(html).toContain("<vscode-checkbox");
    expect(html).toContain('data-attr="bold"');
    expect(html).toContain(" checked");
    expect(html).not.toContain("indeterminate");
    expect(html).not.toContain('<input class="edit-input"');
  });

  it("renders boolean false as an unchecked checkbox", () => {
    const groups: PropertyGroup[] = [
      {
        label: "Attributes",
        entries: [
          {
            name: "italic",
            value: "false",
            editable: true,
            attributePosition: {
              nameStart: 0,
              nameEnd: 6,
              valueStart: 8,
              valueEnd: 13,
            },
            typeInfo: {
              type: "boolean",
              enumValues: ["true", "false"],
            },
          },
        ],
      },
    ];
    const html = getPropertiesHtml(makeWebview(), extensionUri, groups, "Node");
    expect(html).toContain("edit-checkbox");
    expect(html).not.toContain(" checked");
    expect(html).not.toContain("indeterminate");
  });

  it("renders non-true/false boolean value as indeterminate checkbox", () => {
    const groups: PropertyGroup[] = [
      {
        label: "Attributes",
        entries: [
          {
            name: "bold",
            value: "",
            editable: true,
            attributePosition: {
              nameStart: 0,
              nameEnd: 4,
              valueStart: 6,
              valueEnd: 6,
            },
            typeInfo: {
              type: "boolean",
              enumValues: ["true", "false"],
            },
          },
        ],
      },
    ];
    const html = getPropertiesHtml(makeWebview(), extensionUri, groups, "Node");
    expect(html).toContain("edit-checkbox");
    expect(html).toContain("indeterminate");
    expect(html).not.toContain(" checked");
  });

  it("renders data-enum attribute on input when typeInfo has enumValues but type is not enum", () => {
    const groups: PropertyGroup[] = [
      {
        label: "Attributes",
        entries: [
          {
            name: "custom",
            value: "10",
            editable: true,
            attributePosition: {
              nameStart: 0,
              nameEnd: 6,
              valueStart: 8,
              valueEnd: 10,
            },
            typeInfo: {
              type: "integer",
              enumValues: ["10", "20", "30"],
            },
          },
        ],
      },
    ];
    const html = getPropertiesHtml(makeWebview(), extensionUri, groups, "Node");
    expect(html).toContain('data-type="integer"');
    expect(html).toContain("data-enum=");
    expect(html).toContain("edit-input");
    expect(html).not.toContain("<select");
  });

  it("renders absent attributes with absent class on row", () => {
    const groups: PropertyGroup[] = [
      {
        label: "Attributes",
        entries: [
          {
            name: "width",
            value: "",
            present: false,
          },
        ],
      },
    ];
    const html = getPropertiesHtml(makeWebview(), extensionUri, groups, "Node");
    expect(html).toContain('class="absent"');
    expect(html).toContain("width");
  });

  it("does not add absent class for present attributes", () => {
    const groups: PropertyGroup[] = [
      {
        label: "Attributes",
        entries: [
          {
            name: "x",
            value: "10",
            present: true,
          },
        ],
      },
    ];
    const html = getPropertiesHtml(makeWebview(), extensionUri, groups, "Node");
    expect(html).not.toContain('class="absent"');
  });

  it("includes absent CSS rule in style block", () => {
    const html = getPropertiesHtml(makeWebview(), extensionUri, [], "");
    expect(html).toContain(".absent");
    expect(html).toContain("opacity");
  });

  it("renders expression entries as editable inputs with edit-expression class", () => {
    const groups: PropertyGroup[] = [
      {
        label: "Expressions",
        entries: [
          {
            name: "expression",
            value: "$F{name}",
            editable: true,
            isExpression: true,
            present: true,
          },
        ],
      },
    ];
    const html = getPropertiesHtml(
      makeWebview(),
      extensionUri,
      groups,
      "TextField",
    );
    expect(html).toContain("edit-expression");
    expect(html).toContain("edit-input");
    expect(html).toContain('data-expr-tag="expression"');
    expect(html).toContain("$F{name}");
    // Should NOT have data-attr or data-pos (attribute-style edits)
    expect(html).not.toContain('data-attr="expression"');
    expect(html).not.toContain("data-pos=");
  });

  it("renders absent expression entries as editable inputs", () => {
    const groups: PropertyGroup[] = [
      {
        label: "Expressions",
        entries: [
          {
            name: "printWhenExpression",
            value: "",
            editable: true,
            isExpression: true,
            present: false,
          },
        ],
      },
    ];
    const html = getPropertiesHtml(
      makeWebview(),
      extensionUri,
      groups,
      "TextField",
    );
    expect(html).toContain("edit-expression");
    expect(html).toContain('data-expr-tag="printWhenExpression"');
    expect(html).toContain('class="absent"');
  });

  it("does not render expression entries as select or checkbox", () => {
    const groups: PropertyGroup[] = [
      {
        label: "Expressions",
        entries: [
          {
            name: "expression",
            value: "$F{x}",
            editable: true,
            isExpression: true,
            present: true,
          },
        ],
      },
    ];
    const html = getPropertiesHtml(makeWebview(), extensionUri, groups, "Node");
    expect(html).not.toContain("<select");
    expect(html).not.toContain("vscode-checkbox");
  });
});
