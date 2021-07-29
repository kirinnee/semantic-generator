import {Option} from "@hqoss/monads";
import {ReadFile} from "../engine/basicFileFactory";
import {ContentToString} from "../engine/vfs";
import yaml from "yaml";
import {PromiseResult} from "../resultUtil";
import {ReleaseConfiguration, ReleaseConfigurationValid} from "./configuration";

class ConfigReader {

    Read(c: Option<string>): PromiseResult<ReleaseConfiguration, string[]> {
        return ReadFile(c.unwrapOr("atomi_release.yaml"))
            .andThen(c => ContentToString(c))
            .mapErr(x => [x])
            .map(s => yaml.parse(s))
            .andThen(s => ReleaseConfigurationValid(s));
    }
}


export {ConfigReader};
