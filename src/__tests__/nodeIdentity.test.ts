import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as vscode from "vscode";
import {
  NodeIdentityTracker,
  findNodeByIdentity,
} from "../properties/nodeIdentity";
import { makeNode } from "./helpers/makeNode";

describe("NodeIdentityTracker", () => {
  let tracker: NodeIdentityTracker;

  beforeEach(() => {
    tracker = new NodeIdentityTracker();
  });

  afterEach(() => {
    (vscode.window as { activeTextEditor: unknown }).activeTextEditor =
      undefined;
  });

  it("starts with null current", () => {
    expect(tracker.current).toBeNull();
  });

  it("set() stores tag, name, uuid and label", () => {
    const node = makeNode({
      tag: "textField",
      attributes: { name: "field1", uuid: "abc-123" },
    });
    tracker.set(node, "My Field");

    expect(tracker.current).toEqual({
      tag: "textField",
      name: "field1",
      uuid: "abc-123",
      label: "My Field",
    });
  });

  it("set() defaults name and uuid to empty string when missing", () => {
    const node = makeNode({ tag: "band", attributes: {} });
    tracker.set(node, "Band");

    expect(tracker.current).toEqual({
      tag: "band",
      name: "",
      uuid: "",
      label: "Band",
    });
  });

  it("clear() resets current to null", () => {
    tracker.set(makeNode(), "x");
    tracker.clear();
    expect(tracker.current).toBeNull();
  });

  describe("findCurrentNode", () => {
    it("returns null when no identity is set", () => {
      expect(tracker.findCurrentNode()).toBeNull();
    });

    it("returns null when there is no active editor", () => {
      tracker.set(
        makeNode({ tag: "staticText", attributes: { uuid: "u1" } }),
        "st",
      );
      (vscode.window as { activeTextEditor: unknown }).activeTextEditor =
        undefined;

      expect(tracker.findCurrentNode()).toBeNull();
    });

    it("returns null when document has no root element", () => {
      tracker.set(
        makeNode({ tag: "staticText", attributes: { uuid: "u1" } }),
        "st",
      );
      (vscode.window as { activeTextEditor: unknown }).activeTextEditor = {
        document: {
          getText: () => "",
          fileName: "test.jrxml",
        },
      };

      expect(tracker.findCurrentNode()).toBeNull();
    });

    it("finds a node by uuid in the parsed document", () => {
      tracker.set(
        makeNode({ tag: "staticText", attributes: { uuid: "target-uuid" } }),
        "label",
      );

      const jrxml = `<?xml version="1.0"?>
<jasperReport>
  <detail>
    <band>
      <staticText uuid="target-uuid">
        <text><![CDATA[Hello]]></text>
      </staticText>
    </band>
  </detail>
</jasperReport>`;

      (vscode.window as { activeTextEditor: unknown }).activeTextEditor = {
        document: {
          getText: () => jrxml,
          fileName: "test.jrxml",
        },
      };

      const result = tracker.findCurrentNode();
      expect(result).not.toBeNull();
      expect(result!.tag).toBe("staticText");
      expect(result!.attributes["uuid"]).toBe("target-uuid");
    });
  });
});

describe("findNodeByIdentity", () => {
  it("finds node by uuid", () => {
    const target = makeNode({
      tag: "textField",
      attributes: { uuid: "u1", name: "f1" },
    });
    const root = makeNode({
      tag: "jasperReport",
      children: [makeNode({ tag: "detail", children: [target] })],
    });

    const result = findNodeByIdentity(root, {
      tag: "textField",
      name: "f1",
      uuid: "u1",
      label: "Field",
    });
    expect(result).toBe(target);
  });

  it("finds node by tag+name when uuid is empty", () => {
    const target = makeNode({
      tag: "parameter",
      attributes: { name: "myParam" },
    });
    const root = makeNode({
      tag: "jasperReport",
      children: [target],
    });

    const result = findNodeByIdentity(root, {
      tag: "parameter",
      name: "myParam",
      uuid: "",
      label: "Parameter",
    });
    expect(result).toBe(target);
  });

  it("returns null when no match is found", () => {
    const root = makeNode({
      tag: "jasperReport",
      children: [makeNode({ tag: "detail" })],
    });

    const result = findNodeByIdentity(root, {
      tag: "staticText",
      name: "",
      uuid: "nonexistent",
      label: "Missing",
    });
    expect(result).toBeNull();
  });

  it("prefers uuid match over tag+name match", () => {
    const byName = makeNode({
      tag: "field",
      attributes: { name: "f1", uuid: "other" },
    });
    const byUuid = makeNode({
      tag: "band",
      attributes: { name: "x", uuid: "target" },
    });
    const root = makeNode({
      tag: "jasperReport",
      children: [byName, byUuid],
    });

    const result = findNodeByIdentity(root, {
      tag: "field",
      name: "f1",
      uuid: "target",
      label: "Field",
    });
    expect(result).toBe(byUuid);
  });

  it("matches root node itself", () => {
    const root = makeNode({
      tag: "jasperReport",
      attributes: { uuid: "root-id" },
    });

    const result = findNodeByIdentity(root, {
      tag: "jasperReport",
      name: "",
      uuid: "root-id",
      label: "Report",
    });
    expect(result).toBe(root);
  });
});
