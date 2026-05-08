import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("child_process", () => ({
  execFile: vi.fn(),
}));

import { execFile } from "child_process";
import { runJava, type JavaRunOpts } from "../java-runner";
import { getOutputChannel } from "../logger";

beforeEach(() => {
  vi.clearAllMocks();
});

function makeOpts(overrides?: Partial<JavaRunOpts>): JavaRunOpts {
  return {
    javaPath: "/usr/bin/java",
    classpath: "/cp/jr.jar",
    args: ["JrCompiler", "compile", "/test/report.jrxml"],
    cwd: "/test",
    ...overrides,
  };
}

describe("runJava", () => {
  it("returns ok result on success", async () => {
    vi.mocked(execFile).mockImplementation(
      (_cmd: unknown, _args: unknown, _opts: unknown, cb: unknown) => {
        (cb as (err: null, stdout: string, stderr: string) => void)(
          null,
          "done",
          "",
        );
        return undefined as never;
      },
    );

    const result = await runJava(makeOpts());

    expect(result).toEqual({ ok: true, stdout: "done", stderr: "" });
  });

  it("passes correct arguments to execFile", async () => {
    vi.mocked(execFile).mockImplementation(
      (_cmd: unknown, _args: unknown, _opts: unknown, cb: unknown) => {
        (cb as (err: null, stdout: string, stderr: string) => void)(
          null,
          "",
          "",
        );
        return undefined as never;
      },
    );

    await runJava(makeOpts());

    expect(execFile).toHaveBeenCalledWith(
      "/usr/bin/java",
      ["-cp", "/cp/jr.jar", "JrCompiler", "compile", "/test/report.jrxml"],
      { cwd: "/test", timeout: 60_000 },
      expect.any(Function),
    );
  });

  it("uses custom timeout when provided", async () => {
    vi.mocked(execFile).mockImplementation(
      (_cmd: unknown, _args: unknown, _opts: unknown, cb: unknown) => {
        (cb as (err: null, stdout: string, stderr: string) => void)(
          null,
          "",
          "",
        );
        return undefined as never;
      },
    );

    await runJava(makeOpts({ timeout: 30_000 }));

    expect(execFile).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ timeout: 30_000 }),
      expect.any(Function),
    );
  });

  it("returns error result with stderr on failure", async () => {
    vi.mocked(execFile).mockImplementation(
      (_cmd: unknown, _args: unknown, _opts: unknown, cb: unknown) => {
        (cb as (err: Error, stdout: string, stderr: string) => void)(
          new Error("exit code 1"),
          "",
          "net.sf.jasperreports.engine.JRException: Error\nDetails...",
        );
        return undefined as never;
      },
    );

    const result = await runJava(makeOpts());

    expect(result).toEqual({
      ok: false,
      error: "net.sf.jasperreports.engine.JRException: Error",
    });
  });

  it("returns error result with err.message when stderr is empty", async () => {
    vi.mocked(execFile).mockImplementation(
      (_cmd: unknown, _args: unknown, _opts: unknown, cb: unknown) => {
        (cb as (err: Error, stdout: string, stderr: string) => void)(
          new Error("Command timed out"),
          "",
          "",
        );
        return undefined as never;
      },
    );

    const result = await runJava(makeOpts());

    expect(result).toEqual({ ok: false, error: "Command timed out" });
  });

  it("logs stdout to output channel", async () => {
    vi.mocked(execFile).mockImplementation(
      (_cmd: unknown, _args: unknown, _opts: unknown, cb: unknown) => {
        (cb as (err: null, stdout: string, stderr: string) => void)(
          null,
          "compile output",
          "",
        );
        return undefined as never;
      },
    );

    await runJava(makeOpts());

    const channel = getOutputChannel();
    expect(channel.appendLine).toHaveBeenCalledWith("compile output");
  });

  it("logs stderr to output channel", async () => {
    vi.mocked(execFile).mockImplementation(
      (_cmd: unknown, _args: unknown, _opts: unknown, cb: unknown) => {
        (cb as (err: null, stdout: string, stderr: string) => void)(
          null,
          "",
          "warning text",
        );
        return undefined as never;
      },
    );

    await runJava(makeOpts());

    const channel = getOutputChannel();
    expect(channel.appendLine).toHaveBeenCalledWith("warning text");
  });

  it("logs FAILED and shows channel on error", async () => {
    vi.mocked(execFile).mockImplementation(
      (_cmd: unknown, _args: unknown, _opts: unknown, cb: unknown) => {
        (cb as (err: Error, stdout: string, stderr: string) => void)(
          new Error("exit code 1"),
          "",
          "some error",
        );
        return undefined as never;
      },
    );

    await runJava(makeOpts());

    const channel = getOutputChannel();
    expect(channel.appendLine).toHaveBeenCalledWith("FAILED: some error");
    expect(channel.show).toHaveBeenCalledWith(true);
  });

  it("does not log stdout when empty", async () => {
    vi.mocked(execFile).mockImplementation(
      (_cmd: unknown, _args: unknown, _opts: unknown, cb: unknown) => {
        (cb as (err: null, stdout: string, stderr: string) => void)(
          null,
          "",
          "",
        );
        return undefined as never;
      },
    );

    await runJava(makeOpts());

    const channel = getOutputChannel();
    const calls = vi.mocked(channel.appendLine).mock.calls;
    expect(calls.filter((c) => c[0] === "")).toHaveLength(0);
  });
});
