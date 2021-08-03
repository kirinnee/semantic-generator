import {Command} from "commander";
import {Core} from "@kirinnee/core";
import {Wrap} from "../classLibrary/util";
import {ToInstaller} from "./doc-controller";
import {ReleaseParser} from "../classLibrary/release/releaseParser";
import {ConfigReader} from "../classLibrary/release/config-reader";
import {Npm} from "../classLibrary/executor/runtimes/npm";
import {Yarn} from "../classLibrary/executor/runtimes/yarn";
import {Pnpm} from "../classLibrary/executor/runtimes/pnpm";
import {CommitConventionDocumentParser} from "../classLibrary/release/documentParser";
import {MarkdownTable} from "../markdown-table";
import {VarResolver} from "../classLibrary/engine/resolver";
import {Executor} from "../classLibrary/executor/executor";
import {ReleaseExecutor} from "../classLibrary/release/ReleaseExecutor";
import {BasicWriter} from "../classLibrary/engine/writer";
import * as path from "path";


export function ReleaseController(core: Core, c: Command): void {

    c
        .option("-c, --config <cfg>", "path to configuration. default: atomi_docs.yaml")
        .option("-i, --installer <installer>", "Type of installer to use. default: try all. possible values: npm, yarn, pnpm")
        .action(async function (opts: { [s: string]: string }) {
            try {
                const cwd = path.resolve(".");
                const configPath = Wrap(opts.config);
                const installer = ToInstaller(opts.installer);
                const vResolver = new VarResolver(core);
                const runtimes = [new Pnpm(), new Yarn(), new Npm()];
                const executor = new Executor(installer, core, runtimes);
                const mdt = new MarkdownTable(core);
                const reader = new ConfigReader();
                const writer = new BasicWriter(core, cwd);
                const docParser = new CommitConventionDocumentParser(vResolver, mdt, core);
                const releaseParser = new ReleaseParser(core);
                const releaser = new ReleaseExecutor(docParser, releaseParser, writer, executor, cwd,);

                const r = await reader.Read(configPath)
                    .andThenAsync(async c => releaser.Release(c)).promise;
                r.match({
                    err: (e) => e.Map(w => console.warn(w)),
                    ok: () => console.log("Successfully released!")
                });

            } catch (err) {
                console.warn(err);
            }
        });

}
