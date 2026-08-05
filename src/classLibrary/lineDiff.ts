interface UnifiedDiffOptions {
  /**
   * Number of unchanged lines rendered around each change. Default 3.
   */
  context?: number;
  /**
   * Label rendered on the `---` header line, describing the `-` side.
   */
  expectedLabel?: string;
  /**
   * Label rendered on the `+++` header line, describing the `+` side.
   */
  actualLabel?: string;
  /**
   * Safety valve for the O(n*m) LCS table. When the table would exceed this
   * many cells, a coarse summary is rendered instead of a full diff.
   */
  maxCells?: number;
}

const DefaultContext = 3;
const DefaultMaxCells = 4000000;

type OpKind = "equal" | "del" | "add";

interface Op {
  kind: OpKind;
  line: string;
}

interface Range {
  start: number;
  end: number;
}

interface SplitFile {
  lines: string[];
  trailingNewline: boolean;
}

/**
 * Splits a file body into its lines, recording separately whether the body
 * ended with a newline. `lines` + `trailingNewline` losslessly reconstruct the
 * original string, so a difference that lives purely in the trailing newline is
 * never silently swallowed.
 */
function SplitLines(s: string): SplitFile {
  if (s === "") return { lines: [], trailingNewline: false };
  const parts = s.split("\n");
  if (parts[parts.length - 1] === "") {
    parts.pop();
    return { lines: parts, trailingNewline: true };
  }
  return { lines: parts, trailingNewline: false };
}

function FirstDifferingLine(a: string[], b: string[]): number {
  const shorter = Math.min(a.length, b.length);
  for (let i = 0; i < shorter; i++) {
    if (a[i] !== b[i]) return i + 1;
  }
  return shorter + 1;
}

function ComputeOps(a: string[], b: string[]): Op[] {
  const n = a.length;
  const m = b.length;
  const width = m + 1;
  const dp = new Uint32Array((n + 1) * width);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i * width + j] =
        a[i] === b[j]
          ? dp[(i + 1) * width + (j + 1)] + 1
          : Math.max(dp[(i + 1) * width + j], dp[i * width + (j + 1)]);
    }
  }

  const ops: Op[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ kind: "equal", line: a[i] });
      i++;
      j++;
    } else if (dp[(i + 1) * width + j] >= dp[i * width + (j + 1)]) {
      ops.push({ kind: "del", line: a[i] });
      i++;
    } else {
      ops.push({ kind: "add", line: b[j] });
      j++;
    }
  }
  while (i < n) {
    ops.push({ kind: "del", line: a[i] });
    i++;
  }
  while (j < m) {
    ops.push({ kind: "add", line: b[j] });
    j++;
  }
  return ops;
}

function HunkRanges(ops: Op[], context: number): Range[] {
  const ranges: Range[] = [];
  for (let k = 0; k < ops.length; k++) {
    if (ops[k].kind === "equal") continue;
    let end = k;
    while (end + 1 < ops.length && ops[end + 1].kind !== "equal") end++;
    ranges.push({
      start: Math.max(0, k - context),
      end: Math.min(ops.length - 1, end + context),
    });
    k = end;
  }

  const merged: Range[] = [];
  for (const r of ranges) {
    const last = merged.length > 0 ? merged[merged.length - 1] : null;
    if (last != null && r.start <= last.end + 1) {
      last.end = Math.max(last.end, r.end);
    } else {
      merged.push({ start: r.start, end: r.end });
    }
  }
  return merged;
}

function RenderHunks(ops: Op[], context: number): string[] {
  const expectedLineAt: number[] = new Array(ops.length);
  const actualLineAt: number[] = new Array(ops.length);
  let expectedLine = 1;
  let actualLine = 1;
  for (let k = 0; k < ops.length; k++) {
    expectedLineAt[k] = expectedLine;
    actualLineAt[k] = actualLine;
    if (ops[k].kind !== "add") expectedLine++;
    if (ops[k].kind !== "del") actualLine++;
  }

  const out: string[] = [];
  for (const range of HunkRanges(ops, context)) {
    let expectedCount = 0;
    let actualCount = 0;
    const body: string[] = [];
    for (let k = range.start; k <= range.end; k++) {
      const op = ops[k];
      if (op.kind !== "add") expectedCount++;
      if (op.kind !== "del") actualCount++;
      const prefix = op.kind === "del" ? "-" : op.kind === "add" ? "+" : " ";
      body.push(`${prefix}${op.line}`);
    }
    const expectedStart = expectedCount === 0 ? 0 : expectedLineAt[range.start];
    const actualStart = actualCount === 0 ? 0 : actualLineAt[range.start];
    out.push(
      `@@ -${expectedStart},${expectedCount} +${actualStart},${actualCount} @@`,
    );
    for (const line of body) out.push(line);
  }
  return out;
}

/**
 * Renders a unified diff of two file bodies. Returns the empty string when the
 * two bodies are byte-identical, so the return value doubles as a "they differ"
 * signal.
 *
 * `-` lines come from `expected`, `+` lines come from `actual`.
 */
function UnifiedDiff(
  expected: string,
  actual: string,
  options: UnifiedDiffOptions = {},
): string {
  if (expected === actual) return "";

  const context = options.context ?? DefaultContext;
  const maxCells = options.maxCells ?? DefaultMaxCells;
  const expectedLabel = options.expectedLabel ?? "expected";
  const actualLabel = options.actualLabel ?? "actual";

  const e = SplitLines(expected);
  const a = SplitLines(actual);
  const header = [`--- ${expectedLabel}`, `+++ ${actualLabel}`];

  if ((e.lines.length + 1) * (a.lines.length + 1) > maxCells) {
    return [
      ...header,
      `(too large to diff: ${e.lines.length} expected lines vs ${a.lines.length} actual lines; first difference at line ${FirstDifferingLine(e.lines, a.lines)})`,
    ].join("\n");
  }

  const body = RenderHunks(ComputeOps(e.lines, a.lines), context);

  const notes: string[] = [];
  if (e.trailingNewline !== a.trailingNewline) {
    notes.push(
      e.trailingNewline
        ? `\\ ${actualLabel} has no newline at end of file`
        : `\\ ${expectedLabel} has no newline at end of file`,
    );
  }

  if (body.length === 0) {
    body.push(
      notes.length > 0
        ? "(lines are identical; only the trailing newline differs)"
        : "(bodies differ)",
    );
  }

  return [...header, ...body, ...notes].join("\n");
}

export { UnifiedDiff, UnifiedDiffOptions, SplitLines };
