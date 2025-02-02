import { Command } from "commander";
import { Core } from "@kirinnee/core";
import { Wrap } from "../classLibrary/util";
import { ConfigReader } from "../classLibrary/release/config-reader";
import { CommitConventionDocumentParser } from "../classLibrary/release/documentParser";
import { MarkdownTable } from "../markdown-table";
import { VarResolver } from "../classLibrary/engine/resolver";
import * as path from "path";
import { Committer } from "../classLibrary/committer/committer";
import { CommitMessageFormatter } from "../classLibrary/committer/formatter";
import { CommitMessageGenerator } from "../classLibrary/committer/commitMessageGenerator";
import { Git } from "../classLibrary/committer/git";
import { AILoader } from "../classLibrary/ai-loader";
import { Option, Result } from "@hqoss/monads";
import { BasicWriter } from "../classLibrary/engine/writer";
import { CommitHookInstaller } from "../classLibrary/committer/install";

export function CommitterController(core: Core, c: Command): void {
  c.command("generate <commt_msg> <commit_path> <src>")
    .option(
      "-c, --config <cfg>",
      "path to configuration. default: atomi_docs.yaml",
    )
    .action(async function (
      commit_msg: string,
      commit_path: string,
      src: string,
      opts: { [s: string]: string },
    ) {
      let error = false;
      try {
        const cwd = path.resolve(".");
        const configPath = Wrap(opts.config);
        const vResolver = new VarResolver(core);
        const mdt = new MarkdownTable(core);
        const writer = new BasicWriter(core, cwd);
        const reader = new ConfigReader();
        const docParser = new CommitConventionDocumentParser(
          vResolver,
          mdt,
          core,
        );
        const git = new Git();
        const loader = new AILoader();
        const generator = new CommitMessageGenerator(
          core,
          docParser,
          loader,
          git,
        );
        const formatter = new CommitMessageFormatter();
        const committer = new Committer(generator, formatter, writer);

        const r: Result<string, string[]> = await reader
          .Read(configPath)
          .andThenAsync((c) =>
            committer.Commit(
              cwd,
              c,
              src === "message" ? commit_msg : "",
              commit_path,
            ),
          ).promise;
        r.match({
          err: (e) => {
            e.map((w) => console.warn(w));
            error = true;
          },
          ok: (s) => console.log(s),
        });
      } catch (err) {
        console.warn(err);
      }
      if (error) process.exit(1);
    });

  c.command("install").action(async function () {
    let error = false;
    try {
      const cwd = path.resolve(".");
      const writer = new BasicWriter(core, cwd);
      const installer = new CommitHookInstaller(writer);

      const r: Option<string> = await installer.Install();
      r.match({
        none: () => console.log("✅ successfully installed commit hook"),
        some: (e) => {
          console.warn(e);
          error = true;
        },
      });
    } catch (err) {
      console.warn(err);
    }
    if (error) process.exit(1);
  });
}
