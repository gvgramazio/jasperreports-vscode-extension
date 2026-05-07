import { describe, it, expect } from "vitest";
import {
  PositionTypeEnum,
  StretchTypeEnum,
  HorizontalTextAlignEnum,
  VerticalTextAlignEnum,
  HorizontalImageAlignEnum,
  VerticalImageAlignEnum,
  RotationEnum,
  LineStyleEnum,
  LineDirectionEnum,
  LineSpacingEnum,
  ModeEnum,
  FillEnum,
  ScaleImageEnum,
  OnErrorTypeEnum,
  TextAdjustEnum,
  EvaluationTimeEnum,
  ResetTypeEnum,
  IncrementTypeEnum,
  CalculationEnum,
  WhenNoDataTypeEnum,
  WhenResourceMissingTypeEnum,
  OrientationEnum,
  PrintOrderEnum,
  RunDirectionEnum,
  SortOrderEnum,
  SortFieldTypeEnum,
  BreakTypeEnum,
  SplitTypeEnum,
  FooterPositionEnum,
  HyperlinkTypeEnum,
  HyperlinkTargetEnum,
  TabStopAlignEnum,
  DatasetResetTypeEnum,
  ParameterEvaluationTimeEnum,
  PropertyEvaluationTimeEnum,
  BorderSplitType,
  OverflowType,
  SectionTypeEnum,
  HorizontalPosition,
  PartEvaluationTimeType,
  ExpressionTypeEnum,
  ElementKindEnum,
} from "../model/enums";

describe("enums", () => {
  it("exports all enum arrays as non-empty readonly arrays", () => {
    const allEnums = [
      PositionTypeEnum,
      StretchTypeEnum,
      HorizontalTextAlignEnum,
      VerticalTextAlignEnum,
      HorizontalImageAlignEnum,
      VerticalImageAlignEnum,
      RotationEnum,
      LineStyleEnum,
      LineDirectionEnum,
      LineSpacingEnum,
      ModeEnum,
      FillEnum,
      ScaleImageEnum,
      OnErrorTypeEnum,
      TextAdjustEnum,
      EvaluationTimeEnum,
      ResetTypeEnum,
      IncrementTypeEnum,
      CalculationEnum,
      WhenNoDataTypeEnum,
      WhenResourceMissingTypeEnum,
      OrientationEnum,
      PrintOrderEnum,
      RunDirectionEnum,
      SortOrderEnum,
      SortFieldTypeEnum,
      BreakTypeEnum,
      SplitTypeEnum,
      FooterPositionEnum,
      HyperlinkTypeEnum,
      HyperlinkTargetEnum,
      TabStopAlignEnum,
      DatasetResetTypeEnum,
      ParameterEvaluationTimeEnum,
      PropertyEvaluationTimeEnum,
      BorderSplitType,
      OverflowType,
      SectionTypeEnum,
      HorizontalPosition,
      PartEvaluationTimeType,
      ExpressionTypeEnum,
      ElementKindEnum,
    ];
    for (const enumArr of allEnums) {
      expect(enumArr.length).toBeGreaterThan(0);
      for (const value of enumArr) {
        expect(typeof value).toBe("string");
        expect(value.length).toBeGreaterThan(0);
      }
    }
  });

  it("contains no duplicate values within any enum", () => {
    const allEnums: Record<string, readonly string[]> = {
      PositionTypeEnum,
      StretchTypeEnum,
      HorizontalTextAlignEnum,
      VerticalTextAlignEnum,
      HorizontalImageAlignEnum,
      VerticalImageAlignEnum,
      RotationEnum,
      LineStyleEnum,
      LineDirectionEnum,
      LineSpacingEnum,
      ModeEnum,
      FillEnum,
      ScaleImageEnum,
      OnErrorTypeEnum,
      TextAdjustEnum,
      EvaluationTimeEnum,
      ResetTypeEnum,
      IncrementTypeEnum,
      CalculationEnum,
      WhenNoDataTypeEnum,
      WhenResourceMissingTypeEnum,
      OrientationEnum,
      PrintOrderEnum,
      RunDirectionEnum,
      SortOrderEnum,
      SortFieldTypeEnum,
      BreakTypeEnum,
      SplitTypeEnum,
      FooterPositionEnum,
      HyperlinkTypeEnum,
      HyperlinkTargetEnum,
      TabStopAlignEnum,
      DatasetResetTypeEnum,
      ParameterEvaluationTimeEnum,
      PropertyEvaluationTimeEnum,
      BorderSplitType,
      OverflowType,
      SectionTypeEnum,
      HorizontalPosition,
      PartEvaluationTimeType,
      ExpressionTypeEnum,
      ElementKindEnum,
    };
    for (const [name, values] of Object.entries(allEnums)) {
      const unique = new Set(values);
      expect(unique.size, `${name} has duplicate values`).toBe(values.length);
    }
  });

  it("PositionTypeEnum has expected values", () => {
    expect(PositionTypeEnum).toEqual([
      "Float",
      "FixRelativeToTop",
      "FixRelativeToBottom",
    ]);
  });

  it("CalculationEnum has 11 values", () => {
    expect(CalculationEnum).toHaveLength(11);
    expect(CalculationEnum).toContain("Nothing");
    expect(CalculationEnum).toContain("DistinctCount");
  });

  it("EvaluationTimeEnum has 8 values", () => {
    expect(EvaluationTimeEnum).toHaveLength(8);
    expect(EvaluationTimeEnum).toContain("Now");
    expect(EvaluationTimeEnum).toContain("Master");
  });

  it("LineSpacingEnum uses 1_1_2 for one-and-half", () => {
    expect(LineSpacingEnum).toContain("1_1_2");
  });

  it("ElementKindEnum has all 14 visual element kinds", () => {
    expect(ElementKindEnum).toHaveLength(14);
    expect(ElementKindEnum).toContain("textField");
    expect(ElementKindEnum).toContain("staticText");
    expect(ElementKindEnum).toContain("frame");
    expect(ElementKindEnum).toContain("break");
  });

  it("HyperlinkTypeEnum includes Null and Custom", () => {
    expect(HyperlinkTypeEnum).toContain("Null");
    expect(HyperlinkTypeEnum).toContain("Custom");
  });

  it("SplitTypeEnum has 3 values", () => {
    expect(SplitTypeEnum).toEqual(["Stretch", "Prevent", "Immediate"]);
  });

  it("FooterPositionEnum has 4 values", () => {
    expect(FooterPositionEnum).toEqual([
      "Normal",
      "StackAtBottom",
      "ForceAtBottom",
      "CollateAtBottom",
    ]);
  });

  it("PartEvaluationTimeType has 3 values", () => {
    expect(PartEvaluationTimeType).toEqual(["Now", "Group", "Report"]);
  });

  it("HorizontalPosition has 3 values", () => {
    expect(HorizontalPosition).toEqual(["Left", "Center", "Right"]);
  });
});
