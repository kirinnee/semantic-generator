import {Err, Ok, Result} from "@hqoss/monads";
import execa from "execa";
import {PR, PromiseResult} from "../../resultUtil";
import {Installer, Runtime} from "../executor";

class Yarn implements Runtime {

    Key: Installer = "yarn";

    Install(cwd: string): PromiseResult<Runtime, string[]> {
        const parent: Runtime = this;
        return PR(async (): Promise<Result<Runtime, string[]>> => {
            try {
                const installStream = execa("yarn", ["install", "--prefer-offline"], {cwd});
                installStream.stdout.pipe(process.stdout);
                await installStream;
                return Ok(parent);
            } catch (e) {
                return Err([e.toString()]);
            }
        });

    }

    Build(cwd: string): PromiseResult<Runtime, string[]> {
        const parent: Runtime = this;
        return PR(async (): Promise<Result<Runtime, string[]>> => {
            try {
                const installStream = execa("yarn", ["run", "build"], {cwd});
                installStream.stdout.pipe(process.stdout);
                await installStream;
                return Ok(parent);
            } catch (e) {
                return Err([e.toString()]);
            }
        });
    }

    Version(cwd: string, version: string): PromiseResult<Runtime, string[]> {
        const parent: Runtime = this;
        return PR(async (): Promise<Result<Runtime, string[]>> => {
            try {
                const installStream = execa("yarn", ["run", "docusaurus", "docs:version", version], {cwd});
                installStream.stdout.pipe(process.stdout);
                await installStream;
                return Ok(parent);
            } catch (e) {
                return Err([e.toString()]);
            }
        });
    }

    async Check(): Promise<boolean> {
        try {
            await execa("yarn", ["-v"]);
            return true;
        } catch (e) {
            return false;
        }
    }

    GlobalInstall(cwd: string, packages: string[]): PromiseResult<Runtime, string[]> {
        const parent = this;
        return PR(async (): Promise<Result<Runtime, string[]>> => {
            try {
                const installStream = execa("yarn", ["add", "-D", ...packages], {cwd});
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
                const installStream = execa("yarn", ["exec", "semantic-release"],  {cwd});
                installStream.stdout.pipe(process.stdout);
                await installStream;
                return Ok(parent);
            } catch (e) {
                return Err([e.toString()]);
            }
        });
    }


    GlobalFolder(): string {
        return execa.sync("yarn", ["global", "bin"]).stdout.toString();
    }
}

export {Yarn};
