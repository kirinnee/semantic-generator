---
id: config-lint
title: Config Lint
---

# `sg config-lint`

Validates the release configuration **without running a release**, so a broken
config is caught at commit time instead of mid-release.

```bash
sg config-lint                       # lints ./atomi_release.yaml
sg config-lint -c path/to/config.yaml
```

Exit code `0` means the configuration is usable. Exit code `1` means at least one
violation was found; every violation is printed to **stderr** with a stable
machine-readable code, the path it was found at, and why it matters.

```text
config-lint FAILED: 1 violation(s) in atomi_release.yaml
  missing-default-scope [types.fix.scopes]: no `default` scope; a scopeless commit of this type has no release rule
```

## Wiring it as a pre-commit hook — use the ABSOLUTE form

Hook entries must name the binary by its **absolute store path**, never by a bare
command name:

```nix
# nix/pre-commit.nix
{
  a-config-lint = {
    enable = true;
    name = "Release Config Lint";
    description = "Enforce the release configuration is valid";
    entry = "${packages.sg}/bin/sg config-lint";   # ← absolute form
    language = "system";
    pass_filenames = false;
  };
}
```

**Why the absolute form is not a style preference.** A bare tool name in a
`language = "system"` hook is resolved against the `PATH` of whatever shell
invoked `git commit`. When that `PATH` does not carry the tool, the hook process
exits **127** and the hook contributes nothing — it neither checks nor complains
in a way anybody reads. Measured on this fleet: a bare `dlint` token in a hook is
exactly that shape, a hook that silently does nothing. `${packages.sg}/bin/sg`
cannot fail that way: the path either exists in the nix store or the shell fails
to build at all.

Two further requirements of the same kind:

- `pass_filenames = false` — `config-lint` takes a config path, not a file list.
  With filenames passed, pre-commit appends staged paths as positional arguments
  and the command lints the wrong thing.
- Do **not** redirect the hook's `stderr`. Violations are written there and the
  commit verdict is concluded from them.

## Violation codes

The codes below are part of the CLI contract. Hooks and CI grep for them, so they
are not reworded without a major version bump.

### Structural — the file must exist, parse, and satisfy the schema

| code                 | meaning                                         |
| -------------------- | ----------------------------------------------- |
| `config-unreadable`  | the configuration file is missing or unreadable |
| `config-unparseable` | the file is not valid YAML                      |
| `config-schema`      | the parsed document does not satisfy the schema |

`config-unreadable` is deliberately distinct from `config-unparseable`: an absent
file and a broken file are different faults, and a check that reports them
identically cannot tell you which one you have.

### Semantic — a schema-valid config must also describe a usable release

The schema only rejects wrong _shapes_. Every code below is a configuration that
passes the schema and is still wrong.

| code                              | meaning                                                                                        |
| --------------------------------- | ---------------------------------------------------------------------------------------------- |
| `no-types`                        | no commit types declared, so no commit can be classified                                       |
| `duplicate-type`                  | a commit type is declared twice; the later declaration silently wins                           |
| `missing-default-scope`           | a type has no `default` scope, so a scopeless commit of that type has no release rule          |
| `no-branches`                     | no release branches declared, so no branch can release                                         |
| `no-release-path`                 | every scope of every type is `release: false`, so no commit can ever produce a release         |
| `gitlint-missing`                 | the `gitlint` path does not exist, so `sg gitlint` cannot check or write it                    |
| `convention-template-missing-var` | the convention template drops `var___convention_docs___`, so the generated doc would be empty  |
| `plugin-unpinned`                 | a plugin has no `version`, so it resolves to `latest` and the release is not reproducible      |
| `special-scope-collision`         | a special scope name is also a scope of a type; which release rule applies is ambiguous        |
| `vae-example-mismatch`            | a type's `vae.example` declares a different type, so the generated doc documents the wrong one |

## Path resolution

Relative paths inside the configuration (`gitlint`,
`conventionMarkdown.path`) are resolved against the **configuration file's own
directory**, not the process working directory. A linter that resolved against
the working directory would report `gitlint-missing` whenever it was invoked from
a subdirectory — a control answering a neighbouring question.
