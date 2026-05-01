import { describe, it, expect } from "vitest";
import * as extension from "../extension";

describe("extension", () => {
  it("exports an activate function", () => {
    expect(typeof extension.activate).toBe("function");
  });

  it("exports a deactivate function", () => {
    expect(typeof extension.deactivate).toBe("function");
  });
});
