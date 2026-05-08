import { execFile } from "child_process";
import { getOutputChannel } from "./logger";

export interface JavaRunOpts {
  javaPath: string;
  classpath: string;
  /** Arguments after the classpath (e.g. ["JrCompiler", "compile", filePath]). */
  args: string[];
  cwd: string;
  /** Timeout in milliseconds. Defaults to 60 000. */
  timeout?: number;
}

export type JavaRunResult =
  | { ok: true; stdout: string; stderr: string }
  | { ok: false; error: string };

/**
 * Run a Java command via `execFile`, logging stdout/stderr to the output channel.
 *
 * Returns a Result-style discriminated union instead of always-resolving.
 * The `error` field on failure contains the first line of stderr (or err.message).
 */
export function runJava(opts: JavaRunOpts): Promise<JavaRunResult> {
  return new Promise((resolve) => {
    const args = ["-cp", opts.classpath, ...opts.args];

    execFile(
      opts.javaPath,
      args,
      { cwd: opts.cwd, timeout: opts.timeout ?? 60_000 },
      (err, stdout, stderr) => {
        const channel = getOutputChannel();
        if (stdout) {
          channel.appendLine(stdout);
        }
        if (stderr) {
          channel.appendLine(stderr);
        }

        if (err) {
          const errorMsg = stderr || err.message;
          channel.appendLine(`FAILED: ${errorMsg}`);
          channel.show(true);
          resolve({ ok: false, error: errorMsg.split("\n")[0] });
        } else {
          resolve({ ok: true, stdout, stderr });
        }
      },
    );
  });
}
