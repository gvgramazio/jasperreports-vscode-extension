import { describe, it, expect, vi, beforeEach } from "vitest";
import * as vscode from "vscode";
import { handleEditMessage } from "../properties/editHandler";

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
