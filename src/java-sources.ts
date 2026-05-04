import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import { execFile } from "child_process";
import { resolveJavacExecutable, validateJavac } from "./java";
import { getOutputChannel } from "./logger";

/**
 * Recursively finds all `.java` files in the given directories.
 */
export function findJavaFiles(sourcePaths: string[]): string[] {
  const files: string[] = [];
  for (const dir of sourcePaths) {
    collectJavaFiles(dir, files);
  }
  return files;
}

function collectJavaFiles(dir: string, result: string[]): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectJavaFiles(full, result);
    } else if (entry.isFile() && entry.name.endsWith(".java")) {
      result.push(full);
    }
  }
}

/**
 * Compiles Java source files into a temp directory using `javac`.
 * Validates that `javac` is available before compiling.
 * Returns the temp output directory path on success, or `undefined` on failure.
 */
export async function compileJavaSources(
  classpath: string,
  sourcePaths: string[],
): Promise<string | undefined> {
  const javaFiles = findJavaFiles(sourcePaths);
  if (javaFiles.length === 0) {
    return undefined;
  }

  const javacPath = resolveJavacExecutable();
  const javacResult = await validateJavac(javacPath);
  if (!javacResult.ok) {
    vscode.window.showErrorMessage(javacResult.error);
    return undefined;
  }

  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "jr-sources-"));
  const channel = getOutputChannel();

  channel.appendLine(
    `Compiling ${javaFiles.length} Java source file(s) from ${sourcePaths.join(", ")}...`,
  );

  return new Promise((resolve) => {
    const args = ["-d", outDir, "-cp", classpath, ...javaFiles];

    execFile(javacPath, args, (err, stdout, stderr) => {
      if (stdout) {
        channel.appendLine(stdout);
      }
      if (stderr) {
        channel.appendLine(stderr);
      }

      if (err) {
        const errorMsg = stderr || err.message;
        channel.appendLine(`Java source compilation failed: ${errorMsg}`);
        channel.show(true);
        cleanupTempDir(outDir);
        vscode.window.showErrorMessage(
          `Java source compilation failed: ${errorMsg.split("\n")[0]}`,
        );
        resolve(undefined);
      } else {
        const copied = copyResourceFiles(sourcePaths, outDir, channel);
        channel.appendLine(
          `Java sources compiled to ${outDir} (${copied} resource file(s) copied)`,
        );
        resolve(outDir);
      }
    });
  });
}

/**
 * Copies non-`.java` resource files from source directories into the output
 * directory, preserving relative paths. This ensures that files like
 * `jasperreports_extension.properties` (which register custom functions,
 * fonts, etc.) are on the classpath alongside the compiled classes.
 */
export function copyResourceFiles(
  sourcePaths: string[],
  outDir: string,
  channel?: { appendLine(value: string): void },
): number {
  let count = 0;
  for (const srcDir of sourcePaths) {
    count += copyResources(srcDir, srcDir, outDir, channel);
  }
  return count;
}

function copyResources(
  baseDir: string,
  dir: string,
  outDir: string,
  channel?: { appendLine(value: string): void },
): number {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  let count = 0;
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      count += copyResources(baseDir, full, outDir, channel);
    } else if (entry.isFile() && !entry.name.endsWith(".java")) {
      const relative = path.relative(baseDir, full);
      const dest = path.join(outDir, relative);
      try {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(full, dest);
        channel?.appendLine(`  Copied resource: ${relative}`);
        count++;
      } catch {
        // best-effort copy
      }
    }
  }
  return count;
}

export function cleanupTempDir(dir: string): void {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // best-effort cleanup
  }
}
