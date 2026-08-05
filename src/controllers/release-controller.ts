import { Command } from "commander";
import { Core } from "@kirinnee/core";
import { Wrap } from "../classLibrary/util";
import { ReleaseParser } from "../classLibrary/release/releaseParser";
import { ConfigReader } from "../classLibrary/release/config-reader";
import { Npm } from "../classLibrary/executor/runtimes/npm";
import { Yarn } from "../classLibrary/executor/runtimes/yarn";
import { Pnpm } from "../classLibrary/executor/runtimes/pnpm";
import { CommitConventionDocumentParser } from "../classLibrary/release/documentParser";
import { MarkdownTable } from "../markdown-table";
import { VarResolver } from "../classLibrary/engine/resolver";
import { Executor, Installer } from "../classLibrary/executor/executor";
import { ReleaseExecutor } from "../classLibrary/release/ReleaseExecutor";
import { BasicWriter } from "../classLibrary/engine/writer";
import * as path from "path";
import {
  defaultVersions,
  VersionManager,
} from "../classLibrary/release/verison-manager";
import { None, Option, Some } from "@hqoss/monads";
import { BumpCommand } from "../classLibrary/release/bump/self-command";

export function ToInstaller(s?: string): Option<Installer> {
  return Wrap(s).andThen((x) => {
    switch (x) {
      case "npm":
      case "pnpm":
      case "yarn":
        return Some(x as Installer);
      default:
        return None;
    }
  });
}

export function ReleaseController(core: Core, c: Command): void {
  c.option(
    "-c, --config <cfg>",
    "path to configuration. default: atomi_docs.yaml",
  )
    .option(
      "-i, --installer <installer>",
      "Type of installer to use. default: try all. possible values: npm, yarn, pnpm",
    )
    .option(
      "--sr <version>",
      `Version of semantic-release to use. default: ${defaultVersions.semanticRelease}`,
    )
    .option(
      "--cccc <version>",
      `Version of conventional-changelog-conventionalcommits to use. default: ${defaultVersions.conventionalChangelogConventionalCommits}`,
    )
    .option(
      "--ca <version>",
      `Version of @semantic-release/commit-analyzer to use. default: ${defaultVersions.commitAnalyzer}`,
    )
    .option(
      "--rng <version>",
      "Version of @semantic-release/release-notes-generator to use. default: ${defaultVersions.releaseNoteGenerator}",
    )

    .action(async function (opts: { [s: string]: string }) {
      let error = false;
      try {
        const cwd = path.resolve(".");
        const configPath = Wrap(opts.config);
        const semanticRelease = Wrap(opts.sr);
        const conventionalChangelogConventionalCommits = Wrap(opts.cccc);
        const commitAnalyzer = Wrap(opts.ca);
        const releaseNoteGenerator = Wrap(opts.rng);
        const installer = ToInstaller(opts.installer);
        const vResolver = new VarResolver(core);
        const runtimes = [new Pnpm(), new Yarn(), new Npm()];
        const executor = new Executor(installer, core, runtimes);
        const mdt = new MarkdownTable(core);
        const reader = new ConfigReader();
        const writer = new BasicWriter(core, cwd);
        const docParser = new CommitConventionDocumentParser(
          vResolver,
          mdt,
          core,
        );
        const versionManager = new VersionManager(
          semanticRelease,
          conventionalChangelogConventionalCommits,
          commitAnalyzer,
          releaseNoteGenerator,
        );
        const releaseParser = new ReleaseParser(core, BumpCommand(configPath));
        const releaser = new ReleaseExecutor(
          docParser,
          releaseParser,
          writer,
          executor,
          versionManager,
          cwd,
        );
        console.log("Default packages: ", versionManager.defaultPackages);
        const r = await reader
          .Read(configPath)
          .andThenAsync(async (c) => releaser.Release(c)).promise;
        r.match({
          err: (e) => {
            e.map((w) => console.warn(w));
            error = true;
          },
          ok: () => console.log("Successfully released!"),
        });
      } catch (err) {
        console.warn(err);
      }
      if (error) process.exit(1);
    });
}
