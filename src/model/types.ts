/**
 * Attribute value types supported by the JRXML element model.
 * Used to determine UI rendering (input type) and validation.
 */
export type AttributeType =
  | "string"
  | "integer"
  | "decimal"
  | "boolean"
  | "color"
  | "enum";

/**
 * Definition of a single XML attribute on a JRXML element.
 */
export interface AttributeDef {
  /** The XML attribute name as it appears in JRXML (e.g. "hTextAlign"). */
  name: string;
  /** Value type for UI rendering and validation. */
  type: AttributeType;
  /** Whether the attribute is required. Default: false. */
  required?: boolean;
  /** Default value when not specified. */
  defaultValue?: string;
  /** Allowed values for enum-type attributes. */
  enumValues?: readonly string[];
}

/**
 * Definition of an expression child element (e.g. <printWhenExpression>).
 * Expressions contain CDATA-wrapped text.
 */
export interface ExpressionDef {
  /** The XML tag name (e.g. "printWhenExpression"). */
  tag: string;
  /** Human-readable label for the UI. Falls back to tag if not set. */
  label?: string;
}

/**
 * Definition of a valid child element within a parent element.
 */
export interface ChildDef {
  /** The XML tag name of the child element. */
  tag: string;
  /**
   * For children that use a `kind` attribute to differentiate
   * (e.g. `<element kind="textField">`), the required kind value.
   */
  kind?: string;
  /** Minimum occurrences. Default: 0. */
  minOccurs?: number;
  /** Maximum occurrences. undefined = unbounded. */
  maxOccurs?: number;
}

/**
 * A named group of attributes for UI grouping in the properties panel
 * (e.g. "Position & Size", "Font", "Appearance").
 */
export interface AttributeGroup {
  /** Group label displayed in the properties panel. */
  label: string;
  /** Ordered list of attributes in this group. */
  attributes: readonly AttributeDef[];
}

/**
 * Complete definition of a JRXML element type.
 */
export interface ElementDef {
  /** The XML tag name (e.g. "element", "field", "band"). */
  tag: string;
  /**
   * For elements that use a `kind` attribute to differentiate
   * (e.g. `<element kind="textField">`), the kind value.
   */
  kind?: string;
  /** Human-readable label for the UI. */
  label: string;
  /** Attribute groups for structured display in the properties panel. */
  attributeGroups: readonly AttributeGroup[];
  /** Expression child elements (e.g. printWhenExpression). */
  expressions: readonly ExpressionDef[];
  /** Valid child elements. */
  children: readonly ChildDef[];
}
