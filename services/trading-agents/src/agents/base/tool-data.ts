import type { StructuredTool } from '@langchain/core/tools';

export interface ToolCall {
  tool: string;
  args: Record<string, unknown>;
  /** Optional reshaping of the raw tool output (e.g. trim a huge JSON blob). */
  transform?: (raw: string) => string;
  maxChars?: number;
}

/** Collapse Yahoo-style {raw, fmt} wrappers and drop noise so JSON fits a small model's context. */
export function compactJson(raw: string): string {
  try {
    const walk = (v: any): any => {
      if (Array.isArray(v)) return v.map(walk);
      if (v && typeof v === 'object') {
        if ('raw' in v) return v.fmt ?? v.raw;
        const out: Record<string, any> = {};
        for (const [k, val] of Object.entries(v)) {
          if (k === 'maxAge' || val === null || val === undefined) continue;
          out[k] = walk(val);
        }
        return out;
      }
      return v;
    };
    return JSON.stringify(walk(JSON.parse(raw)));
  } catch {
    return raw;
  }
}

/**
 * Yahoo reports debtToEquity as a PERCENT (16.77 means 0.17x, i.e. 16.77%), which small
 * models read as a 16.77x multiple. Rewrite it with explicit units after compaction.
 */
export function compactFundamentals(raw: string): string {
  const compact = compactJson(raw);
  try {
    const walk = (v: any): any => {
      if (Array.isArray(v)) return v.map(walk);
      if (v && typeof v === 'object') {
        const out: Record<string, any> = {};
        for (const [k, val] of Object.entries(v)) {
          if (k === 'debtToEquity') {
            const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/[,%]/g, ''));
            out[k] = Number.isFinite(n)
              ? `${n.toFixed(1)}% of equity (= ${(n / 100).toFixed(2)}x; under 1.0x means debt is below equity)`
              : val;
          } else {
            out[k] = walk(val);
          }
        }
        return out;
      }
      return v;
    };
    return JSON.stringify(walk(JSON.parse(compact)));
  } catch {
    return compact;
  }
}

/** Keep only the named top-level keys of a JSON object. */
export function pickKeys(keys: string[]): (raw: string) => string {
  return (raw) => {
    try {
      const obj = JSON.parse(raw);
      const out: Record<string, unknown> = {};
      for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
      return JSON.stringify(out);
    } catch {
      return raw;
    }
  };
}

/**
 * Run tools directly (no LLM tool-calling) and format the results for the prompt.
 * Small local models do not call tools reliably, so data is fetched in code and
 * the model is told to use only what is supplied.
 */
export async function fetchToolData(
  tools: StructuredTool[] | undefined,
  calls: ToolCall[],
  defaultMaxChars = 6000
): Promise<string> {
  const sections: string[] = [];
  for (const call of calls) {
    const tool = tools?.find((t) => t.name === call.tool);
    if (!tool) {
      sections.push(`### ${call.tool}\nERROR: tool not available`);
      continue;
    }
    try {
      const out = await tool.invoke(call.args as any);
      let text = typeof out === 'string' ? out : JSON.stringify(out);
      if (call.transform) text = call.transform(text);
      const limit = call.maxChars ?? defaultMaxChars;
      if (text.length > limit) text = text.slice(0, limit) + '\n[truncated]';
      sections.push(`### ${call.tool} ${JSON.stringify(call.args)}\n${text}`);
    } catch (error) {
      sections.push(`### ${call.tool}\nERROR: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return `FETCHED DATA (retrieved ${new Date().toISOString()}; snapshot values reflect fetch time)\n\n${sections.join('\n\n')}`;
}