import {
  ReleaseConfiguration,
  ReleaseConfigurationValid,
} from "../../src/classLibrary/release/configuration";

import { should } from "chai";
import { TestCases } from "../testHelper";

should();

describe("ReleaseConfigurationValid", () => {
  const valid1 = {
    gitlint: ".gitlint",
    committer: {
      model: "gpt-4o",
      variations: 10,
      provider: "openai",
      maxDiff: 500,
    },
    conventionMarkdown: {
      path: "docs/developer/03-Commit Conventions.md",
      template: `---
id: commit-conventions
title: Commit Conventions
---

var___convention_docs___
`,
    },
    keywords: ["BREAKING CHANGE", "BREAKING CHANGES", "BREAKING"],
    branches: ["main"],
    specialScopes: {
      "no-release": {
        desc: "Prevent release from happening",
        release: false,
      },
    },
    plugins: [
      {
        module: "@semantic-release/changelog",
        version: "5.0.0",
        config: {
          changelogFile: "CHANGELOG.md",
        },
      },
      {
        module: "@semantic-release/git",
        version: "5.0.1",
        config: {
          message:
            "release: ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}",
        },
      },
      {
        module: "@semantic-release/github",
        version: "5.0.0",
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
            desc: "Fixes in old-nix derivations in the repository",
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
          example: "new(narwhal): a aswiss army knife for docker",
        },
        scopes: {
          default: {
            desc: "Release a new package",
            release: "minor",
          },
        },
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
        },
      },
    ],
  };
  const ex1: ReleaseConfiguration = {
    bumps: undefined,
    gitlint: ".gitlint",
    committer: {
      model: "gpt-4o",
      variations: 10,
      provider: "openai",
      maxDiff: 500,
    },
    conventionMarkdown: {
      path: "docs/developer/03-Commit Conventions.md",
      template: `---
id: commit-conventions
title: Commit Conventions
---

var___convention_docs___
`,
    },
    keywords: ["BREAKING CHANGE", "BREAKING CHANGES", "BREAKING"],
    branches: ["main"],
    specialScopes: {
      "no-release": {
        desc: "Prevent release from happening",
        release: false,
      },
    },
    plugins: [
      {
        module: "@semantic-release/changelog",
        version: "5.0.0",
        config: {
          changelogFile: "CHANGELOG.md",
        },
      },
      {
        module: "@semantic-release/git",
        version: "5.0.1",
        config: {
          message:
            "release: ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}",
        },
      },
      {
        module: "@semantic-release/github",
        version: "5.0.0",
        config: undefined,
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
            desc: "Fixes in old-nix derivations in the repository",
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
          example: "new(narwhal): a aswiss army knife for docker",
        },
        scopes: {
          default: {
            desc: "Release a new package",
            release: "minor",
          },
        },
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
        },
      },
    ],
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
            desc: "Fixes in old-nix derivations in the repository",
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
          example: "new(narwhal): a aswiss army knife for docker",
        },
        scopes: {
          default: {
            desc: "Release a new package",
            release: "minor",
          },
        },
      },
      {
        type: "update",
        section: "Packages Updated",
        desc: "Fixed a bug within the repository",
        scopes: {
          default: {
            desc: "Update a package's version",
            release: "major",
          },
        },
      },
    ],
  };
  const ex2: ReleaseConfiguration = {
    bumps: undefined,
    gitlint: ".gitlint",
    committer: {
      model: "gpt-4o-mini",
      variations: 3,
      provider: "openai",
      maxDiff: 1000,
    },
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
            desc: "Fixes in old-nix derivations in the repository",
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
          example: "new(narwhal): a aswiss army knife for docker",
        },
        scopes: {
          default: {
            desc: "Release a new package",
            release: "minor",
          },
        },
      },
      {
        type: "update",
        vae: undefined,
        section: "Packages Updated",
        desc: "Fixed a bug within the repository",
        scopes: {
          default: {
            desc: "Update a package's version",
            release: "major",
          },
        },
      },
    ],
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
      },
    },
    plugins: [
      {
        module: "@semantic-release/changelog",
        version: "5.0.0",
        config: {
          changelogFile: "CHANGELOG.md",
        },
      },
      {
        module: "@semantic-release/github",
        version: "5.0.0",
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
            desc: "Fixes in old-nix derivations in the repository",
            release: "patch",
          },
          config: {
            desc: "Fixes in configuration",
            release: "patch",
          },
        },
      },
    ],
  };
  const ex3: ReleaseConfiguration = {
    bumps: undefined,
    gitlint: ".gitlint",
    committer: {
      model: "gpt-4o-mini",
      variations: 3,
      provider: "openai",
      maxDiff: 1000,
    },
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
      },
    },
    plugins: [
      {
        module: "@semantic-release/changelog",
        version: "5.0.0",
        config: {
          changelogFile: "CHANGELOG.md",
        },
      },
      {
        config: undefined,
        version: "5.0.0",
        module: "@semantic-release/github",
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
            desc: "Fixes in old-nix derivations in the repository",
            release: "patch",
          },
          config: {
            desc: "Fixes in configuration",
            release: "patch",
          },
        },
      },
    ],
  };

  (
    [
      { subject: valid1, expected: ex1 },
      { subject: valid2, expected: ex2 },
      { subject: valid3, expected: ex3 },
    ] as TestCases<unknown, ReleaseConfiguration>
  ).forEach(({ subject, expected }) =>
    it("should return a result with the configuration if its successful", function () {
      const actual = ReleaseConfigurationValid(subject);
      actual.unwrap().should.deep.equal(expected);
    }),
  );

  (
    [
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
`,
          },
          keywords: "BREAKING CHANGE",
          branches: ["main"],
          specialScopes: {
            "no-release": {
              desc: "Prevent release from happening",
            },
          },
          plugins: [
            {
              module: "@semantic-release/changelog",
              config: {
                changelogFile: "CHANGELOG.md",
              },
            },
            {
              module: "@semantic-release/git",
              config: {
                message:
                  "release: ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}",
              },
            },
            {
              module: "@semantic-release/github",
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
                  desc: "Fixes in old-nix derivations in the repository",
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
                example: "new(narwhal): a aswiss army knife for docker",
              },
              scopes: {
                default: {
                  desc: "Release a new package",
                  release: "minor",
                },
              },
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
              },
            },
          ],
        },
        expected: [
          "\u001b[36mconventionMarkdown.path\u001b[39m: Expected a string, but received: 55",
          '\u001b[36mkeywords\u001b[39m: Expected an array value, but received: "BREAKING CHANGE"',
          "\u001b[36mspecialScopes.no-release.release\u001b[39m: Expected the value to satisfy a union of `literal | literal | literal | literal`, but received: undefined",
          "\u001b[36mspecialScopes.no-release.release\u001b[39m: Expected the literal `false`, but received: undefined",
          '\u001b[36mspecialScopes.no-release.release\u001b[39m: Expected the literal `"major"`, but received: undefined',
          '\u001b[36mspecialScopes.no-release.release\u001b[39m: Expected the literal `"minor"`, but received: undefined',
          '\u001b[36mspecialScopes.no-release.release\u001b[39m: Expected the literal `"patch"`, but received: undefined',
        ],
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
                  desc: "Fixes in old-nix derivations in the repository",
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
                example: "new(narwhal): a aswiss army knife for docker",
              },
              scopes: {
                default: {
                  desc: "Release a new package",
                  release: "minor",
                },
              },
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
              },
            },
          ],
        },
        expected: [
          "\u001b[36mtypes.0.type\u001b[39m: Expected a string, but received: undefined",
          '\u001b[36mtypes.0.scopes.drv.release\u001b[39m: Expected the value to satisfy a union of `literal | literal | literal | literal`, but received: "patch1"',
          '\u001b[36mtypes.0.scopes.drv.release\u001b[39m: Expected the literal `false`, but received: "patch1"',
          '\u001b[36mtypes.0.scopes.drv.release\u001b[39m: Expected the literal `"major"`, but received: "patch1"',
          '\u001b[36mtypes.0.scopes.drv.release\u001b[39m: Expected the literal `"minor"`, but received: "patch1"',
          '\u001b[36mtypes.0.scopes.drv.release\u001b[39m: Expected the literal `"patch"`, but received: "patch1"',
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
            },
          },
          plugins: [
            {
              config: {
                changelogFile: "CHANGELOG.md",
              },
            },
            {
              module: "@semantic-release/github",
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
              scopes: ["default"],
            },
          ],
        },
        expected: [
          "\u001b[36mplugins.0.module\u001b[39m: Expected a string, but received: undefined",
          '\u001b[36mtypes.0.scopes.0\u001b[39m: Expected an object, but received: "default"',
        ],
      },
    ] as TestCases<unknown, string[]>
  ).forEach(({ subject, expected }) =>
    it("should return a result with error", function () {
      const actual = ReleaseConfigurationValid(subject);
      actual.isOk().should.be.false;
      actual.unwrapErr().slice(0, expected.length).should.deep.equal(expected);
    }),
  );

  /**
   * The `bumps` list. SUBJECT of every case below is the `bumps` key of an
   * otherwise-valid configuration, so any failure reported is attributable to the
   * bump entry and nothing else.
   */
  describe("bumps", () => {
    const base = {
      branches: ["main"],
      types: [
        {
          type: "fix",
          section: "Bug Fixes",
          scopes: { default: { desc: "a fix", release: "patch" } },
        },
      ],
    };

    const withBumps = (bumps: unknown) => ({ ...base, bumps });

    it("accepts the two defaulted types with no file", function () {
      // dotnet-version is absent here on purpose: it has no default and is
      // covered by its own cases below.
      const actual = ReleaseConfigurationValid(
        withBumps([{ type: "node-version" }, { type: "dart-version" }]),
      );
      actual.isOk().should.be.true;
      actual.unwrap().bumps?.should.deep.equal([
        { type: "node-version", file: undefined, reason: undefined },
        { type: "dart-version", file: undefined, reason: undefined },
      ]);
    });

    it("accepts a file that states a reason", function () {
      const actual = ReleaseConfigurationValid(
        withBumps([
          {
            type: "dotnet-version",
            file: "Version.props",
            reason: "this repo keeps its version in Version.props",
          },
        ]),
      );
      actual.isOk().should.be.true;
      actual.unwrap().bumps?.[0].file?.should.equal("Version.props");
    });

    it("REJECTS dotnet-version with NO file, because it has no default", function () {
      // Measured across four authoritative dotnet trees, the version field lives
      // in App/App.csproj, in Version.props, and twice nowhere. No default could
      // be right, so the entry must name the path rather than have one guessed.
      const actual = ReleaseConfigurationValid(
        withBumps([{ type: "dotnet-version" }]),
      );
      actual.isOk().should.be.false;
      const err = actual.unwrapErr().join("\n");
      err.should.contain("bumps.0");
      err.should.contain("no built-in default path");
      err.should.contain("must name a");
    });

    it("CONTROL: the SAME type passes once a file and reason are given", function () {
      // SUBJECT: the identical `dotnet-version` type from the test above, with
      // only file+reason added. Proves the rejection is about the missing path
      // and not about the type being unsupported.
      const actual = ReleaseConfigurationValid(
        withBumps([
          {
            type: "dotnet-version",
            file: "App/App.csproj",
            reason: "this repo keeps its version in the App project",
          },
        ]),
      );
      actual.isOk().should.be.true;
    });

    it("REJECTS a file with no reason", function () {
      // This is the rule that keeps a path from being silent.
      const actual = ReleaseConfigurationValid(
        withBumps([
          { type: "node-version", file: "packages/api/package.json" },
        ]),
      );
      actual.isOk().should.be.false;
      const err = actual.unwrapErr().join("\n");
      err.should.contain("bumps.0");
      err.should.contain("states no");
      err.should.contain("only with a stated reason");
    });

    it("REJECTS a file whose reason is only whitespace", function () {
      // A blank string would satisfy `optional(string())`, so the refinement has
      // to trim. Otherwise `reason: " "` becomes the silent override.
      const actual = ReleaseConfigurationValid(
        withBumps([
          {
            type: "node-version",
            file: "packages/api/package.json",
            reason: "   ",
          },
        ]),
      );
      actual.isOk().should.be.false;
      actual.unwrapErr().join("\n").should.contain("states no");
    });

    it("CONTROL: the identical entry PASSES once a reason is added", function () {
      // SUBJECT: the exact entry rejected two tests above, with only `reason`
      // added. Proves those rejections are caused by the missing reason and not
      // by the file path or the type.
      const actual = ReleaseConfigurationValid(
        withBumps([
          {
            type: "node-version",
            file: "packages/api/package.json",
            reason: "stated",
          },
        ]),
      );
      actual.isOk().should.be.true;
    });

    it("REJECTS an unknown runtime type", function () {
      const actual = ReleaseConfigurationValid(
        withBumps([{ type: "python-version" }]),
      );
      actual.isOk().should.be.false;
      actual.unwrapErr().join("\n").should.contain("bumps.0.type");
    });

    it("REJECTS an empty reason with no override", function () {
      // An empty `reason` on a default-path entry is dead weight that reads like
      // a justification, so it is refused too.
      const actual = ReleaseConfigurationValid(
        withBumps([{ type: "node-version", reason: "  " }]),
      );
      actual.isOk().should.be.false;
      actual.unwrapErr().join("\n").should.contain("empty `reason`");
    });

    it("treats an absent bumps key as absent, not as an empty list", function () {
      // Distinguishing the two matters: the bump step refuses an empty list
      // rather than reporting a success, so `bumps` must not be defaulted to [].
      const actual = ReleaseConfigurationValid(base);
      actual.isOk().should.be.true;
      (actual.unwrap().bumps === undefined).should.be.true;
    });
  });
});
