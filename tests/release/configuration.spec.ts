import {ReleaseConfiguration, ReleaseConfigurationValid} from "../../src/classLibrary/release/configuration";

import {should} from "chai";
import {TestCases} from "../testHelper";

should();

describe("ReleaseConfigurationValid", () => {
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
                        release: "patch",
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
                    example: "new(narwhal): a aswiss army knife for docker"
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
                module: "@semantic-release/github",
                config: undefined
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
                        release: "patch",
                    },
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
                    default: {
                        desc: "Release a new package",
                        release: "minor",
                    }
                }
            },
            {
                type: "update",
                vae: undefined,
                section: "Packages Updated",
                desc: "Update a package's version",
                scopes: {
                    default: {
                        desc: "Update a package's version",
                        release: "major",
                    },
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
                        release: "patch",
                    },
                },
            },
            {
                type: "new",
                section: "New Packages",
                desc: "Release a new package",
                vae: {
                    verb: "add",
                    application: "<scope>, <title>",
                    example: "new(narwhal): a aswiss army knife for docker"
                },
                scopes: {
                    default: {
                        desc: "Release a new package",
                        release: "minor",
                    },
                }
            },
            {
                type: "update",
                section: "Packages Updated",
                desc: "Fixed a bug within the repository",
                scopes: {
                    default: {
                        desc: "Update a package's version",
                        release: "major"
                    }
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
        plugins: undefined,
        specialScopes: undefined,
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
                        release: "patch",
                    },
                },
            },
            {
                type: "new",
                section: "New Packages",
                desc: "Release a new package",
                vae: {
                    verb: "add",
                    application: "<scope>, <title>",
                    example: "new(narwhal): a aswiss army knife for docker"
                },
                scopes: {
                    default: {
                        desc: "Release a new package",
                        release: "minor",
                    },
                }
            },
            {
                type: "update",
                vae: undefined,
                section: "Packages Updated",
                desc: "Fixed a bug within the repository",
                scopes: {
                    default: {
                        desc: "Update a package's version",
                        release: "major"
                    }
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
                        release: "patch",
                    },
                }
            },
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
                config: undefined,
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
                        release: "patch",
                    },
                }
            },
        ]
    };

    ([
        {subject: valid1, expected: ex1},
        {subject: valid2, expected: ex2},
        {subject: valid3, expected: ex3},
    ] as TestCases<unknown, ReleaseConfiguration>)
        .forEach(({subject, expected}) =>
            it("should return a result with the configuration if its successful", function () {
                const actual = ReleaseConfigurationValid(subject);
                actual.unwrap().should.deep.equal(expected);
            }));

    ([
        {
            subject: {
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
                                release: "patch",
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
                            example: "new(narwhal): a aswiss army knife for docker"
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
                ]
            },
            expected: [
                "\u001b[36mconventionMarkdown.path\u001b[39m: Expected a string, but received: 55",
                "\u001b[36mkeywords\u001b[39m: Expected an array value, but received: \"BREAKING CHANGE\"",
                "\u001b[36mspecialScopes.no-release.release\u001b[39m: Expected the value to satisfy a union of `literal | literal | literal | literal`, but received: undefined",
                "\u001b[36mspecialScopes.no-release.release\u001b[39m: Expected the literal `false`, but received: undefined",
                "\u001b[36mspecialScopes.no-release.release\u001b[39m: Expected the literal `\"major\"`, but received: undefined",
                "\u001b[36mspecialScopes.no-release.release\u001b[39m: Expected the literal `\"minor\"`, but received: undefined",
                "\u001b[36mspecialScopes.no-release.release\u001b[39m: Expected the literal `\"patch\"`, but received: undefined"
            ]
        },
        {
            subject: {
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
                            default: {
                                desc: "Generic fixes not under `drv` or `patch`",
                                release: "patch",
                            },
                            drv: {
                                desc: "Fixes in nix derivations in the repository",
                                release: "patch1",
                            },
                            config: {
                                desc: "Fixes in configuration",
                                release: "patch",
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
                            example: "new(narwhal): a aswiss army knife for docker"
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
                ]
            },
            expected: [
                "\u001b[36mtypes.0.type\u001b[39m: Expected a string, but received: undefined",
                "\u001b[36mtypes.0.scopes.drv.release\u001b[39m: Expected the value to satisfy a union of `literal | literal | literal | literal`, but received: \"patch1\"",
                "\u001b[36mtypes.0.scopes.drv.release\u001b[39m: Expected the literal `false`, but received: \"patch1\"",
                "\u001b[36mtypes.0.scopes.drv.release\u001b[39m: Expected the literal `\"major\"`, but received: \"patch1\"",
                "\u001b[36mtypes.0.scopes.drv.release\u001b[39m: Expected the literal `\"minor\"`, but received: \"patch1\"",
                "\u001b[36mtypes.0.scopes.drv.release\u001b[39m: Expected the literal `\"patch\"`, but received: \"patch1\"",
            ],
        },
        {
            subject: {
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
            },
            expected: [
                "\u001b[36mplugins.0.module\u001b[39m: Expected a string, but received: undefined",
                "\u001b[36mtypes.0.scopes.0\u001b[39m: Expected an object, but received: \"default\"",
            ],
        },
    ] as TestCases<unknown, string[]>).forEach(({subject, expected}) =>
        it("should return a result with error", function () {
            const actual = ReleaseConfigurationValid(subject);
            actual.isOk().should.be.false;
            actual.unwrapErr().should.deep.equal(expected);
        }))

    ;

});
