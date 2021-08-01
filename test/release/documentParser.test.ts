import {ReleaseConfiguration} from "../../src/classLibrary/release/configuration";
import {CommitConventionDocumentParser} from "../../src/classLibrary/release/documentParser";
import {Kore} from "@kirinnee/core";
import {MarkdownTable} from "../../src/markdown-table";

const core = new Kore();
core.ExtendPrimitives();


describe("CommitConventionDocumentParser", function () {

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
                    example: "fix: dropdown flickering bug",
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
                desc: "Releases a new package in the repository",
                vae: {
                    verb: "add",
                    application: "<scope> - <title>",
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
                desc: "Removes and existing package",
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

    const mdt = new MarkdownTable(core);
    const parser = new CommitConventionDocumentParser(configuration, mdt, core);

    describe("generateToc", () => {
        it("should generate markdown table as the table of content of all types with their respective descriptions", function () {
            const ex =
                `# Types

| Type                | Description                                               |
| ------------------- | --------------------------------------------------------- |
| [fix](#fix)         | Fixed a bug within the repository                         |
| [new](#new)         | Releases a new package in the repository                  |
| [update](#update)   | Update a package's version                                |
| [remove](#remove)   | Removes and existing package                              |
| [docs](#docs)       | Add documentation                                         |
| [ci](#ci)           | Changed the CI pipeline                                   |
| [release](#release) | Initiate a release (machine initiated)                    |
| [config](#config)   | Update configuration of the repository                    |
| [chore](#chore)     | Any chores, uncategorized, or small mistakes (like typos) |
`;
            const act = parser.generateToc();
            expect(act).toBe(ex);
        });


    });

    describe("generateVaeDocs", () => {
        it("should generate vae with example substituted inside", function () {

            const cases: [string, string][] = [
                ["fix", `| **V.A.E**       | V.A.E values                                                           |
| --------------- | ---------------------------------------------------------------------- |
| verb            | fix                                                                    |
| application     | when this commit is applied, it will _fix_ \`<title>\`                   |
| example         | fix: dropdown flickering bug                                           |
| example applied | when this commit is applied, it will _fix_ **dropdown flickering bug** |`],
                ["new", `| **V.A.E**       | V.A.E values                                                                             |
| --------------- | ---------------------------------------------------------------------------------------- |
| verb            | add                                                                                      |
| application     | when this commit is applied, it will _add_ \`<scope> - <title>\`                           |
| example         | new(narwhal): a swiss army knife for docker                                              |
| example applied | when this commit is applied, it will _add_ \`narwhal\` - **a swiss army knife for docker** |`],
            ];
            cases.Each(([a, e]: [string, string]) => {
                const act = parser.generateVaeDocs(a);
                expect(act.isOk()).toBe(true);
                expect(act.unwrap()).toBe(e);
            });
        });


        it("should return error result if vae does not exist", function () {
            const act = parser.generateVaeDocs("random");
            expect(act.isOk()).toBe(false);
            expect(act.unwrapErr()).toBe("cannot find type entry: random");
        });


        it("return empty string if no vae is specified", function () {
            const cases: [string, string][] = [
                ["update", ""],
                ["remove", ""],
            ];

            cases.Each(([a, e]: [string, string]) => {
                const act = parser.generateVaeDocs(a);
                expect(act.isOk()).toBe(true);
                expect(act.unwrap()).toBe(e);
            });

        });
    });
});
