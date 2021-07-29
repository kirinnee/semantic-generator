import {Plugin, Release, ReleaseConfiguration} from "./configuration";
import {Core} from "@kirinnee/core";
import {Wrap} from "../util";

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

function ToMap<V>(i: { [s: string]: V }): Map<string, V> {
    return new Map<string, V>(Object.entries(i));
}


class ReleaseParser {
    private readonly rc: ReleaseConfiguration;

    constructor(rc: ReleaseConfiguration, core: Core) {
        this.rc = rc;
        core.AssertExtend();
    }

    parseReleaseRules(): ReleaseRule[] {
        const base = this.rc.types.Map(x => ToMap(x.scopes).Map((k, v) => {
            const typing: ReleaseRule = {
                type: x.type,
                release: v.release,
            };
            if (k !== "default") typing.scope = k;
            return typing;
        })).flat();
        const additional: ReleaseRule[] = Wrap(this.rc.specialScopes)
            .map(m => ToMap(m).Map((k, v) => {
                return {
                    scope: k,
                    release: v.release,
                };
            })).unwrapOr([]);
        return [...base, ...additional];

    }

    parsePresetConfig(): PresetConfig {
        return {
            types: this.rc.types.Map(x => {
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

    generateDefaultPlugins(): Plugin[] {
        return [
            {
                module: "@semantic-release/commit-analyzer",
                config: {
                    preset: "conventionalcommits",
                    parserOpts: this.rc.keywords,
                    releaseRules: this.parseReleaseRules(),
                    presetConfig: this.parsePresetConfig(),
                }
            },
            {
                module: "@semantic-release/release-notes-generator",
                config: {
                    preset: "conventionalcommits",
                    parserOpts: this.rc.keywords,
                    writerOpts: {commitsSort: ["subject", "scope"]},
                    presetConfig: this.parsePresetConfig(),
                }
            }
        ];
    }

    GenerateReleaseRc(): ReleaseRc {
        const plugins = [...this.generateDefaultPlugins(), ...(this.rc.plugins ?? [])]
            .Map(PluginToSemanticReleasePlugin);
        return {
            branches: this.rc.branches,
            plugins,
        };
    }

}

export {
    ReleaseParser,
    PresetConfig,
    ReleaseRule,
    ToMap,
    ReleaseRc,
    SemanticReleasePlugin,
    PluginToSemanticReleasePlugin
};
