/**
 * All JRXML enum value lists for JasperReports 7.0.6.
 *
 * Values are the exact XML-serialized getName() strings from the Java enum types
 * in net.sf.jasperreports.engine.type.*.
 *
 * Source of truth: jasperreports/core/src/main/java/net/sf/jasperreports/engine/type/
 */

export const PositionTypeEnum = [
  "Float",
  "FixRelativeToTop",
  "FixRelativeToBottom",
] as const;

export const StretchTypeEnum = [
  "NoStretch",
  "ElementGroupHeight",
  "ElementGroupBottom",
  "ContainerHeight",
  "ContainerBottom",
] as const;

export const HorizontalTextAlignEnum = [
  "Left",
  "Center",
  "Right",
  "Justified",
] as const;

export const VerticalTextAlignEnum = [
  "Top",
  "Middle",
  "Bottom",
  "Justified",
] as const;

export const HorizontalImageAlignEnum = ["Left", "Center", "Right"] as const;

export const VerticalImageAlignEnum = ["Top", "Middle", "Bottom"] as const;

export const RotationEnum = ["None", "Left", "Right", "UpsideDown"] as const;

export const LineStyleEnum = ["Solid", "Dashed", "Dotted", "Double"] as const;

export const LineDirectionEnum = ["TopDown", "BottomUp"] as const;

export const LineSpacingEnum = [
  "Single",
  "1_1_2",
  "Double",
  "AtLeast",
  "Fixed",
  "Proportional",
] as const;

export const ModeEnum = ["Opaque", "Transparent"] as const;

export const FillEnum = ["Solid"] as const;

export const ScaleImageEnum = [
  "Clip",
  "FillFrame",
  "RetainShape",
  "RealHeight",
  "RealSize",
] as const;

export const OnErrorTypeEnum = ["Error", "Blank", "Icon"] as const;

export const TextAdjustEnum = [
  "CutText",
  "StretchHeight",
  "ScaleFont",
] as const;

export const EvaluationTimeEnum = [
  "Now",
  "Report",
  "Page",
  "Column",
  "Group",
  "Band",
  "Auto",
  "Master",
] as const;

export const ResetTypeEnum = [
  "Report",
  "Page",
  "Column",
  "Group",
  "None",
  "Master",
] as const;

export const IncrementTypeEnum = [
  "Report",
  "Page",
  "Column",
  "Group",
  "None",
] as const;

export const CalculationEnum = [
  "Nothing",
  "Count",
  "Sum",
  "Average",
  "Lowest",
  "Highest",
  "StandardDeviation",
  "Variance",
  "System",
  "First",
  "DistinctCount",
] as const;

export const WhenNoDataTypeEnum = [
  "NoPages",
  "BlankPage",
  "AllSectionsNoDetail",
  "NoDataSection",
] as const;

export const WhenResourceMissingTypeEnum = [
  "Null",
  "Empty",
  "Key",
  "Error",
] as const;

export const OrientationEnum = ["Portrait", "Landscape"] as const;

export const PrintOrderEnum = ["Vertical", "Horizontal"] as const;

export const RunDirectionEnum = ["LTR", "RTL"] as const;

export const SortOrderEnum = ["Ascending", "Descending"] as const;

export const SortFieldTypeEnum = ["Field", "Variable"] as const;

export const BreakTypeEnum = ["Page", "Column"] as const;

export const SplitTypeEnum = ["Stretch", "Prevent", "Immediate"] as const;

export const FooterPositionEnum = [
  "Normal",
  "StackAtBottom",
  "ForceAtBottom",
  "CollateAtBottom",
] as const;

export const HyperlinkTypeEnum = [
  "Null",
  "None",
  "Reference",
  "LocalAnchor",
  "LocalPage",
  "RemoteAnchor",
  "RemotePage",
  "Custom",
] as const;

export const HyperlinkTargetEnum = [
  "None",
  "Self",
  "Blank",
  "Parent",
  "Top",
  "Custom",
] as const;

export const TabStopAlignEnum = ["Left", "Center", "Right"] as const;

export const DatasetResetTypeEnum = [
  "Report",
  "Page",
  "Column",
  "Group",
  "None",
] as const;

export const ParameterEvaluationTimeEnum = ["Early", "Late"] as const;

export const PropertyEvaluationTimeEnum = ["Early", "Late", "Report"] as const;

export const BorderSplitType = ["NoBorders", "DrawBorders"] as const;

export const OverflowType = ["Stretch", "NoStretch"] as const;

export const SectionTypeEnum = ["Band", "Part"] as const;

export const HorizontalPosition = ["Left", "Center", "Right"] as const;

export const PartEvaluationTimeType = ["Now", "Group", "Report"] as const;

export const ExpressionTypeEnum = ["default", "simpleText"] as const;

export const ElementKindEnum = [
  "textField",
  "staticText",
  "image",
  "line",
  "rectangle",
  "ellipse",
  "frame",
  "subreport",
  "chart",
  "crosstab",
  "component",
  "elementGroup",
  "generic",
  "break",
] as const;
