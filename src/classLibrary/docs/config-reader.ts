import {Option} from "@hqoss/monads";
import {InputConfig, InputConfigValid} from "./configuration";
import {IFileFactory, ReadFile} from "../engine/basicFileFactory";
import {ContentToString} from "../engine/vfs";
import yaml from "yaml";
import {PromiseResult} from "../resultUtil";

class ConfigReader {

    private readonly srcFileFactory: IFileFactory;

    constructor(srcFileFactory: IFileFactory) {
        this.srcFileFactory = srcFileFactory;
    }

    Read(c: Option<string>): PromiseResult<InputConfig, string[]> {
        return c
            .match({
                none: () => this.srcFileFactory.ReadSingle("atomi_docs.yaml").map(x => x.content),
                some: (val: string) => ReadFile(val),
            })
            .andThen(c => ContentToString(c))
            .mapErr(x => [x])
            .map(s => yaml.parse(s))
            .andThen(s => InputConfigValid(s));
    }
}


export {ConfigReader};
