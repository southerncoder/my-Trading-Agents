export interface WorkflowTestResult {
  name: string;
  passed: boolean;
  warnings?: string[];
  errors?: string[];
  metrics?: Record<string, any>;
  skipped?: boolean;
}

declare global {
  // eslint-disable-next-line no-var
  var __workflowResults: WorkflowTestResult[] | undefined;
}

if (!global.__workflowResults) {
  global.__workflowResults = [];
}

export function recordResult(result: WorkflowTestResult) {
  global.__workflowResults!.push(result);
}

export function captureAsync(name: string, fn: () => Promise<WorkflowTestResult | void>): Promise<void> {
  return fn()
    .then(r => {
      if (r) recordResult(r);
    })
    .catch(e => {
      recordResult({ name, passed: false, errors: [e instanceof Error ? e.message : String(e)] });
    });
}

export function markSkipped(name: string, reason: string, warnings: string[] = []) {
  recordResult({ name, passed: true, skipped: true, warnings: [reason, ...warnings] });
}

export function currentResults() { return global.__workflowResults!; }
