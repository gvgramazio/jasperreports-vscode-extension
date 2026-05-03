import { describe, it, expect, vi, beforeEach } from "vitest";

import { Uri } from "vscode";
import { PropertiesViewProvider } from "../properties/PropertiesViewProvider";
import { JrxmlNode } from "../jrxml-parser";

function makeNode(overrides: Partial<JrxmlNode> = {}): JrxmlNode {
  return {
    tag: "element",
    attributes: { kind: "TextField", x: "10", y: "20" },
    children: [],
    position: { startLine: 1, startColumn: 1, endLine: 1, endColumn: 10 },
    ...overrides,
  };
}

describe("PropertiesViewProvider", () => {
  let provider: PropertiesViewProvider;
  let mockWebviewView: {
    webview: {
      options: unknown;
      html: string;
      asWebviewUri: ReturnType<typeof vi.fn>;
      cspSource: string;
    };
  };

  beforeEach(() => {
    const extensionUri = Uri.file("/ext");
    provider = new PropertiesViewProvider(extensionUri as never);

    mockWebviewView = {
      webview: {
        options: {},
        html: "",
        asWebviewUri: vi.fn(
          (uri: { fsPath: string }) => `vscode-webview:///${uri.fsPath}`,
        ),
        cspSource: "https://webview.example",
        onDidReceiveMessage: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      },
    };
  });

  it("resolveWebviewView sets options and renders empty state", () => {
    provider.resolveWebviewView(mockWebviewView as never);
    expect(mockWebviewView.webview.options).toHaveProperty(
      "enableScripts",
      true,
    );
    expect(mockWebviewView.webview.html).toContain("Select an element");
  });

  it("update renders properties for a node", () => {
    provider.resolveWebviewView(mockWebviewView as never);
    const node = makeNode();
    provider.update(node, "TextField");

    expect(mockWebviewView.webview.html).toContain("TextField");
    expect(mockWebviewView.webview.html).toContain("Attributes");
    expect(mockWebviewView.webview.html).toContain("kind");
  });

  it("update with null shows empty state", () => {
    provider.resolveWebviewView(mockWebviewView as never);
    provider.update(makeNode(), "Field");
    provider.update(null, "");

    expect(mockWebviewView.webview.html).toContain("Select an element");
  });

  it("update before resolveWebviewView does nothing", () => {
    // Should not throw
    provider.update(makeNode(), "Test");
  });

  it("HTML includes script reference with nonce", () => {
    provider.resolveWebviewView(mockWebviewView as never);
    provider.update(makeNode(), "Node");

    expect(mockWebviewView.webview.html).toContain("nonce-");
    expect(mockWebviewView.webview.html).toContain("webview-properties.js");
  });

  it("HTML escapes special characters in values", () => {
    provider.resolveWebviewView(mockWebviewView as never);
    const node = makeNode({ attributes: { expr: '<test>&"value"' } });
    provider.update(node, "Node");

    expect(mockWebviewView.webview.html).toContain(
      "&lt;test&gt;&amp;&quot;value&quot;",
    );
  });
});
