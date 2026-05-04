import { describe, it, expect, vi, beforeEach } from "vitest";
import * as vscode from "vscode";
import { addElement, deleteElement } from "../outline-actions";
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
    const item = makeGroupItem("root");
    await addElement(item);
    expect(vscode.window.showInputBox).not.toHaveBeenCalled();
    expect(vscode.window.showQuickPick).not.toHaveBeenCalled();
  });

  it("prompts for name and inserts field (single-child kind)", async () => {
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

    expect(vscode.window.showQuickPick).not.toHaveBeenCalled();
    expect(vscode.window.showInputBox).toHaveBeenCalledTimes(1);
    expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);
  });

  it("inserts style with name prompt", async () => {
    const item = makeGroupItem("group-styles");
    (vscode.window.showInputBox as ReturnType<typeof vi.fn>).mockResolvedValue(
      "myStyle",
    );
    setupEditor("<jasperReport>\n</jasperReport>");

    await addElement(item);

    expect(vscode.window.showInputBox).toHaveBeenCalledTimes(1);
    expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);
  });

  it("inserts band directly without name for section", async () => {
    const sectionNode = makeNode({
      tag: "detail",
      position: { startLine: 2, startColumn: 1, endLine: 5, endColumn: 10 },
    });
    const item = new OutlineItem("Detail", "section", sectionNode, []);

    setupEditor(
      '<jasperReport>\n  <detail>\n    <band height="20"/>\n  </detail>\n</jasperReport>',
    );

    await addElement(item);

    expect(vscode.window.showQuickPick).not.toHaveBeenCalled();
    expect(vscode.window.showInputBox).not.toHaveBeenCalled();
    expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);
  });

  it("shows QuickPick for band (multi-child kind)", async () => {
    const bandNode = makeNode({
      tag: "band",
      position: { startLine: 3, startColumn: 1, endLine: 4, endColumn: 10 },
    });
    const item = new OutlineItem("Band", "band", bandNode, []);

    (vscode.window.showQuickPick as ReturnType<typeof vi.fn>).mockResolvedValue(
      {
        label: "Text Field",
        child: {
          label: "Text Field",
          kind: "element:textField",
          needsName: false,
        },
      },
    );
    setupEditor(
      '<jasperReport>\n  <detail>\n    <band height="20">\n    </band>\n  </detail>\n</jasperReport>',
    );

    await addElement(item);

    expect(vscode.window.showQuickPick).toHaveBeenCalledTimes(1);
    expect(vscode.window.showInputBox).not.toHaveBeenCalled();
    expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);
  });

  it("expands self-closing parent when adding child", async () => {
    const bandNode = makeNode({
      tag: "band",
      position: { startLine: 3, startColumn: 5, endLine: 3, endColumn: 25 },
    });
    const item = new OutlineItem("Band", "band", bandNode, []);

    (vscode.window.showQuickPick as ReturnType<typeof vi.fn>).mockResolvedValue(
      {
        label: "Text Field",
        child: {
          label: "Text Field",
          kind: "element:textField",
          needsName: false,
        },
      },
    );
    setupEditor(
      '<jasperReport>\n  <detail>\n    <band height="20"/>\n  </detail>\n</jasperReport>',
    );

    await addElement(item);

    expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);
    // Verify it used replace (not insert) to expand the self-closing tag
    const editArg = (vscode.workspace.applyEdit as ReturnType<typeof vi.fn>)
      .mock.calls[0][0];
    const entries = editArg.entries();
    expect(entries.length).toBe(1);
    const [, edits] = entries[0];
    // Should be a replace operation (expanding />)
    expect(edits[0].newText).toContain("</band>");
    expect(edits[0].newText).toContain(">");
  });

  it("shows QuickPick for group (groupHeader/groupFooter)", async () => {
    const groupNode = makeNode({
      tag: "group",
      position: { startLine: 3, startColumn: 1, endLine: 5, endColumn: 10 },
    });
    const item = new OutlineItem("myGroup", "group", groupNode, []);

    (vscode.window.showQuickPick as ReturnType<typeof vi.fn>).mockResolvedValue(
      {
        label: "Group Header",
        child: { label: "Group Header", kind: "groupHeader", needsName: false },
      },
    );
    setupEditor(
      '<jasperReport>\n  <group name="myGroup">\n  </group>\n</jasperReport>',
    );

    await addElement(item);

    expect(vscode.window.showQuickPick).toHaveBeenCalledTimes(1);
    expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);
  });

  it("does nothing when user cancels QuickPick", async () => {
    const bandNode = makeNode({
      tag: "band",
      position: { startLine: 3, startColumn: 1, endLine: 4, endColumn: 10 },
    });
    const item = new OutlineItem("Band", "band", bandNode, []);

    (vscode.window.showQuickPick as ReturnType<typeof vi.fn>).mockResolvedValue(
      undefined,
    );
    setupEditor("<jasperReport>\n</jasperReport>");

    await addElement(item);

    expect(vscode.workspace.applyEdit).not.toHaveBeenCalled();
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

  it("does nothing when no active editor", async () => {
    const node = makeNode();
    const item = new OutlineItem("testField", "field", node, [], "String");

    (vscode.window as { activeTextEditor: undefined }).activeTextEditor =
      undefined;

    await deleteElement(item);

    expect(vscode.window.showWarningMessage).not.toHaveBeenCalled();
  });
});

describe("addElement — additional scenarios", () => {
  it("inserts sort field with name prompt", async () => {
    const item = makeGroupItem("group-sortFields");
    (vscode.window.showInputBox as ReturnType<typeof vi.fn>).mockResolvedValue(
      "city",
    );
    setupEditor("<jasperReport>\n</jasperReport>");

    await addElement(item);

    expect(vscode.window.showInputBox).toHaveBeenCalledTimes(1);
    expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);
  });

  it("inserts parameter with name prompt", async () => {
    const item = makeGroupItem("group-parameters");
    (vscode.window.showInputBox as ReturnType<typeof vi.fn>).mockResolvedValue(
      "myParam",
    );
    setupEditor("<jasperReport>\n</jasperReport>");

    await addElement(item);

    expect(vscode.window.showInputBox).toHaveBeenCalledTimes(1);
    expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);
  });

  it("inserts variable with name prompt", async () => {
    const item = makeGroupItem("group-variables");
    (vscode.window.showInputBox as ReturnType<typeof vi.fn>).mockResolvedValue(
      "myVar",
    );
    setupEditor("<jasperReport>\n</jasperReport>");

    await addElement(item);

    expect(vscode.window.showInputBox).toHaveBeenCalledTimes(1);
    expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);
  });

  it("inserts group with name prompt", async () => {
    const item = makeGroupItem("group-groups");
    (vscode.window.showInputBox as ReturnType<typeof vi.fn>).mockResolvedValue(
      "CityGroup",
    );
    setupEditor("<jasperReport>\n</jasperReport>");

    await addElement(item);

    expect(vscode.window.showInputBox).toHaveBeenCalledTimes(1);
    expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);
  });
});

describe("addElement — template and edge coverage", () => {
  it("invokes validateInput callback", async () => {
    const item = makeGroupItem("group-fields");
    (vscode.window.showInputBox as ReturnType<typeof vi.fn>).mockImplementation(
      async (opts: { validateInput?: (v: string) => string | null }) => {
        // Exercise the validateInput callback
        if (opts.validateInput) {
          expect(opts.validateInput("")).toBe("Name is required");
          expect(opts.validateInput("  ")).toBe("Name is required");
          expect(opts.validateInput("validName")).toBeNull();
        }
        return "validName";
      },
    );
    setupEditor("<jasperReport>\n</jasperReport>");

    await addElement(item);

    expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);
  });

  it("inserts groupHeader template", async () => {
    const groupNode = makeNode({
      tag: "group",
      position: { startLine: 2, startColumn: 1, endLine: 3, endColumn: 10 },
    });
    const item = new OutlineItem("myGroup", "group", groupNode, []);

    (vscode.window.showQuickPick as ReturnType<typeof vi.fn>).mockResolvedValue(
      {
        label: "Group Footer",
        child: { label: "Group Footer", kind: "groupFooter", needsName: false },
      },
    );
    setupEditor(
      '<jasperReport>\n  <group name="myGroup">\n  </group>\n</jasperReport>',
    );

    await addElement(item);

    const editArg = (vscode.workspace.applyEdit as ReturnType<typeof vi.fn>)
      .mock.calls[0][0];
    const entries = editArg.entries();
    const [, edits] = entries[0];
    expect(edits[0].newText).toContain("groupFooter");
  });

  it("inserts staticText element via band QuickPick", async () => {
    const bandNode = makeNode({
      tag: "band",
      position: { startLine: 3, startColumn: 1, endLine: 4, endColumn: 10 },
    });
    const item = new OutlineItem("Band", "band", bandNode, []);

    (vscode.window.showQuickPick as ReturnType<typeof vi.fn>).mockResolvedValue(
      {
        label: "Static Text",
        child: {
          label: "Static Text",
          kind: "element:staticText",
          needsName: false,
        },
      },
    );
    setupEditor(
      '<jasperReport>\n  <detail>\n    <band height="20">\n    </band>\n  </detail>\n</jasperReport>',
    );

    await addElement(item);

    expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);
  });

  it("inserts image element via band QuickPick", async () => {
    const bandNode = makeNode({
      tag: "band",
      position: { startLine: 3, startColumn: 1, endLine: 4, endColumn: 10 },
    });
    const item = new OutlineItem("Band", "band", bandNode, []);

    (vscode.window.showQuickPick as ReturnType<typeof vi.fn>).mockResolvedValue(
      {
        label: "Image",
        child: { label: "Image", kind: "element:image", needsName: false },
      },
    );
    setupEditor(
      '<jasperReport>\n  <detail>\n    <band height="20">\n    </band>\n  </detail>\n</jasperReport>',
    );

    await addElement(item);

    expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);
  });

  it("inserts line element via band QuickPick", async () => {
    const bandNode = makeNode({
      tag: "band",
      position: { startLine: 3, startColumn: 1, endLine: 4, endColumn: 10 },
    });
    const item = new OutlineItem("Band", "band", bandNode, []);

    (vscode.window.showQuickPick as ReturnType<typeof vi.fn>).mockResolvedValue(
      {
        label: "Line",
        child: { label: "Line", kind: "element:line", needsName: false },
      },
    );
    setupEditor(
      '<jasperReport>\n  <detail>\n    <band height="20">\n    </band>\n  </detail>\n</jasperReport>',
    );

    await addElement(item);

    expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);
  });

  it("inserts rectangle element via band QuickPick", async () => {
    const bandNode = makeNode({
      tag: "band",
      position: { startLine: 3, startColumn: 1, endLine: 4, endColumn: 10 },
    });
    const item = new OutlineItem("Band", "band", bandNode, []);

    (vscode.window.showQuickPick as ReturnType<typeof vi.fn>).mockResolvedValue(
      {
        label: "Rectangle",
        child: {
          label: "Rectangle",
          kind: "element:rectangle",
          needsName: false,
        },
      },
    );
    setupEditor(
      '<jasperReport>\n  <detail>\n    <band height="20">\n    </band>\n  </detail>\n</jasperReport>',
    );

    await addElement(item);

    expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);
  });

  it("inserts ellipse element via band QuickPick", async () => {
    const bandNode = makeNode({
      tag: "band",
      position: { startLine: 3, startColumn: 1, endLine: 4, endColumn: 10 },
    });
    const item = new OutlineItem("Band", "band", bandNode, []);

    (vscode.window.showQuickPick as ReturnType<typeof vi.fn>).mockResolvedValue(
      {
        label: "Ellipse",
        child: {
          label: "Ellipse",
          kind: "element:ellipse",
          needsName: false,
        },
      },
    );
    setupEditor(
      '<jasperReport>\n  <detail>\n    <band height="20">\n    </band>\n  </detail>\n</jasperReport>',
    );

    await addElement(item);

    expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);
  });

  it("inserts frame element via band QuickPick", async () => {
    const bandNode = makeNode({
      tag: "band",
      position: { startLine: 3, startColumn: 1, endLine: 4, endColumn: 10 },
    });
    const item = new OutlineItem("Band", "band", bandNode, []);

    (vscode.window.showQuickPick as ReturnType<typeof vi.fn>).mockResolvedValue(
      {
        label: "Frame",
        child: { label: "Frame", kind: "element:frame", needsName: false },
      },
    );
    setupEditor(
      '<jasperReport>\n  <detail>\n    <band height="20">\n    </band>\n  </detail>\n</jasperReport>',
    );

    await addElement(item);

    expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);
  });

  it("getInsertPosition falls back to line 1 for virtual group with no children", async () => {
    const item = makeGroupItem("group-fields");
    (vscode.window.showInputBox as ReturnType<typeof vi.fn>).mockResolvedValue(
      "newField",
    );
    setupEditor("<jasperReport>\n</jasperReport>");

    await addElement(item);

    expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);
    const editArg = (vscode.workspace.applyEdit as ReturnType<typeof vi.fn>)
      .mock.calls[0][0];
    const entries = editArg.entries();
    const [, edits] = entries[0];
    // Insert position should be line 1 (fallback)
    expect(edits[0].range).toBeUndefined(); // insert, not replace
  });

  it("isSelfClosing returns false for out-of-bounds line", async () => {
    const bandNode = makeNode({
      tag: "band",
      position: { startLine: 0, startColumn: 1, endLine: 0, endColumn: 10 },
    });
    const item = new OutlineItem("Band", "band", bandNode, []);

    (vscode.window.showQuickPick as ReturnType<typeof vi.fn>).mockResolvedValue(
      {
        label: "Text Field",
        child: {
          label: "Text Field",
          kind: "element:textField",
          needsName: false,
        },
      },
    );
    setupEditor("<jasperReport>\n</jasperReport>");

    await addElement(item);

    // Should fall through to regular insert (isSelfClosing returns false)
    expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);
  });

  it("getInsertPosition uses fallback for virtual group with positioned children", async () => {
    const childNode = makeNode({
      position: { startLine: 2, startColumn: 1, endLine: 2, endColumn: 40 },
    });
    const childItem = new OutlineItem("existingField", "field", childNode, []);
    // Virtual group (no node) with children that have positions
    const item = makeGroupItem("group-fields", [childItem]);

    (vscode.window.showInputBox as ReturnType<typeof vi.fn>).mockResolvedValue(
      "anotherField",
    );
    setupEditor(
      '<jasperReport>\n  <field name="existingField"/>\n</jasperReport>',
    );

    await addElement(item);

    expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);
  });

  it("getInsertPosition returns undefined for single-line document with virtual group", async () => {
    const item = makeGroupItem("group-fields");
    (vscode.window.showInputBox as ReturnType<typeof vi.fn>).mockResolvedValue(
      "newField",
    );
    setupEditor("<jasperReport/>");

    await addElement(item);

    // getInsertPosition returns undefined → addElement returns early
    expect(vscode.workspace.applyEdit).not.toHaveBeenCalled();
  });
});
