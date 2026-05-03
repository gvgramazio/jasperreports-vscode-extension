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
    // escapeAttr should have escaped the value in the input's value attribute
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
    expect(html).toContain('data-type="boolean"');
    expect(html).toContain("data-enum=");
  });
});
