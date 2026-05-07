import { describe, it, expect } from "vitest";
import {
  REPORT_ELEMENT_ATTRIBUTES,
  reportElementGroup,
  REPORT_ELEMENT_EXPRESSIONS,
} from "../model/common/reportElement";
import {
  TEXT_ELEMENT_ATTRIBUTES,
  fontGroup,
  textAlignmentGroup,
} from "../model/common/textElement";
import {
  GRAPHIC_ELEMENT_ATTRIBUTES,
  graphicElementGroup,
} from "../model/common/graphicElement";
import { PEN_ATTRIBUTES, penGroup } from "../model/common/pen";
import { BOX_ATTRIBUTES, boxGroup } from "../model/common/box";
import {
  PARAGRAPH_ATTRIBUTES,
  paragraphGroup,
} from "../model/common/paragraph";
import {
  HYPERLINK_ATTRIBUTES,
  hyperlinkGroup,
  HYPERLINK_EXPRESSIONS,
} from "../model/common/hyperlink";

describe("common attribute groups", () => {
  describe("reportElement", () => {
    it("has position and size attributes", () => {
      const names = REPORT_ELEMENT_ATTRIBUTES.map((a) => a.name);
      expect(names).toContain("x");
      expect(names).toContain("y");
      expect(names).toContain("width");
      expect(names).toContain("height");
    });

    it("marks x, y, width, height as required integers", () => {
      for (const attr of REPORT_ELEMENT_ATTRIBUTES) {
        if (["x", "y", "width", "height"].includes(attr.name)) {
          expect(attr.type).toBe("integer");
          expect(attr.required).toBe(true);
        }
      }
    });

    it("has style, mode, colors", () => {
      const names = REPORT_ELEMENT_ATTRIBUTES.map((a) => a.name);
      expect(names).toContain("style");
      expect(names).toContain("mode");
      expect(names).toContain("forecolor");
      expect(names).toContain("backcolor");
    });

    it("has forecolor/backcolor as color type", () => {
      const forecolor = REPORT_ELEMENT_ATTRIBUTES.find(
        (a) => a.name === "forecolor",
      );
      expect(forecolor?.type).toBe("color");
    });

    it("has positioning enums", () => {
      const posType = REPORT_ELEMENT_ATTRIBUTES.find(
        (a) => a.name === "positionType",
      );
      expect(posType?.type).toBe("enum");
      expect(posType?.enumValues).toContain("Float");
    });

    it("group label is 'Report Element'", () => {
      expect(reportElementGroup.label).toBe("Report Element");
      expect(reportElementGroup.attributes.length).toBeGreaterThan(0);
    });

    it("has printWhenExpression and styleExpression", () => {
      const tags = REPORT_ELEMENT_EXPRESSIONS.map((e) => e.tag);
      expect(tags).toContain("printWhenExpression");
      expect(tags).toContain("styleExpression");
    });
  });

  describe("textElement", () => {
    it("has font attributes", () => {
      const names = TEXT_ELEMENT_ATTRIBUTES.map((a) => a.name);
      expect(names).toContain("fontName");
      expect(names).toContain("fontSize");
      expect(names).toContain("bold");
      expect(names).toContain("italic");
    });

    it("has alignment enums", () => {
      const hAlign = TEXT_ELEMENT_ATTRIBUTES.find(
        (a) => a.name === "hTextAlign",
      );
      expect(hAlign?.type).toBe("enum");
      expect(hAlign?.enumValues).toContain("Left");
      expect(hAlign?.enumValues).toContain("Justified");
    });

    it("fontGroup contains only font-related attributes", () => {
      const names = fontGroup.attributes.map((a) => a.name);
      expect(names).toContain("fontName");
      expect(names).toContain("fontSize");
      expect(names).toContain("bold");
      expect(names).not.toContain("hTextAlign");
    });

    it("textAlignmentGroup contains alignment attributes", () => {
      const names = textAlignmentGroup.attributes.map((a) => a.name);
      expect(names).toContain("hTextAlign");
      expect(names).toContain("vTextAlign");
      expect(names).toContain("rotation");
      expect(names).not.toContain("fontName");
    });
  });

  describe("graphicElement", () => {
    it("has fill attribute", () => {
      expect(GRAPHIC_ELEMENT_ATTRIBUTES).toHaveLength(1);
      expect(GRAPHIC_ELEMENT_ATTRIBUTES[0].name).toBe("fill");
      expect(GRAPHIC_ELEMENT_ATTRIBUTES[0].type).toBe("enum");
    });

    it("graphicElementGroup has label", () => {
      expect(graphicElementGroup.label).toBe("Graphic");
    });
  });

  describe("pen", () => {
    it("has lineWidth, lineStyle, lineColor", () => {
      const names = PEN_ATTRIBUTES.map((a) => a.name);
      expect(names).toEqual(["lineWidth", "lineStyle", "lineColor"]);
    });

    it("lineWidth is decimal", () => {
      expect(PEN_ATTRIBUTES.find((a) => a.name === "lineWidth")?.type).toBe(
        "decimal",
      );
    });

    it("lineColor is color", () => {
      expect(PEN_ATTRIBUTES.find((a) => a.name === "lineColor")?.type).toBe(
        "color",
      );
    });

    it("penGroup has label 'Pen'", () => {
      expect(penGroup.label).toBe("Pen");
    });
  });

  describe("box", () => {
    it("has padding attributes", () => {
      const names = BOX_ATTRIBUTES.map((a) => a.name);
      expect(names).toContain("padding");
      expect(names).toContain("topPadding");
      expect(names).toContain("leftPadding");
      expect(names).toContain("bottomPadding");
      expect(names).toContain("rightPadding");
    });

    it("has pen attributes for all sides", () => {
      const names = BOX_ATTRIBUTES.map((a) => a.name);
      expect(names).toContain("pen.lineWidth");
      expect(names).toContain("topPen.lineWidth");
      expect(names).toContain("leftPen.lineStyle");
      expect(names).toContain("bottomPen.lineColor");
      expect(names).toContain("rightPen.lineWidth");
    });

    it("box pen attributes have correct types", () => {
      const topWidth = BOX_ATTRIBUTES.find(
        (a) => a.name === "topPen.lineWidth",
      );
      expect(topWidth?.type).toBe("decimal");
      const leftColor = BOX_ATTRIBUTES.find(
        (a) => a.name === "leftPen.lineColor",
      );
      expect(leftColor?.type).toBe("color");
    });

    it("boxGroup has label 'Box'", () => {
      expect(boxGroup.label).toBe("Box");
    });

    it("has 20 attributes total (5 padding + 3 pen + 4×3 side pens)", () => {
      expect(BOX_ATTRIBUTES).toHaveLength(20);
    });
  });

  describe("paragraph", () => {
    it("has spacing and indent attributes", () => {
      const names = PARAGRAPH_ATTRIBUTES.map((a) => a.name);
      expect(names).toContain("lineSpacing");
      expect(names).toContain("lineSpacingSize");
      expect(names).toContain("leftIndent");
      expect(names).toContain("firstLineIndent");
      expect(names).toContain("rightIndent");
      expect(names).toContain("spacingBefore");
      expect(names).toContain("spacingAfter");
      expect(names).toContain("tabStopWidth");
    });

    it("lineSpacing is an enum", () => {
      const ls = PARAGRAPH_ATTRIBUTES.find((a) => a.name === "lineSpacing");
      expect(ls?.type).toBe("enum");
      expect(ls?.enumValues).toContain("Single");
      expect(ls?.enumValues).toContain("Double");
    });

    it("paragraphGroup has label", () => {
      expect(paragraphGroup.label).toBe("Paragraph");
    });
  });

  describe("hyperlink", () => {
    it("has linkType and linkTarget", () => {
      const names = HYPERLINK_ATTRIBUTES.map((a) => a.name);
      expect(names).toEqual(["linkType", "linkTarget"]);
    });

    it("linkType has enum values", () => {
      const lt = HYPERLINK_ATTRIBUTES.find((a) => a.name === "linkType");
      expect(lt?.type).toBe("enum");
      expect(lt?.enumValues).toContain("Reference");
      expect(lt?.enumValues).toContain("Custom");
    });

    it("has 4 hyperlink expressions", () => {
      expect(HYPERLINK_EXPRESSIONS).toHaveLength(4);
      const tags = HYPERLINK_EXPRESSIONS.map((e) => e.tag);
      expect(tags).toContain("hyperlinkReferenceExpression");
      expect(tags).toContain("hyperlinkTooltipExpression");
    });

    it("hyperlinkGroup has label", () => {
      expect(hyperlinkGroup.label).toBe("Hyperlink");
    });
  });
});
