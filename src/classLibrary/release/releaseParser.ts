import {Plugin, Release, ReleaseConfiguration} from "./configuration";
import {Core} from "@kirinnee/core";
import {Wrap} from "../util";
import {ToMap} from "./toMap";

interface PresetConfig {
    types: {
        type: string
        section?: string
        hidden?: boolean
    }[]
}

interface ReleaseRule {
    type?: string
    scope?: string
    release: Release
}

type SemanticReleasePlugin = ([string, unknown] | string);


interface ReleaseRc {
    branches: string[]
    plugins: SemanticReleasePlugin[]
}

function PluginToSemanticReleasePlugin(p: Plugin): SemanticReleasePlugin {
    return p.config ? [p.module, p.config] : p.module;
}


class ReleaseParser {

    constructor(core: Core) {
        core.AssertExtend();
    }

    parseReleaseRules(rc: ReleaseConfiguration): ReleaseRule[] {
        const base = rc.types.Map(x => ToMap(x.scopes).Map((k, v) => {
            const typing: ReleaseRule = {
                type: x.type,
                release: v.release,
            };
            if (k !== "default") typing.scope = k;
            return typing;
        })).flat();
        const additional: ReleaseRule[] = Wrap(rc.specialScopes)
            .map(m => ToMap(m).Map((k, v) => {
                return {
                    scope: k,
                    release: v.release,
                };
            })).unwrapOr([]);
        return [...base, ...additional];
    }

    parsePresetConfig(rc: ReleaseConfiguration): PresetConfig {
        return {
            types: rc.types.Map(x => {
                if (x.section) {
                    return {
                        type: x.type,
                        section: x.section,
                    };
                }
                return {
                    type: x.type,
                    hidden: true,
                };
            })
        };
    }

    generateDefaultPlugins(rc: ReleaseConfiguration): Plugin[] {
        return [
            {
                module: "@semantic-release/commit-analyzer",
                config: {
                    preset: "conventionalcommits",
                    parserOpts: rc.keywords,
                    releaseRules: this.parseReleaseRules(rc),
                    presetConfig: this.parsePresetConfig(rc),
                }
            },
            {
                module: "@semantic-release/release-notes-generator",
                config: {
                    preset: "conventionalcommits",
                    parserOpts: rc.keywords,
                    writerOpts: {commitsSort: ["subject", "scope"]},
                    presetConfig: this.parsePresetConfig(rc),
                }
            }
        ];
    }

    GenerateReleaseRc(rc: ReleaseConfiguration): ReleaseRc {
        const plugins = [...this.generateDefaultPlugins(rc), ...(rc.plugins ?? [])]
            .Map(PluginToSemanticReleasePlugin);
        return {
            branches: rc.branches,
            plugins,
        };
    }

}

export {
    ReleaseParser,
    PresetConfig,
    ReleaseRule,
    ReleaseRc,
    SemanticReleasePlugin,
    PluginToSemanticReleasePlugin
};
