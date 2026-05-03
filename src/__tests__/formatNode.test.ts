import { describe, it, expect } from "vitest";
import { formatNodeProperties } from "../properties/formatNode";
import { JrxmlNode } from "../jrxml-parser";

function makeNode(overrides: Partial<JrxmlNode> = {}): JrxmlNode {
  return {
    tag: "element",
    attributes: {},
    children: [],
    position: { startLine: 1, startColumn: 1, endLine: 1, endColumn: 10 },
    ...overrides,
  };
}

describe("formatNodeProperties", () => {
  it("returns empty array for node with no attributes or children", () => {
    const node = makeNode();
    expect(formatNodeProperties(node)).toEqual([]);
  });

  it("returns Attributes group for node attributes", () => {
    const node = makeNode({
      attributes: { x: "10", y: "20", width: "100", height: "50" },
    });
    const groups = formatNodeProperties(node);
    expect(groups[0].label).toBe("Attributes");
    expect(groups[0].entries).toEqual([
      { name: "x", value: "10", editable: true, attributePosition: undefined },
      { name: "y", value: "20", editable: true, attributePosition: undefined },
      {
        name: "width",
        value: "100",
        editable: true,
        attributePosition: undefined,
      },
      {
        name: "height",
        value: "50",
        editable: true,
        attributePosition: undefined,
      },
    ]);
  });

  it("returns Expressions group for expression children with text", () => {
    const node = makeNode({
      children: [
        makeNode({
          tag: "textFieldExpression",
          text: "$F{name}",
        }),
      ],
    });
    const groups = formatNodeProperties(node);
    const exprGroup = groups.find((g) => g.label === "Expressions");
    expect(exprGroup).toBeDefined();
    expect(exprGroup!.entries).toEqual([
      { name: "textFieldExpression", value: "$F{name}" },
    ]);
  });

  it("skips expression children with no text content", () => {
    const node = makeNode({
      children: [
        makeNode({ tag: "textFieldExpression", text: "" }),
        makeNode({ tag: "textFieldExpression" }),
      ],
    });
    const groups = formatNodeProperties(node);
    const exprGroup = groups.find((g) => g.label === "Expressions");
    expect(exprGroup).toBeUndefined();
  });

  it("returns Style group when style attribute present", () => {
    const node = makeNode({
      attributes: { style: "Bold", width: "100" },
    });
    const groups = formatNodeProperties(node);
    const styleGroup = groups.find((g) => g.label === "Style");
    expect(styleGroup).toBeDefined();
    expect(styleGroup!.entries).toEqual([{ name: "style", value: "Bold" }]);
  });

  it("returns Box group with pen properties", () => {
    const node = makeNode({
      children: [
        makeNode({
          tag: "box",
          attributes: { padding: "2" },
          children: [
            makeNode({
              tag: "topPen",
              attributes: { lineWidth: "1.0", lineColor: "#000000" },
            }),
          ],
        }),
      ],
    });
    const groups = formatNodeProperties(node);
    const boxGroup = groups.find((g) => g.label === "Box");
    expect(boxGroup).toBeDefined();
    expect(boxGroup!.entries).toEqual([
      { name: "padding", value: "2" },
      { name: "top.lineWidth", value: "1.0" },
      { name: "top.lineColor", value: "#000000" },
    ]);
  });

  it("returns Pen group for direct pen child", () => {
    const node = makeNode({
      children: [
        makeNode({
          tag: "pen",
          attributes: { lineWidth: "0.5", lineStyle: "Dashed" },
        }),
      ],
    });
    const groups = formatNodeProperties(node);
    const penGroup = groups.find((g) => g.label === "Pen");
    expect(penGroup).toBeDefined();
    expect(penGroup!.entries).toEqual([
      { name: "lineWidth", value: "0.5" },
      { name: "lineStyle", value: "Dashed" },
    ]);
  });

  it("returns Report Element group for reportElement child", () => {
    const node = makeNode({
      children: [
        makeNode({
          tag: "reportElement",
          attributes: { x: "0", y: "0", width: "200", height: "30" },
        }),
      ],
    });
    const groups = formatNodeProperties(node);
    const reGroup = groups.find((g) => g.label === "Report Element");
    expect(reGroup).toBeDefined();
    expect(reGroup!.entries).toHaveLength(4);
  });

  it("trims whitespace from expression text", () => {
    const node = makeNode({
      children: [
        makeNode({
          tag: "imageExpression",
          text: "  $P{logo}  ",
        }),
      ],
    });
    const groups = formatNodeProperties(node);
    const exprGroup = groups.find((g) => g.label === "Expressions");
    expect(exprGroup!.entries[0].value).toBe("$P{logo}");
  });
});
