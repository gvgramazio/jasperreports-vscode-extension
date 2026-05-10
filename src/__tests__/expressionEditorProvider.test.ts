import { describe, it, expect, vi, beforeEach } from "vitest";
import * as vscode from "vscode";
import {
  ExpressionEditorProvider,
  EXPR_SCHEME,
} from "../properties/expressionEditorProvider";
import { handleExpressionEdit } from "../properties/editHandler";

vi.mock("../properties/editHandler", () => ({
  handleExpressionEdit: vi.fn().mockResolvedValue(true),
}));

const encoder = new TextEncoder();
const decoder = new TextDecoder();

describe("ExpressionEditorProvider", () => {
  let provider: ExpressionEditorProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new ExpressionEditorProvider();
  });

  it("exports the jrexpr scheme constant", () => {
    expect(EXPR_SCHEME).toBe("jrexpr");
  });

  it("readFile returns empty bytes when no source document", () => {
    const state = {
      identity: { tag: "element", name: "tf1", uuid: "abc", label: "tf1" },
      expressionTag: "expression",
      sourceUri: "file:///missing.jrxml",
      language: "java",
    };
    const uri = vscode.Uri.from({
      scheme: EXPR_SCHEME,
      path: "/tf1.expression",
      query: JSON.stringify(state),
    });

    (
      vscode.workspace as unknown as { textDocuments: unknown[] }
    ).textDocuments = [];

    const content = decoder.decode(provider.readFile(uri));
    expect(content).toBe("");
  });

  it("readFile returns expression text from source", () => {
    const jrxmlContent = `<?xml version="1.0"?>
<jasperReport>
  <detail>
    <band>
      <element kind="TextField" uuid="abc">
        <expression><![CDATA[$F{name}]]></expression>
      </element>
    </band>
  </detail>
</jasperReport>`;

    const state = {
      identity: { tag: "element", name: "", uuid: "abc", label: "TextField" },
      expressionTag: "expression",
      sourceUri: "file:///test.jrxml",
      language: "java",
    };
    const uri = vscode.Uri.from({
      scheme: EXPR_SCHEME,
      path: "/TextField.expression",
      query: JSON.stringify(state),
    });

    (
      vscode.workspace as unknown as { textDocuments: unknown[] }
    ).textDocuments = [
      {
        uri: { toString: () => "file:///test.jrxml" },
        getText: () => jrxmlContent,
      },
    ];

    const content = decoder.decode(provider.readFile(uri));
    expect(content).toBe("$F{name}");
  });

  it("writeFile applies expression edit to source", async () => {
    const jrxmlContent = `<?xml version="1.0"?>
<jasperReport>
  <detail>
    <band>
      <element kind="TextField" uuid="abc">
        <expression><![CDATA[$F{name}]]></expression>
      </element>
    </band>
  </detail>
</jasperReport>`;

    const state = {
      identity: { tag: "element", name: "", uuid: "abc", label: "TextField" },
      expressionTag: "expression",
      sourceUri: "file:///test.jrxml",
      language: "java",
    };
    const uri = vscode.Uri.from({
      scheme: EXPR_SCHEME,
      path: "/TextField.expression",
      query: JSON.stringify(state),
    });

    (
      vscode.workspace as unknown as { textDocuments: unknown[] }
    ).textDocuments = [
      {
        uri: { toString: () => "file:///test.jrxml" },
        getText: () => jrxmlContent,
      },
    ];

    await provider.writeFile(uri, encoder.encode("$F{newField}"));

    expect(handleExpressionEdit).toHaveBeenCalledWith(
      expect.objectContaining({ tag: "element" }),
      "expression",
      "$F{newField}",
      expect.objectContaining({ getText: expect.any(Function) }),
    );
  });

  it("openExpression opens a virtual document with correct language", async () => {
    const jrxmlContent = `<?xml version="1.0"?>
<jasperReport language="groovy">
  <detail>
    <band>
      <element kind="TextField" uuid="u1">
        <expression><![CDATA[$F{x}]]></expression>
      </element>
    </band>
  </detail>
</jasperReport>`;

    (vscode.window as { activeTextEditor?: unknown }).activeTextEditor = {
      document: {
        fileName: "/test.jrxml",
        getText: () => jrxmlContent,
        uri: { toString: () => "file:///test.jrxml" },
      },
    };

    await provider.openExpression(
      { tag: "element", name: "", uuid: "u1", label: "TextField" },
      "expression",
    );

    expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith(
      expect.objectContaining({ scheme: EXPR_SCHEME }),
    );
    expect(vscode.languages.setTextDocumentLanguage).toHaveBeenCalledWith(
      expect.anything(),
      "groovy",
    );
    expect(vscode.window.showTextDocument).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ viewColumn: vscode.ViewColumn.Beside }),
    );
  });

  it("openExpression does nothing when no active editor", async () => {
    (vscode.window as { activeTextEditor?: unknown }).activeTextEditor =
      undefined;

    await provider.openExpression(
      { tag: "element", name: "", uuid: "u1", label: "TextField" },
      "expression",
    );

    expect(vscode.workspace.openTextDocument).not.toHaveBeenCalled();
  });

  it("openExpression does nothing when node not found", async () => {
    const jrxmlContent = `<?xml version="1.0"?>
<jasperReport><detail><band/></detail></jasperReport>`;

    (vscode.window as { activeTextEditor?: unknown }).activeTextEditor = {
      document: {
        fileName: "/test.jrxml",
        getText: () => jrxmlContent,
        uri: { toString: () => "file:///test.jrxml" },
      },
    };

    await provider.openExpression(
      { tag: "element", name: "", uuid: "nonexistent", label: "TextField" },
      "expression",
    );

    expect(vscode.workspace.openTextDocument).not.toHaveBeenCalled();
  });

  it("dispose cleans up resources", () => {
    // Should not throw
    expect(() => provider.dispose()).not.toThrow();
  });
});
