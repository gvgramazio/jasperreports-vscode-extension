import type { ElementDef } from "../types";
import { EdgeEnum } from "../enums";
import { registerElement } from "../registry";

const chartTitleDef: ElementDef = {
  tag: "chartTitle",
  label: "Chart Title",
  attributeGroups: [
    {
      label: "Chart Title",
      attributes: [
        { name: "position", type: "enum", enumValues: EdgeEnum },
        { name: "color", type: "color" },
      ],
    },
  ],
  expressions: [{ tag: "expression", label: "Expression" }],
  children: [{ tag: "font", maxOccurs: 1 }],
};

registerElement(chartTitleDef);

const chartSubtitleDef: ElementDef = {
  tag: "chartSubtitle",
  label: "Chart Subtitle",
  attributeGroups: [
    {
      label: "Chart Subtitle",
      attributes: [
        { name: "position", type: "enum", enumValues: EdgeEnum },
        { name: "color", type: "color" },
      ],
    },
  ],
  expressions: [{ tag: "expression", label: "Expression" }],
  children: [{ tag: "font", maxOccurs: 1 }],
};

registerElement(chartSubtitleDef);

const chartLegendDef: ElementDef = {
  tag: "chartLegend",
  label: "Chart Legend",
  attributeGroups: [
    {
      label: "Chart Legend",
      attributes: [
        { name: "position", type: "enum", enumValues: EdgeEnum },
        { name: "color", type: "color" },
      ],
    },
  ],
  expressions: [{ tag: "expression", label: "Expression" }],
  children: [{ tag: "font", maxOccurs: 1 }],
};

registerElement(chartLegendDef);

export { chartTitleDef, chartSubtitleDef, chartLegendDef };
