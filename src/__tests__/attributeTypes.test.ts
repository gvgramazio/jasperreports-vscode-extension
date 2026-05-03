import { describe, it, expect } from "vitest";
import {
  getAttributeType,
  validateAttributeValue,
} from "../properties/attributeTypes";

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

describe("validateAttributeValue", () => {
  it("accepts empty values for any type", () => {
    expect(validateAttributeValue("x", "")).toBe(true);
    expect(validateAttributeValue("bold", "")).toBe(true);
  });

  it("validates integers", () => {
    expect(validateAttributeValue("x", "100")).toBe(true);
    expect(validateAttributeValue("x", "-5")).toBe(true);
    expect(validateAttributeValue("x", "0")).toBe(true);
    expect(validateAttributeValue("x", "12.5")).toBe(false);
    expect(validateAttributeValue("x", "abc")).toBe(false);
  });

  it("validates decimals", () => {
    expect(validateAttributeValue("lineWidth", "1.5")).toBe(true);
    expect(validateAttributeValue("lineWidth", "2")).toBe(true);
    expect(validateAttributeValue("lineWidth", "-0.5")).toBe(true);
    expect(validateAttributeValue("lineWidth", "abc")).toBe(false);
  });

  it("validates booleans", () => {
    expect(validateAttributeValue("bold", "true")).toBe(true);
    expect(validateAttributeValue("bold", "false")).toBe(true);
    expect(validateAttributeValue("bold", "yes")).toBe(false);
    expect(validateAttributeValue("bold", "1")).toBe(false);
  });

  it("validates colors", () => {
    expect(validateAttributeValue("forecolor", "#FF0000")).toBe(true);
    expect(validateAttributeValue("forecolor", "#aabbcc")).toBe(true);
    expect(validateAttributeValue("forecolor", "red")).toBe(false);
    expect(validateAttributeValue("forecolor", "#FFF")).toBe(false);
    expect(validateAttributeValue("forecolor", "#GGGGGG")).toBe(false);
  });

  it("validates enums", () => {
    expect(validateAttributeValue("hTextAlign", "Left")).toBe(true);
    expect(validateAttributeValue("hTextAlign", "Center")).toBe(true);
    expect(validateAttributeValue("hTextAlign", "Invalid")).toBe(false);
  });

  it("accepts any value for unknown attributes", () => {
    expect(validateAttributeValue("name", "anything")).toBe(true);
    expect(validateAttributeValue("class", "java.lang.String")).toBe(true);
  });
});
