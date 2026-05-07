import type { ElementDef } from "../types";
import { EvaluationTimeEnum } from "../enums";
import {
  reportElementGroup,
  REPORT_ELEMENT_EXPRESSIONS,
} from "../common/reportElement";
import { hyperlinkGroup, HYPERLINK_EXPRESSIONS } from "../common/hyperlink";
import { registerElement } from "../registry";

const chartDef: ElementDef = {
  tag: "element",
  kind: "chart",
  label: "Chart",
  attributeGroups: [
    reportElementGroup,
    {
      label: "Chart",
      attributes: [
        { name: "chartType", type: "string" },
        { name: "customizerClass", type: "string" },
        { name: "renderType", type: "string" },
        { name: "theme", type: "string" },
        {
          name: "evaluationTime",
          type: "enum",
          enumValues: EvaluationTimeEnum,
        },
        { name: "evaluationGroup", type: "string" },
        { name: "showLegend", type: "boolean" },
        { name: "bookmarkLevel", type: "integer" },
        { name: "titleColor", type: "color" },
        { name: "subtitleColor", type: "color" },
        { name: "legendColor", type: "color" },
        { name: "legendBackgroundColor", type: "color" },
      ],
    },
    hyperlinkGroup,
  ],
  expressions: [
    ...REPORT_ELEMENT_EXPRESSIONS,
    { tag: "anchorNameExpression", label: "Anchor Name" },
    { tag: "bookmarkLevelExpression", label: "Bookmark Level" },
    ...HYPERLINK_EXPRESSIONS,
  ],
  children: [
    { tag: "property", maxOccurs: undefined },
    { tag: "propertyExpression", maxOccurs: undefined },
    { tag: "chartTitle", maxOccurs: 1 },
    { tag: "chartSubtitle", maxOccurs: 1 },
    { tag: "chartLegend", maxOccurs: 1 },
    { tag: "dataset", maxOccurs: 1 },
    { tag: "plot", maxOccurs: 1 },
    { tag: "hyperlinkParameter", maxOccurs: undefined },
  ],
};

registerElement(chartDef);

export { chartDef };
