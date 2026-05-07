import type { ElementDef } from "../types";
import { CalculationEnum, CrosstabPercentageEnum } from "../enums";
import { registerElement } from "../registry";

const crosstabMeasureDef: ElementDef = {
  tag: "measure",
  label: "Measure",
  attributeGroups: [
    {
      label: "Measure",
      attributes: [
        { name: "name", type: "string", required: true },
        { name: "class", type: "string" },
        { name: "calculation", type: "enum", enumValues: CalculationEnum },
        {
          name: "percentageOf",
          type: "enum",
          enumValues: CrosstabPercentageEnum,
        },
      ],
    },
  ],
  expressions: [{ tag: "expression", label: "Expression" }],
  children: [],
};

registerElement(crosstabMeasureDef);

export { crosstabMeasureDef };
