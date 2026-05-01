import * as vscode from "vscode";
import { execFile } from "child_process";

/**
 * Resolves the path to the `java` executable.
 *
 * Resolution order:
 * 1. `jasperreports.java.home` extension setting
 * 2. `JAVA_HOME` environment variable
 * 3. `java` on the system PATH
 *
 * Returns `undefined` if Java cannot be found.
 */
export function resolveJavaExecutable(): string | undefined {
  const config = vscode.workspace.getConfiguration("jasperreports");
  const configuredHome = config.get<string>("java.home", "").trim();

  if (configuredHome) {
    return `${configuredHome}/bin/java`;
  }

  const javaHome = process.env.JAVA_HOME?.trim();
  if (javaHome) {
    return `${javaHome}/bin/java`;
  }

  // Fall back to PATH
  return "java";
}

/**
 * Validates that the resolved java executable actually runs.
 * Returns the version string on success, or an error message on failure.
 */
export function validateJava(
  javaPath: string,
): Promise<{ ok: true; version: string } | { ok: false; error: string }> {
  return new Promise((resolve) => {
    execFile(javaPath, ["-version"], (err, _stdout, stderr) => {
      if (err) {
        resolve({
          ok: false,
          error: `Cannot run '${javaPath}': ${err.message}`,
        });
        return;
      }
      // java -version prints to stderr
      const version = stderr.split("\n")[0] ?? "unknown";
      resolve({ ok: true, version });
    });
  });
}
