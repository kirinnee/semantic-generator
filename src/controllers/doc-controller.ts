import tmp from "tmp-promise";
import rimraf from "rimraf";
import * as path from "path";

import {Command} from "commander";
import {Core} from "@kirinnee/core";
import {Generator} from "../classLibrary/docs/generate";
import {Wrap} from "../classLibrary/util";
import {BasicWriter} from "../classLibrary/engine/writer";
import {None, Option, Some} from "@hqoss/monads";
import {BasicFileFactory, IFileFactory} from "../classLibrary/engine/basicFileFactory";
import {FlagResolver, VarResolver} from "../classLibrary/engine/resolver";
import {ConfigReader} from "../classLibrary/docs/config-reader";
import {ArtifactManager} from "../classLibrary/docs/artifactManager";
import {Versioner} from "../classLibrary/docs/history_writer";
import {InputConfig} from "../classLibrary/docs/configuration";
import {Executor, Installer} from "../classLibrary/executor/executor";
import {Yarn} from "../classLibrary/executor/runtimes/yarn";
import {Npm} from "../classLibrary/executor/runtimes/npm";
import {Pnpm} from "../classLibrary/executor/runtimes/pnpm";


function ToInstaller(s?: string): Option<Installer> {
    return Wrap(s).andThen(x => {
        switch (x) {
        case "npm":
        case"pnpm":
        case "yarn":
            return Some(x as Installer);
        default:
            return None;
        }
    });
}

export function DocController(core: Core, c: Command): void {
    c.command("build <src> <target>")
        .option("-c, --config <cfg>", "path to configuration. default: atomi_docs.yaml")
        .option("-t, --tmp <tmp>", "path to tmp folder. default: random generated folder in /tmp")
        .option("-i, --installer <installer>", "Type of installer to use. default: try all. possible values: npm, yarn, pnpm")
        .option("-k, --keep-tmp", "Keep tmp file")
        .action(async function (src: string, target: string, opts: { [s: string]: string }) {
            const tmpPath = await Wrap(opts["tmp"]).match(
                {
                    some: (tmp) => Promise.resolve(path.resolve(tmp)),
                    none: async () => {
                        const td = await tmp.dir();
                        return td.path;
                    },
                }
            );
            let error = false;
            const keepTemp = opts.keepTmp;
            try {
                const configPath = Wrap(opts.config);
                const installer = ToInstaller(opts.installer);

                const srcPath = path.resolve(src);
                const tgtPath = path.resolve(target);
                const tplPath = path.resolve(__dirname, "../../template");

                const sourceFileFactory = new BasicFileFactory(srcPath, core);
                const templateFileFactory = new BasicFileFactory(tplPath, core);
                const targetWriter = new BasicWriter(core, tgtPath);
                const tmpWriter = new BasicWriter(core, tmpPath);
                const resolvers = [new VarResolver(core), new FlagResolver(core)];
                const runtimes = [new Pnpm(), new Yarn(), new Npm()];


                const generator = new Generator(templateFileFactory, sourceFileFactory, tmpWriter, resolvers);
                const artifactManager = new ArtifactManager(targetWriter);
                const cfgReader = new ConfigReader(sourceFileFactory);
                const exe = new Executor(installer, core, runtimes);
                // Read configuration
                const configResult = await cfgReader.Read(configPath)
                    .andThenAsync((config) => generator.generateTemp(config, src))
                    .run((dir) => console.log(`Generated folder at ${dir}`))
                    .andThenAsync(dir => exe.Build(dir))
                    .andThenAsync(ff => artifactManager.Copy(ff))
                    .promise;

                configResult.match({
                    err: (e) => {
                        console.warn(...e);
                        error = true;
                    },
                    ok: (o) => console.log(o),
                });
            } catch (err) {
                console.warn(err);
            } finally {
                if (!keepTemp) rimraf.sync(tmpPath);
                if (error) process.exit(1);
            }


        });


    c.command("version <src> <version>")
        .option("-c, --config <cfg>", "path to configuration. default: atomi_docs.yaml")
        .option("-t, --tmp <tmp>", "path to tmp folder. default: random generated folder in /tmp")
        .option("-i, --installer <installer>", "Type of installer to use. default: try all. possible values: npm, yarn, pnpm")
        .option("-k, --keep-tmp", "Keep tmp file")
        .action(async function (src: string, version: string, opts: { [s: string]: string }) {

            const tmpPath = await Wrap(opts["tmp"]).match(
                {
                    some: (tmp) => Promise.resolve(path.resolve(tmp)),
                    none: async () => {
                        const td = await tmp.dir();
                        return td.path;
                    },
                }
            );
            let error = false;
            const keepTemp = opts.keepTmp;
            try {

                const configPath = Wrap(opts.config);
                const installer = ToInstaller(opts.installer);

                const srcPath = path.resolve(src);
                const tplPath = path.resolve(__dirname, "../../template");


                const sourceFileFactory = new BasicFileFactory(srcPath, core);
                const templateFileFactory = new BasicFileFactory(tplPath, core);
                const tmpWriter = new BasicWriter(core, tmpPath);
                const srcWriter = new BasicWriter(core, srcPath);
                const resolvers = [new VarResolver(core), new FlagResolver(core)];
                const runtimes = [new Pnpm(), new Yarn(), new Npm()];


                const generator = new Generator(templateFileFactory, sourceFileFactory, tmpWriter, resolvers);
                const cfgReader = new ConfigReader(sourceFileFactory);
                const exe = new Executor(installer, core, runtimes);
                const versioner = new Versioner(srcWriter);
                // Read configuration
                const configResult = await cfgReader.Read(configPath)
                    .andThenAsync((config) => generator.generateTemp(config, src).map(v => [v, config] as [string, InputConfig]))
                    .run(([dir,]) => console.log(`Generated folder at ${dir}`))
                    .andThenAsync(([dir, config]) => exe.Version(dir, version).map(v => [v, config] as [IFileFactory, InputConfig]))
                    .andThenAsync(([ff, config]) => versioner.Copy(ff, config))
                    .promise;

                configResult.match({
                    err: (e) => {
                        console.warn(...e);
                        error = true;
                    },
                    ok: (o) => console.log(o),
                });
            } catch (err) {
                console.warn(err);
            } finally {
                if (!keepTemp) rimraf.sync(tmpPath);
                if (error) {
                    process.exit(1);
                }
            }
        });
}


export {ToInstaller};
