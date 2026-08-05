---
id: version-bumping
title: Version Bumping
---

The releaser owns the version number. Repositories do not carry bump scripts or
bump hooks; they declare **where** their version lives and the releaser writes it
during the release.

## Configuring it

Add a `bumps` list to the release configuration:

```yaml
bumps:
  - type: node-version
  - type: dart-version
  - type: dotnet-version
    file: Version.props
    reason: this repo keeps its version in Version.props
```

Each entry names a **runtime type**. Most types know their own default path, so the
type is all you need.

| type             | field it owns                        | built-in default path             |
| ---------------- | ------------------------------------ | --------------------------------- |
| `node-version`   | top-level `"version"` string in JSON | `package.json`                    |
| `dart-version`   | top-level `version` key (column 0)   | `pubspec.yaml`                    |
| `dotnet-version` | a `<Version>` MSBuild property       | **none — you must name the file** |

### `file` requires `reason`

Naming a `file` is allowed only with a non-empty `reason`, and this is enforced by
the schema rather than by review. If a default is wrong for your repository, the
configuration has to say why, next to the fact itself.

### Why `dotnet-version` has no default

Measured across the authoritative dotnet trees, the version field lives in a
different place in each one:

| tree                      | file carrying a version field |
| ------------------------- | ----------------------------- |
| `dotnet-base` @`329d76c0` | `App/App.csproj`              |
| `dotnet-lib` @`9b23f046`  | `Version.props`               |
| `dotnet-api` @`abe5d046`  | none                          |

`Directory.Build.props` exists at the identical path in all of them and carries the
version in **none** — which is exactly what made it look like the right default.

No fixed default can be correct, and a default that is wrong everywhere is worse
than an absent one: it turns a configuration error into a plausible-looking write
to the wrong file. So for dotnet the `file` entry is the **norm, not an escape
hatch**, and its `reason` is a standing fact about the repository. It is not
boilerplate to be cleaned up later.

## Two rules that make a bump either right or loud

**It never creates a field.** Writing a version into a file that does not declare
one is a project-shape change, not a bump. If the field is absent the release fails
and names the file and the field. A `dotnet-version` entry pointed at a file with no
`<Version>` is therefore **inert until someone adds that field deliberately** — by
design. A green release pipeline does not mean bumping is live for a repository that
has never declared where its version lives.

**Exactly one occurrence, or it refuses.** Zero occurrences is _absent_; two or more
is _ambiguous_. There is no first-match-wins, because a bump that picks the wrong one
of two candidates is worse than a bump that stops. This matters more than it looks:
`dotnet-base` and `dotnet-lib` each declare `<Version>` in exactly one file, but a
_different_ file — a glob taking the first match would silently pick a different
file per repository and look correct in both.

A leading `v` is stripped when a digit follows it, so a tag-shaped `v1.4.0` is
written as `1.4.0`.

## How it runs

`sg bump <version>` applies the list. The version is a **positional argument**: a
`--version` option would be shadowed by the program's own `-V, --version`, which
prints the generator version and exits 0 — a bump that reports success and changes
nothing.

During a release the generator wires itself in, so there is nothing to invoke by
hand. When `bumps` is non-empty the generated `.releaserc.yaml` gains an
`@semantic-release/exec` `prepareCmd` that calls this same binary, inserted **before**
`@semantic-release/git` so the commit is built from post-bump bytes, and the bumped
paths are appended to that plugin's `assets` so the bump is actually committed. A
bump that is written and then discarded reads exactly like a bump that worked.

Files are read and transformed **before any are written**: if one entry fails,
nothing is written at all, so the repository never claims two versions at once.
