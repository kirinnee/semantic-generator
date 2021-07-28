import {ReleaseConfiguration, ReleaseConfigurationValid} from "../../src/classLibrary/release/configuration";

describe("ReleaseConfigurationValid", () => {
    it("should return a result with the configuration if its successful", function () {
        const valid1 = {
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
                        default: "patch",
                        drv: "patch",
                        config: "patch",
                    }
                },
                {
                    type: "new",
                    section: "New Packages",
                    desc: "Fixed a bug within the repository",
                    vae: {
                        verb: "add",
                        application: "<scope>, <title>",
                        example: "new(narwhal): a aswiss army knife for docker"
                    },
                    scopes: {
                        default: "minor"
                    }
                },
                {
                    type: "update",
                    section: "Packages Updated",
                    desc: "Fixed a bug within the repository",
                    scopes: {
                        default: "major"
                    }
                }
            ]
        };
        const valid2 = {
            branches: ["main"],
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
                        default: "patch",
                        drv: "patch",
                        config: "patch",
                    }
                },
                {
                    type: "new",
                    section: "New Packages",
                    desc: "Fixed a bug within the repository",
                    vae: {
                        verb: "add",
                        application: "<scope>, <title>",
                        example: "new(narwhal): a aswiss army knife for docker"
                    },
                    scopes: {
                        default: "minor"
                    }
                },
                {
                    type: "update",
                    section: "Packages Updated",
                    desc: "Fixed a bug within the repository",
                    scopes: {
                        default: "major"
                    }
                }

            ]
        };
        const valid3 = {
            gitlint: ".gitlint",
            conventionMarkdown: {
                path: "docs/developer/03-Commit Conventions.md",
            },
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
                        default: "patch",
                        drv: "patch",
                        config: "patch",
                    }
                },
            ]
        };

        const ex1: ReleaseConfiguration = {
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
                        default: "patch",
                        drv: "patch",
                        config: "patch",
                    }
                },
                {
                    type: "new",
                    section: "New Packages",
                    desc: "Fixed a bug within the repository",
                    vae: {
                        verb: "add",
                        application: "<scope>, <title>",
                        example: "new(narwhal): a aswiss army knife for docker"
                    },
                    scopes: {
                        default: "minor"
                    }
                },
                {
                    type: "update",
                    section: "Packages Updated",
                    desc: "Fixed a bug within the repository",
                    scopes: {
                        default: "major"
                    }
                }
            ]
        };
        const ex2: ReleaseConfiguration = {
            gitlint: ".gitlint",
            conventionMarkdown: {
                path: "COMMIT_CONVENTION.MD",
                template: "var___convention_docs___",
            },
            keywords: ["BREAKING"],
            branches: ["main"],
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
                        default: "patch",
                        drv: "patch",
                        config: "patch",
                    }
                },
                {
                    type: "new",
                    section: "New Packages",
                    desc: "Fixed a bug within the repository",
                    vae: {
                        verb: "add",
                        application: "<scope>, <title>",
                        example: "new(narwhal): a aswiss army knife for docker"
                    },
                    scopes: {
                        default: "minor"
                    }
                },
                {
                    type: "update",
                    section: "Packages Updated",
                    desc: "Fixed a bug within the repository",
                    scopes: {
                        default: "major"
                    }
                }

            ]
        };

        const ex3: ReleaseConfiguration = {
            gitlint: ".gitlint",
            conventionMarkdown: {
                path: "docs/developer/03-Commit Conventions.md",
                template: "var___convention_docs___",
            },
            keywords: ["BREAKING"],
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
                        default: "patch",
                        drv: "patch",
                        config: "patch",
                    }
                },
            ]
        };

        const a1 = ReleaseConfigurationValid(valid1);
        const a2 = ReleaseConfigurationValid(valid2);
        const a3 = ReleaseConfigurationValid(valid3);

        expect(a1.isOk()).toBe(true);
        expect(a1.unwrap()).toEqual(ex1);

        expect(a2.isOk()).toBe(true);
        expect(a2.unwrap()).toEqual(ex2);

        expect(a3.isOk()).toBe(true);
        expect(a3.unwrap()).toEqual(ex3);

    });

    it("should return a result with error", function () {
        const subj1 = {
            gitlint: ".gitlint",
            conventionMarkdown: {
                path: 55,
                template: `---
id: commit-conventions
title: Commit Conventions
---

var___convention_docs___
`
            },
            keywords: "BREAKING CHANGE",
            branches: ["main"],
            specialScopes: {
                "no-release": {
                    desc: "Prevent release from happening",
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
                        default: "patch",
                        drv: "patch",
                        config: "patch",
                    }
                },
                {
                    type: "new",
                    section: "New Packages",
                    desc: "Fixed a bug within the repository",
                    vae: {
                        verb: "add",
                        application: "<scope>, <title>",
                        example: "new(narwhal): a aswiss army knife for docker"
                    },
                    scopes: {
                        default: "minor"
                    }
                },
                {
                    type: "update",
                    section: "Packages Updated",
                    desc: "Fixed a bug within the repository",
                    scopes: {
                        default: "major"
                    }
                }
            ]
        };
        const subj2 = {
            branches: ["main"],
            types: [
                {
                    section: "Bug Fixes",
                    desc: "Fixed a bug within the repository",
                    vae: {
                        verb: "fix",
                        application: "<title>",
                        example: "fix: dropdown flickering",
                    },
                    scopes: {
                        default: "patch",
                        drv: "patch1",
                        config: "patch",
                    }
                },
                {
                    type: "new",
                    section: "New Packages",
                    desc: "Fixed a bug within the repository",
                    vae: {
                        verb: "add",
                        application: "<scope>, <title>",
                        example: "new(narwhal): a aswiss army knife for docker"
                    },
                    scopes: {
                        default: "minor"
                    }
                },
                {
                    type: "update",
                    section: "Packages Updated",
                    desc: "Fixed a bug within the repository",
                    scopes: {
                        default: "major"
                    }
                }

            ]
        };
        const subj3 = {
            gitlint: ".gitlint",
            conventionMarkdown: {
                path: "docs/developer/03-Commit Conventions.md",
            },
            branches: ["main"],
            specialScopes: {
                "no-release": {
                    desc: "Prevent release from happening",
                    release: false,
                }
            },
            plugins: [
                {
                    config: {
                        changelogFile: "CHANGELOG.md",
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
                    scopes: ["default"]
                },
            ]
        };

        const ex1 = [
            "\u001b[36mconventionMarkdown.path\u001b[39m: Expected a string, but received: 55",
            "\u001b[36mkeywords\u001b[39m: Expected an array value, but received: \"BREAKING CHANGE\"",
            "\u001b[36mspecialScopes.no-release.release\u001b[39m: Expected the value to satisfy a union of `literal | literal | literal | literal`, but received: undefined",
            "\u001b[36mspecialScopes.no-release.release\u001b[39m: Expected the literal `false`, but received: undefined",
            "\u001b[36mspecialScopes.no-release.release\u001b[39m: Expected the literal `\"major\"`, but received: undefined",
            "\u001b[36mspecialScopes.no-release.release\u001b[39m: Expected the literal `\"minor\"`, but received: undefined",
            "\u001b[36mspecialScopes.no-release.release\u001b[39m: Expected the literal `\"patch\"`, but received: undefined"
        ];
        const ex2 = [
            "\u001b[36mtypes.0.type\u001b[39m: Expected a string, but received: undefined",
            "\u001b[36mtypes.0.scopes.drv\u001b[39m: Expected the value to satisfy a union of `literal | literal | literal | literal`, but received: \"patch1\"",
            "\u001b[36mtypes.0.scopes.drv\u001b[39m: Expected the literal `false`, but received: \"patch1\"",
            "\u001b[36mtypes.0.scopes.drv\u001b[39m: Expected the literal `\"major\"`, but received: \"patch1\"",
            "\u001b[36mtypes.0.scopes.drv\u001b[39m: Expected the literal `\"minor\"`, but received: \"patch1\"",
            "\u001b[36mtypes.0.scopes.drv\u001b[39m: Expected the literal `\"patch\"`, but received: \"patch1\""
        ];
        const ex3 = [
            "\u001b[36mplugins.0.module\u001b[39m: Expected a string, but received: undefined",
            "\u001b[36mtypes.0.scopes.0\u001b[39m: Expected the value to satisfy a union of `literal | literal | literal | literal`, but received: \"default\"",
            "\u001b[36mtypes.0.scopes.0\u001b[39m: Expected the literal `false`, but received: \"default\"",
            "\u001b[36mtypes.0.scopes.0\u001b[39m: Expected the literal `\"major\"`, but received: \"default\"",
            "\u001b[36mtypes.0.scopes.0\u001b[39m: Expected the literal `\"minor\"`, but received: \"default\"",
            "\u001b[36mtypes.0.scopes.0\u001b[39m: Expected the literal `\"patch\"`, but received: \"default\""
        ];

        const act1 = ReleaseConfigurationValid(subj1);
        const act2 = ReleaseConfigurationValid(subj2);
        const act3 = ReleaseConfigurationValid(subj3);

        expect(act1.isOk()).toBe(false);
        expect(act1.unwrapErr()).toEqual(ex1);

        expect(act2.isOk()).toBe(false);
        expect(act2.unwrapErr()).toEqual(ex2);

        expect(act3.isOk()).toBe(false);
        expect(act3.unwrapErr()).toEqual(ex3);
    });

});
