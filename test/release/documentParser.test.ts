import {ReleaseConfiguration, ReleaseConfigurationValid} from "../../src/classLibrary/release/configuration";
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
                desc: "Prevent release",
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
                        desc: "Fixes a bug in Nix derivations in the repository",
                        release: "patch",
                    },
                    config: {
                        desc: "Fixes a bug in repository configurations, such as scripts, rc files or ci files",
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
                vae: {
                    verb: "update",
                    application: "<scope> <title>",
                    example: "update(narwhal): from v0.13.1 to v0.14.0",
                },
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
                desc: "Removes an existing package",
                scopes: {
                    default: {
                        desc: "Removes an existing package",
                        release: "major",
                    },
                }
            },
            {
                type: "docs",
                desc: "Add documentation",
                section: "Documentation Updates",
                vae: {
                    verb: "document",
                    application: "<title>",
                    example: "docs(pkg): new features added in narwhal v0.14.0",
                },
                scopes: {
                    default: {
                        desc: "Adds a generic documentation not related to `dev`, `pkg` or `user`",
                        release: false
                    },
                    user: {
                        desc: "User-side documentation",
                        release: false
                    },
                    dev: {
                        desc: "Documentation for contributing processes",
                        release: false
                    },
                    pkg: {
                        desc: "Documentation for packages",
                        release: false
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
                desc: "Configuration changes, such as build scripts, rc files or Taskfile.dev etc",
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
                        desc: "Add, update or change build pipelines and generators",
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
    const configuration2 = ReleaseConfigurationValid({
        branches: ["main"],
        specialScopes: {
            big: {
                desc: "Makes it a major bump",
                release: "major",
            },
            medium: {
                desc: "Makes it a minor bump",
                release: "minor",
            },
            small: {
                desc: "Makes it a patch bump",
                release: "patch",
            },
            no: {
                desc: "Prevents version bumping",
                release: false,
            }
        },
        types: [
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
        ]
    }).unwrap();
    const configuration3 = ReleaseConfigurationValid({
        branches: ["main"],
        specialScopes: {
            major: {
                desc: "Makes it a major bump",
                release: "major"
            },
            minor: {
                desc: "Makes it a minor bump",
                release: "minor"
            }
        },
        types: [
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
        ]
    }).unwrap();
    const configuration4 = ReleaseConfigurationValid({
        branches: ["main"],
        types: [
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
        ]
    }).unwrap();

    const mdt = new MarkdownTable(core);
    const parser = new CommitConventionDocumentParser(configuration, mdt, core);

    const parser2 = new CommitConventionDocumentParser(configuration2, mdt, core);
    const parser3 = new CommitConventionDocumentParser(configuration3, mdt, core);
    const parser4 = new CommitConventionDocumentParser(configuration4, mdt, core);

    describe("generateToc", () => {
        it("should generate markdown table as the table of content of all types with their respective descriptions", function () {
            const ex =
                `# Types

| Type                | Description                                                                |
| ------------------- | -------------------------------------------------------------------------- |
| [fix](#fix)         | Fixed a bug within the repository                                          |
| [new](#new)         | Releases a new package in the repository                                   |
| [update](#update)   | Update a package's version                                                 |
| [remove](#remove)   | Removes an existing package                                                |
| [docs](#docs)       | Add documentation                                                          |
| [ci](#ci)           | Changed the CI pipeline                                                    |
| [release](#release) | Initiate a release (machine initiated)                                     |
| [config](#config)   | Configuration changes, such as build scripts, rc files or Taskfile.dev etc |
| [chore](#chore)     | Any chores, uncategorized, or small mistakes (like typos)                  |
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
                ["ci", ""],
                ["release", ""],
            ];

            cases.Each(([a, e]: [string, string]) => {
                const act = parser.generateVaeDocs(a);
                expect(act.isOk()).toBe(true);
                expect(act.unwrap()).toBe(e);
            });

        });
    });

    describe("generateScopeDocs", () => {
        it("should generate scope documents", function () {
            const cases: [string, string][] = [
                ["fix", `| Scope    | Description                                                                     | Bump    |
| -------- | ------------------------------------------------------------------------------- | ------- |
| default  | Generic fixes not under \`drv\` or \`patch\`                                        | \`patch\` |
| \`drv\`    | Fixes a bug in Nix derivations in the repository                                | \`patch\` |
| \`config\` | Fixes a bug in repository configurations, such as scripts, rc files or ci files | \`nil\`   |`],
                ["update", `| Scope   | Description                | Bump    |
| ------- | -------------------------- | ------- |
| default | Update a package's version | \`major\` |`],
                ["docs", `| Scope   | Description                                                        | Bump  |
| ------- | ------------------------------------------------------------------ | ----- |
| default | Adds a generic documentation not related to \`dev\`, \`pkg\` or \`user\` | \`nil\` |
| \`user\`  | User-side documentation                                            | \`nil\` |
| \`dev\`   | Documentation for contributing processes                           | \`nil\` |
| \`pkg\`   | Documentation for packages                                         | \`nil\` |`],
            ];

            cases.Each(([a, e]) => {
                const act = parser.generateScopeDocs(a);
                expect(act.isOk()).toBe(true);
                expect(act.unwrap()).toBe(e);
            });
        });

        it("should return error if scope does not exist", function () {
            const act = parser.generateScopeDocs("random");
            expect(act.isOk()).toBe(false);
            expect(act.unwrapErr()).toBe("cannot find type entry: random");
        });
    });

    describe("preamble", () => {
        it("should return the preamble", function () {
            const ex = `This project uses [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/) loosely as the specification
for our commits.

Commit message will be in the format:

\`\`\`
type(scope): title

body
\`\`\`

This page will document the types and scopes used.`;
            const act = parser.preamble();
            expect(act).toBe(ex);
        });
    });

    describe("generateSpecialScopes", () => {
        it("should generate special scope table indicating the description and bump", function () {
            const cases: [CommitConventionDocumentParser, string][] = [
                [parser, `| Scope        | Description     | Bump  |
| ------------ | --------------- | ----- |
| \`no-release\` | Prevent release | \`nil\` |`],
                [parser2, `| Scope    | Description              | Bump    |
| -------- | ------------------------ | ------- |
| \`big\`    | Makes it a major bump    | \`major\` |
| \`medium\` | Makes it a minor bump    | \`minor\` |
| \`small\`  | Makes it a patch bump    | \`patch\` |
| \`no\`     | Prevents version bumping | \`nil\`   |`],
                [parser3, `| Scope   | Description           | Bump    |
| ------- | --------------------- | ------- |
| \`major\` | Makes it a major bump | \`major\` |
| \`minor\` | Makes it a minor bump | \`minor\` |`],
            ];

            cases.Each(([a, s]) => {
                expect(a.generateSpecialScopes()).toBe(s);
            });

        });

        it("should return \"no special scopes\" if there isn't any special scopes", function () {
            expect(parser4.generateSpecialScopes()).toBe("no special scopes");
        });
    });

    describe("generateType", () => {
        it("should generate type documentation with vae and scope", function () {
            const cases: [string, string][] = [
                ["update", `## update

Update a package's version

| **V.A.E**       | V.A.E values                                                                        |
| --------------- | ----------------------------------------------------------------------------------- |
| verb            | update                                                                              |
| application     | when this commit is applied, it will _update_ \`<scope> <title>\`                     |
| example         | update(narwhal): from v0.13.1 to v0.14.0                                            |
| example applied | when this commit is applied, it will _update_ \`narwhal\` **from v0.13.1 to v0.14.0** |

| Scope   | Description                | Bump    |
| ------- | -------------------------- | ------- |
| default | Update a package's version | \`major\` |`],
                ["remove", `## remove

Removes an existing package

| Scope   | Description                 | Bump    |
| ------- | --------------------------- | ------- |
| default | Removes an existing package | \`major\` |`],
                ["docs", `## docs

Add documentation

| **V.A.E**       | V.A.E values                                                                              |
| --------------- | ----------------------------------------------------------------------------------------- |
| verb            | document                                                                                  |
| application     | when this commit is applied, it will _document_ \`<title>\`                                 |
| example         | docs(pkg): new features added in narwhal v0.14.0                                          |
| example applied | when this commit is applied, it will _document_ **new features added in narwhal v0.14.0** |

| Scope   | Description                                                        | Bump  |
| ------- | ------------------------------------------------------------------ | ----- |
| default | Adds a generic documentation not related to \`dev\`, \`pkg\` or \`user\` | \`nil\` |
| \`user\`  | User-side documentation                                            | \`nil\` |
| \`dev\`   | Documentation for contributing processes                           | \`nil\` |
| \`pkg\`   | Documentation for packages                                         | \`nil\` |`]
            ];

            cases.Each(([a, e]) => {
                const act = parser.generateType(a);
                expect(act.isOk()).toBe(true);
                expect(act.unwrap()).toBe(e);
            });
        });

        it("should fail if type does not exist", function () {
            const act = parser.generateType("random");
            expect(act.isOk()).toBe(false);
            expect(act.unwrapErr()).toEqual([
                "cannot find type entry: random",
                "cannot find type entry: random",
                "cannot find type entry: random"
            ]);
        });
    });

    describe("generateFullDocs", () => {
        it("should generate full documentation", () => {
            const ex = `This project uses [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/) loosely as the specification
for our commits.

Commit message will be in the format:

\`\`\`
type(scope): title

body
\`\`\`

This page will document the types and scopes used.

# Types

| Type                | Description                                                                |
| ------------------- | -------------------------------------------------------------------------- |
| [fix](#fix)         | Fixed a bug within the repository                                          |
| [new](#new)         | Releases a new package in the repository                                   |
| [update](#update)   | Update a package's version                                                 |
| [remove](#remove)   | Removes an existing package                                                |
| [docs](#docs)       | Add documentation                                                          |
| [ci](#ci)           | Changed the CI pipeline                                                    |
| [release](#release) | Initiate a release (machine initiated)                                     |
| [config](#config)   | Configuration changes, such as build scripts, rc files or Taskfile.dev etc |
| [chore](#chore)     | Any chores, uncategorized, or small mistakes (like typos)                  |

## fix

Fixed a bug within the repository

| **V.A.E**       | V.A.E values                                                           |
| --------------- | ---------------------------------------------------------------------- |
| verb            | fix                                                                    |
| application     | when this commit is applied, it will _fix_ \`<title>\`                   |
| example         | fix: dropdown flickering bug                                           |
| example applied | when this commit is applied, it will _fix_ **dropdown flickering bug** |

| Scope    | Description                                                                     | Bump    |
| -------- | ------------------------------------------------------------------------------- | ------- |
| default  | Generic fixes not under \`drv\` or \`patch\`                                        | \`patch\` |
| \`drv\`    | Fixes a bug in Nix derivations in the repository                                | \`patch\` |
| \`config\` | Fixes a bug in repository configurations, such as scripts, rc files or ci files | \`nil\`   |

## new

Releases a new package in the repository

| **V.A.E**       | V.A.E values                                                                             |
| --------------- | ---------------------------------------------------------------------------------------- |
| verb            | add                                                                                      |
| application     | when this commit is applied, it will _add_ \`<scope> - <title>\`                           |
| example         | new(narwhal): a swiss army knife for docker                                              |
| example applied | when this commit is applied, it will _add_ \`narwhal\` - **a swiss army knife for docker** |

| Scope   | Description           | Bump    |
| ------- | --------------------- | ------- |
| default | Release a new package | \`minor\` |

## update

Update a package's version

| **V.A.E**       | V.A.E values                                                                        |
| --------------- | ----------------------------------------------------------------------------------- |
| verb            | update                                                                              |
| application     | when this commit is applied, it will _update_ \`<scope> <title>\`                     |
| example         | update(narwhal): from v0.13.1 to v0.14.0                                            |
| example applied | when this commit is applied, it will _update_ \`narwhal\` **from v0.13.1 to v0.14.0** |

| Scope   | Description                | Bump    |
| ------- | -------------------------- | ------- |
| default | Update a package's version | \`major\` |

## remove

Removes an existing package

| Scope   | Description                 | Bump    |
| ------- | --------------------------- | ------- |
| default | Removes an existing package | \`major\` |

## docs

Add documentation

| **V.A.E**       | V.A.E values                                                                              |
| --------------- | ----------------------------------------------------------------------------------------- |
| verb            | document                                                                                  |
| application     | when this commit is applied, it will _document_ \`<title>\`                                 |
| example         | docs(pkg): new features added in narwhal v0.14.0                                          |
| example applied | when this commit is applied, it will _document_ **new features added in narwhal v0.14.0** |

| Scope   | Description                                                        | Bump  |
| ------- | ------------------------------------------------------------------ | ----- |
| default | Adds a generic documentation not related to \`dev\`, \`pkg\` or \`user\` | \`nil\` |
| \`user\`  | User-side documentation                                            | \`nil\` |
| \`dev\`   | Documentation for contributing processes                           | \`nil\` |
| \`pkg\`   | Documentation for packages                                         | \`nil\` |

## ci

Changed the CI pipeline

| Scope   | Description             | Bump  |
| ------- | ----------------------- | ----- |
| default | Update CI configuration | \`nil\` |

## release

Initiate a release (machine initiated)

| Scope   | Description               | Bump  |
| ------- | ------------------------- | ----- |
| default | Machine initiated release | \`nil\` |

## config

Configuration changes, such as build scripts, rc files or Taskfile.dev etc

| Scope    | Description                                                                  | Bump  |
| -------- | ---------------------------------------------------------------------------- | ----- |
| default  | Updates the configuration of the repository, not related to the other scopes | \`nil\` |
| \`lint\`   | Add, update or remove linters                                                | \`nil\` |
| \`fmt\`    | Add, update or remove formatters                                             | \`nil\` |
| \`build\`  | Add, update or change build pipelines and generators                         | \`nil\` |
| \`nix\`    | Add, update or change nix shell                                              | \`nil\` |
| \`env\`    | Add, update or change environment                                            | \`nil\` |
| \`ignore\` | Add, update or change ignore configurations                                  | \`nil\` |

## chore

Any chores, uncategorized, or small mistakes (like typos)

| Scope   | Description | Bump  |
| ------- | ----------- | ----- |
| default | chores      | \`nil\` |

# Special Scopes

| Scope        | Description     | Bump  |
| ------------ | --------------- | ----- |
| \`no-release\` | Prevent release | \`nil\` |
`;

            const act = parser.generateFullDocs();
            expect(act).toBe(ex);

        });
    });
});
