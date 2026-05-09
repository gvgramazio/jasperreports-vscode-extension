import { describe, it, expect, vi, beforeEach } from "vitest";
import * as vscode from "vscode";
import { getOutputChannel, disposeOutputChannel } from "../logger";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(vscode.window.createOutputChannel).mockImplementation(
    () =>
      ({
        appendLine: vi.fn(),
        show: vi.fn(),
        dispose: vi.fn(),
      }) as unknown as vscode.LogOutputChannel,
  );
});

describe("getOutputChannel", () => {
  it("creates an output channel on first call", () => {
    // Reset internal state by disposing first
    disposeOutputChannel();

    const channel = getOutputChannel();
    expect(channel).toBeDefined();
    expect(vscode.window.createOutputChannel).toHaveBeenCalledWith(
      "JasperReports",
    );
  });

  it("returns the same channel on subsequent calls", () => {
    disposeOutputChannel();

    const channel1 = getOutputChannel();
    const channel2 = getOutputChannel();
    expect(channel1).toBe(channel2);
    // createOutputChannel should be called only once for the two calls
    expect(vscode.window.createOutputChannel).toHaveBeenCalledTimes(1);
  });
});

describe("disposeOutputChannel", () => {
  it("disposes the channel and creates a new one on next get", () => {
    disposeOutputChannel();

    const channel1 = getOutputChannel();
    disposeOutputChannel();
    expect(channel1.dispose).toHaveBeenCalled();

    const channel2 = getOutputChannel();
    expect(channel2).not.toBe(channel1);
  });

  it("does not throw when called without an active channel", () => {
    disposeOutputChannel();
    expect(() => disposeOutputChannel()).not.toThrow();
  });
});
