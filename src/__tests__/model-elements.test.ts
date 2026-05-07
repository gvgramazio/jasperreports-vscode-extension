import { describe, it, expect, beforeEach } from "vitest";
import {
  clearRegistry,
  getElementDef,
  getRegistrySize,
} from "../model/registry";
import {
  parameterDef,
  fieldDef,
  variableDef,
  sortFieldDef,
  bandDef,
  groupDef,
  styleDef,
  datasetDef,
  lineDef,
  rectangleDef,
  ellipseDef,
  breakDef,
  elementGroupDef,
  staticTextDef,
  textFieldDef,
  imageDef,
  frameDef,
  subreportDef,
  chartDef,
  crosstabDef,
  componentDef,
  genericElementDef,
  jasperReportDef,
} from "../model/elements";

// Re-register after clearing (importing elements already registered them,
// but clearRegistry in other test files may remove them).
function ensureRegistered() {
  // Elements self-register on import. If cleared, re-register:
  if (getRegistrySize() === 0) {
    // Force re-import by re-registering all defs
    const { registerElement } = require("../model/registry");
    [
      parameterDef,
      fieldDef,
      variableDef,
      sortFieldDef,
      bandDef,
      groupDef,
      styleDef,
      datasetDef,
      lineDef,
      rectangleDef,
      ellipseDef,
      breakDef,
      elementGroupDef,
      staticTextDef,
      textFieldDef,
      imageDef,
      frameDef,
      subreportDef,
      chartDef,
      crosstabDef,
      componentDef,
      genericElementDef,
      jasperReportDef,
    ].forEach((def) => registerElement(def));
  }
}

describe("element definitions", () => {
  beforeEach(() => {
    ensureRegistered();
  });

  // =============================================
  // Step 5: Simple data elements
  // =============================================

  describe("parameter", () => {
    it("has correct tag and label", () => {
      expect(parameterDef.tag).toBe("parameter");
      expect(parameterDef.label).toBe("Parameter");
      expect(parameterDef.kind).toBeUndefined();
    });

    it("requires name attribute", () => {
      const attrs = parameterDef.attributeGroups[0].attributes;
      const name = attrs.find((a) => a.name === "name");
      expect(name?.required).toBe(true);
    });

    it("has class with default java.lang.String", () => {
      const attrs = parameterDef.attributeGroups[0].attributes;
      const cls = attrs.find((a) => a.name === "class");
      expect(cls?.type).toBe("string");
      expect(cls?.defaultValue).toBe("java.lang.String");
    });

    it("has evaluationTime enum", () => {
      const attrs = parameterDef.attributeGroups[0].attributes;
      const evalTime = attrs.find((a) => a.name === "evaluationTime");
      expect(evalTime?.type).toBe("enum");
      expect(evalTime?.enumValues).toContain("Early");
      expect(evalTime?.enumValues).toContain("Late");
    });

    it("has defaultValueExpression", () => {
      expect(parameterDef.expressions).toHaveLength(1);
      expect(parameterDef.expressions[0].tag).toBe("defaultValueExpression");
    });

    it("is registered and retrievable", () => {
      expect(getElementDef("parameter")).toBe(parameterDef);
    });
  });

  describe("field", () => {
    it("has name and class attributes", () => {
      const attrs = fieldDef.attributeGroups[0].attributes;
      expect(attrs).toHaveLength(2);
      expect(attrs[0].name).toBe("name");
      expect(attrs[0].required).toBe(true);
      expect(attrs[1].name).toBe("class");
    });

    it("has no expressions", () => {
      expect(fieldDef.expressions).toHaveLength(0);
    });

    it("allows property, propertyExpression, description children", () => {
      const tags = fieldDef.children.map((c) => c.tag);
      expect(tags).toEqual(["property", "propertyExpression", "description"]);
    });
  });

  describe("variable", () => {
    it("has 8 attributes", () => {
      const attrs = variableDef.attributeGroups[0].attributes;
      expect(attrs).toHaveLength(8);
    });

    it("has calculation, resetType, incrementType enums", () => {
      const attrs = variableDef.attributeGroups[0].attributes;
      const calc = attrs.find((a) => a.name === "calculation");
      expect(calc?.enumValues).toContain("Sum");
      expect(calc?.enumValues).toContain("DistinctCount");

      const reset = attrs.find((a) => a.name === "resetType");
      expect(reset?.enumValues).toContain("Group");

      const incr = attrs.find((a) => a.name === "incrementType");
      expect(incr?.enumValues).toContain("None");
    });

    it("has expression and initialValueExpression", () => {
      const tags = variableDef.expressions.map((e) => e.tag);
      expect(tags).toEqual(["expression", "initialValueExpression"]);
    });
  });

  describe("sortField", () => {
    it("has 3 attributes", () => {
      const attrs = sortFieldDef.attributeGroups[0].attributes;
      expect(attrs).toHaveLength(3);
      expect(attrs[0].name).toBe("name");
      expect(attrs[1].name).toBe("order");
      expect(attrs[2].name).toBe("type");
    });

    it("has no expressions or children", () => {
      expect(sortFieldDef.expressions).toHaveLength(0);
      expect(sortFieldDef.children).toHaveLength(0);
    });
  });

  // =============================================
  // Step 6: Structural elements
  // =============================================

  describe("band", () => {
    it("has height and splitType", () => {
      const attrs = bandDef.attributeGroups[0].attributes;
      expect(attrs[0].name).toBe("height");
      expect(attrs[0].type).toBe("integer");
      expect(attrs[1].name).toBe("splitType");
      expect(attrs[1].enumValues).toContain("Stretch");
    });

    it("has printWhenExpression", () => {
      expect(bandDef.expressions[0].tag).toBe("printWhenExpression");
    });

    it("allows element children", () => {
      const tags = bandDef.children.map((c) => c.tag);
      expect(tags).toContain("element");
    });
  });

  describe("group", () => {
    it("has name as required", () => {
      const attrs = groupDef.attributeGroups[0].attributes;
      expect(attrs[0].name).toBe("name");
      expect(attrs[0].required).toBe(true);
    });

    it("uses non-prefixed boolean names for group booleans", () => {
      const attrs = groupDef.attributeGroups[0].attributes;
      const names = attrs.map((a) => a.name);
      expect(names).toContain("startNewColumn");
      expect(names).toContain("startNewPage");
      expect(names).toContain("resetPageNumber");
      expect(names).toContain("reprintHeaderOnEachPage");
      expect(names).toContain("reprintHeaderOnEachColumn");
      expect(names).toContain("keepTogether");
      expect(names).toContain("preventOrphanFooter");
    });

    it("has footerPosition enum", () => {
      const attrs = groupDef.attributeGroups[0].attributes;
      const fp = attrs.find((a) => a.name === "footerPosition");
      expect(fp?.enumValues).toContain("Normal");
      expect(fp?.enumValues).toContain("CollateAtBottom");
    });

    it("has groupExpression and header/footer children", () => {
      expect(groupDef.expressions[0].tag).toBe("expression");
      const childTags = groupDef.children.map((c) => c.tag);
      expect(childTags).toEqual(["groupHeader", "groupFooter"]);
    });
  });

  describe("style", () => {
    it("has name as required", () => {
      const attrs = styleDef.attributeGroups[0].attributes;
      expect(attrs[0].name).toBe("name");
      expect(attrs[0].required).toBe(true);
    });

    it("includes appearance, font, alignment, and image attrs", () => {
      const names = styleDef.attributeGroups[0].attributes.map((a) => a.name);
      expect(names).toContain("mode");
      expect(names).toContain("forecolor");
      expect(names).toContain("fontName");
      expect(names).toContain("bold");
      expect(names).toContain("hTextAlign");
      expect(names).toContain("hImageAlign");
      expect(names).toContain("fill");
      expect(names).toContain("scaleImage");
      expect(names).toContain("pattern");
      expect(names).toContain("blankWhenNull");
    });

    it("has conditionalStyle, box, pen, paragraph children", () => {
      const childTags = styleDef.children.map((c) => c.tag);
      expect(childTags).toEqual([
        "conditionalStyle",
        "box",
        "pen",
        "paragraph",
      ]);
    });
  });

  describe("dataset", () => {
    it("has name as required", () => {
      const attrs = datasetDef.attributeGroups[0].attributes;
      expect(attrs[0].name).toBe("name");
      expect(attrs[0].required).toBe(true);
    });

    it("allows sub-elements in order", () => {
      const tags = datasetDef.children.map((c) => c.tag);
      expect(tags).toContain("parameter");
      expect(tags).toContain("query");
      expect(tags).toContain("field");
      expect(tags).toContain("variable");
      expect(tags).toContain("group");
    });
  });

  // =============================================
  // Step 7: Simple visual elements
  // =============================================

  describe("line", () => {
    it("uses element tag with line kind", () => {
      expect(lineDef.tag).toBe("element");
      expect(lineDef.kind).toBe("line");
    });

    it("has reportElement + graphicElement + line groups", () => {
      expect(lineDef.attributeGroups).toHaveLength(3);
      expect(lineDef.attributeGroups[0].label).toBe("Report Element");
      expect(lineDef.attributeGroups[1].label).toBe("Graphic");
      expect(lineDef.attributeGroups[2].label).toBe("Line");
    });

    it("has direction enum", () => {
      const lineAttrs = lineDef.attributeGroups[2].attributes;
      expect(lineAttrs[0].name).toBe("direction");
      expect(lineAttrs[0].enumValues).toContain("TopDown");
    });

    it("is retrievable by tag+kind", () => {
      expect(getElementDef("element", "line")).toBe(lineDef);
    });
  });

  describe("rectangle", () => {
    it("has radius attribute", () => {
      const rectAttrs = rectangleDef.attributeGroups[2].attributes;
      expect(rectAttrs[0].name).toBe("radius");
      expect(rectAttrs[0].type).toBe("integer");
    });
  });

  describe("ellipse", () => {
    it("has only reportElement + graphicElement groups", () => {
      expect(ellipseDef.attributeGroups).toHaveLength(2);
    });
  });

  describe("break", () => {
    it("has type enum with Page and Column", () => {
      const breakAttrs = breakDef.attributeGroups[1].attributes;
      expect(breakAttrs[0].name).toBe("type");
      expect(breakAttrs[0].enumValues).toContain("Page");
      expect(breakAttrs[0].enumValues).toContain("Column");
    });
  });

  describe("elementGroup", () => {
    it("has no attributes", () => {
      expect(elementGroupDef.attributeGroups).toHaveLength(0);
    });

    it("allows nested elements", () => {
      expect(elementGroupDef.children[0].tag).toBe("element");
    });
  });

  describe("staticText", () => {
    it("has reportElement + font + textAlignment groups", () => {
      expect(staticTextDef.attributeGroups).toHaveLength(3);
      expect(staticTextDef.attributeGroups[1].label).toBe("Font");
      expect(staticTextDef.attributeGroups[2].label).toBe("Text Alignment");
    });

    it("allows box, paragraph, text children", () => {
      const tags = staticTextDef.children.map((c) => c.tag);
      expect(tags).toContain("box");
      expect(tags).toContain("paragraph");
      expect(tags).toContain("text");
    });
  });

  // =============================================
  // Step 8: Complex visual elements
  // =============================================

  describe("textField", () => {
    it("has 5 attribute groups", () => {
      expect(textFieldDef.attributeGroups).toHaveLength(5);
    });

    it("has textAdjust, evaluationTime, pattern, blankWhenNull, bookmarkLevel", () => {
      const tfAttrs = textFieldDef.attributeGroups[3].attributes;
      const names = tfAttrs.map((a) => a.name);
      expect(names).toContain("textAdjust");
      expect(names).toContain("evaluationTime");
      expect(names).toContain("pattern");
      expect(names).toContain("blankWhenNull");
      expect(names).toContain("bookmarkLevel");
    });

    it("has hyperlink group", () => {
      expect(textFieldDef.attributeGroups[4].label).toBe("Hyperlink");
    });

    it("has expression + hyperlink expressions", () => {
      const tags = textFieldDef.expressions.map((e) => e.tag);
      expect(tags).toContain("expression");
      expect(tags).toContain("patternExpression");
      expect(tags).toContain("anchorNameExpression");
      expect(tags).toContain("hyperlinkReferenceExpression");
    });

    it("allows box, paragraph, hyperlinkParameter children", () => {
      const tags = textFieldDef.children.map((c) => c.tag);
      expect(tags).toContain("box");
      expect(tags).toContain("paragraph");
      expect(tags).toContain("hyperlinkParameter");
    });
  });

  describe("image", () => {
    it("has reportElement + graphic + image + hyperlink groups", () => {
      expect(imageDef.attributeGroups).toHaveLength(4);
      expect(imageDef.attributeGroups[2].label).toBe("Image");
    });

    it("has scaleImage, rotation, alignment, onErrorType, usingCache, isLazy", () => {
      const imgAttrs = imageDef.attributeGroups[2].attributes;
      const names = imgAttrs.map((a) => a.name);
      expect(names).toContain("scaleImage");
      expect(names).toContain("rotation");
      expect(names).toContain("hImageAlign");
      expect(names).toContain("vImageAlign");
      expect(names).toContain("onErrorType");
      expect(names).toContain("usingCache");
      expect(names).toContain("isLazy");
    });

    it("allows box and pen children", () => {
      const tags = imageDef.children.map((c) => c.tag);
      expect(tags).toContain("box");
      expect(tags).toContain("pen");
    });
  });

  describe("frame", () => {
    it("has borderSplitType attribute", () => {
      const frameAttrs = frameDef.attributeGroups[1].attributes;
      expect(frameAttrs[0].name).toBe("borderSplitType");
      expect(frameAttrs[0].enumValues).toContain("NoBorders");
    });

    it("allows nested elements and box", () => {
      const tags = frameDef.children.map((c) => c.tag);
      expect(tags).toContain("element");
      expect(tags).toContain("box");
    });
  });

  describe("subreport", () => {
    it("has usingCache, runToBottom, overflowType", () => {
      const subAttrs = subreportDef.attributeGroups[1].attributes;
      const names = subAttrs.map((a) => a.name);
      expect(names).toEqual(["usingCache", "runToBottom", "overflowType"]);
    });

    it("has 4 expression children for subreport", () => {
      const tags = subreportDef.expressions.map((e) => e.tag);
      expect(tags).toContain("expression");
      expect(tags).toContain("parametersMapExpression");
      expect(tags).toContain("connectionExpression");
      expect(tags).toContain("dataSourceExpression");
    });

    it("allows parameter and returnValue children", () => {
      const tags = subreportDef.children.map((c) => c.tag);
      expect(tags).toContain("parameter");
      expect(tags).toContain("returnValue");
    });
  });

  // =============================================
  // Step 9: Complex elements
  // =============================================

  describe("chart", () => {
    it("has reportElement + chart + hyperlink groups", () => {
      expect(chartDef.attributeGroups).toHaveLength(3);
      expect(chartDef.attributeGroups[1].label).toBe("Chart");
    });

    it("has chart-specific attributes", () => {
      const chartAttrs = chartDef.attributeGroups[1].attributes;
      const names = chartAttrs.map((a) => a.name);
      expect(names).toContain("chartType");
      expect(names).toContain("customizerClass");
      expect(names).toContain("evaluationTime");
      expect(names).toContain("showLegend");
      expect(names).toContain("titleColor");
    });

    it("allows chartTitle, dataset, plot children", () => {
      const tags = chartDef.children.map((c) => c.tag);
      expect(tags).toContain("chartTitle");
      expect(tags).toContain("chartSubtitle");
      expect(tags).toContain("chartLegend");
      expect(tags).toContain("dataset");
      expect(tags).toContain("plot");
    });
  });

  describe("crosstab", () => {
    it("has crosstab-specific attributes", () => {
      const ctAttrs = crosstabDef.attributeGroups[1].attributes;
      const names = ctAttrs.map((a) => a.name);
      expect(names).toContain("columnBreakOffset");
      expect(names).toContain("repeatColumnHeaders");
      expect(names).toContain("repeatRowHeaders");
      expect(names).toContain("runDirection");
      expect(names).toContain("ignoreWidth");
      expect(names).toContain("horizontalPosition");
    });

    it("allows rowGroup, columnGroup, measure, cell children", () => {
      const tags = crosstabDef.children.map((c) => c.tag);
      expect(tags).toContain("rowGroup");
      expect(tags).toContain("columnGroup");
      expect(tags).toContain("measure");
      expect(tags).toContain("cell");
    });
  });

  describe("component", () => {
    it("has only reportElement group", () => {
      expect(componentDef.attributeGroups).toHaveLength(1);
      expect(componentDef.attributeGroups[0].label).toBe("Report Element");
    });
  });

  describe("genericElement", () => {
    it("has evaluationTime and evaluationGroup", () => {
      const genAttrs = genericElementDef.attributeGroups[1].attributes;
      expect(genAttrs[0].name).toBe("evaluationTime");
      expect(genAttrs[1].name).toBe("evaluationGroup");
    });

    it("allows genericType and parameter children", () => {
      const tags = genericElementDef.children.map((c) => c.tag);
      expect(tags).toContain("genericType");
      expect(tags).toContain("parameter");
    });
  });

  // =============================================
  // Step 10: Root element
  // =============================================

  describe("jasperReport", () => {
    it("has correct tag and label", () => {
      expect(jasperReportDef.tag).toBe("jasperReport");
      expect(jasperReportDef.label).toBe("Jasper Report");
      expect(jasperReportDef.kind).toBeUndefined();
    });

    it("has 4 attribute groups", () => {
      expect(jasperReportDef.attributeGroups).toHaveLength(4);
      expect(jasperReportDef.attributeGroups[0].label).toBe("Report");
      expect(jasperReportDef.attributeGroups[1].label).toBe("Page");
      expect(jasperReportDef.attributeGroups[2].label).toBe("Layout");
      expect(jasperReportDef.attributeGroups[3].label).toBe("Advanced");
    });

    it("has name as required in Report group", () => {
      const reportAttrs = jasperReportDef.attributeGroups[0].attributes;
      const name = reportAttrs.find((a) => a.name === "name");
      expect(name?.required).toBe(true);
    });

    it("has page dimension defaults", () => {
      const pageAttrs = jasperReportDef.attributeGroups[1].attributes;
      const pw = pageAttrs.find((a) => a.name === "pageWidth");
      expect(pw?.defaultValue).toBe("595");
      const ph = pageAttrs.find((a) => a.name === "pageHeight");
      expect(ph?.defaultValue).toBe("842");
    });

    it("has layout enums", () => {
      const layoutAttrs = jasperReportDef.attributeGroups[2].attributes;
      const wnd = layoutAttrs.find((a) => a.name === "whenNoDataType");
      expect(wnd?.enumValues).toContain("NoPages");
      const po = layoutAttrs.find((a) => a.name === "printOrder");
      expect(po?.enumValues).toContain("Vertical");
    });

    it("has all band section children", () => {
      const tags = jasperReportDef.children.map((c) => c.tag);
      expect(tags).toContain("title");
      expect(tags).toContain("pageHeader");
      expect(tags).toContain("columnHeader");
      expect(tags).toContain("detail");
      expect(tags).toContain("columnFooter");
      expect(tags).toContain("pageFooter");
      expect(tags).toContain("lastPageFooter");
      expect(tags).toContain("summary");
      expect(tags).toContain("noData");
      expect(tags).toContain("background");
    });

    it("has data children in order", () => {
      const tags = jasperReportDef.children.map((c) => c.tag);
      const paramIdx = tags.indexOf("parameter");
      const fieldIdx = tags.indexOf("field");
      const variableIdx = tags.indexOf("variable");
      const groupIdx = tags.indexOf("group");
      expect(paramIdx).toBeLessThan(fieldIdx);
      expect(fieldIdx).toBeLessThan(variableIdx);
      expect(variableIdx).toBeLessThan(groupIdx);
    });
  });

  // =============================================
  // Registry integration
  // =============================================

  describe("registry integration", () => {
    it("registers all 22 element definitions", () => {
      // 4 data + 4 structural + 6 simple visual + 4 complex visual +
      // 4 complex + 1 root = 23 total
      // But elementGroup, staticText, textField, etc. use "element" tag with kind
      expect(getRegistrySize()).toBeGreaterThanOrEqual(22);
    });

    it("retrieves non-kind elements by tag", () => {
      expect(getElementDef("parameter")).toBe(parameterDef);
      expect(getElementDef("field")).toBe(fieldDef);
      expect(getElementDef("variable")).toBe(variableDef);
      expect(getElementDef("sortField")).toBe(sortFieldDef);
      expect(getElementDef("band")).toBe(bandDef);
      expect(getElementDef("group")).toBe(groupDef);
      expect(getElementDef("style")).toBe(styleDef);
      expect(getElementDef("dataset")).toBe(datasetDef);
      expect(getElementDef("jasperReport")).toBe(jasperReportDef);
    });

    it("retrieves kind elements by tag+kind", () => {
      expect(getElementDef("element", "line")).toBe(lineDef);
      expect(getElementDef("element", "rectangle")).toBe(rectangleDef);
      expect(getElementDef("element", "ellipse")).toBe(ellipseDef);
      expect(getElementDef("element", "break")).toBe(breakDef);
      expect(getElementDef("element", "elementGroup")).toBe(elementGroupDef);
      expect(getElementDef("element", "staticText")).toBe(staticTextDef);
      expect(getElementDef("element", "textField")).toBe(textFieldDef);
      expect(getElementDef("element", "image")).toBe(imageDef);
      expect(getElementDef("element", "frame")).toBe(frameDef);
      expect(getElementDef("element", "subreport")).toBe(subreportDef);
      expect(getElementDef("element", "chart")).toBe(chartDef);
      expect(getElementDef("element", "crosstab")).toBe(crosstabDef);
      expect(getElementDef("element", "component")).toBe(componentDef);
      expect(getElementDef("element", "generic")).toBe(genericElementDef);
    });

    it("all definitions have non-empty labels", () => {
      const allDefs = [
        parameterDef,
        fieldDef,
        variableDef,
        sortFieldDef,
        bandDef,
        groupDef,
        styleDef,
        datasetDef,
        lineDef,
        rectangleDef,
        ellipseDef,
        breakDef,
        elementGroupDef,
        staticTextDef,
        textFieldDef,
        imageDef,
        frameDef,
        subreportDef,
        chartDef,
        crosstabDef,
        componentDef,
        genericElementDef,
        jasperReportDef,
      ];
      for (const def of allDefs) {
        expect(
          def.label.length,
          `${def.tag}:${def.kind} has empty label`,
        ).toBeGreaterThan(0);
      }
    });

    it("all enum attributes have non-empty enumValues", () => {
      const allDefs = [
        parameterDef,
        fieldDef,
        variableDef,
        sortFieldDef,
        bandDef,
        groupDef,
        styleDef,
        datasetDef,
        lineDef,
        rectangleDef,
        ellipseDef,
        breakDef,
        elementGroupDef,
        staticTextDef,
        textFieldDef,
        imageDef,
        frameDef,
        subreportDef,
        chartDef,
        crosstabDef,
        componentDef,
        genericElementDef,
        jasperReportDef,
      ];
      for (const def of allDefs) {
        for (const group of def.attributeGroups) {
          for (const attr of group.attributes) {
            if (attr.type === "enum") {
              expect(
                attr.enumValues?.length,
                `${def.tag}:${def.kind} attr ${attr.name} has no enumValues`,
              ).toBeGreaterThan(0);
            }
          }
        }
      }
    });
  });
});
