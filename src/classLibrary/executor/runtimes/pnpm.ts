import {PR, PromiseResult} from "../../resultUtil";
import execa from "execa";
import {Err, Ok, Result} from "@hqoss/monads";
import {Installer, Runtime} from "../executor";

class Pnpm implements Runtime {


    Build(cwd: string): PromiseResult<Runtime, string[]> {
        const parent = this;

        return PR(async (): Promise<Result<Runtime, string[]>> => {
            try {
                const buildStream = execa("pnpm", ["run", "build"], {cwd});
                buildStream.stdout.pipe(process.stdout);
                await buildStream;

                return Ok(parent);
            } catch (e) {
                return Err([e.toString()]);
            }
        });
    }

    Install(cwd: string): PromiseResult<Runtime, string[]> {
        const parent = this;

        return PR(async (): Promise<Result<Runtime, string[]>> => {
            try {
                const installStream = execa("pnpm", ["i"], {cwd});
                installStream.stdout.pipe(process.stdout);
                await installStream;
                return Ok(parent);
            } catch (e) {
                return Err([e.toString()]);
            }
        });
    }

    Key: Installer = "pnpm";

    async Check(): Promise<boolean> {
        try {
            await execa("pnpm", ["-v"]);
            return true;
        } catch (err) {
            return false;
        }
    }

    Version(cwd: string, version: string): PromiseResult<Runtime, string[]> {
        const parent = this;

        return PR(async (): Promise<Result<Runtime, string[]>> => {
            try {
                const installStream = execa("pnpm", ["run", "docusaurus", "docs:version", version], {cwd});
                installStream.stdout.pipe(process.stdout);
                await installStream;
                return Ok(parent);
            } catch (e) {
                return Err([e.toString()]);
            }
        });
    }

    GlobalInstall(cwd: string, packages: string[]): PromiseResult<Runtime, string[]> {
        const parent = this;
        return PR(async (): Promise<Result<Runtime, string[]>> => {
            try {
                const installStream = execa("pnpm", ["add", "-D", ...packages], {cwd});
                installStream.stdout.pipe(process.stdout);
                await installStream;
                return Ok(parent);
            } catch (e) {
                return Err([e.toString()]);
            }
        });
    }

    Release(cwd: string): PromiseResult<Runtime, string[]> {
        const parent = this;
        return PR(async (): Promise<Result<Runtime, string[]>> => {
            try {
                const installStream = execa("pnpm", ["exec", "semantic-release"], {cwd});
                installStream.stdout.pipe(process.stdout);
                await installStream;
                return Ok(parent);
            } catch (e) {
                return Err([e.toString()]);
            }
        });
    }

    GlobalFolder(): string {
        return execa.sync("pnpm", ["bin", "-g"]).stdout.toString();
    }

}

export {Pnpm};
