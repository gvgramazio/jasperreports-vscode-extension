import { describe, it, expect, vi, beforeEach } from "vitest";
import * as vscode from "vscode";
import { addElement, addBand, deleteElement } from "../outline-actions";
import { OutlineItem } from "../outline";
import { JrxmlNode } from "../jrxml-parser";

function makeNode(overrides: Partial<JrxmlNode> = {}): JrxmlNode {
  return {
    tag: "field",
    attributes: { name: "testField" },
    children: [],
    position: { startLine: 3, startColumn: 1, endLine: 3, endColumn: 40 },
    ...overrides,
  };
}

function makeGroupItem(
  kind: string,
  children: OutlineItem[] = [],
): OutlineItem {
  return new OutlineItem("Fields", kind as never, null, children);
}

function setupEditor(text: string): void {
  const lines = text.split("\n");
  (
    vscode.window as {
      activeTextEditor: unknown;
    }
  ).activeTextEditor = {
    document: {
      getText: () => text,
      uri: { fsPath: "/test.jrxml", toString: () => "file:///test.jrxml" },
      lineCount: lines.length,
      lineAt: (line: number) => ({ text: lines[line] || "" }),
      positionAt: (offset: number) => new vscode.Position(0, offset),
      languageId: "jrxml",
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  (vscode.window as { activeTextEditor: undefined }).activeTextEditor =
    undefined;
});

describe("addElement", () => {
  it("does nothing for unsupported kind", async () => {
    const item = makeGroupItem("group-styles");
    await addElement(item);
    expect(vscode.window.showInputBox).not.toHaveBeenCalled();
  });

  it("prompts for name and inserts field", async () => {
    const childNode = makeNode();
    const childItem = new OutlineItem(
      "testField",
      "field",
      childNode,
      [],
      "String",
    );
    const item = makeGroupItem("group-fields", [childItem]);

    (vscode.window.showInputBox as ReturnType<typeof vi.fn>).mockResolvedValue(
      "newField",
    );
    setupEditor('<jasperReport>\n  <field name="testField"/>\n</jasperReport>');

    await addElement(item);

    expect(vscode.window.showInputBox).toHaveBeenCalledTimes(1);
    expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);
  });

  it("does nothing when user cancels input", async () => {
    const item = makeGroupItem("group-fields");
    (vscode.window.showInputBox as ReturnType<typeof vi.fn>).mockResolvedValue(
      undefined,
    );

    await addElement(item);

    expect(vscode.workspace.applyEdit).not.toHaveBeenCalled();
  });

  it("does nothing when no active editor", async () => {
    const item = makeGroupItem("group-fields");
    (vscode.window.showInputBox as ReturnType<typeof vi.fn>).mockResolvedValue(
      "test",
    );

    await addElement(item);

    expect(vscode.workspace.applyEdit).not.toHaveBeenCalled();
  });
});

describe("addBand", () => {
  it("inserts band before section closing tag", async () => {
    const sectionNode = makeNode({
      tag: "detail",
      position: { startLine: 2, startColumn: 1, endLine: 5, endColumn: 10 },
    });
    const item = new OutlineItem("Detail", "section", sectionNode, []);

    setupEditor(
      '<jasperReport>\n  <detail>\n    <band height="20"/>\n  </detail>\n</jasperReport>',
    );

    await addBand(item);

    expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);
  });

  it("does nothing when no node position", async () => {
    const item = new OutlineItem("Detail", "section", null, []);
    setupEditor("<jasperReport/>");

    await addBand(item);

    expect(vscode.workspace.applyEdit).not.toHaveBeenCalled();
  });
});

describe("deleteElement", () => {
  it("deletes after confirmation", async () => {
    const node = makeNode();
    const item = new OutlineItem("testField", "field", node, [], "String");

    setupEditor('<jasperReport>\n  <field name="testField"/>\n</jasperReport>');
    (
      vscode.window.showWarningMessage as ReturnType<typeof vi.fn>
    ).mockResolvedValue("Delete");

    await deleteElement(item);

    expect(vscode.window.showWarningMessage).toHaveBeenCalledTimes(1);
    expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);
  });

  it("does nothing when user cancels", async () => {
    const node = makeNode();
    const item = new OutlineItem("testField", "field", node, [], "String");

    setupEditor('<jasperReport>\n  <field name="testField"/>\n</jasperReport>');
    (
      vscode.window.showWarningMessage as ReturnType<typeof vi.fn>
    ).mockResolvedValue(undefined);

    await deleteElement(item);

    expect(vscode.workspace.applyEdit).not.toHaveBeenCalled();
  });

  it("does nothing when node has no position", async () => {
    const item = new OutlineItem("testField", "field", null, [], "String");

    await deleteElement(item);

    expect(vscode.window.showWarningMessage).not.toHaveBeenCalled();
  });
});
