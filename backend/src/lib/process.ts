import { spawn, type SpawnOptions } from 'child_process';

export interface RunResult {
  code: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
}

export interface RunOptions extends SpawnOptions {
  timeoutMs?: number;
  maxOutput?: number;
  onStdout?: (chunk: string) => void;
  onStderr?: (chunk: string) => void;
  /** Receives a function that kills the process (for cancellation) */
  onSpawn?: (kill: () => void) => void;
}

export class ProcessError extends Error {
  constructor(message: string, readonly result?: RunResult, readonly notFound = false) {
    super(message);
  }
}

/** Spawn a process without a shell, collect capped output, reject on spawn failure or timeout. */
export function runProcess(command: string, args: string[], options: RunOptions = {}): Promise<RunResult> {
  const { timeoutMs, maxOutput = 64 * 1024, onStdout, onStderr, onSpawn, ...spawnOpts } = options;

  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    let settled = false;
    let timedOut = false;

    const child = spawn(command, args, { ...spawnOpts, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });

    const kill = () => {
      if (child.exitCode === null && !child.killed) {
        child.kill('SIGTERM');
        setTimeout(() => { if (child.exitCode === null) child.kill('SIGKILL'); }, 5000).unref();
      }
    };
    onSpawn?.(kill);

    const timer = timeoutMs ? setTimeout(() => { timedOut = true; kill(); }, timeoutMs) : null;

    child.stdout?.on('data', (d: Buffer) => {
      const s = d.toString();
      if (stdout.length < maxOutput) stdout += s;
      onStdout?.(s);
    });
    child.stderr?.on('data', (d: Buffer) => {
      const s = d.toString();
      if (stderr.length < maxOutput) stderr += s;
      onStderr?.(s);
    });

    child.on('error', (err: NodeJS.ErrnoException) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      const notFound = err.code === 'ENOENT';
      reject(new ProcessError(notFound ? `${command} is not installed or not on PATH` : err.message, undefined, notFound));
    });

    child.on('close', (code, signal) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      const result = { code, signal, stdout, stderr };
      if (timedOut) reject(new ProcessError(`${command} timed out`, result));
      else resolve(result);
    });
  });
}

/** Last meaningful lines of a process' stderr, for error messages */
export function tail(text: string, lines = 3, maxLength = 400): string {
  const out = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(-lines)
    .join(' | ');
  return out.length > maxLength ? out.slice(-maxLength) : out;
}
