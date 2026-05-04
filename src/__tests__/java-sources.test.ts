import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  findJavaFiles,
  compileJavaSources,
  copyResourceFiles,
  cleanupTempDir,
} from "../java-sources";

vi.mock("child_process", () => ({
  execFile: vi.fn(),
}));

vi.mock("../java", () => ({
  resolveJavacExecutable: vi.fn(() => "javac"),
  validateJavac: vi.fn(() => Promise.resolve({ ok: true })),
}));

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  return {
    ...actual,
    readdirSync: vi.fn(() => []),
    mkdtempSync: vi.fn(() => "/tmp/jr-sources-abc"),
    mkdirSync: vi.fn(),
    copyFileSync: vi.fn(),
    rmSync: vi.fn(),
  };
});

import { execFile } from "child_process";
import * as fs from "fs";
import * as vscode from "vscode";
import { validateJavac } from "../java";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fs.mkdtempSync).mockReturnValue("/tmp/jr-sources-abc");
  vi.mocked(fs.readdirSync).mockReturnValue([]);
});

describe("findJavaFiles", () => {
  it("returns empty array for empty source paths", () => {
    expect(findJavaFiles([])).toEqual([]);
  });

  it("finds .java files recursively", () => {
    vi.mocked(fs.readdirSync).mockImplementation((dir) => {
      const d = String(dir);
      if (d === "/src") {
        return [
          { name: "Main.java", isFile: () => true, isDirectory: () => false },
          { name: "util", isFile: () => false, isDirectory: () => true },
          { name: "README.md", isFile: () => true, isDirectory: () => false },
        ] as unknown as fs.Dirent[];
      }
      if (d === "/src/util") {
        return [
          {
            name: "Helper.java",
            isFile: () => true,
            isDirectory: () => false,
          },
        ] as unknown as fs.Dirent[];
      }
      return [] as unknown as fs.Dirent[];
    });

    const files = findJavaFiles(["/src"]);
    expect(files).toEqual(["/src/Main.java", "/src/util/Helper.java"]);
  });

  it("skips directories that cannot be read", () => {
    vi.mocked(fs.readdirSync).mockImplementation(() => {
      throw new Error("EACCES");
    });

    expect(findJavaFiles(["/noaccess"])).toEqual([]);
  });
});

describe("compileJavaSources", () => {
  it("returns undefined when no java files found", async () => {
    const result = await compileJavaSources("/libs/jr.jar", ["/empty"]);
    expect(result).toBeUndefined();
  });

  it("returns temp dir on successful compilation", async () => {
    vi.mocked(fs.readdirSync).mockReturnValue([
      { name: "Foo.java", isFile: () => true, isDirectory: () => false },
    ] as unknown as fs.Dirent[]);

    vi.mocked(execFile).mockImplementation(
      (_cmd: unknown, _args: unknown, cb: unknown) => {
        (cb as (err: null, stdout: string, stderr: string) => void)(
          null,
          "",
          "",
        );
        return undefined as never;
      },
    );

    const result = await compileJavaSources("/libs/jr.jar", ["/src"]);
    expect(result).toBe("/tmp/jr-sources-abc");
    expect(execFile).toHaveBeenCalledWith(
      "javac",
      expect.arrayContaining(["-d", "/tmp/jr-sources-abc", "-cp"]),
      expect.any(Function),
    );
  });

  it("logs stdout when javac produces output", async () => {
    vi.mocked(fs.readdirSync).mockReturnValue([
      { name: "Foo.java", isFile: () => true, isDirectory: () => false },
    ] as unknown as fs.Dirent[]);

    vi.mocked(execFile).mockImplementation(
      (_cmd: unknown, _args: unknown, cb: unknown) => {
        (cb as (err: null, stdout: string, stderr: string) => void)(
          null,
          "Note: Some notes about compilation",
          "some warning",
        );
        return undefined as never;
      },
    );

    const result = await compileJavaSources("/libs/jr.jar", ["/src"]);
    expect(result).toBe("/tmp/jr-sources-abc");
  });

  it("returns undefined and shows error on compilation failure", async () => {
    vi.mocked(fs.readdirSync).mockReturnValue([
      { name: "Bad.java", isFile: () => true, isDirectory: () => false },
    ] as unknown as fs.Dirent[]);

    vi.mocked(execFile).mockImplementation(
      (_cmd: unknown, _args: unknown, cb: unknown) => {
        (cb as (err: Error, stdout: string, stderr: string) => void)(
          new Error("exit code 1"),
          "",
          "Bad.java:1: error: ';' expected",
        );
        return undefined as never;
      },
    );

    const result = await compileJavaSources("/libs/jr.jar", ["/src"]);
    expect(result).toBeUndefined();
    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining("Java source compilation failed"),
    );
  });

  it("returns undefined when javac validation fails", async () => {
    vi.mocked(fs.readdirSync).mockReturnValue([
      { name: "Foo.java", isFile: () => true, isDirectory: () => false },
    ] as unknown as fs.Dirent[]);
    vi.mocked(validateJavac).mockResolvedValue({
      ok: false,
      error:
        "JDK required for source path compilation. Cannot run 'javac': ENOENT",
    });

    const result = await compileJavaSources("/libs/jr.jar", ["/src"]);
    expect(result).toBeUndefined();
    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining("JDK required"),
    );
  });
});

describe("copyResourceFiles", () => {
  it("copies non-java files preserving relative paths", () => {
    vi.mocked(fs.readdirSync).mockImplementation((dir) => {
      const d = String(dir);
      if (d === "/src") {
        return [
          {
            name: "jasperreports_extension.properties",
            isFile: () => true,
            isDirectory: () => false,
          },
          { name: "Main.java", isFile: () => true, isDirectory: () => false },
          { name: "sub", isFile: () => false, isDirectory: () => true },
        ] as unknown as fs.Dirent[];
      }
      if (d === "/src/sub") {
        return [
          {
            name: "messages.properties",
            isFile: () => true,
            isDirectory: () => false,
          },
        ] as unknown as fs.Dirent[];
      }
      return [] as unknown as fs.Dirent[];
    });

    copyResourceFiles(["/src"], "/tmp/out");

    expect(fs.copyFileSync).toHaveBeenCalledWith(
      "/src/jasperreports_extension.properties",
      "/tmp/out/jasperreports_extension.properties",
    );
    expect(fs.copyFileSync).toHaveBeenCalledWith(
      "/src/sub/messages.properties",
      "/tmp/out/sub/messages.properties",
    );
    // .java files should NOT be copied
    expect(fs.copyFileSync).not.toHaveBeenCalledWith(
      expect.stringContaining("Main.java"),
      expect.anything(),
    );
  });

  it("skips unreadable directories", () => {
    vi.mocked(fs.readdirSync).mockImplementation(() => {
      throw new Error("EACCES");
    });

    expect(() => copyResourceFiles(["/noaccess"], "/tmp/out")).not.toThrow();
  });

  it("logs copied files when channel is provided", () => {
    vi.mocked(fs.readdirSync).mockImplementation((dir) => {
      const d = String(dir);
      if (d === "/src") {
        return [
          {
            name: "config.properties",
            isFile: () => true,
            isDirectory: () => false,
          },
        ] as unknown as fs.Dirent[];
      }
      return [] as unknown as fs.Dirent[];
    });

    const channel = { appendLine: vi.fn() };
    const count = copyResourceFiles(["/src"], "/tmp/out", channel);

    expect(count).toBe(1);
    expect(channel.appendLine).toHaveBeenCalledWith(
      expect.stringContaining("Copied resource: config.properties"),
    );
  });

  it("handles copyFileSync failure gracefully", () => {
    vi.mocked(fs.readdirSync).mockImplementation((dir) => {
      const d = String(dir);
      if (d === "/src") {
        return [
          {
            name: "data.xml",
            isFile: () => true,
            isDirectory: () => false,
          },
        ] as unknown as fs.Dirent[];
      }
      return [] as unknown as fs.Dirent[];
    });
    vi.mocked(fs.copyFileSync).mockImplementation(() => {
      throw new Error("EPERM");
    });

    const count = copyResourceFiles(["/src"], "/tmp/out");
    expect(count).toBe(0);
  });

  it("copies from multiple source paths", () => {
    vi.mocked(fs.copyFileSync).mockImplementation(() => {});
    vi.mocked(fs.readdirSync).mockImplementation((dir) => {
      const d = String(dir);
      if (d === "/src1") {
        return [
          {
            name: "a.properties",
            isFile: () => true,
            isDirectory: () => false,
          },
        ] as unknown as fs.Dirent[];
      }
      if (d === "/src2") {
        return [
          {
            name: "b.properties",
            isFile: () => true,
            isDirectory: () => false,
          },
        ] as unknown as fs.Dirent[];
      }
      return [] as unknown as fs.Dirent[];
    });

    const count = copyResourceFiles(["/src1", "/src2"], "/tmp/out");

    expect(count).toBe(2);
    expect(fs.copyFileSync).toHaveBeenCalledWith(
      "/src1/a.properties",
      "/tmp/out/a.properties",
    );
    expect(fs.copyFileSync).toHaveBeenCalledWith(
      "/src2/b.properties",
      "/tmp/out/b.properties",
    );
  });
});

describe("cleanupTempDir", () => {
  it("removes directory recursively", () => {
    cleanupTempDir("/tmp/jr-sources-abc");
    expect(fs.rmSync).toHaveBeenCalledWith("/tmp/jr-sources-abc", {
      recursive: true,
      force: true,
    });
  });

  it("does not throw when rmSync fails", () => {
    vi.mocked(fs.rmSync).mockImplementation(() => {
      throw new Error("EPERM");
    });
    expect(() => cleanupTempDir("/tmp/jr-sources-abc")).not.toThrow();
  });
});
