import { describe, it, expect } from "vitest";
import {
  SECTION_TAGS,
  SECTION_LABELS,
  tagToLabel,
  JRXML_ELEMENT_ORDER,
  generateElementXml,
} from "../outline";
import { jasperReportDef } from "../model/elements/jasperReport";

describe("tagToLabel", () => {
  it("converts simple camelCase", () => {
    expect(tagToLabel("pageHeader")).toBe("Page Header");
    expect(tagToLabel("columnFooter")).toBe("Column Footer");
  });

  it("handles multi-word camelCase", () => {
    expect(tagToLabel("lastPageFooter")).toBe("Last Page Footer");
    expect(tagToLabel("noData")).toBe("No Data");
    expect(tagToLabel("groupHeader")).toBe("Group Header");
    expect(tagToLabel("groupFooter")).toBe("Group Footer");
  });

  it("handles single word", () => {
    expect(tagToLabel("title")).toBe("Title");
    expect(tagToLabel("detail")).toBe("Detail");
    expect(tagToLabel("summary")).toBe("Summary");
    expect(tagToLabel("background")).toBe("Background");
  });
});

describe("SECTION_TAGS (model-derived)", () => {
  it("contains all expected section tags", () => {
    expect(SECTION_TAGS).toContain("title");
    expect(SECTION_TAGS).toContain("pageHeader");
    expect(SECTION_TAGS).toContain("columnHeader");
    expect(SECTION_TAGS).toContain("detail");
    expect(SECTION_TAGS).toContain("columnFooter");
    expect(SECTION_TAGS).toContain("pageFooter");
    expect(SECTION_TAGS).toContain("lastPageFooter");
    expect(SECTION_TAGS).toContain("summary");
    expect(SECTION_TAGS).toContain("noData");
    expect(SECTION_TAGS).toContain("background");
  });

  it("does not contain data element tags", () => {
    expect(SECTION_TAGS).not.toContain("parameter");
    expect(SECTION_TAGS).not.toContain("field");
    expect(SECTION_TAGS).not.toContain("variable");
    expect(SECTION_TAGS).not.toContain("style");
    expect(SECTION_TAGS).not.toContain("group");
    expect(SECTION_TAGS).not.toContain("query");
  });

  it("has exactly 10 section tags", () => {
    expect(SECTION_TAGS).toHaveLength(10);
  });

  it("is derived from jasperReport model children", () => {
    const modelTags = jasperReportDef.children
      .filter((c) => c.maxOccurs === 1 && c.tag !== "query")
      .map((c) => c.tag);
    expect(SECTION_TAGS).toEqual(modelTags);
  });
});

describe("SECTION_LABELS (model-derived)", () => {
  it("has a label for every section tag", () => {
    for (const tag of SECTION_TAGS) {
      expect(SECTION_LABELS[tag]).toBeDefined();
      expect(SECTION_LABELS[tag].length).toBeGreaterThan(0);
    }
  });

  it("produces correct human-readable labels", () => {
    expect(SECTION_LABELS["title"]).toBe("Title");
    expect(SECTION_LABELS["pageHeader"]).toBe("Page Header");
    expect(SECTION_LABELS["lastPageFooter"]).toBe("Last Page Footer");
    expect(SECTION_LABELS["noData"]).toBe("No Data");
  });
});

describe("JRXML_ELEMENT_ORDER (model-derived)", () => {
  it("is derived from jasperReport model children", () => {
    const modelOrder = jasperReportDef.children.map((c) => c.tag);
    expect(JRXML_ELEMENT_ORDER).toEqual(modelOrder);
  });

  it("maintains correct relative ordering of data elements", () => {
    const indexOf = (tag: string) => JRXML_ELEMENT_ORDER.indexOf(tag);
    expect(indexOf("style")).toBeLessThan(indexOf("parameter"));
    expect(indexOf("parameter")).toBeLessThan(indexOf("field"));
    expect(indexOf("field")).toBeLessThan(indexOf("sortField"));
    expect(indexOf("sortField")).toBeLessThan(indexOf("variable"));
    expect(indexOf("variable")).toBeLessThan(indexOf("group"));
  });

  it("maintains correct relative ordering of sections", () => {
    const indexOf = (tag: string) => JRXML_ELEMENT_ORDER.indexOf(tag);
    expect(indexOf("group")).toBeLessThan(indexOf("background"));
    expect(indexOf("background")).toBeLessThan(indexOf("title"));
    expect(indexOf("title")).toBeLessThan(indexOf("detail"));
    expect(indexOf("detail")).toBeLessThan(indexOf("summary"));
    expect(indexOf("summary")).toBeLessThan(indexOf("noData"));
  });

  it("contains all section tags", () => {
    for (const tag of SECTION_TAGS) {
      expect(JRXML_ELEMENT_ORDER).toContain(tag);
    }
  });
});

describe("generateElementXml", () => {
  describe("section templates", () => {
    it("generates title with band height 50", () => {
      const xml = generateElementXml("title");
      expect(xml).toContain("<title>");
      expect(xml).toContain('height="50"');
      expect(xml).toContain("</title>");
    });

    it("generates pageHeader with band height 30", () => {
      const xml = generateElementXml("pageHeader");
      expect(xml).toContain("<pageHeader>");
      expect(xml).toContain('height="30"');
      expect(xml).toContain("</pageHeader>");
    });

    it("generates summary with band height 50", () => {
      const xml = generateElementXml("summary");
      expect(xml).toContain('height="50"');
    });

    it("generates detail with band height 30", () => {
      const xml = generateElementXml("detail");
      expect(xml).toContain('height="30"');
    });
  });

  describe("wrapper elements", () => {
    it("generates groupHeader with nested band", () => {
      const xml = generateElementXml("groupHeader");
      expect(xml).toContain("<groupHeader>");
      expect(xml).toContain('height="20"');
      expect(xml).toContain("</groupHeader>");
    });

    it("generates groupFooter with nested band", () => {
      const xml = generateElementXml("groupFooter");
      expect(xml).toContain("<groupFooter>");
      expect(xml).toContain("</groupFooter>");
    });
  });

  describe("data elements", () => {
    it("generates field with name and required attrs", () => {
      const xml = generateElementXml("field", undefined, "myField");
      expect(xml).toContain('name="myField"');
      expect(xml).toContain("<field");
      expect(xml).toContain("/>");
    });

    it("generates parameter with name", () => {
      const xml = generateElementXml("parameter", undefined, "myParam");
      expect(xml).toContain('name="myParam"');
    });

    it("generates style with name", () => {
      const xml = generateElementXml("style", undefined, "myStyle");
      expect(xml).toContain('name="myStyle"');
    });

    it("generates sortField with name", () => {
      const xml = generateElementXml("sortField", undefined, "mySort");
      expect(xml).toContain('name="mySort"');
    });
  });

  describe("group element", () => {
    it("generates group with header and footer", () => {
      const xml = generateElementXml("group", undefined, "myGroup");
      expect(xml).toContain('name="myGroup"');
      expect(xml).toContain("<groupHeader>");
      expect(xml).toContain("<groupFooter>");
      expect(xml).toContain("</group>");
    });
  });

  describe("band", () => {
    it("generates band with practical height", () => {
      const xml = generateElementXml("band");
      expect(xml).toContain('height="20"');
    });
  });

  describe("visual elements", () => {
    it("generates textField element with kind and position", () => {
      const xml = generateElementXml("element", "textField");
      expect(xml).toContain('kind="textField"');
      expect(xml).toContain('x="0"');
      expect(xml).toContain('y="0"');
      expect(xml).toContain("/>");
    });

    it("generates staticText element", () => {
      const xml = generateElementXml("element", "staticText");
      expect(xml).toContain('kind="staticText"');
    });

    it("generates line element", () => {
      const xml = generateElementXml("element", "line");
      expect(xml).toContain('kind="line"');
      expect(xml).toContain('x="0"');
    });

    it("generates rectangle element", () => {
      const xml = generateElementXml("element", "rectangle");
      expect(xml).toContain('kind="rectangle"');
    });

    it("generates ellipse element", () => {
      const xml = generateElementXml("element", "ellipse");
      expect(xml).toContain('kind="ellipse"');
    });

    it("generates image element", () => {
      const xml = generateElementXml("element", "image");
      expect(xml).toContain('kind="image"');
    });

    it("generates frame element", () => {
      const xml = generateElementXml("element", "frame");
      expect(xml).toContain('kind="frame"');
    });

    it("generates break element", () => {
      const xml = generateElementXml("element", "break");
      expect(xml).toContain('kind="break"');
    });

    it("generates elementGroup as non-self-closing", () => {
      const xml = generateElementXml("element", "elementGroup");
      expect(xml).toContain('kind="elementGroup"');
      expect(xml).toContain("</element>");
      expect(xml).not.toContain("/>");
    });

    it("generates subreport element", () => {
      const xml = generateElementXml("element", "subreport");
      expect(xml).toContain('kind="subreport"');
    });

    it("generates chart element", () => {
      const xml = generateElementXml("element", "chart");
      expect(xml).toContain('kind="chart"');
    });

    it("generates crosstab element", () => {
      const xml = generateElementXml("element", "crosstab");
      expect(xml).toContain('kind="crosstab"');
    });

    it("generates component element", () => {
      const xml = generateElementXml("element", "component");
      expect(xml).toContain('kind="component"');
    });

    it("generates generic element", () => {
      const xml = generateElementXml("element", "generic");
      expect(xml).toContain('kind="generic"');
    });
  });

  describe("edge cases", () => {
    it("returns empty string for unknown tag", () => {
      expect(generateElementXml("nonexistent")).toBe("");
    });

    it("does not include uuid in generated XML", () => {
      const xml = generateElementXml("element", "textField");
      expect(xml).not.toContain("uuid");
    });
  });
});
