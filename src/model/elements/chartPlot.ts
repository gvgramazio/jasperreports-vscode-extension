import type { ElementDef } from "../types";
import { OrientationEnum } from "../enums";
import { registerElement } from "../registry";

const chartPlotDef: ElementDef = {
  tag: "plot",
  label: "Chart Plot",
  attributeGroups: [
    {
      label: "Chart Plot",
      attributes: [
        { name: "orientation", type: "enum", enumValues: OrientationEnum },
        { name: "backgroundAlpha", type: "decimal" },
        { name: "foregroundAlpha", type: "decimal" },
        { name: "labelRotation", type: "decimal" },
        { name: "showLabels", type: "boolean" },
        { name: "showTickLabels", type: "boolean" },
        { name: "showTickMarks", type: "boolean" },
        { name: "isShowLabels", type: "boolean" },
        { name: "isShowTickLabels", type: "boolean" },
        { name: "isShowTickMarks", type: "boolean" },
        { name: "isShowLines", type: "boolean" },
        { name: "isShowShapes", type: "boolean" },
        { name: "depthFactor", type: "decimal" },
        { name: "isCircular", type: "boolean" },
      ],
    },
  ],
  expressions: [
    { tag: "categoryAxisLabelExpression", label: "Category Axis Label" },
    { tag: "valueAxisLabelExpression", label: "Value Axis Label" },
    { tag: "domainAxisMinValueExpression", label: "Domain Axis Min" },
    { tag: "domainAxisMaxValueExpression", label: "Domain Axis Max" },
    { tag: "rangeAxisMinValueExpression", label: "Range Axis Min" },
    { tag: "rangeAxisMaxValueExpression", label: "Range Axis Max" },
    { tag: "timeAxisLabelExpression", label: "Time Axis Label" },
    { tag: "xaxisLabelExpression", label: "X Axis Label" },
    { tag: "yaxisLabelExpression", label: "Y Axis Label" },
  ],
  children: [
    { tag: "itemLabel", maxOccurs: 1 },
    { tag: "seriesColor", maxOccurs: undefined },
    { tag: "valueDisplay", maxOccurs: 1 },
    { tag: "meterInterval", maxOccurs: undefined },
    { tag: "axis", maxOccurs: undefined },
    { tag: "dataRange", maxOccurs: 1 },
    { tag: "lowRange", maxOccurs: 1 },
    { tag: "mediumRange", maxOccurs: 1 },
    { tag: "highRange", maxOccurs: 1 },
  ],
};

registerElement(chartPlotDef);

export { chartPlotDef };
