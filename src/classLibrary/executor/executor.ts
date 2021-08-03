import {Err, Ok, Option, Result} from "@hqoss/monads";
import {PR, PromiseResult} from "../resultUtil";
import {BasicFileFactory, IFileFactory} from "../engine/basicFileFactory";
import {Core} from "@kirinnee/core";
import {Wrap} from "../util";

type Installer = "npm" | "yarn" | "pnpm";

interface Runtime {

    Key: Installer

    Build(cwd: string): PromiseResult<Runtime, string[]>

    Install(cwd: string): PromiseResult<Runtime, string[]>

    Version(cwd: string, version: string): PromiseResult<Runtime, string[]>

    GlobalInstall(cwd: string, packages: string[]): PromiseResult<Runtime, string[]>

    Release(cwd: string): PromiseResult<Runtime, string[]>

    GlobalFolder(): string;

    Check(): Promise<boolean>;
}


class Executor {

    private readonly executor: Option<Installer>;
    private readonly core: Core;
    private readonly runtimes: Runtime[];

    autoChooseRuntime(): PromiseResult<Runtime, string[]> {
        return PR(async (): Promise<Result<Runtime, string[]>> => {
            for (const v of this.runtimes) {
                const r = await v.Check();
                if (r) {
                    return Ok(v);
                }
            }
            return Err(["No runtime to be found in PATH. Supported: npm, yarn, pnpm"]);
        });
    }

    chooseRuntime(): PromiseResult<Runtime, string[]> {
        return PR(async () => {
            const r = this.executor.andThen(x => Wrap(this.runtimes.Find(r => r.Key === x)));
            if (r.isSome()) {
                const rt = r.unwrap();
                const valid = await rt.Check();
                if (valid) {
                    return Ok(rt);
                }
            }
            return await this.autoChooseRuntime().promise;
        });
    }


    Version(cwd: string, version: string): PromiseResult<IFileFactory, string[]> {
        return this.chooseRuntime()
            .andThenAsync(r => r.Install(cwd))
            .andThenAsync(r => r.Version(cwd, version))
            .map(() => new BasicFileFactory(cwd, this.core));
    }

    Build(cwd: string): PromiseResult<IFileFactory, string[]> {
        return this.chooseRuntime()
            .andThenAsync(r => r.Install(cwd))
            .andThenAsync(r => r.Build(cwd))
            .map(() => new BasicFileFactory(cwd, this.core).Sub("build"));
    }

    Release(cwd: string, packages: string[]): PromiseResult<Runtime, string[]> {
        return this.chooseRuntime()
            .andThenAsync(r => r.GlobalInstall(cwd, packages))
            .andThenAsync(r => r.Release(cwd));
    }

    constructor(executor: Option<Installer>, core: Core, runtimes: Runtime[]) {
        this.executor = executor;
        this.core = core;
        this.runtimes = runtimes;
    }

}

export {Executor, Runtime, Installer};
