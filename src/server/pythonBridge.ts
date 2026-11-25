import { execFile, execFileSync } from 'node:child_process';
import path from 'node:path';

const PYTHON_BIN = process.env.PYTHON_BIN || 'python3';
const PROCESSOR_SCRIPT = path.resolve(process.cwd(), 'src', 'server', 'data_processor.py');
const EXEC_TIMEOUT_MS = 5000;
const MAX_BUFFER_BYTES = 10 * 1024 * 1024;

export type PythonProcessorCommand =
  | 'preprocess_product'
  | 'preprocess_rfq'
  | 'preprocess_catalog'
  | 'build_comparison_matrix'
  | 'preprocess_ai_query'
  | 'compute_fleet_analytics';

interface ProcessorEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export function runPythonProcessorSync<T>(
  command: PythonProcessorCommand,
  payload: unknown
): T {
  const stdout = execFileSync(PYTHON_BIN, [PROCESSOR_SCRIPT, command], {
    input: JSON.stringify(payload ?? {}),
    encoding: 'utf8',
    timeout: EXEC_TIMEOUT_MS,
    maxBuffer: MAX_BUFFER_BYTES,
  });

  const parsed = JSON.parse(stdout) as ProcessorEnvelope<T>;
  if (!parsed.ok) {
    throw new Error(parsed.error || `Python data processor failed for ${command}.`);
  }
  return parsed.data as T;
}

export async function runPythonProcessorAsync<T>(
  command: PythonProcessorCommand,
  payload: unknown
): Promise<T> {
  const stdout = await new Promise<string>((resolve, reject) => {
    const child = execFile(
      PYTHON_BIN,
      [PROCESSOR_SCRIPT, command],
      {
        encoding: 'utf8',
        timeout: EXEC_TIMEOUT_MS,
        maxBuffer: MAX_BUFFER_BYTES,
      },
      (err, out) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(out);
      }
    );
    child.stdin?.end(JSON.stringify(payload ?? {}));
  });

  const parsed = JSON.parse(stdout) as ProcessorEnvelope<T>;
  if (!parsed.ok) {
    throw new Error(parsed.error || `Python data processor failed for ${command}.`);
  }
  return parsed.data as T;
}
