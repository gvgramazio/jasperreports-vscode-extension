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

  it("does not re-parse when edit message fails", async () => {
    // No active editor → handleEditMessage returns false
    (vscode.window as { activeTextEditor: unknown }).activeTextEditor =
      undefined;

    provider.resolveWebviewView(mockWebviewView as never);
    provider.update(makeNode({ tag: "field", attributes: { name: "x" } }), "x");

    const htmlBefore = mockWebviewView.webview.html;

    const handler = (
      mockWebviewView.webview.onDidReceiveMessage as ReturnType<typeof vi.fn>
    ).mock.calls[0][0];
    await handler({
      type: "edit",
      attribute: "name",
      value: "y",
      attributePosition: {
        nameStart: 0,
        nameEnd: 4,
        valueStart: 6,
        valueEnd: 7,
      },
    });

    // HTML should not have changed (no re-parse)
    expect(mockWebviewView.webview.html).toBe(htmlBefore);
    expect(provider.editInProgress).toBe(false);
  });

  it("resets editInProgress even when handleEditMessage throws", async () => {
    // Set up an editor that will cause applyEdit to reject
    const mockDocument = {
      getText: () => "",
      positionAt: () => new vscode.Position(0, 0),
      uri: { fsPath: "/test.jrxml", toString: () => "file:///test.jrxml" },
    };
    (vscode.window as { activeTextEditor: unknown }).activeTextEditor = {
      document: mockDocument,
    };
    vi.mocked(vscode.workspace.applyEdit).mockRejectedValueOnce(
      new Error("fail"),
    );

    provider.resolveWebviewView(mockWebviewView as never);
    provider.update(makeNode(), "Node");

    const handler = (
      mockWebviewView.webview.onDidReceiveMessage as ReturnType<typeof vi.fn>
    ).mock.calls[0][0];

    await handler({
      type: "edit",
      attribute: "kind",
      value: "newVal",
      attributePosition: {
        nameStart: 0,
        nameEnd: 4,
        valueStart: 6,
        valueEnd: 12,
      },
    });

    expect(provider.editInProgress).toBe(false);
  });

  it("re-parses on refresh message", async () => {
    const jrxmlContent =
      '<?xml version="1.0"?>\n<jasperReport><field name="f1" class="java.lang.String"/></jasperReport>';
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
      makeNode({ tag: "field", attributes: { name: "f1" } }),
      "f1",
    );

    const handler = (
      mockWebviewView.webview.onDidReceiveMessage as ReturnType<typeof vi.fn>
    ).mock.calls[0][0];
    await handler({ type: "refresh" });

    expect(mockWebviewView.webview.html).toContain("Attributes");
  });

  it("reParseAndRefresh does nothing with no active editor", async () => {
    (vscode.window as { activeTextEditor: unknown }).activeTextEditor =
      undefined;

    provider.resolveWebviewView(mockWebviewView as never);
    provider.update(
      makeNode({ tag: "field", attributes: { name: "f1" } }),
      "f1",
    );

    const htmlBefore = mockWebviewView.webview.html;

    const handler = (
      mockWebviewView.webview.onDidReceiveMessage as ReturnType<typeof vi.fn>
    ).mock.calls[0][0];
    await handler({ type: "refresh" });

    expect(mockWebviewView.webview.html).toBe(htmlBefore);
  });

  it("reParseAndRefresh does nothing when parse returns no root", async () => {
    const mockDocument = {
      getText: () => "not valid xml at all",
      positionAt: (offset: number) => new vscode.Position(0, offset),
      uri: { fsPath: "/test.jrxml", toString: () => "file:///test.jrxml" },
    };
    (vscode.window as { activeTextEditor: unknown }).activeTextEditor = {
      document: mockDocument,
    };

    provider.resolveWebviewView(mockWebviewView as never);
    provider.update(
      makeNode({ tag: "field", attributes: { name: "f1" } }),
      "f1",
    );

    const htmlBefore = mockWebviewView.webview.html;

    const handler = (
      mockWebviewView.webview.onDidReceiveMessage as ReturnType<typeof vi.fn>
    ).mock.calls[0][0];
    await handler({ type: "refresh" });

    expect(mockWebviewView.webview.html).toBe(htmlBefore);
  });

  it("reParseAndRefresh does nothing when node not found after re-parse", async () => {
    const jrxmlContent =
      '<?xml version="1.0"?>\n<jasperReport><field name="other"/></jasperReport>';
    const mockDocument = {
      getText: () => jrxmlContent,
      positionAt: (offset: number) => new vscode.Position(0, offset),
      uri: { fsPath: "/test.jrxml", toString: () => "file:///test.jrxml" },
    };
    (vscode.window as { activeTextEditor: unknown }).activeTextEditor = {
      document: mockDocument,
    };

    provider.resolveWebviewView(mockWebviewView as never);
    // Set current node to something that won't be found in the re-parsed doc
    provider.update(
      makeNode({ tag: "field", attributes: { name: "missing" } }),
      "missing",
    );

    const htmlBefore = mockWebviewView.webview.html;

    const handler = (
      mockWebviewView.webview.onDidReceiveMessage as ReturnType<typeof vi.fn>
    ).mock.calls[0][0];
    await handler({ type: "refresh" });

    expect(mockWebviewView.webview.html).toBe(htmlBefore);
  });

  it("reParseAndRefresh does nothing when no node is selected", async () => {
    const mockDocument = {
      getText: () => "<jasperReport/>",
      positionAt: (offset: number) => new vscode.Position(0, offset),
      uri: { fsPath: "/test.jrxml", toString: () => "file:///test.jrxml" },
    };
    (vscode.window as { activeTextEditor: unknown }).activeTextEditor = {
      document: mockDocument,
    };

    provider.resolveWebviewView(mockWebviewView as never);
    // Don't call update, so _currentNodeId is null

    const handler = (
      mockWebviewView.webview.onDidReceiveMessage as ReturnType<typeof vi.fn>
    ).mock.calls[0][0];
    await handler({ type: "refresh" });

    // Should show empty state, not crash
    expect(mockWebviewView.webview.html).toContain("Select an element");
  });

  it("markStale before resolveWebviewView does not throw", () => {
    expect(() => provider.markStale()).not.toThrow();
  });

  it("findNodeByIdentity traverses nested children", async () => {
    const jrxmlContent = `<?xml version="1.0"?>
<jasperReport>
  <detail>
    <band>
      <textField name="deep"/>
    </band>
  </detail>
</jasperReport>`;
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
      makeNode({ tag: "textField", attributes: { name: "deep" } }),
      "deep",
    );

    const handler = (
      mockWebviewView.webview.onDidReceiveMessage as ReturnType<typeof vi.fn>
    ).mock.calls[0][0];
    await handler({ type: "refresh" });

    // The deeply-nested textField should be found and rendered
    expect(mockWebviewView.webview.html).toContain("Attributes");
  });

  it("findNodeByIdentity matches by uuid for elements without name", async () => {
    const jrxmlContent = `<?xml version="1.0"?>
<jasperReport>
  <title>
    <band>
      <element kind="staticText" uuid="aaa-111" x="0" y="0"/>
      <element kind="textField" uuid="bbb-222" x="10" y="20"/>
    </band>
  </title>
</jasperReport>`;
    const mockDocument = {
      getText: () => jrxmlContent,
      positionAt: (offset: number) => new vscode.Position(0, offset),
      uri: { fsPath: "/test.jrxml", toString: () => "file:///test.jrxml" },
    };
    (vscode.window as { activeTextEditor: unknown }).activeTextEditor = {
      document: mockDocument,
    };

    provider.resolveWebviewView(mockWebviewView as never);
    // Select the second element (textField with uuid bbb-222)
    provider.update(
      makeNode({
        tag: "element",
        attributes: { kind: "textField", uuid: "bbb-222", x: "10", y: "20" },
      }),
      "textField",
    );

    const handler = (
      mockWebviewView.webview.onDidReceiveMessage as ReturnType<typeof vi.fn>
    ).mock.calls[0][0];
    await handler({ type: "refresh" });

    // Should find the textField (bbb-222), not the staticText (aaa-111)
    expect(mockWebviewView.webview.html).toContain("textField");
    expect(mockWebviewView.webview.html).toContain("bbb-222");
  });

  it("reParseAndRefresh is called after a successful edit", async () => {
    // Content where attribute positions match exactly
    const jrxmlContent = '<jasperReport><field name="id"/></jasperReport>';
    // 'name' starts at 21, ends at 25; value 'id' starts at 27, ends at 29
    const mockDocument = {
      getText: () => jrxmlContent,
      positionAt: (offset: number) => new vscode.Position(0, offset),
      uri: { fsPath: "/test.jrxml", toString: () => "file:///test.jrxml" },
    };
    (vscode.window as { activeTextEditor: unknown }).activeTextEditor = {
      document: mockDocument,
    };

    // Ensure applyEdit returns true for this test (reset any leftover mocks)
    vi.mocked(vscode.workspace.applyEdit).mockReset();
    vi.mocked(vscode.workspace.applyEdit).mockResolvedValue(true);

    provider.resolveWebviewView(mockWebviewView as never);
    provider.update(
      makeNode({ tag: "field", attributes: { name: "id" } }),
      "id",
    );

    const handler = (
      mockWebviewView.webview.onDidReceiveMessage as ReturnType<typeof vi.fn>
    ).mock.calls[0][0];
    await handler({
      type: "edit",
      attribute: "name",
      value: "newId",
      attributePosition: {
        nameStart: 21,
        nameEnd: 25,
        valueStart: 27,
        valueEnd: 29,
      },
    });

    // After successful edit, reParseAndRefresh should have been called
    expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);
    expect(provider.editInProgress).toBe(false);
  });
});
