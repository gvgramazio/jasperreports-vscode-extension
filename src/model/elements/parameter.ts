import type { ElementDef } from "../types";
import { ParameterEvaluationTimeEnum } from "../enums";
import { registerElement } from "../registry";

const parameterDef: ElementDef = {
  tag: "parameter",
  label: "Parameter",
  attributeGroups: [
    {
      label: "Parameter",
      attributes: [
        { name: "name", type: "string", required: true },
        { name: "class", type: "string", defaultValue: "java.lang.String" },
        { name: "isForPrompting", type: "boolean", defaultValue: "true" },
        {
          name: "evaluationTime",
          type: "enum",
          enumValues: ParameterEvaluationTimeEnum,
        },
        { name: "nestedType", type: "string" },
      ],
    },
  ],
  expressions: [{ tag: "defaultValueExpression", label: "Default Value" }],
  children: [
    { tag: "property", maxOccurs: undefined },
    { tag: "description", maxOccurs: 1 },
  ],
};

registerElement(parameterDef);

export { parameterDef };
