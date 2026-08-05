import { Err, Ok, Result } from "@hqoss/monads";
import * as fs from "graceful-fs";
import * as path from "path";
import { PR, PromiseResult } from "../../resultUtil";
import { Bump, BumpTypeName } from "../configuration";
import { bumpPresets, NormalizeVersion, ValidVersion } from "./bump-types";

/**
 * Applies the configured bumps. The releaser owns the version number in every
 * runtime it releases; nothing downstream needs a bump script or a bump hook.
 */

interface BumpReport {
  type: BumpTypeName;
  /** Path as configured, relative to the target directory. */
  file: string;
  field: string;
  from: string;
  to: string;
  /** True when the entry overrode the preset's built-in default path. */
  overridden: boolean;
  reason?: string;
}

function ReadText(p: string): Promise<Result<string, string>> {
  return new Promise((resolve) => {
    fs.readFile(p, "utf8", (err, data) => {
      if (err) resolve(Err(err.message));
      else resolve(Ok(data as unknown as string));
    });
  });
}

function WriteText(p: string, content: string): Promise<Result<void, string>> {
  return new Promise((resolve) => {
    fs.writeFile(p, content, "utf8", (err) => {
      if (err) resolve(Err(err.message));
      else resolve(Ok(undefined));
    });
  });
}

class Bumper {
  private readonly target: string;

  constructor(target: string) {
    this.target = target;
  }

  /**
   * The path a bump entry resolves to, relative to the target directory, or
   * `null` when the type has no built-in default and the entry named no file.
   * The schema rejects that combination, so a `null` here means the entry reached
   * the engine unvalidated.
   */
  static Resolve(b: Bump): string | null {
    return b.file ?? bumpPresets[b.type].defaultFile;
  }

  /**
   * Reads and transforms EVERY entry before writing ANY of them. A half-applied
   * bump leaves the repository claiming two different versions at once, so a
   * failure anywhere has to mean nothing was written rather than some of it was.
   */
  Bump(bumps: Bump[], raw: string): PromiseResult<BumpReport[], string[]> {
    return PR(async (): Promise<Result<BumpReport[], string[]>> => {
      // Normalise before validating so a tag-shaped `v1.2.3` is accepted and
      // written as `1.2.3`, exactly as the bump scripts being replaced do.
      const version = NormalizeVersion(raw);
      const valid = ValidVersion(version);
      if (valid.isErr()) return Err([valid.unwrapErr()]);

      if (bumps.length === 0)
        return Err([
          "no bump entries are configured, so there is nothing to bump. " +
            "Add a `bumps` list to the release configuration, or do not invoke " +
            "the bump step at all — succeeding here would report a bump that " +
            "did not happen",
        ]);

      const seen = new Map<string, string>();
      const errors: string[] = [];
      const staged: { path: string; content: string; report: BumpReport }[] =
        [];

      for (const b of bumps) {
        const rel = Bumper.Resolve(b);
        if (rel === null) {
          errors.push(
            `${b.type}: has no built-in default path, so the entry must name a ` +
              "`file`. Refusing to guess where this runtime keeps its version",
          );
          continue;
        }
        const abs = path.resolve(this.target, rel);

        const owner = seen.get(abs);
        if (owner !== undefined) {
          errors.push(
            `${rel}: already claimed by the ${owner} entry. Two bump entries ` +
              `writing one file cannot both be the version of record`,
          );
          continue;
        }
        seen.set(abs, b.type);

        const preset = bumpPresets[b.type];
        const read = await ReadText(abs);
        if (read.isErr()) {
          errors.push(
            `${rel}: cannot be read for the ${b.type} bump: ${read.unwrapErr()}`,
          );
          continue;
        }

        const applied = preset.Apply(read.unwrap(), version);
        if (applied.isErr()) {
          errors.push(`${rel}: ${applied.unwrapErr()} [${b.type}]`);
          continue;
        }

        const outcome = applied.unwrap();
        staged.push({
          path: abs,
          content: outcome.content,
          report: {
            type: b.type,
            file: rel,
            field: preset.field,
            from: outcome.from,
            to: version,
            overridden: b.file !== undefined,
            reason: b.reason,
          },
        });
      }

      if (errors.length > 0) return Err(errors);

      const reports: BumpReport[] = [];
      for (const s of staged) {
        const wrote = await WriteText(s.path, s.content);
        if (wrote.isErr())
          return Err([
            `${s.report.file}: cannot be written: ${wrote.unwrapErr()}`,
          ]);
        reports.push(s.report);
      }
      return Ok(reports);
    });
  }
}

export { Bumper, BumpReport };
