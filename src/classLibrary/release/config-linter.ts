import * as fs from "graceful-fs";
import * as path from "path";
import yaml from "yaml";
import conventionalCommitsParser from "conventional-commits-parser";
import { StructError, validate } from "superstruct";
import { Err, Ok, Result } from "@hqoss/monads";
import { PromiseResult } from "../resultUtil";
import {
  ReleaseConfiguration,
  ReleaseConfigurationSchema,
} from "./configuration";

/**
 * Stable machine-readable identifiers for every way a release configuration can
 * be rejected. They are part of the CLI contract: hooks and CI grep for them,
 * so they are never reworded without a major bump.
 */
const LintCode = {
  Unreadable: "config-unreadable",
  Unparseable: "config-unparseable",
  Schema: "config-schema",
  NoTypes: "no-types",
  DuplicateType: "duplicate-type",
  MissingDefaultScope: "missing-default-scope",
  NoBranches: "no-branches",
  NoReleasePath: "no-release-path",
  GitlintMissing: "gitlint-missing",
  ConventionTemplateMissingVar: "convention-template-missing-var",
  PluginUnpinned: "plugin-unpinned",
  SpecialScopeCollision: "special-scope-collision",
  VaeExampleMismatch: "vae-example-mismatch",
} as const;

type LintCode = (typeof LintCode)[keyof typeof LintCode];

interface LintFinding {
  code: LintCode;
  where: string;
  message: string;
}

/** The variable the convention markdown template must interpolate. */
const CONVENTION_VAR = "var___convention_docs___";

function render(f: LintFinding): string {
  return `${f.code} [${f.where}]: ${f.message}`;
}

/**
 * Lints a release configuration without executing a release.
 *
 * Two tiers:
 *   structural — the file must exist, parse as YAML and satisfy the schema;
 *   semantic   — the schema-valid config must also describe a usable release.
 *
 * The semantic tier exists because superstruct only rejects wrong shapes. A
 * config can be perfectly shaped and still be unable to release anything, or
 * silently generate wrong convention docs.
 */
class ConfigLinter {
  private readonly cwd: string;

  constructor(cwd: string) {
    this.cwd = cwd;
  }

  /** Resolves against the configuration's own directory, not the process cwd. */
  private resolve(p: string): string {
    return path.resolve(this.cwd, p);
  }

  Lint(configPath: string): PromiseResult<string, string[]> {
    return new PromiseResult<string, string[]>(
      (async (): Promise<Result<string, string[]>> => {
        const target = this.resolve(configPath);

        let raw: string;
        try {
          raw = fs.readFileSync(target, "utf8");
        } catch (e) {
          const reason = e instanceof Error ? e.message : String(e);
          return Err([
            render({
              code: LintCode.Unreadable,
              where: configPath,
              message: `cannot read configuration: ${reason}`,
            }),
          ]);
        }

        let parsed: unknown;
        try {
          parsed = yaml.parse(raw);
        } catch (e) {
          const reason = e instanceof Error ? e.message : String(e);
          return Err([
            render({
              code: LintCode.Unparseable,
              where: configPath,
              message: `not valid YAML: ${reason}`,
            }),
          ]);
        }

        const [err, config] = validate(parsed, ReleaseConfigurationSchema, {
          coerce: true,
        });

        if (err instanceof StructError) {
          return Err(
            err.failures().map((f) =>
              render({
                code: LintCode.Schema,
                where: f.path.length > 0 ? f.path.join(".") : configPath,
                message: f.message,
              }),
            ),
          );
        }

        const findings = this.semantic(config as ReleaseConfiguration);
        if (findings.length > 0) return Err(findings.map(render));
        return Ok(
          `${configPath} is a valid release configuration (${
            (config as ReleaseConfiguration).types.length
          } types, ${
            (config as ReleaseConfiguration).branches.length
          } release branches)`,
        );
      })(),
    );
  }

  private semantic(rc: ReleaseConfiguration): LintFinding[] {
    const findings: LintFinding[] = [];

    if (rc.types.length === 0) {
      findings.push({
        code: LintCode.NoTypes,
        where: "types",
        message:
          "no commit types declared, so no commit can ever be classified",
      });
    }

    const seen = new Set<string>();
    for (const t of rc.types) {
      if (seen.has(t.type)) {
        findings.push({
          code: LintCode.DuplicateType,
          where: `types.${t.type}`,
          message: `commit type declared more than once; the later declaration silently wins`,
        });
      }
      seen.add(t.type);
    }

    for (const t of rc.types) {
      if (!Object.prototype.hasOwnProperty.call(t.scopes, "default")) {
        findings.push({
          code: LintCode.MissingDefaultScope,
          where: `types.${t.type}.scopes`,
          message:
            "no `default` scope; a scopeless commit of this type has no release rule",
        });
      }
    }

    if (rc.branches.length === 0) {
      findings.push({
        code: LintCode.NoBranches,
        where: "branches",
        message: "no release branches declared, so no branch can ever release",
      });
    }

    const canRelease = rc.types.some((t) =>
      Object.values(t.scopes).some((s) => s.release !== false),
    );
    if (rc.types.length > 0 && !canRelease) {
      findings.push({
        code: LintCode.NoReleasePath,
        where: "types",
        message:
          "every scope of every type has `release: false`, so no commit can ever produce a release",
      });
    }

    if (!fs.existsSync(this.resolve(rc.gitlint))) {
      findings.push({
        code: LintCode.GitlintMissing,
        where: "gitlint",
        message: `gitlint config \`${rc.gitlint}\` does not exist; \`sg gitlint\` cannot check or write it`,
      });
    }

    if (!rc.conventionMarkdown.template.includes(CONVENTION_VAR)) {
      findings.push({
        code: LintCode.ConventionTemplateMissingVar,
        where: "conventionMarkdown.template",
        message: `template does not interpolate \`${CONVENTION_VAR}\`, so the generated document would contain no conventions`,
      });
    }

    for (const [i, p] of (rc.plugins ?? []).entries()) {
      if (p.version == null || p.version.trim() === "") {
        findings.push({
          code: LintCode.PluginUnpinned,
          where: `plugins.${i}.version`,
          message: `plugin \`${p.module}\` has no version, so it resolves to \`latest\` and the release is not reproducible`,
        });
      }
    }

    const specialScopes = Object.keys(rc.specialScopes ?? {});
    for (const special of specialScopes) {
      for (const t of rc.types) {
        if (Object.prototype.hasOwnProperty.call(t.scopes, special)) {
          findings.push({
            code: LintCode.SpecialScopeCollision,
            where: `specialScopes.${special}`,
            message: `also declared as a scope of type \`${t.type}\`; which release rule applies is ambiguous`,
          });
        }
      }
    }

    for (const t of rc.types) {
      if (t.vae == null) continue;
      const parsedExample = conventionalCommitsParser.sync(t.vae.example);
      if (parsedExample.type !== t.type) {
        findings.push({
          code: LintCode.VaeExampleMismatch,
          where: `types.${t.type}.vae.example`,
          message: `example commit declares type \`${
            parsedExample.type ?? "<none>"
          }\`, not \`${t.type}\`; the generated document would document the wrong type`,
        });
      }
    }

    return findings;
  }
}

export { ConfigLinter, LintCode, CONVENTION_VAR };
