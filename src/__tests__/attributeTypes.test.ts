import { describe, it, expect } from "vitest";
import { getAttributeType } from "../properties/attributeTypes";

describe("getAttributeType", () => {
  it("returns integer for numeric attributes", () => {
    expect(getAttributeType("x")).toEqual({ type: "integer" });
    expect(getAttributeType("y")).toEqual({ type: "integer" });
    expect(getAttributeType("width")).toEqual({ type: "integer" });
    expect(getAttributeType("height")).toEqual({ type: "integer" });
    expect(getAttributeType("fontSize")).toEqual({ type: "integer" });
    expect(getAttributeType("columnCount")).toEqual({ type: "integer" });
  });

  it("returns decimal for decimal attributes", () => {
    expect(getAttributeType("lineWidth")).toEqual({ type: "decimal" });
    expect(getAttributeType("lineSpacingSize")).toEqual({ type: "decimal" });
  });

  it("returns boolean for boolean attributes", () => {
    const result = getAttributeType("bold");
    expect(result?.type).toBe("boolean");
    expect(result?.enumValues).toEqual(["true", "false"]);
  });

  it("returns color for color attributes", () => {
    expect(getAttributeType("forecolor")).toEqual({ type: "color" });
    expect(getAttributeType("backcolor")).toEqual({ type: "color" });
  });

  it("returns enum for enum attributes", () => {
    const result = getAttributeType("hTextAlign");
    expect(result?.type).toBe("enum");
    expect(result?.enumValues).toContain("Left");
    expect(result?.enumValues).toContain("Right");
  });

  it("returns undefined for unknown attributes", () => {
    expect(getAttributeType("name")).toBeUndefined();
    expect(getAttributeType("class")).toBeUndefined();
    expect(getAttributeType("unknownAttr")).toBeUndefined();
  });
});
