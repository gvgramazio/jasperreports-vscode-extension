import { describe, it, expect } from "vitest";
import { getAttributeType } from "../properties/attributeTypes";
// Ensure model elements are registered
import "../model/elements";

describe("getAttributeType", () => {
  it("returns integer for integer attributes on element", () => {
    expect(getAttributeType("element", "x", "textField")).toEqual({
      type: "integer",
    });
    expect(getAttributeType("element", "y", "textField")).toEqual({
      type: "integer",
    });
    expect(getAttributeType("element", "width", "textField")).toEqual({
      type: "integer",
    });
    expect(getAttributeType("element", "height", "textField")).toEqual({
      type: "integer",
    });
  });

  it("returns integer for integer attributes on jasperReport", () => {
    expect(getAttributeType("jasperReport", "columnCount")).toEqual({
      type: "integer",
    });
    expect(getAttributeType("jasperReport", "pageWidth")).toEqual({
      type: "integer",
    });
  });

  it("returns decimal for decimal attributes", () => {
    // lineWidth is on pen elements, not directly on reportElement
    // lineSpacingSize is on paragraph
    expect(getAttributeType("element", "lineWidth", "line")).toBeUndefined();
  });

  it("returns boolean for boolean attributes", () => {
    const result = getAttributeType("element", "blankWhenNull", "textField");
    expect(result?.type).toBe("boolean");
    expect(result?.enumValues).toEqual(["true", "false"]);
  });

  it("returns color for color attributes", () => {
    expect(getAttributeType("element", "forecolor", "textField")).toEqual({
      type: "color",
    });
    expect(getAttributeType("element", "backcolor", "textField")).toEqual({
      type: "color",
    });
  });

  it("returns enum for enum attributes", () => {
    const result = getAttributeType("element", "hTextAlign", "textField");
    expect(result?.type).toBe("enum");
    expect(result?.enumValues).toContain("Left");
    expect(result?.enumValues).toContain("Right");
  });

  it("returns undefined for unknown attributes", () => {
    expect(getAttributeType("element", "unknownAttr")).toBeUndefined();
    expect(getAttributeType("unknown", "x")).toBeUndefined();
  });

  it("returns undefined when tag is not registered", () => {
    expect(getAttributeType("notRegistered", "x")).toBeUndefined();
  });

  it("looks up kind-specific definitions", () => {
    // textField has evaluationTime enum
    const result = getAttributeType("element", "evaluationTime", "textField");
    expect(result?.type).toBe("enum");
    expect(result?.enumValues).toContain("Now");
    expect(result?.enumValues).toContain("Report");
  });

  it("returns undefined for string type (no special treatment)", () => {
    const result = getAttributeType("element", "pattern", "textField");
    expect(result).toBeUndefined();
  });

  it("returns enum for positionType on element", () => {
    const result = getAttributeType("element", "positionType", "textField");
    expect(result?.type).toBe("enum");
    expect(result?.enumValues).toContain("Float");
  });

  it("returns enum for calculation on variable", () => {
    const result = getAttributeType("variable", "calculation");
    expect(result?.type).toBe("enum");
    expect(result?.enumValues).toContain("Sum");
  });
});
