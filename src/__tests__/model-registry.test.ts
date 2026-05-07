import { describe, it, expect, beforeEach } from "vitest";
import {
  registerElement,
  getElementDef,
  getValidChildren,
  getAttributeDef,
  getAllElementDefs,
  getRegistrySize,
  clearRegistry,
} from "../model/registry";
import type { ElementDef } from "../model/types";

function makeTestElement(overrides: Partial<ElementDef> = {}): ElementDef {
  return {
    tag: "testTag",
    label: "Test Element",
    attributeGroups: [],
    expressions: [],
    children: [],
    ...overrides,
  };
}

describe("registry", () => {
  beforeEach(() => {
    clearRegistry();
  });

  describe("registerElement / getElementDef", () => {
    it("registers and retrieves an element by tag", () => {
      const def = makeTestElement({ tag: "field", label: "Field" });
      registerElement(def);
      expect(getElementDef("field")).toBe(def);
    });

    it("registers and retrieves an element with kind", () => {
      const def = makeTestElement({
        tag: "element",
        kind: "textField",
        label: "Text Field",
      });
      registerElement(def);
      expect(getElementDef("element", "textField")).toBe(def);
    });

    it("returns undefined for unregistered tag", () => {
      expect(getElementDef("nonexistent")).toBeUndefined();
    });

    it("returns undefined for unregistered kind", () => {
      const def = makeTestElement({ tag: "element", kind: "textField" });
      registerElement(def);
      expect(getElementDef("element", "image")).toBeUndefined();
    });

    it("falls back to tag-only when kind lookup misses", () => {
      const tagDef = makeTestElement({ tag: "element", label: "Base Element" });
      registerElement(tagDef);
      // Looking for element:unknownKind should fall back to "element"
      expect(getElementDef("element", "unknownKind")).toBe(tagDef);
    });

    it("prefers kind-specific registration over tag-only", () => {
      const baseDef = makeTestElement({ tag: "element", label: "Base" });
      const kindDef = makeTestElement({
        tag: "element",
        kind: "textField",
        label: "TextField",
      });
      registerElement(baseDef);
      registerElement(kindDef);
      expect(getElementDef("element", "textField")?.label).toBe("TextField");
      expect(getElementDef("element")?.label).toBe("Base");
    });
  });

  describe("getValidChildren", () => {
    it("returns children for a registered element", () => {
      const def = makeTestElement({
        tag: "band",
        children: [
          { tag: "element", maxOccurs: undefined },
          { tag: "property" },
        ],
      });
      registerElement(def);
      const children = getValidChildren("band");
      expect(children).toHaveLength(2);
      expect(children[0].tag).toBe("element");
    });

    it("returns empty array for unregistered element", () => {
      expect(getValidChildren("nonexistent")).toEqual([]);
    });
  });

  describe("getAttributeDef", () => {
    it("finds attribute across groups", () => {
      const def = makeTestElement({
        tag: "element",
        kind: "textField",
        attributeGroups: [
          {
            label: "Position",
            attributes: [
              { name: "x", type: "integer", required: true },
              { name: "y", type: "integer", required: true },
            ],
          },
          {
            label: "Font",
            attributes: [
              { name: "fontName", type: "string" },
              { name: "fontSize", type: "integer" },
            ],
          },
        ],
      });
      registerElement(def);

      const xAttr = getAttributeDef("element", "x", "textField");
      expect(xAttr).toBeDefined();
      expect(xAttr!.type).toBe("integer");
      expect(xAttr!.required).toBe(true);

      const fontAttr = getAttributeDef("element", "fontName", "textField");
      expect(fontAttr).toBeDefined();
      expect(fontAttr!.type).toBe("string");
    });

    it("returns undefined for unknown attribute", () => {
      const def = makeTestElement({
        tag: "field",
        attributeGroups: [
          {
            label: "Basic",
            attributes: [{ name: "name", type: "string", required: true }],
          },
        ],
      });
      registerElement(def);
      expect(getAttributeDef("field", "nonexistent")).toBeUndefined();
    });

    it("returns undefined for unregistered element", () => {
      expect(getAttributeDef("nonexistent", "x")).toBeUndefined();
    });
  });

  describe("getAllElementDefs / getRegistrySize", () => {
    it("returns all registered definitions", () => {
      registerElement(makeTestElement({ tag: "field" }));
      registerElement(makeTestElement({ tag: "parameter" }));
      registerElement(makeTestElement({ tag: "variable" }));

      expect(getRegistrySize()).toBe(3);
      expect(getAllElementDefs()).toHaveLength(3);
    });

    it("starts empty", () => {
      expect(getRegistrySize()).toBe(0);
      expect(getAllElementDefs()).toHaveLength(0);
    });
  });

  describe("clearRegistry", () => {
    it("removes all registered definitions", () => {
      registerElement(makeTestElement({ tag: "field" }));
      registerElement(makeTestElement({ tag: "parameter" }));
      expect(getRegistrySize()).toBe(2);

      clearRegistry();
      expect(getRegistrySize()).toBe(0);
      expect(getElementDef("field")).toBeUndefined();
    });
  });
});
