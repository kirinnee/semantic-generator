import { Option } from "@hqoss/monads";
import { ReadFile } from "../engine/basicFileFactory";
import { ContentToString } from "../engine/vfs";
import yaml from "yaml";
import { PromiseResult } from "../resultUtil";
import {
  ReleaseConfiguration,
  ReleaseConfigurationValid,
} from "./configuration";

/**
 * The one and only default name of the release configuration file. Anything
 * that needs to name the config — help text, error messages — must read it from
 * here rather than spelling it out again, so the name lives in exactly one
 * place.
 */
const DefaultReleaseConfigPath = "atomi_release.yaml";

class ConfigReader {
  Read(c: Option<string>): PromiseResult<ReleaseConfiguration, string[]> {
    return ReadFile(c.unwrapOr(DefaultReleaseConfigPath))
      .andThen((c) => ContentToString(c))
      .mapErr((x) => [x])
      .map((s) => yaml.parse(s))
      .andThen((s) => ReleaseConfigurationValid(s));
  }
}

export { ConfigReader, DefaultReleaseConfigPath };
