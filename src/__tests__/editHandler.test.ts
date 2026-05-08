import { describe, it, expect, vi, beforeEach } from "vitest";
import * as vscode from "vscode";
import {
  handleEditMessage,
  handleExpressionEdit,
  handleRemoveAttribute,
} from "../properties/editHandler";
import { parseJrxml, JrxmlNode } from "../jrxml-parser";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("handleEditMessage", () => {
  it("returns false when no active editor", async () => {
    (vscode.window as { activeTextEditor: undefined }).activeTextEditor =
      undefined;

    const result = await handleEditMessage({
      type: "edit",
      attribute: "x",
      value: "50",
      attributePosition: {
        nameStart: 10,
        nameEnd: 11,
        valueStart: 13,
        valueEnd: 15,
      },
    });

    expect(result).toBe(false);
  });

  it("applies edit with correct range when editor is active", async () => {
    const mockDocument = {
      getText: () => '<element x="10" y="20"/>',
      positionAt: (offset: number) => new vscode.Position(0, offset),
      uri: { fsPath: "/test.jrxml", toString: () => "file:///test.jrxml" },
    };

    (
      vscode.window as {
        activeTextEditor: unknown;
      }
    ).activeTextEditor = {
      document: mockDocument,
    };

    const result = await handleEditMessage({
      type: "edit",
      attribute: "x",
      value: "50",
      attributePosition: {
        nameStart: 9,
        nameEnd: 10,
        valueStart: 12,
        valueEnd: 14,
      },
    });

    expect(result).toBe(true);
    expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);
  });

  it("returns false for invalid position offsets (valueStart out of bounds)", async () => {
    const mockDocument = {
      getText: () => '<element x="10"/>',
      positionAt: (offset: number) => new vscode.Position(0, offset),
      uri: { fsPath: "/test.jrxml", toString: () => "file:///test.jrxml" },
    };

    (
      vscode.window as {
        activeTextEditor: unknown;
      }
    ).activeTextEditor = {
      document: mockDocument,
    };

    const result = await handleEditMessage({
      type: "edit",
      attribute: "x",
      value: "50",
      attributePosition: {
        nameStart: 9,
        nameEnd: 10,
        valueStart: -1,
        valueEnd: 14,
      },
    });

    expect(result).toBe(false);
  });

  it("returns false when valueStart > valueEnd", async () => {
    const mockDocument = {
      getText: () => '<element x="10"/>',
      positionAt: (offset: number) => new vscode.Position(0, offset),
      uri: { fsPath: "/test.jrxml", toString: () => "file:///test.jrxml" },
    };

    (
      vscode.window as {
        activeTextEditor: unknown;
      }
    ).activeTextEditor = {
      document: mockDocument,
    };

    const result = await handleEditMessage({
      type: "edit",
      attribute: "x",
      value: "50",
      attributePosition: {
        nameStart: 9,
        nameEnd: 10,
        valueStart: 20,
        valueEnd: 14,
      },
    });

    expect(result).toBe(false);
  });

  it("returns false when attribute name at position does not match", async () => {
    const mockDocument = {
      getText: () => '<element x="10" y="20"/>',
      positionAt: (offset: number) => new vscode.Position(0, offset),
      uri: { fsPath: "/test.jrxml", toString: () => "file:///test.jrxml" },
    };

    (
      vscode.window as {
        activeTextEditor: unknown;
      }
    ).activeTextEditor = {
      document: mockDocument,
    };

    // Provide offsets that point to "y" but claim attribute is "x"
    const result = await handleEditMessage({
      type: "edit",
      attribute: "x",
      value: "50",
      attributePosition: {
        nameStart: 16,
        nameEnd: 17,
        valueStart: 19,
        valueEnd: 21,
      },
    });

    expect(result).toBe(false);
    expect(vscode.workspace.applyEdit).not.toHaveBeenCalled();
  });
});

describe("handleExpressionEdit", () => {
  function setupEditor(text: string) {
    const mockDocument = {
      getText: () => text,
      positionAt: (offset: number) => new vscode.Position(0, offset),
      uri: { fsPath: "/test.jrxml", toString: () => "file:///test.jrxml" },
    };
    (vscode.window as { activeTextEditor: unknown }).activeTextEditor = {
      document: mockDocument,
    };
  }

  function parseNode(text: string): JrxmlNode {
    const doc = parseJrxml(text);
    return doc.root!;
  }

  it("returns false when no active editor", async () => {
    (vscode.window as { activeTextEditor: undefined }).activeTextEditor =
      undefined;
    const node = parseNode("<element><expression>old</expression></element>");
    const result = await handleExpressionEdit(node, "expression", "new");
    expect(result).toBe(false);
  });

  it("returns false when no child and empty value (no-op)", async () => {
    const text = "<element/>";
    setupEditor(text);
    const node = parseNode(text);
    const result = await handleExpressionEdit(node, "expression", "");
    expect(result).toBe(false);
    expect(vscode.workspace.applyEdit).not.toHaveBeenCalled();
  });

  it("replaces existing expression content", async () => {
    const text =
      '<element kind="textField">\n  <expression><![CDATA[$F{old}]]></expression>\n</element>';
    setupEditor(text);
    const node = parseNode(text);

    const result = await handleExpressionEdit(node, "expression", "$F{new}");
    expect(result).toBe(true);
    expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);

    const editArg = (vscode.workspace.applyEdit as ReturnType<typeof vi.fn>)
      .mock.calls[0][0] as vscode.WorkspaceEdit;
    const entries = editArg.entries();
    expect(entries).toHaveLength(1);
    const edits = entries[0][1];
    expect(edits[0].newText).toBe(
      "<expression><![CDATA[$F{new}]]></expression>",
    );
  });

  it("removes expression when value is empty", async () => {
    const text =
      '<element kind="textField">\n  <expression><![CDATA[$F{name}]]></expression>\n</element>';
    setupEditor(text);
    const node = parseNode(text);

    const result = await handleExpressionEdit(node, "expression", "");
    expect(result).toBe(true);
    expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);

    const editArg = (vscode.workspace.applyEdit as ReturnType<typeof vi.fn>)
      .mock.calls[0][0] as vscode.WorkspaceEdit;
    const entries = editArg.entries();
    expect(entries).toHaveLength(1);
    const edits = entries[0][1];
    // Delete operation: range is set, no newText
    expect(edits[0].range).toBeDefined();
  });

  it("inserts expression into element with existing content", async () => {
    const text =
      '<element kind="textField">\n  <patternExpression><![CDATA[#,##0]]></patternExpression>\n</element>';
    setupEditor(text);
    const node = parseNode(text);

    const result = await handleExpressionEdit(node, "expression", "$F{name}");
    expect(result).toBe(true);
    expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);

    const editArg = (vscode.workspace.applyEdit as ReturnType<typeof vi.fn>)
      .mock.calls[0][0] as vscode.WorkspaceEdit;
    const entries = editArg.entries();
    expect(entries).toHaveLength(1);
    const edits = entries[0][1];
    expect(edits[0].newText).toContain(
      "<expression><![CDATA[$F{name}]]></expression>",
    );
  });

  it("expands self-closing tag when inserting expression", async () => {
    const text = '<element kind="textField"/>';
    setupEditor(text);
    const node = parseNode(text);

    const result = await handleExpressionEdit(node, "expression", "$F{name}");
    expect(result).toBe(true);
    expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);

    const editArg = (vscode.workspace.applyEdit as ReturnType<typeof vi.fn>)
      .mock.calls[0][0] as vscode.WorkspaceEdit;
    const entries = editArg.entries();
    const edits = entries[0][1];
    // Should expand: replace "/>" with ">\n  <expression>...</expression>\n</element>"
    expect(edits[0].newText).toContain(
      "<expression><![CDATA[$F{name}]]></expression>",
    );
    expect(edits[0].newText).toContain("</element>");
  });

  it("replaces expression with plain text content (not CDATA)", async () => {
    const text = "<field>\n  <expression>oldValue</expression>\n</field>";
    setupEditor(text);
    const node = parseNode(text);

    const result = await handleExpressionEdit(node, "expression", "newValue");
    expect(result).toBe(true);
    expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);

    const editArg = (vscode.workspace.applyEdit as ReturnType<typeof vi.fn>)
      .mock.calls[0][0] as vscode.WorkspaceEdit;
    const entries = editArg.entries();
    const edits = entries[0][1];
    expect(edits[0].newText).toBe(
      "<expression><![CDATA[newValue]]></expression>",
    );
  });
});

describe("handleRemoveAttribute", () => {
  function setupEditor(text: string) {
    const mockDocument = {
      getText: () => text,
      positionAt: (offset: number) => new vscode.Position(0, offset),
      uri: { fsPath: "/test.jrxml", toString: () => "file:///test.jrxml" },
    };
    (vscode.window as { activeTextEditor: unknown }).activeTextEditor = {
      document: mockDocument,
    };
  }

  function getAttrPos(text: string, attrName: string) {
    const doc = parseJrxml(text);
    return doc.root!.attributePositions![attrName];
  }

  it("returns false when no active editor", async () => {
    (vscode.window as { activeTextEditor: undefined }).activeTextEditor =
      undefined;
    const result = await handleRemoveAttribute({
      type: "removeAttribute",
      attribute: "x",
      attributePosition: {
        nameStart: 9,
        nameEnd: 10,
        valueStart: 12,
        valueEnd: 14,
      },
    });
    expect(result).toBe(false);
  });

  it("returns false when attribute name at position does not match", async () => {
    const text = '<element x="10" y="20"/>';
    setupEditor(text);
    const pos = getAttrPos(text, "y");
    const result = await handleRemoveAttribute({
      type: "removeAttribute",
      attribute: "x",
      attributePosition: pos,
    });
    expect(result).toBe(false);
    expect(vscode.workspace.applyEdit).not.toHaveBeenCalled();
  });

  it("removes a middle attribute from a multi-attribute tag", async () => {
    const text = '<element x="10" y="20" width="100"/>';
    setupEditor(text);
    const pos = getAttrPos(text, "y");
    const result = await handleRemoveAttribute({
      type: "removeAttribute",
      attribute: "y",
      attributePosition: pos,
    });
    expect(result).toBe(true);
    expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);

    const editArg = (vscode.workspace.applyEdit as ReturnType<typeof vi.fn>)
      .mock.calls[0][0] as vscode.WorkspaceEdit;
    const entries = editArg.entries();
    const edits = entries[0][1];
    // Should delete from the space before 'y' to after the closing quote
    const deletedText = text.substring(
      edits[0].range.start.character,
      edits[0].range.end.character,
    );
    expect(deletedText).toBe(' y="20"');
  });

  it("removes the first attribute", async () => {
    const text = '<element x="10" y="20"/>';
    setupEditor(text);
    const pos = getAttrPos(text, "x");
    const result = await handleRemoveAttribute({
      type: "removeAttribute",
      attribute: "x",
      attributePosition: pos,
    });
    expect(result).toBe(true);

    const editArg = (vscode.workspace.applyEdit as ReturnType<typeof vi.fn>)
      .mock.calls[0][0] as vscode.WorkspaceEdit;
    const entries = editArg.entries();
    const edits = entries[0][1];
    const deletedText = text.substring(
      edits[0].range.start.character,
      edits[0].range.end.character,
    );
    expect(deletedText).toBe(' x="10"');
  });

  it("removes the last attribute", async () => {
    const text = '<element x="10" y="20"/>';
    setupEditor(text);
    const pos = getAttrPos(text, "y");
    const result = await handleRemoveAttribute({
      type: "removeAttribute",
      attribute: "y",
      attributePosition: pos,
    });
    expect(result).toBe(true);

    const editArg = (vscode.workspace.applyEdit as ReturnType<typeof vi.fn>)
      .mock.calls[0][0] as vscode.WorkspaceEdit;
    const entries = editArg.entries();
    const edits = entries[0][1];
    const deletedText = text.substring(
      edits[0].range.start.character,
      edits[0].range.end.character,
    );
    expect(deletedText).toBe(' y="20"');
  });

  it("removes the only attribute on a self-closing tag", async () => {
    const text = '<element x="10"/>';
    setupEditor(text);
    const pos = getAttrPos(text, "x");
    const result = await handleRemoveAttribute({
      type: "removeAttribute",
      attribute: "x",
      attributePosition: pos,
    });
    expect(result).toBe(true);

    const editArg = (vscode.workspace.applyEdit as ReturnType<typeof vi.fn>)
      .mock.calls[0][0] as vscode.WorkspaceEdit;
    const entries = editArg.entries();
    const edits = entries[0][1];
    const deletedText = text.substring(
      edits[0].range.start.character,
      edits[0].range.end.character,
    );
    expect(deletedText).toBe(' x="10"');
  });

  it("removes an attribute on a non-self-closing tag", async () => {
    const text = '<element x="10" y="20">\n  <child/>\n</element>';
    setupEditor(text);
    const pos = getAttrPos(text, "y");
    const result = await handleRemoveAttribute({
      type: "removeAttribute",
      attribute: "y",
      attributePosition: pos,
    });
    expect(result).toBe(true);

    const editArg = (vscode.workspace.applyEdit as ReturnType<typeof vi.fn>)
      .mock.calls[0][0] as vscode.WorkspaceEdit;
    const entries = editArg.entries();
    const edits = entries[0][1];
    const deletedText = text.substring(
      edits[0].range.start.character,
      edits[0].range.end.character,
    );
    expect(deletedText).toBe(' y="20"');
  });

  it("removes an attribute on a multiline opening tag", async () => {
    const text = '<element\n  x="10"\n  y="20"/>';
    setupEditor(text);
    const pos = getAttrPos(text, "y");
    const result = await handleRemoveAttribute({
      type: "removeAttribute",
      attribute: "y",
      attributePosition: pos,
    });
    expect(result).toBe(true);

    const editArg = (vscode.workspace.applyEdit as ReturnType<typeof vi.fn>)
      .mock.calls[0][0] as vscode.WorkspaceEdit;
    const entries = editArg.entries();
    const edits = entries[0][1];
    // On a multiline tag, consumes the leading newline + indent
    const start = edits[0].range.start.character;
    const end = edits[0].range.end.character;
    const deletedText = text.substring(start, end);
    expect(deletedText).toBe('\n  y="20"');
  });

  it("returns false for out-of-bounds offsets", async () => {
    const text = '<element x="10"/>';
    setupEditor(text);
    const result = await handleRemoveAttribute({
      type: "removeAttribute",
      attribute: "x",
      attributePosition: {
        nameStart: -1,
        nameEnd: 10,
        valueStart: 12,
        valueEnd: 14,
      },
    });
    expect(result).toBe(false);
  });
});
