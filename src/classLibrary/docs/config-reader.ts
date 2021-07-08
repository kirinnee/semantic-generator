import {Option, Result} from "@hqoss/monads";
import {InputConfig} from "./configuration";
import {IFileFactory, ReadBinary} from "../engine/basicFileFactory";
import {ContentToBuffer} from "../engine/vfs";
import yaml from "yaml";
import {PromiseResult} from "../resultUtil";

class ConfigReader {

    private readonly srcFileFactory: IFileFactory;

    constructor(srcFileFactory: IFileFactory) {
        this.srcFileFactory = srcFileFactory;
    }

    Read(c: Option<string>): PromiseResult<InputConfig, string[]> {
        const closure = async (): Promise<Result<InputConfig, string[]>> => {
            const r = await c.map(async x => {
                // try read if exist
                const content = await ReadBinary(x).mapErr(x => [x]);
                return content.map(b => b.toString("utf8"));
            })
                .match({
                    some: (p) => p,
                    // if doesnt exist, read default file
                    none: async () => {
                        const b = await this.srcFileFactory.ReadSingle("atomi_docs.yaml");
                        return b.map(v => ContentToBuffer(v.content).toString("utf8")).mapErr(x => [x]);
                    }
                });
            return await r.map(x => yaml.parse(x) as InputConfig).promise;
        };
        return new PromiseResult<InputConfig, string[]>(closure());
    }
}


export {ConfigReader};
