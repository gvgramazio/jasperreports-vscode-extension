import { describe, it, expect, vi, beforeEach } from "vitest";
import * as vscode from "vscode";
import { OutlineDragAndDropController } from "../outline-dnd";
import { OutlineItem } from "../outline";
import { JrxmlNode } from "../jrxml-parser";

function makeNode(overrides: Partial<JrxmlNode> = {}): JrxmlNode {
  return {
    tag: "field",
    attributes: { name: "testField" },
    children: [],
    position: { startLine: 3, startColumn: 1, endLine: 3, endColumn: 50 },
    ...overrides,
  };
}

function makeItem(
  label: string,
  kind: string,
  node: JrxmlNode | null,
  parent?: OutlineItem,
): OutlineItem {
  const item = new OutlineItem(label, kind as never, node, []);
  if (parent) {
    item.parent = parent;
  }
  return item;
}

describe("OutlineDragAndDropController", () => {
  let controller: OutlineDragAndDropController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new OutlineDragAndDropController();
  });

  describe("handleDrag", () => {
    it("adds draggable item to data transfer", () => {
      const node = makeNode();
      const item = makeItem("myField", "field", node);
      const transfer = new vscode.DataTransfer();
      const token = { isCancellationRequested: false } as never;

      controller.handleDrag([item], transfer, token);

      const result = transfer.get(
        "application/vnd.code.tree.jasperreports-outline",
      );
      expect(result).toBeDefined();
      expect(result!.value).toBe("field");
    });

    it("does not add non-draggable kinds to data transfer", () => {
      const item = makeItem("Properties", "group-properties", null);
      const transfer = new vscode.DataTransfer();
      const token = { isCancellationRequested: false } as never;

      controller.handleDrag([item], transfer, token);

      const result = transfer.get(
        "application/vnd.code.tree.jasperreports-outline",
      );
      expect(result).toBeUndefined();
    });

    it("does not add property items to data transfer", () => {
      const item = makeItem("pageWidth", "property", null);
      const transfer = new vscode.DataTransfer();
      const token = { isCancellationRequested: false } as never;

      controller.handleDrag([item], transfer, token);

      const result = transfer.get(
        "application/vnd.code.tree.jasperreports-outline",
      );
      expect(result).toBeUndefined();
    });

    it("does not add section items to data transfer", () => {
      const node = makeNode({ tag: "title" });
      const item = makeItem("Title", "section", node);
      const transfer = new vscode.DataTransfer();
      const token = { isCancellationRequested: false } as never;

      controller.handleDrag([item], transfer, token);

      const result = transfer.get(
        "application/vnd.code.tree.jasperreports-outline",
      );
      expect(result).toBeUndefined();
    });
  });

  describe("handleDrop", () => {
    const MIME = "application/vnd.code.tree.jasperreports-outline";

    function setupEditor(text: string) {
      const lines = text.split("\n");
      const mockDocument = {
        getText: (range?: vscode.Range) => {
          if (!range) return text;
          const startLine = range.start.line;
          const endLine = range.end.line;
          const selectedLines = lines.slice(startLine, endLine);
          return selectedLines.join("\n") + "\n";
        },
        positionAt: (offset: number) => new vscode.Position(0, offset),
        uri: { fsPath: "/test.jrxml", toString: () => "file:///test.jrxml" },
        lineCount: lines.length,
        lineAt: (line: number) => ({ text: lines[line] || "" }),
      };
      (vscode.window as { activeTextEditor: unknown }).activeTextEditor = {
        document: mockDocument,
      };
    }

    it("rejects drop when target is undefined", async () => {
      const source = makeItem("myField", "field", makeNode());
      const transfer = new vscode.DataTransfer();
      transfer.set(MIME, new vscode.DataTransferItem(source));
      const token = { isCancellationRequested: false } as never;

      await controller.handleDrop(undefined, transfer, token);

      expect(vscode.workspace.applyEdit).not.toHaveBeenCalled();
    });

    it("rejects cross-parent drop", async () => {
      setupEditor('<jasperReport>\n  <field name="a"/>\n</jasperReport>\n');

      const parentA = makeItem("Fields", "group-fields", null);
      const parentB = makeItem("Parameters", "group-parameters", null);

      const source = makeItem(
        "a",
        "field",
        makeNode({
          position: { startLine: 2, startColumn: 1, endLine: 2, endColumn: 20 },
        }),
        parentA,
      );
      const target = makeItem("p", "parameter", makeNode(), parentB);
      target.parent = parentB;

      const transfer = new vscode.DataTransfer();
      transfer.set(MIME, new vscode.DataTransferItem(source));
      const token = { isCancellationRequested: false } as never;

      await controller.handleDrop(target, transfer, token);

      expect(vscode.workspace.applyEdit).not.toHaveBeenCalled();
    });

    it("rejects drop onto self", async () => {
      setupEditor('<jasperReport>\n  <field name="a"/>\n</jasperReport>\n');

      const parent = makeItem("Fields", "group-fields", null);
      const source = makeItem(
        "a",
        "field",
        makeNode({
          position: { startLine: 2, startColumn: 1, endLine: 2, endColumn: 20 },
        }),
        parent,
      );

      const transfer = new vscode.DataTransfer();
      transfer.set(MIME, new vscode.DataTransferItem(source));
      const token = { isCancellationRequested: false } as never;

      await controller.handleDrop(source, transfer, token);

      expect(vscode.workspace.applyEdit).not.toHaveBeenCalled();
    });

    it("applies edit when dropping on a sibling (move before)", async () => {
      const text =
        '<jasperReport>\n  <field name="a"/>\n  <field name="b"/>\n</jasperReport>\n';
      setupEditor(text);

      const parent = new OutlineItem(
        "Fields",
        "group-fields" as never,
        null,
        [],
      );
      const nodeA = makeNode({
        tag: "field",
        attributes: { name: "a" },
        position: { startLine: 2, startColumn: 3, endLine: 2, endColumn: 20 },
      });
      const nodeB = makeNode({
        tag: "field",
        attributes: { name: "b" },
        position: { startLine: 3, startColumn: 3, endLine: 3, endColumn: 20 },
      });

      const itemA = makeItem("a", "field", nodeA, parent);
      const itemB = makeItem("b", "field", nodeB, parent);
      // Manually set children for parent
      (parent as unknown as { children: OutlineItem[] }).children = [
        itemA,
        itemB,
      ];
      itemA.parent = parent;
      itemB.parent = parent;

      // Drag B onto A → B should move before A
      const transfer = new vscode.DataTransfer();
      const token = { isCancellationRequested: false } as never;

      controller.handleDrag([itemB], transfer, token);
      await controller.handleDrop(itemA, transfer, token);

      expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);
    });

    it("applies edit when dropping on parent (move to end)", async () => {
      const text =
        '<jasperReport>\n  <field name="a"/>\n  <field name="b"/>\n</jasperReport>\n';
      setupEditor(text);

      const nodeA = makeNode({
        tag: "field",
        attributes: { name: "a" },
        position: { startLine: 2, startColumn: 3, endLine: 2, endColumn: 20 },
      });
      const nodeB = makeNode({
        tag: "field",
        attributes: { name: "b" },
        position: { startLine: 3, startColumn: 3, endLine: 3, endColumn: 20 },
      });

      const itemA = new OutlineItem("a", "field" as never, nodeA, []);
      const itemB = new OutlineItem("b", "field" as never, nodeB, []);
      const parent = new OutlineItem("Fields", "group-fields" as never, null, [
        itemA,
        itemB,
      ]);

      // Drag A onto parent → A should move to end (after B)
      const transfer = new vscode.DataTransfer();
      const token = { isCancellationRequested: false } as never;

      controller.handleDrag([itemA], transfer, token);
      await controller.handleDrop(parent, transfer, token);

      expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);
    });

    it("returns early when source is already at end (drop on parent)", async () => {
      const text =
        '<jasperReport>\n  <field name="a"/>\n  <field name="b"/>\n</jasperReport>\n';
      setupEditor(text);

      const nodeA = makeNode({
        tag: "field",
        attributes: { name: "a" },
        position: { startLine: 2, startColumn: 3, endLine: 2, endColumn: 20 },
      });
      const nodeB = makeNode({
        tag: "field",
        attributes: { name: "b" },
        position: { startLine: 3, startColumn: 3, endLine: 3, endColumn: 20 },
      });

      const itemA = new OutlineItem("a", "field" as never, nodeA, []);
      const itemB = new OutlineItem("b", "field" as never, nodeB, []);
      const parent = new OutlineItem("Fields", "group-fields" as never, null, [
        itemA,
        itemB,
      ]);

      // Drag B (last sibling) onto parent → already at end → no-op
      const transfer = new vscode.DataTransfer();
      const token = { isCancellationRequested: false } as never;

      controller.handleDrag([itemB], transfer, token);
      await controller.handleDrop(parent, transfer, token);

      expect(vscode.workspace.applyEdit).not.toHaveBeenCalled();
    });

    it("returns early when last sibling has no position (drop on parent)", async () => {
      const text = '<jasperReport>\n  <field name="a"/>\n</jasperReport>\n';
      setupEditor(text);

      const nodeA = makeNode({
        tag: "field",
        attributes: { name: "a" },
        position: { startLine: 2, startColumn: 3, endLine: 2, endColumn: 20 },
      });

      const itemA = new OutlineItem("a", "field" as never, nodeA, []);
      // Last sibling has no node/position
      const itemB = new OutlineItem("b", "field" as never, null, []);
      const parent = new OutlineItem("Fields", "group-fields" as never, null, [
        itemA,
        itemB,
      ]);

      // Drag A onto parent → last sibling (B) has no position → return
      const transfer = new vscode.DataTransfer();
      const token = { isCancellationRequested: false } as never;

      controller.handleDrag([itemA], transfer, token);
      await controller.handleDrop(parent, transfer, token);

      expect(vscode.workspace.applyEdit).not.toHaveBeenCalled();
    });
  });
});
