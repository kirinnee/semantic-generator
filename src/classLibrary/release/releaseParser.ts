import { Bump, Plugin, Release, ReleaseConfiguration } from "./configuration";
import { Core } from "@kirinnee/core";
import { Wrap } from "../util";
import { ToMap } from "./toMap";
import { Bumper } from "./bump/bumper";

const GIT_PLUGIN = "@semantic-release/git";
const EXEC_PLUGIN = "@semantic-release/exec";

interface PresetConfig {
  types: {
    type: string;
    section?: string;
    hidden?: boolean;
  }[];
}

interface ReleaseRule {
  type?: string;
  scope?: string;
  release: Release;
}

type SemanticReleasePlugin = [string, unknown] | string;

interface ReleaseRc {
  branches: string[];
  plugins: SemanticReleasePlugin[];
}

function PluginToSemanticReleasePlugin(p: Plugin): SemanticReleasePlugin {
  return p.config ? [p.module, p.config] : p.module;
}

class ReleaseParser {
  /**
   * The command that invokes this generator's own `bump` subcommand, without the
   * version argument. Injected rather than derived here so it is exactly
   * assertable in tests and so the caller owns how it locates itself.
   */
  private readonly bumpCommand: string;

  constructor(core: Core, bumpCommand: string) {
    core.AssertExtend();
    this.bumpCommand = bumpCommand;
  }

  parseReleaseRules(rc: ReleaseConfiguration): ReleaseRule[] {
    const base = rc.types
      .Map((x) =>
        ToMap(x.scopes).Map((k, v) => {
          const typing: ReleaseRule = {
            type: x.type,
            release: v.release,
          };
          if (k !== "default") typing.scope = k;
          return typing;
        }),
      )
      .flat();
    const additional: ReleaseRule[] = Wrap(rc.specialScopes)
      .map((m) =>
        ToMap(m).Map((k, v) => {
          return {
            scope: k,
            release: v.release,
          };
        }),
      )
      .unwrapOr([]);
    return [...base, ...additional];
  }

  parsePresetConfig(rc: ReleaseConfiguration): PresetConfig {
    return {
      types: rc.types.Map((x) => {
        if (x.section) {
          return {
            type: x.type,
            section: x.section,
          };
        }
        return {
          type: x.type,
          hidden: true,
        };
      }),
    };
  }

  generateDefaultPlugins(rc: ReleaseConfiguration): Plugin[] {
    return [
      {
        module: "@semantic-release/commit-analyzer",
        config: {
          preset: "conventionalcommits",
          parserOpts: rc.keywords,
          releaseRules: this.parseReleaseRules(rc),
          presetConfig: this.parsePresetConfig(rc),
        },
      },
      {
        module: "@semantic-release/release-notes-generator",
        config: {
          preset: "conventionalcommits",
          parserOpts: rc.keywords,
          writerOpts: { commitsSort: ["subject", "scope"] },
          presetConfig: this.parsePresetConfig(rc),
        },
      },
    ];
  }

  /**
   * The prepare-step command that performs the bump. `${nextRelease.version}` is
   * emitted literally for semantic-release to template at release time.
   */
  bumpPrepareCmd(): string {
    return `${this.bumpCommand} \${nextRelease.version}`;
  }

  /**
   * Wires bumping into the generated release configuration.
   *
   * This is what makes the releaser the owner of the version number: the bump
   * runs as a `prepare` step of the release itself, so no template needs a bump
   * script and no repository needs a bump hook.
   *
   * Two things have to be true for a bump to be real, and both are done here:
   *
   *  1. The exec plugin must run BEFORE `@semantic-release/git`, or the commit is
   *     built from pre-bump bytes. It is therefore inserted immediately before the
   *     git plugin rather than appended.
   *
   *  2. The bumped files must be in the git plugin's `assets`, or the bump is
   *     written to the working tree and then thrown away — a bump that happened
   *     and left no trace, which reads exactly like a bump that worked.
   */
  private wireBumps(bumps: Bump[], plugins: Plugin[]): Plugin[] {
    // A null resolution means the entry named no file for a type that has no
    // default. The schema rejects that, and the bump step errors on it; there is
    // no path to add as a release asset, so it is dropped here rather than
    // becoming the string "null" in the git plugin's asset list.
    const paths = bumps
      .map((b) => Bumper.Resolve(b))
      .filter((p): p is string => p !== null);

    const withAssets = plugins.map((p) => {
      if (p.module !== GIT_PLUGIN) return p;
      const config = (p.config ?? {}) as { assets?: unknown };
      const existing = Array.isArray(config.assets)
        ? (config.assets as unknown[])
        : [];
      const missing = paths.filter((x) => !existing.includes(x));
      return {
        ...p,
        config: { ...config, assets: [...existing, ...missing] },
      };
    });

    const exec: Plugin = {
      module: EXEC_PLUGIN,
      config: { prepareCmd: this.bumpPrepareCmd() },
    };

    const gitAt = withAssets.findIndex((p) => p.module === GIT_PLUGIN);
    if (gitAt < 0) return [...withAssets, exec];
    return [...withAssets.slice(0, gitAt), exec, ...withAssets.slice(gitAt)];
  }

  GenerateReleaseRc(rc: ReleaseConfiguration): ReleaseRc {
    const configured = [
      ...this.generateDefaultPlugins(rc),
      ...(rc.plugins ?? []),
    ];
    const bumps = rc.bumps ?? [];
    const plugins = (
      bumps.length > 0 ? this.wireBumps(bumps, configured) : configured
    ).Map(PluginToSemanticReleasePlugin);
    return {
      branches: rc.branches,
      plugins,
    };
  }
}

export {
  ReleaseParser,
  PresetConfig,
  ReleaseRule,
  ReleaseRc,
  SemanticReleasePlugin,
  PluginToSemanticReleasePlugin,
};
