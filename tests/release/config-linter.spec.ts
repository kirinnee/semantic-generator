import * as fs from "graceful-fs";
import * as os from "os";
import * as path from "path";
import yaml from "yaml";
import { should } from "chai";
import {
  ConfigLinter,
  LintCode,
} from "../../src/classLibrary/release/config-linter";

should();

/**
 * A configuration that lints clean. Every sabotage case below is this object
 * with exactly one thing broken, so a RED verdict is attributable to that one
 * mutation and nothing else.
 */
function baseline(): Record<string, unknown> {
  return {
    gitlint: ".gitlint",
    conventionMarkdown: {
      path: "docs/developer/Conventions.md",
      template: "---\nid: x\n---\nvar___convention_docs___\n",
    },
    keywords: ["BREAKING"],
    branches: ["main"],
    plugins: [{ module: "@semantic-release/github", version: "10.3.5" }],
    specialScopes: {
      "no-release": { desc: "Prevent release", release: false },
    },
    types: [
      {
        type: "fix",
        section: "Bug Fixes",
        desc: "Fixed a bug",
        vae: {
          verb: "fix",
          application: "<title>",
          example: "fix: dropdown flickering",
        },
        scopes: {
          default: { desc: "generic fixes", release: "patch" },
        },
      },
    ],
  };
}

describe("ConfigLinter", () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "sg-config-lint-"));
    // Every baseline config references `.gitlint`; it must really exist, or
    // `gitlint-missing` would fire in every case and mask the intended one.
    fs.writeFileSync(
      path.join(dir, ".gitlint"),
      "[general]\n[contrib-title-conventional-commits]\ntypes = fix\n",
    );
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  function write(config: unknown, name = "release.yaml"): string {
    fs.writeFileSync(path.join(dir, name), yaml.stringify(config));
    return name;
  }

  async function lint(name: string): Promise<[boolean, string[]]> {
    const r = await new ConfigLinter(dir).Lint(name).promise;
    return r.isOk() ? [true, [r.unwrap()]] : [false, r.unwrapErr()];
  }

  /** Asserts RED *and* that the failure carries the expected named code. */
  async function expectRed(config: unknown, code: string): Promise<string[]> {
    const [ok, msgs] = await lint(write(config));
    ok.should.equal(
      false,
      `expected a violation for ${code}, got OK: ${msgs.join("; ")}`,
    );
    msgs
      .some((m) => m.startsWith(`${code} `))
      .should.equal(
        true,
        `expected a finding with code \`${code}\`, got: ${msgs.join("; ")}`,
      );
    return msgs;
  }

  // ── the must-differ control ────────────────────────────────────────────────
  // Without this arm, an unconditionally-RED linter would pass every arm below.
  it("accepts a clean configuration", async () => {
    const [ok, msgs] = await lint(write(baseline()));
    ok.should.equal(true, `expected OK, got: ${msgs.join("; ")}`);
    msgs[0].should.contain("valid release configuration");
  });

  // ── structural tier ───────────────────────────────────────────────────────
  it("rejects a configuration file that does not exist", async () => {
    const [ok, msgs] = await lint("absent.yaml");
    ok.should.equal(false);
    msgs.length.should.equal(1);
    msgs[0].should.contain(LintCode.Unreadable);
  });

  it("rejects a configuration file that is not YAML", async () => {
    fs.writeFileSync(
      path.join(dir, "release.yaml"),
      "branches: [main\n  - :\t",
    );
    const [ok, msgs] = await lint("release.yaml");
    ok.should.equal(false);
    msgs.join(";").should.contain(LintCode.Unparseable);
  });

  it("rejects a configuration that violates the schema", async () => {
    const c = baseline();
    (c.types as Record<string, unknown>[])[0].scopes = "default";
    const msgs = await expectRed(c, LintCode.Schema);
    msgs.join(";").should.contain("types.0.scopes");
  });

  // ── semantic tier ─────────────────────────────────────────────────────────
  it("rejects an empty type list", async () => {
    const c = baseline();
    c.types = [];
    await expectRed(c, LintCode.NoTypes);
  });

  it("rejects a duplicated commit type", async () => {
    const c = baseline();
    const types = c.types as Record<string, unknown>[];
    c.types = [types[0], { ...types[0], section: "Other" }];
    await expectRed(c, LintCode.DuplicateType);
  });

  it("rejects a type with no default scope", async () => {
    const c = baseline();
    (c.types as Record<string, unknown>[])[0].scopes = {
      drv: { desc: "derivations", release: "patch" },
    };
    await expectRed(c, LintCode.MissingDefaultScope);
  });

  it("rejects an empty branch list", async () => {
    const c = baseline();
    c.branches = [];
    await expectRed(c, LintCode.NoBranches);
  });

  it("rejects a configuration in which nothing can ever release", async () => {
    const c = baseline();
    (c.types as Record<string, unknown>[])[0].scopes = {
      default: { desc: "generic fixes", release: false },
    };
    await expectRed(c, LintCode.NoReleasePath);
  });

  it("rejects a gitlint path that does not exist", async () => {
    const c = baseline();
    c.gitlint = ".gitlint-absent";
    await expectRed(c, LintCode.GitlintMissing);
  });

  it("rejects a convention template that drops the conventions variable", async () => {
    const c = baseline();
    c.conventionMarkdown = {
      path: "docs/developer/Conventions.md",
      template: "---\nid: x\n---\nno variable here\n",
    };
    await expectRed(c, LintCode.ConventionTemplateMissingVar);
  });

  it("rejects an unpinned plugin", async () => {
    const c = baseline();
    c.plugins = [{ module: "@semantic-release/github" }];
    const msgs = await expectRed(c, LintCode.PluginUnpinned);
    msgs.join(";").should.contain("@semantic-release/github");
  });

  it("rejects a special scope that collides with a type scope", async () => {
    const c = baseline();
    (c.types as Record<string, unknown>[])[0].scopes = {
      default: { desc: "generic fixes", release: "patch" },
      "no-release": { desc: "collides", release: false },
    };
    await expectRed(c, LintCode.SpecialScopeCollision);
  });

  it("rejects a v.a.e example whose type does not match its own entry", async () => {
    const c = baseline();
    (c.types as Record<string, unknown>[])[0].vae = {
      verb: "fix",
      application: "<title>",
      example: "chore: dropdown flickering",
    };
    const msgs = await expectRed(c, LintCode.VaeExampleMismatch);
    msgs.join(";").should.contain("chore");
  });

  // ── scope of the check ────────────────────────────────────────────────────
  it("resolves relative paths against the configuration's directory, not the process cwd", async () => {
    // `.gitlint` exists in `dir` but not in the process cwd. A linter that
    // resolved against cwd would report `gitlint-missing` here.
    const [ok] = await lint(write(baseline()));
    ok.should.equal(true);
    fs.existsSync(path.join(process.cwd(), ".gitlint-absent")).should.equal(
      false,
    );
  });
});
