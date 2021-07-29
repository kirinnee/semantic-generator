import {PR, PromiseResult} from "../../resultUtil";
import {Err, Ok, Result} from "@hqoss/monads";
import execa from "execa";
import {Installer, Runtime} from "../executor";

class Npm implements Runtime {


    Install(cwd: string): PromiseResult<Runtime, string[]> {
        const parent = this;
        return PR(async (): Promise<Result<Runtime, string[]>> => {
            try {
                const installStream = execa("npm", ["i"], {cwd});
                installStream.stdout.pipe(process.stdout);
                await installStream;
                return Ok(parent);
            } catch (e) {
                return Err([e.toString()]);
            }
        });
    }

    Build(cwd: string): PromiseResult<Runtime, string[]> {
        const parent = this;

        return PR(async (): Promise<Result<Runtime, string[]>> => {
            try {
                const buildStream = execa("npm", ["run", "build"], {cwd});
                buildStream.stdout.pipe(process.stdout);
                await buildStream;
                return Ok(parent);
            } catch (e) {
                return Err([e.toString()]);
            }
        });
    }

    async Check(): Promise<boolean> {
        try {
            await execa("npm", ["-v"]);
            return true;
        } catch (err) {
            return false;
        }
    }

    Version(cwd: string, version: string): PromiseResult<Runtime, string[]> {
        const parent = this;

        return PR(async (): Promise<Result<Runtime, string[]>> => {
            try {
                const installStream = execa("npm", ["run", "docusaurus", "docs:version", version], {cwd});
                installStream.stdout.pipe(process.stdout);
                await installStream;
                return Ok(parent);
            } catch (e) {
                return Err([e.toString()]);
            }
        });
    }

    Key: Installer = "npm";
}

export {Npm};