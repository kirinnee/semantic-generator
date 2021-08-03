import {Command} from "commander";
import {Core} from "@kirinnee/core";
import {Wrap} from "../classLibrary/util";
import {ConfigReader} from "../classLibrary/release/config-reader";
import {BasicWriter} from "../classLibrary/engine/writer";
import * as path from "path";
import {BasicFileFactory} from "../classLibrary/engine/basicFileFactory";
import {GitlintChecker} from "../classLibrary/release/gitlint-checker";


export function GitlintController(core: Core, c: Command): void {

    c
        .option("-c, --config <cfg>", "path to configuration. default: atomi_docs.yaml")
        .action(async function (opts: { [s: string]: string }) {
            let error = false;
            try {
                const cwd = path.resolve(".");
                const configPath = Wrap(opts.config);
                const fileFactory = new BasicFileFactory(cwd, core);
                const reader = new ConfigReader();
                const writer = new BasicWriter(core, cwd);
                const gitlint = new GitlintChecker(fileFactory, writer, core);

                const r = await reader.Read(configPath)
                    .andThenAsync(c => gitlint.Check(c).mapErr(x => [x])).promise;
                r.match({
                    err: (e) => {
                        e.Map(w => console.warn(w));
                        error = true;
                    },
                    ok: (o) => console.log(o)
                });
            } catch (err) {
                console.warn(err);
            }
            if (error) process.exit(1);
        });

}
