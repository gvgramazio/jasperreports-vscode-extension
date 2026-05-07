import { describe, it, expect, vi, beforeEach } from "vitest";
import * as vscode from "vscode";
import {
  addElement,
  deleteElement,
  duplicateElement,
} from "../outline-actions";
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

  it("getInsertPosition inserts empty group after preceding sibling using canonical order", async () => {
    const item = makeGroupItem("group-fields");
    (vscode.window.showInputBox as ReturnType<typeof vi.fn>).mockResolvedValue(
      "newField",
    );
    setupEditor(
      '<jasperReport>\n  <parameter name="p1" class="java.lang.String"/>\n</jasperReport>',
    );

    await addElement(item);

    expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);
    const editArg = (vscode.workspace.applyEdit as ReturnType<typeof vi.fn>)
      .mock.calls[0][0];
    const entries = editArg.entries();
    const [, edits] = entries[0];
    // Should insert after the parameter (line 2 in 1-based = endLine of parameter)
    expect(edits[0].position).toBeDefined();
    expect(edits[0].position!.line).toBe(2);
  });

  it("getInsertPosition inserts empty group before following sibling when no preceding exists", async () => {
    const item = makeGroupItem("group-styles");
    (vscode.window.showInputBox as ReturnType<typeof vi.fn>).mockResolvedValue(
      "myStyle",
    );
    setupEditor(
      '<jasperReport>\n  <field name="f1" class="java.lang.String"/>\n</jasperReport>',
    );

    await addElement(item);

    expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);
    const editArg = (vscode.workspace.applyEdit as ReturnType<typeof vi.fn>)
      .mock.calls[0][0];
    const entries = editArg.entries();
    const [, edits] = entries[0];
    // Should insert before the field (field starts at line 2, so insert at line 1 = startLine - 1)
    expect(edits[0].position).toBeDefined();
    expect(edits[0].position!.line).toBe(1);
  });

  it("getInsertPosition falls back to after root open tag for empty doc", async () => {
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
    // Root starts at line 1, so insert at line 1 (after root open tag)
    expect(edits[0].position).toBeDefined();
    expect(edits[0].position!.line).toBe(1);
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

  it("inserts break element via band QuickPick", async () => {
    const bandNode = makeNode({
      tag: "band",
      position: { startLine: 3, startColumn: 1, endLine: 4, endColumn: 10 },
    });
    const item = new OutlineItem("Band", "band", bandNode, []);

    (vscode.window.showQuickPick as ReturnType<typeof vi.fn>).mockResolvedValue(
      {
        label: "Break",
        child: { label: "Break", kind: "element:break", needsName: false },
      },
    );
    setupEditor(
      '<jasperReport>\n  <detail>\n    <band height="20">\n    </band>\n  </detail>\n</jasperReport>',
    );

    await addElement(item);

    expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);
    const editArg = (vscode.workspace.applyEdit as ReturnType<typeof vi.fn>)
      .mock.calls[0][0];
    const entries = editArg.entries();
    const [, edits] = entries[0];
    expect(edits[0].newText).toContain('kind="break"');
  });

  it("inserts elementGroup element via band QuickPick", async () => {
    const bandNode = makeNode({
      tag: "band",
      position: { startLine: 3, startColumn: 1, endLine: 4, endColumn: 10 },
    });
    const item = new OutlineItem("Band", "band", bandNode, []);

    (vscode.window.showQuickPick as ReturnType<typeof vi.fn>).mockResolvedValue(
      {
        label: "Element Group",
        child: {
          label: "Element Group",
          kind: "element:elementGroup",
          needsName: false,
        },
      },
    );
    setupEditor(
      '<jasperReport>\n  <detail>\n    <band height="20">\n    </band>\n  </detail>\n</jasperReport>',
    );

    await addElement(item);

    expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);
    const editArg = (vscode.workspace.applyEdit as ReturnType<typeof vi.fn>)
      .mock.calls[0][0];
    const entries = editArg.entries();
    const [, edits] = entries[0];
    expect(edits[0].newText).toContain('kind="elementGroup"');
  });

  it("getInsertPosition fallback when last child has no position", async () => {
    const firstChild = new OutlineItem(
      "field1",
      "field",
      makeNode({
        position: { startLine: 2, startColumn: 1, endLine: 2, endColumn: 40 },
      }),
      [],
    );
    const lastChild = new OutlineItem("field2", "field", null, []);
    const item = makeGroupItem("group-fields", [firstChild, lastChild]);

    (vscode.window.showInputBox as ReturnType<typeof vi.fn>).mockResolvedValue(
      "newField",
    );
    setupEditor('<jasperReport>\n  <field name="field1"/>\n</jasperReport>');

    await addElement(item);

    // Falls through to last-resort insert at line 1
    expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);
  });
});

describe("duplicateElement", () => {
  it("does nothing when item has no node", async () => {
    const item = new OutlineItem("Fields", "group-fields" as never, null, []);
    setupEditor("<jasperReport/>");

    await duplicateElement(item);

    expect(vscode.workspace.applyEdit).not.toHaveBeenCalled();
  });

  it("does nothing when no active editor", async () => {
    const node = makeNode({
      tag: "field",
      attributes: { name: "f1" },
      position: { startLine: 2, startColumn: 1, endLine: 2, endColumn: 40 },
    });
    const item = new OutlineItem("f1", "field", node, []);

    await duplicateElement(item);

    expect(vscode.workspace.applyEdit).not.toHaveBeenCalled();
  });

  it("duplicates a named field with _copy suffix", async () => {
    const node = makeNode({
      tag: "field",
      attributes: { name: "myField", class: "java.lang.String" },
      position: { startLine: 2, startColumn: 1, endLine: 2, endColumn: 50 },
    });
    const item = new OutlineItem("myField", "field", node, [], "String");
    setupEditor(
      '<jasperReport>\n  <field name="myField" class="java.lang.String"/>\n</jasperReport>',
    );

    await duplicateElement(item);

    expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);
    const editArg = (vscode.workspace.applyEdit as ReturnType<typeof vi.fn>)
      .mock.calls[0][0];
    const entries = editArg.entries();
    const [, edits] = entries[0];
    expect(edits[0].newText).toContain('name="myField_copy"');
    expect(edits[0].position).toBeDefined();
    expect(edits[0].position!.line).toBe(2);
  });

  it("replaces uuid with a new value", async () => {
    const node = makeNode({
      tag: "element",
      attributes: {
        kind: "textField",
        uuid: "aaaa-bbbb-cccc",
        x: "0",
        y: "0",
      },
      position: { startLine: 4, startColumn: 1, endLine: 4, endColumn: 80 },
    });
    const item = new OutlineItem("textField", "element", node, []);
    setupEditor(
      '<jasperReport>\n  <detail>\n    <band>\n      <element kind="textField" uuid="aaaa-bbbb-cccc" x="0" y="0"/>\n    </band>\n  </detail>\n</jasperReport>',
    );

    await duplicateElement(item);

    expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);
    const editArg = (vscode.workspace.applyEdit as ReturnType<typeof vi.fn>)
      .mock.calls[0][0];
    const entries = editArg.entries();
    const [, edits] = entries[0];
    // UUID should be replaced (not the original)
    expect(edits[0].newText).not.toContain('uuid="aaaa-bbbb-cccc"');
    expect(edits[0].newText).toMatch(/uuid="[0-9a-f-]+"/);
  });

  it("does not add _copy suffix for non-named kinds", async () => {
    const node = makeNode({
      tag: "element",
      attributes: { kind: "line", x: "0", y: "0" },
      position: { startLine: 4, startColumn: 1, endLine: 4, endColumn: 60 },
    });
    const item = new OutlineItem("line", "element", node, []);
    setupEditor(
      '<jasperReport>\n  <detail>\n    <band>\n      <element kind="line" x="0" y="0"/>\n    </band>\n  </detail>\n</jasperReport>',
    );

    await duplicateElement(item);

    expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);
    const editArg = (vscode.workspace.applyEdit as ReturnType<typeof vi.fn>)
      .mock.calls[0][0];
    const entries = editArg.entries();
    const [, edits] = entries[0];
    expect(edits[0].newText).not.toContain("_copy");
  });
});
