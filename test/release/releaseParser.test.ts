import {
    PluginToSemanticReleasePlugin,
    PresetConfig,
    ReleaseParser,
    ReleaseRule,
    SemanticReleasePlugin,
    ToMap
} from "../../src/classLibrary/release/releaseParser";
import {ReleaseConfiguration, Plugin} from "../../src/classLibrary/release/configuration";
import {Kore} from "@kirinnee/core";

const core = new Kore();
core.ExtendPrimitives();

describe("ToMap", function () {
    it("should transform k:v object into k:v maps", function () {
        const subj1: { [s: string]: number } = {
            "a": 5,
            "b": 6,
            "c": 7,
            "d": 8,
        };

        const subj2: { [s: string]: string } = {
            "a": "AA",
            "b": "BB",
            "c": "CC",
            "d": "DD",
        };

        type TestComplex = { color: string, release: "major" | "minor" | "patch", hidden?: boolean, numbers?: number[] }
        const subj3: { [s: string]: TestComplex } = {
            "green": {color: "green", release: "major"},
            "blue": {color: "blue", release: "minor", hidden: false},
            "pink": {color: "pink", release: "patch", numbers: [5, 10, -10982, -77182, 9, 0]},
            "white": {color: "white", release: "minor", hidden: true},
            "red": {color: "red", release: "patch", numbers: [], hidden: true},
        };

        const ex1 = new Map<string, number>([
            ["a", 5],
            ["b", 6],
            ["c", 7],
            ["d", 8],
        ]);
        const ex2 = new Map<string, string>([
            ["a", "AA"],
            ["b", "BB"],
            ["c", "CC"],
            ["d", "DD"],
        ]);
        const ex3 = new Map<string, TestComplex>([
            ["green", {color: "green", release: "major"}],
            ["blue", {color: "blue", release: "minor", hidden: false}],
            ["pink", {color: "pink", release: "patch", numbers: [5, 10, -10982, -77182, 9, 0]}],
            ["white", {color: "white", release: "minor", hidden: true}],
            ["red", {color: "red", release: "patch", numbers: [], hidden: true}],
        ]);

        const act1 = ToMap(subj1);
        const act2 = ToMap(subj2);
        const act3 = ToMap(subj3);

        expect(ex1).toEqual(act1);
        expect(ex2).toEqual(act2);
        expect(ex3).toEqual(act3);

    });
});


describe("PluginToSemanticReleasePlugin", function () {
    it("should convert plugins with config to Semantic Release Plugin (double)", function () {
        const subj: Plugin = {
            module: "@semantic-release/changelog",
            config: {
                changelogFile: "CHANGELOG.MD",
            }
        };

        const ex: SemanticReleasePlugin = [
            "@semantic-release/changelog",
            {
                changelogFile: "CHANGELOG.MD"
            }
        ];
        const act = PluginToSemanticReleasePlugin(subj);
        expect(act).toEqual(ex);
    });

    it("should convert plugins without config to Semantic Release Plugin (single)", function () {
        const subj: Plugin = {
            module: "@semantic-release/github"
        };
        const ex: SemanticReleasePlugin = "@semantic-release/github";

        const act = PluginToSemanticReleasePlugin(subj);
        expect(act).toEqual(ex);
    });
});

describe("ReleaseParser", function () {
    const configuration: ReleaseConfiguration = {
        gitlint: ".gitlint",
        conventionMarkdown: {
            path: "docs/developer/03-Commit Conventions.md",
            template: `---
id: commit-conventions
title: Commit Conventions
---

var___convention_docs___
`
        },
        keywords: ["BREAKING CHANGE", "BREAKING CHANGES", "BREAKING"],
        branches: ["main"],
        specialScopes: {
            "no-release": {
                desc: "Prevent release from happening",
                release: false,
            }
        },
        plugins: [
            {
                module: "@semantic-release/changelog",
                config: {
                    changelogFile: "CHANGELOG.md",
                }
            },
            {
                module: "@semantic-release/git",
                config: {
                    message: "release: ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
                }
            },
            {
                module: "@semantic-release/github"
            },
        ],
        types: [
            {
                type: "fix",
                section: "Bug Fixes",
                desc: "Fixed a bug within the repository",
                vae: {
                    verb: "fix",
                    application: "<title>",
                    example: "fix: dropdown flickering",
                },
                scopes: {
                    default: {
                        desc: "Generic fixes not under `drv` or `patch`",
                        release: "patch",
                    },
                    drv: {
                        desc: "Fixes in nix derivations in the repository",
                        release: "patch",
                    },
                    config: {
                        desc: "Fixes in configuration",
                        release: false,
                    },
                },
            },
            {
                type: "new",
                section: "New Packages",
                desc: "Fixed a bug within the repository",
                vae: {
                    verb: "add",
                    application: "<scope>, <title>",
                    example: "new(narwhal): a swiss army knife for docker"
                },
                scopes: {
                    default: {
                        desc: "Release a new package",
                        release: "minor",
                    }
                }
            },
            {
                type: "update",
                section: "Packages Updated",
                desc: "Update a package's version",
                scopes: {
                    default: {
                        desc: "Update a package's version",
                        release: "major",
                    },
                }
            },
            {
                type: "remove",
                section: "Removed Packages",
                desc: "Update a package's version",
                scopes: {
                    default: {
                        desc: "Update a package's version",
                        release: "major",
                    },
                }
            },
            {
                type: "docs",
                desc: "Add documentation",
                section: "Documentation Updates",
                scopes: {
                    default: {
                        desc: "Adds a generic documentation not related to `dev`, `pkg` or `user`",
                        release: false
                    },
                    user: {
                        desc: "Adds a user-side documentation",
                        release: false
                    },
                    dev: {
                        desc: "Adds a developer-side (contributing) documentation",
                        release: false
                    },
                    pkg: {
                        desc: "Updates a documentation on a package",
                        release: "patch"
                    }
                }
            },
            {
                type: "ci",
                desc: "Changed the CI pipeline",
                scopes: {
                    default: {
                        desc: "Update CI configuration",
                        release: false
                    }
                }
            },
            {
                type: "release",
                desc: "Initiate a release (machine initiated)",
                scopes: {
                    default: {
                        desc: "Machine initiated release",
                        release: false
                    }
                }
            },
            {
                type: "config",
                desc: "Update configuration of the repository",
                scopes: {
                    default: {
                        desc: "Updates the configuration of the repository, not related to the other scopes",
                        release: false
                    },
                    lint: {
                        desc: "Add, update or remove linters",
                        release: false
                    },
                    fmt: {
                        desc: "Add, update or remove formatters",
                        release: false
                    },
                    build: {
                        desc: "Add, update or change buyild pipelines and generators",
                        release: false
                    }, nix: {
                        desc: "Add, update or change nix shell",
                        release: false
                    },
                    env: {
                        desc: "Add, update or change environment",
                        release: false
                    },
                    ignore: {
                        desc: "Add, update or change ignore configurations",
                        release: false
                    }
                }
            },
            {
                type: "chore",
                desc: "Any chores, uncategorized, or small mistakes (like typos)",
                scopes: {
                    default: {
                        desc: "chores",
                        release: false
                    }
                }
            },
        ]
    };

    const parser = new ReleaseParser(configuration, core);

    describe("parseReleaseRules", function () {
        it("should parse types in atomi config into release rules", function () {

            const ex: ReleaseRule[] = [
                {
                    type: "fix",
                    release: "patch"
                },
                {
                    type: "fix",
                    scope: "drv",
                    release: "patch"
                },
                {
                    type: "fix",
                    scope: "config",
                    release: false
                },
                {
                    type: "new",
                    release: "minor"
                },
                {
                    type: "update",
                    release: "major"
                },
                {
                    type: "remove",
                    release: "major"
                },
                {
                    type: "docs",
                    release: false
                },
                {
                    type: "docs",
                    scope: "user",
                    release: false
                },
                {
                    type: "docs",
                    scope: "dev",
                    release: false
                },
                {
                    type: "docs",
                    scope: "pkg",
                    release: "patch"
                },
                {
                    type: "ci",
                    release: false
                },
                {
                    type: "release",
                    release: false
                },
                {
                    type: "config",
                    release: false,
                },
                {
                    type: "config",
                    release: false,
                    scope: "lint"
                },
                {
                    type: "config",
                    release: false,
                    scope: "fmt"
                },
                {
                    type: "config",
                    release: false,
                    scope: "build"
                },
                {
                    type: "config",
                    release: false,
                    scope: "nix"
                },
                {
                    type: "config",
                    release: false,
                    scope: "env"
                },
                {
                    type: "config",
                    release: false,
                    scope: "ignore"
                },
                {
                    type: "chore",
                    release: false,
                },
                {
                    scope: "no-release",
                    release: false
                }
            ];

            const act = parser.parseReleaseRules();

            expect(act).toEqual(ex);

        });
    });

    describe("parsePresetConfig", function () {
        it("should return a presetConfig for conventional commits", function () {
            const ex: PresetConfig = {
                types: [
                    {
                        type: "fix",
                        section: "Bug Fixes"
                    },
                    {
                        type: "new",
                        section: "New Packages"
                    },
                    {
                        type: "update",
                        section: "Packages Updated"
                    },
                    {
                        type: "remove",
                        section: "Removed Packages"
                    },
                    {
                        type: "docs",
                        section: "Documentation Updates"
                    },
                    {
                        type: "ci",
                        hidden: true
                    },
                    {
                        type: "release",
                        hidden: true
                    },
                    {
                        type: "config",
                        hidden: true
                    },
                    {
                        type: "chore",
                        hidden: true
                    }
                ]
            };

            const act = parser.parsePresetConfig();
            expect(act).toEqual(ex);
        });
    });

    describe("generateDefaultPlugins", function () {
        it("should generate the default plugins `commit-analyzer` and `release-note-generator`", function () {
            const ex = [
                {
                    module: "@semantic-release/commit-analyzer",
                    config: {
                        preset: "conventionalcommits",
                        parserOpts: [
                            "BREAKING CHANGE",
                            "BREAKING CHANGES",
                            "BREAKING"
                        ],
                        releaseRules: [
                            {
                                type: "fix",
                                release: "patch"
                            },
                            {
                                type: "fix",
                                scope: "drv",
                                release: "patch"
                            },
                            {
                                type: "fix",
                                scope: "config",
                                release: false
                            },
                            {
                                type: "new",
                                release: "minor"
                            },
                            {
                                type: "update",
                                release: "major"
                            },
                            {
                                type: "remove",
                                release: "major"
                            },
                            {
                                type: "docs",
                                release: false
                            },
                            {
                                type: "docs",
                                scope: "user",
                                release: false
                            },
                            {
                                type: "docs",
                                scope: "dev",
                                release: false
                            },
                            {
                                type: "docs",
                                scope: "pkg",
                                release: "patch"
                            },
                            {
                                type: "ci",
                                release: false
                            },
                            {
                                type: "release",
                                release: false
                            },
                            {
                                type: "config",
                                release: false
                            },
                            {
                                type: "config",
                                release: false,
                                scope: "lint"
                            },
                            {
                                type: "config",
                                release: false,
                                scope: "fmt"
                            },
                            {
                                type: "config",
                                release: false,
                                scope: "build"
                            },
                            {
                                type: "config",
                                release: false,
                                scope: "nix"
                            },
                            {
                                type: "config",
                                release: false,
                                scope: "env"
                            },
                            {
                                type: "config",
                                release: false,
                                scope: "ignore"
                            },
                            {
                                type: "chore",
                                release: false
                            },
                            {
                                scope: "no-release",
                                release: false
                            }
                        ],
                        presetConfig: {
                            types: [
                                {
                                    type: "fix",
                                    section: "Bug Fixes"
                                },
                                {
                                    type: "new",
                                    section: "New Packages"
                                },
                                {
                                    type: "update",
                                    section: "Packages Updated"
                                },
                                {
                                    type: "remove",
                                    section: "Removed Packages"
                                },
                                {
                                    type: "docs",
                                    section: "Documentation Updates"
                                },
                                {
                                    type: "ci",
                                    hidden: true
                                },
                                {
                                    type: "release",
                                    hidden: true
                                },
                                {
                                    type: "config",
                                    hidden: true
                                },
                                {
                                    type: "chore",
                                    hidden: true
                                }
                            ]
                        }
                    }
                },
                {
                    module: "@semantic-release/release-notes-generator",
                    config: {
                        preset: "conventionalcommits",
                        parserOpts: [
                            "BREAKING CHANGE",
                            "BREAKING CHANGES",
                            "BREAKING"
                        ],
                        writerOpts: {
                            commitsSort: [
                                "subject",
                                "scope"
                            ]
                        },
                        presetConfig: {
                            types: [
                                {
                                    type: "fix",
                                    section: "Bug Fixes"
                                },
                                {
                                    type: "new",
                                    section: "New Packages"
                                },
                                {
                                    type: "update",
                                    section: "Packages Updated"
                                },
                                {
                                    type: "remove",
                                    section: "Removed Packages"
                                },
                                {
                                    type: "docs",
                                    section: "Documentation Updates"
                                },
                                {
                                    type: "ci",
                                    hidden: true
                                },
                                {
                                    type: "release",
                                    hidden: true
                                },
                                {
                                    type: "config",
                                    hidden: true
                                },
                                {
                                    type: "chore",
                                    hidden: true
                                }
                            ]
                        }
                    }
                }
            ];

            const act = parser.generateDefaultPlugins();

            expect(act).toEqual(ex);

        });
    });

});
