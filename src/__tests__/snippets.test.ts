import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("jrxml snippets", () => {
  const snippetsPath = resolve(__dirname, "../../snippets/jrxml.json");
  const raw = readFileSync(snippetsPath, "utf-8");
  const snippets = JSON.parse(raw) as Record<
    string,
    { prefix: string; body: string[]; description?: string }
  >;

  it("is valid JSON", () => {
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it("contains at least 30 snippets", () => {
    expect(Object.keys(snippets).length).toBeGreaterThanOrEqual(30);
  });

  it("every snippet has prefix, body, and description", () => {
    for (const [name, snippet] of Object.entries(snippets)) {
      expect(snippet.prefix, `${name} missing prefix`).toBeTruthy();
      expect(snippet.body, `${name} missing body`).toBeTruthy();
      expect(snippet.description, `${name} missing description`).toBeTruthy();
    }
  });

  it("every snippet body is a string array", () => {
    for (const [name, snippet] of Object.entries(snippets)) {
      expect(Array.isArray(snippet.body), `${name} body not an array`).toBe(
        true,
      );
      for (const line of snippet.body) {
        expect(typeof line, `${name} body line not a string`).toBe("string");
      }
    }
  });

  it("no duplicate prefixes", () => {
    const prefixes = Object.values(snippets).map((s) => s.prefix);
    const unique = new Set(prefixes);
    expect(unique.size).toBe(prefixes.length);
  });

  it("covers all 13 element kinds", () => {
    const kinds = [
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
    ];
    const allBodies = Object.values(snippets)
      .flatMap((s) => s.body)
      .join("\n");
    for (const kind of kinds) {
      expect(allBodies, `missing element kind="${kind}"`).toContain(
        `kind="${kind}"`,
      );
    }
  });

  it("covers expression references $F, $P, $V, $R", () => {
    const prefixes = Object.values(snippets).map((s) => s.prefix);
    expect(prefixes).toContain("$F");
    expect(prefixes).toContain("$P");
    expect(prefixes).toContain("$V");
    expect(prefixes).toContain("$R");
  });
});
