import type { ElementDef } from "../types";
import { CalculationEnum, ResetTypeEnum, IncrementTypeEnum } from "../enums";
import { registerElement } from "../registry";

const variableDef: ElementDef = {
  tag: "variable",
  label: "Variable",
  attributeGroups: [
    {
      label: "Variable",
      attributes: [
        { name: "name", type: "string", required: true },
        { name: "class", type: "string", defaultValue: "java.lang.String" },
        {
          name: "calculation",
          type: "enum",
          enumValues: CalculationEnum,
        },
        { name: "resetType", type: "enum", enumValues: ResetTypeEnum },
        { name: "resetGroup", type: "string" },
        {
          name: "incrementType",
          type: "enum",
          enumValues: IncrementTypeEnum,
        },
        { name: "incrementGroup", type: "string" },
        { name: "incrementerFactoryClass", type: "string" },
      ],
    },
  ],
  expressions: [
    { tag: "expression", label: "Variable Expression" },
    { tag: "initialValueExpression", label: "Initial Value" },
  ],
  children: [{ tag: "description", maxOccurs: 1 }],
};

registerElement(variableDef);

export { variableDef };
