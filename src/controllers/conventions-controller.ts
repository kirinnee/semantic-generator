import { Command } from "commander";
import { Core } from "@kirinnee/core";
import * as path from "path";
import { Wrap } from "../classLibrary/util";
import {
  ConfigReader,
  DefaultReleaseConfigPath,
} from "../classLibrary/release/config-reader";
import { CommitConventionDocumentParser } from "../classLibrary/release/documentParser";
import { ConventionsChecker } from "../classLibrary/release/conventions-checker";
import { BasicWriter } from "../classLibrary/engine/writer";
import { VarResolver } from "../classLibrary/engine/resolver";
import { MarkdownTable } from "../markdown-table";

interface ConventionsOptions {
  config?: string;
  check?: boolean;
}

export function ConventionsController(core: Core, c: Command): void {
  c.description(
    "Generate the commit convention document from the release configuration",
  )
    .option(
      "-c, --config <cfg>",
      `path to configuration. default: ${DefaultReleaseConfigPath}`,
    )
    .option(
      "--check",
      "do not write; verify the document on disk matches the generated one and exit 1 if it does not",
    )
    .action(async function (opts: ConventionsOptions) {
      let error = false;
      try {
        const cwd = path.resolve(".");
        const configPath = Wrap(opts.config);
        const vResolver = new VarResolver(core);
        const mdt = new MarkdownTable(core);
        const docParser = new CommitConventionDocumentParser(
          vResolver,
          mdt,
          core,
        );
        const writer = new BasicWriter(core, cwd);
        const reader = new ConfigReader();
        const checker = new ConventionsChecker(
          docParser,
          writer,
          cwd,
          configPath.unwrapOr(DefaultReleaseConfigPath),
        );

        const r = await reader
          .Read(configPath)
          .mapErr((e) => e.join("\n"))
          .andThenAsync((rc) =>
            opts.check === true ? checker.Check(rc) : checker.Write(rc),
          ).promise;

        r.match({
          err: (e) => {
            console.warn(e);
            error = true;
          },
          ok: (o) => console.log(o),
        });
      } catch (err) {
        console.warn(err);
      }
      if (error) process.exit(1);
    });
}
