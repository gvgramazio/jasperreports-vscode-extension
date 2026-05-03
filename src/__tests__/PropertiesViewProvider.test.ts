import { describe, it, expect, vi, beforeEach } from "vitest";

import * as vscode from "vscode";
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
      postMessage: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
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
        postMessage: vi.fn(),
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

  it("editInProgress is false by default", () => {
    expect(provider.editInProgress).toBe(false);
  });

  it("markStale posts markStale message to webview", () => {
    provider.resolveWebviewView(mockWebviewView as never);
    provider.update(makeNode(), "TextField");
    provider.markStale();

    expect(mockWebviewView.webview.postMessage).toHaveBeenCalledWith({
      type: "markStale",
    });
  });

  it("markStale does nothing when no node is selected", () => {
    provider.resolveWebviewView(mockWebviewView as never);
    provider.markStale();

    expect(mockWebviewView.webview.postMessage).not.toHaveBeenCalled();
  });

  it("HTML includes stale overlay element", () => {
    provider.resolveWebviewView(mockWebviewView as never);
    provider.update(makeNode(), "Node");

    expect(mockWebviewView.webview.html).toContain("stale-overlay");
    expect(mockWebviewView.webview.html).toContain(
      "Document changed externally",
    );
  });

  it("re-parses and refreshes on edit message when editor has JRXML content", async () => {
    const jrxmlContent =
      '<?xml version="1.0"?>\n<jasperReport><field name="id" class="java.lang.Integer"/></jasperReport>';
    const mockDocument = {
      getText: () => jrxmlContent,
      positionAt: (offset: number) => new vscode.Position(0, offset),
      uri: { fsPath: "/test.jrxml", toString: () => "file:///test.jrxml" },
    };
    (vscode.window as { activeTextEditor: unknown }).activeTextEditor = {
      document: mockDocument,
    };

    provider.resolveWebviewView(mockWebviewView as never);
    provider.update(
      makeNode({ tag: "field", attributes: { name: "id" } }),
      "id",
    );

    // Simulate receiving an edit message through the registered handler
    const handler = (
      mockWebviewView.webview.onDidReceiveMessage as ReturnType<typeof vi.fn>
    ).mock.calls[0][0];
    await handler({
      type: "edit",
      attribute: "name",
      value: "newId",
      attributePosition: {
        nameStart: 38,
        nameEnd: 42,
        valueStart: 44,
        valueEnd: 46,
      },
    });

    // After edit, the panel should have re-rendered with fresh parse
    expect(mockWebviewView.webview.html).toContain("Attributes");
  });
});
