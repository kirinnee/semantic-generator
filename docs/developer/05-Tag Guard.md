---
id: tag-guard
title: Tag Collision Guard
---

# `sg tag-guard`

Refuses to compute a release onto a version an existing tag already occupies —
**regardless of who minted the tag.**

```bash
sg tag-guard              # visibility arm only (no version known yet)
sg tag-guard 1.4.0        # visibility arm + "is 1.4.0 already taken?"
sg tag-guard 1.4.0 --cwd /path/to/repo
```

Exit `0` means the release may proceed. Exit `1` means it may not, and every
reason is printed to **stderr** with a stable machine-readable code.

The same guard runs as a **mandatory preflight inside `sg release`**, before any
version is computed and before the configuration is even read. It has no bypass
flag.

## The hazard this closes

Measured on a live repository:

- `git tag --merged <branch>` returned **0** tags, so the releaser computed
  `1.0.0` from scratch.
- The repository already carried `v1.0.0` — plus ten further v-tags
  (`v0.1.0 v0.1.1 v1.0.1 v1.0.2 v1.1.0 v1.1.1 v1.1.2 v1.2.0 v1.3.0 v1.3.1`) — on
  refs the release branch could not reach.

Three properties made that fatal rather than merely wrong:

1. tag validation checked the tag **name** and not its **existence**;
2. tag creation carried no `-f`, so a collision is an error, not an overwrite;
3. tagging happens **after** the release commit.

So the failure mode is not "the release stops". It is: the release commit lands,
the changelog is written, assets are committed — and _only then_ does tag creation
fail, leaving **a committed release with no tag** on the branch about to be
pushed.

That instance was cleared by deleting four tags. **The instance closed and the
class stayed open.** This is the class fix.

## Two arms, because the version is not always known yet

| arm               | question                                                    | when it can run                                              |
| ----------------- | ----------------------------------------------------------- | ------------------------------------------------------------ |
| `CheckVersion`    | is _this_ version's tag already taken?                      | when a concrete version is in hand (a bump, an explicit ask) |
| `CheckVisibility` | does this repository hold version tags `HEAD` cannot reach? | always — including before the next version has been computed |

The visibility arm is the one that catches the incident above. It is the only
check that can be made **before** semantic-release computes a version, and an
unreachable version tag is exactly the condition under which the computed version
can land on one.

## "Regardless of who minted it" is a requirement, not a nicety

Of the four tags that blocked a release on this fleet, **two were the human
owner's.** A guard that treated machine-minted and human-minted tags differently
would have waved those two through.

The guard therefore reads **ref names only**. The `TagReader` interface exposes
`All()`, `Visible()` and `IsShallow()` and offers no way to read a tag's tagger,
committer, date or message. Identity is not "not consulted by convention" — it is
**unrepresentable in the interface**, and the shipped bundle is asserted to
contain no `taggername` / `taggeremail` / `taggerdate` / `committername` token.

`All()` uses `git for-each-ref refs/tags`, not `git tag --list`, because
`for-each-ref` applies no implicit reachability filter and returns names only.
Annotated and lightweight tags are indistinguishable to it, which is the point.

## Refusal codes

| code              | meaning                                                                       |
| ----------------- | ----------------------------------------------------------------------------- |
| `tag-collision`   | a tag for the asked version already exists (with or without the `v` prefix)   |
| `tag-not-visible` | version tags exist in the repository that `HEAD` cannot reach                 |
| `invalid-version` | the asked version is not full `x.y.z`; refused rather than guessed at         |
| `shallow-clone`   | the clone is shallow, so the tag set is incomplete and nothing can be cleared |
| `not-a-git-repo`  | the tags could not be read at all                                             |

### Refusing is the correct answer to "I could not check"

`shallow-clone` and `not-a-git-repo` are **refusals, not skips**. "I could not
look" and "I looked and it is clear" are different verdicts and only one of them
is safe to release on. A guard that returns `0` when it could not read the tag set
reports _safe_ while having measured nothing — which is the shape of an inert
check, and inert checks are worse than missing ones because they retire the doubt.

## What is deliberately _not_ treated as a version tag

`semantic-release-major-tag` mints floating `v3` and `v3.1` tags and **moves
them** on every release. They are not full versions, and they are unreachable from
`HEAD` roughly whenever they have just been moved. Counting them as version tags
would make every release refuse itself. Only `x.y.z` (optionally `v`-prefixed,
optionally with a prerelease or build suffix) is a version tag here.

## Interaction with the version-bump feature (D5)

When the releaser stamps a computed version into ecosystem manifests, call
`CheckVersion` with that version first. The bump writes files; the tag proves the
version was free. Doing it in the other order reproduces hazard property 3 with
extra steps.
