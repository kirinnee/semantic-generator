import execa from "execa";
import { Err, Ok, Result } from "@hqoss/monads";
import { PR, PromiseResult } from "../resultUtil";

/**
 * Stable machine-readable identifiers for every refusal. Part of the CLI
 * contract: CI and hooks grep for them.
 */
const GuardCode = {
  NotAGitRepo: "not-a-git-repo",
  ShallowClone: "shallow-clone",
  InvalidVersion: "invalid-version",
  TagCollision: "tag-collision",
  TagNotVisible: "tag-not-visible",
} as const;

type GuardCode = (typeof GuardCode)[keyof typeof GuardCode];

/** `1.2.3`, `v1.2.3`, `v1.2.3-rc.1`, `1.2.3+build.4`. */
const FULL_VERSION = /^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/;

interface SemVer {
  raw: string;
  major: number;
  minor: number;
  patch: number;
  prerelease: string;
}

function parseVersion(tag: string): SemVer | null {
  const m = FULL_VERSION.exec(tag);
  if (m == null) return null;
  const dash = tag.indexOf("-");
  return {
    raw: tag,
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
    prerelease: dash >= 0 ? tag.slice(dash + 1) : "",
  };
}

function compareVersion(a: SemVer, b: SemVer): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  if (a.patch !== b.patch) return a.patch - b.patch;
  // A release outranks its own prereleases; beyond that, lexical is enough for
  // the only question asked here ("is anything unreachable at least as high").
  if (a.prerelease === b.prerelease) return 0;
  if (a.prerelease === "") return 1;
  if (b.prerelease === "") return -1;
  return a.prerelease < b.prerelease ? -1 : 1;
}

/**
 * Reads tag *names* from a repository.
 *
 * Deliberately exposes no way to read a tag's tagger, committer, date or
 * message. The guard must refuse a colliding tag REGARDLESS OF WHO MINTED IT:
 * of the four tags that blocked a release on this fleet, two were the human
 * owner's, and a minter-sensitive guard would have waved them through. Keeping
 * identity out of the interface makes that failure unrepresentable rather than
 * merely unwritten.
 */
interface TagReader {
  /** Every tag in the repository, reachable or not. */
  All(): Promise<Result<string[], string>>;

  /** Only the tags reachable from `HEAD` — what semantic-release can see. */
  Visible(): Promise<Result<string[], string>>;

  /** `false` unless the working copy is a shallow clone. */
  IsShallow(): Promise<Result<boolean, string>>;
}

class GitTagReader implements TagReader {
  private readonly cwd: string;

  constructor(cwd: string) {
    this.cwd = cwd;
  }

  private async git(args: string[]): Promise<Result<string, string>> {
    try {
      // stderr is captured and returned, never discarded: the caller concludes
      // from this result and a swallowed message turns a refusal into silence.
      const { stdout } = await execa("git", args, { cwd: this.cwd });
      return Ok(stdout.toString());
    } catch (e) {
      const detail =
        e != null && typeof e === "object" && "stderr" in e
          ? String((e as { stderr: unknown }).stderr).trim()
          : String(e);
      return Err(detail.length > 0 ? detail : String(e));
    }
  }

  private static lines(out: string): string[] {
    return out
      .split("\n")
      .map((x) => x.trim())
      .filter((x) => x.length > 0);
  }

  async All(): Promise<Result<string[], string>> {
    // for-each-ref, not `git tag --list`: it takes no implicit reachability
    // filter and returns names only.
    const r = await this.git([
      "for-each-ref",
      "--format=%(refname:strip=2)",
      "refs/tags",
    ]);
    return r.map(GitTagReader.lines);
  }

  async Visible(): Promise<Result<string[], string>> {
    const r = await this.git(["tag", "--merged", "HEAD"]);
    return r.map(GitTagReader.lines);
  }

  async IsShallow(): Promise<Result<boolean, string>> {
    const r = await this.git(["rev-parse", "--is-shallow-repository"]);
    return r.map((x) => x.trim() === "true");
  }
}

interface GuardFinding {
  code: GuardCode;
  message: string;
}

function render(f: GuardFinding): string {
  return `${f.code}: ${f.message}`;
}

/**
 * Refuses to compute a release onto a version a tag already occupies.
 *
 * The hazard this closes, measured: `git tag --merged <branch>` returned **0**
 * tags, so the releaser computed `1.0.0` from scratch — while the repository
 * already carried `v1.0.0` and ten further v-tags on other refs. The three
 * parts of the hazard were a tag validation that checked only the NAME and not
 * existence, a tag creation with no `-f`, and tagging that happens AFTER the
 * release commit. Failure mode: the release commit lands, the changelog is
 * written, assets are committed — and only *then* does tag creation fail,
 * leaving a committed release with no tag on the branch about to be pushed.
 *
 * The instance was cleared by deleting four tags. This is the class fix.
 */
class TagGuard {
  private readonly reader: TagReader;

  constructor(reader: TagReader) {
    this.reader = reader;
  }

  /**
   * Refuses when the repository holds version tags that `HEAD` cannot reach.
   *
   * This is the arm that catches the measured incident, and it runs without
   * knowing the version yet — which is the only thing that can be checked
   * *before* semantic-release computes one.
   */
  CheckVisibility(): PromiseResult<string, string[]> {
    return PR(async (): Promise<Result<string, string[]>> => {
      const pre = await this.preflight();
      if (pre.isErr()) return Err(pre.unwrapErr());
      const { all, visible } = pre.unwrap();

      const allVersions = all
        .map(parseVersion)
        .filter((x): x is SemVer => x != null);
      const visibleSet = new Set(visible);
      const invisible = allVersions.filter((v) => !visibleSet.has(v.raw));

      if (invisible.length === 0) {
        return Ok(
          `all ${allVersions.length} version tag(s) are reachable from HEAD; the computed version cannot land on an existing tag`,
        );
      }

      const highest = invisible.reduce((a, b) =>
        compareVersion(a, b) >= 0 ? a : b,
      );
      return Err([
        render({
          code: GuardCode.TagNotVisible,
          message:
            `${invisible.length} version tag(s) exist in this repository but are NOT reachable from HEAD ` +
            `(highest: ${highest.raw}; all: ${invisible
              .map((x) => x.raw)
              .join(", ")}). ` +
            `The next version is computed from reachable tags only, so it can be computed onto one of these. ` +
            `Tag creation happens after the release commit, so the commit and changelog would land and only then would tagging fail, ` +
            `leaving a committed release with no tag. Fetch the tags into this branch's history, or delete the tags deliberately, before releasing.`,
        }),
      ]);
    });
  }

  /**
   * Refuses when a tag for `version` already exists anywhere in the repository
   * — reachable or not, annotated or lightweight, whoever created it.
   */
  CheckVersion(version: string): PromiseResult<string, string[]> {
    return PR(async (): Promise<Result<string, string[]>> => {
      const parsed = parseVersion(version);
      if (parsed == null) {
        return Err([
          render({
            code: GuardCode.InvalidVersion,
            message: `\`${version}\` is not a full version (expected \`x.y.z\`, optionally \`v\`-prefixed); refusing rather than guessing what to check`,
          }),
        ]);
      }

      const pre = await this.preflight();
      if (pre.isErr()) return Err(pre.unwrapErr());
      const { all } = pre.unwrap();

      const bare = version.startsWith("v") ? version.slice(1) : version;
      const candidates = [bare, `v${bare}`];
      const taken = all.filter((t) => candidates.includes(t));

      if (taken.length > 0) {
        return Err([
          render({
            code: GuardCode.TagCollision,
            message:
              `tag(s) ${taken.join(", ")} already exist in this repository, so version ${bare} is already taken. ` +
              `Existence is the only test applied: the tag's author, date, annotation and reachability are not consulted, ` +
              `because a tag minted by a human owner blocks a release exactly as hard as one minted by a machine.`,
          }),
        ]);
      }

      return Ok(
        `version ${bare} is free (checked ${candidates.join(" and ")} against all ${all.length} tag(s) in the repository)`,
      );
    });
  }

  /** Both arms. Every finding is reported, not just the first. */
  Check(version?: string): PromiseResult<string[], string[]> {
    return PR(async (): Promise<Result<string[], string[]>> => {
      const results: string[] = [];
      const errors: string[] = [];

      if (version != null) {
        const r = await this.CheckVersion(version).promise;
        r.match({
          ok: (o) => results.push(o),
          err: (e) => errors.push(...e),
        });
      }

      const v = await this.CheckVisibility().promise;
      v.match({
        ok: (o) => results.push(o),
        err: (e) => errors.push(...e),
      });

      // Both arms share a preflight, so a repository-level fault (shallow clone,
      // not a repository) is reported by each of them. Report it once: a reason
      // repeated reads as two independent faults.
      if (errors.length > 0) return Err([...new Set(errors)]);
      return Ok(results);
    });
  }

  /**
   * Establishes that the guard is able to answer at all.
   *
   * A guard that cannot read the tags must refuse, not pass: "I could not look"
   * and "I looked and it is clear" are different verdicts, and only one of them
   * is safe to release on.
   */
  private async preflight(): Promise<
    Result<{ all: string[]; visible: string[] }, string[]>
  > {
    const shallow = await this.reader.IsShallow();
    if (shallow.isErr()) {
      return Err([
        render({
          code: GuardCode.NotAGitRepo,
          message: `cannot inspect tags: ${shallow.unwrapErr()}`,
        }),
      ]);
    }
    if (shallow.unwrap()) {
      return Err([
        render({
          code: GuardCode.ShallowClone,
          message:
            "this is a shallow clone, so the tag set is incomplete and a collision cannot be ruled out. " +
            "Refusing instead of reporting a clear result from an incomplete population. " +
            "Fetch full history and tags (`git fetch --unshallow --tags`) before releasing.",
        }),
      ]);
    }

    const all = await this.reader.All();
    if (all.isErr()) {
      return Err([
        render({
          code: GuardCode.NotAGitRepo,
          message: `cannot list tags: ${all.unwrapErr()}`,
        }),
      ]);
    }

    const visible = await this.reader.Visible();
    if (visible.isErr()) {
      return Err([
        render({
          code: GuardCode.NotAGitRepo,
          message: `cannot list tags reachable from HEAD: ${visible.unwrapErr()}`,
        }),
      ]);
    }

    return Ok({ all: all.unwrap(), visible: visible.unwrap() });
  }
}

export {
  TagGuard,
  GitTagReader,
  TagReader,
  GuardCode,
  parseVersion,
  compareVersion,
};
