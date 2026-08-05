import { Err, Ok, Result } from "@hqoss/monads";
import { should } from "chai";
import {
  compareVersion,
  GuardCode,
  parseVersion,
  TagGuard,
  TagReader,
} from "../../src/classLibrary/release/tag-guard";

should();

/**
 * A tag reader that can be told exactly what a repository holds.
 *
 * It also RECORDS every call, so a test can assert the guard consulted the full
 * tag set rather than the reachable subset — the distinction the measured
 * incident turned on.
 */
class FakeTagReader implements TagReader {
  readonly calls: string[] = [];

  constructor(
    private readonly all: string[],
    private readonly visible: string[] = all,
    private readonly shallow = false,
    private readonly broken: string | null = null,
  ) {}

  async All(): Promise<Result<string[], string>> {
    this.calls.push("All");
    if (this.broken != null) return Err(this.broken);
    return Ok(this.all);
  }

  async Visible(): Promise<Result<string[], string>> {
    this.calls.push("Visible");
    if (this.broken != null) return Err(this.broken);
    return Ok(this.visible);
  }

  async IsShallow(): Promise<Result<boolean, string>> {
    this.calls.push("IsShallow");
    if (this.broken != null) return Err(this.broken);
    return Ok(this.shallow);
  }
}

async function version(
  reader: TagReader,
  v: string,
): Promise<[boolean, string[]]> {
  const r = await new TagGuard(reader).CheckVersion(v).promise;
  return r.isOk() ? [true, [r.unwrap()]] : [false, r.unwrapErr()];
}

async function visibility(reader: TagReader): Promise<[boolean, string[]]> {
  const r = await new TagGuard(reader).CheckVisibility().promise;
  return r.isOk() ? [true, [r.unwrap()]] : [false, r.unwrapErr()];
}

describe("parseVersion", () => {
  it("accepts full versions with and without a v prefix", () => {
    parseVersion("1.2.3")?.major.should.equal(1);
    parseVersion("v1.2.3")?.patch.should.equal(3);
    parseVersion("v1.2.3-rc.1")?.prerelease.should.equal("rc.1");
  });

  it("rejects anything that is not a full version", () => {
    // Floating major/minor tags (semantic-release-major-tag mints `v3`, `v3.1`
    // and MOVES them) must not be read as version tags, or every release would
    // refuse itself.
    ["v3", "v3.1", "1.2", "main", "latest", "release-1.2.3", "", "v"].forEach(
      (t) => {
        // eslint-disable-next-line no-unused-expressions
        (parseVersion(t) === null).should.equal(
          true,
          `expected null for '${t}'`,
        );
      },
    );
  });
});

describe("compareVersion", () => {
  it("orders by major, minor, patch", () => {
    const c = (a: string, b: string) =>
      compareVersion(parseVersion(a)!, parseVersion(b)!);
    c("2.0.0", "1.9.9").should.be.greaterThan(0);
    c("1.3.1", "1.3.0").should.be.greaterThan(0);
    c("1.0.0", "1.0.0").should.equal(0);
  });

  it("ranks a release above its own prereleases", () => {
    compareVersion(
      parseVersion("1.0.0")!,
      parseVersion("1.0.0-rc.1")!,
    ).should.be.greaterThan(0);
  });
});

describe("TagGuard.CheckVersion", () => {
  // ── the must-differ control ────────────────────────────────────────────────
  it("clears a version no tag occupies", async () => {
    const [ok, msgs] = await version(new FakeTagReader(["v1.0.0"]), "2.0.0");
    ok.should.equal(true, msgs.join("; "));
    msgs[0].should.contain("is free");
  });

  it("refuses a version whose tag exists", async () => {
    const [ok, msgs] = await version(new FakeTagReader(["v1.0.0"]), "1.0.0");
    ok.should.equal(false);
    msgs.join(";").should.contain(GuardCode.TagCollision);
    msgs.join(";").should.contain("v1.0.0");
  });

  it("refuses regardless of the v prefix on either side", async () => {
    (await version(new FakeTagReader(["2.0.0"]), "v2.0.0"))[0].should.equal(
      false,
    );
    (await version(new FakeTagReader(["v2.0.0"]), "2.0.0"))[0].should.equal(
      false,
    );
  });

  it("refuses a tag that HEAD cannot reach, not only the reachable ones", async () => {
    // The measured incident in one assertion: the tag exists, `git tag --merged`
    // cannot see it, and the guard must still refuse. A guard that consulted
    // only the reachable set would return OK here.
    const reader = new FakeTagReader(["v1.0.0"], []);
    const [ok, msgs] = await version(reader, "1.0.0");
    ok.should.equal(false, "an unreachable tag must still block its version");
    msgs.join(";").should.contain(GuardCode.TagCollision);
    reader.calls.should.contain("All");
  });

  it("refuses a version that is not full semver rather than guessing", async () => {
    const [ok, msgs] = await version(new FakeTagReader([]), "1.2");
    ok.should.equal(false);
    msgs.join(";").should.contain(GuardCode.InvalidVersion);
  });

  it("refuses when the tag set is incomplete, instead of reporting it clear", async () => {
    const [ok, msgs] = await version(new FakeTagReader([], [], true), "9.9.9");
    ok.should.equal(false, "a shallow clone cannot clear a version");
    msgs.join(";").should.contain(GuardCode.ShallowClone);
  });

  it("refuses when it cannot read the repository at all", async () => {
    const [ok, msgs] = await version(
      new FakeTagReader([], [], false, "fatal: not a git repository"),
      "1.0.0",
    );
    ok.should.equal(false, "'I could not look' is not 'it is clear'");
    msgs.join(";").should.contain(GuardCode.NotAGitRepo);
  });
});

describe("TagGuard.CheckVisibility", () => {
  // ── the must-differ control ────────────────────────────────────────────────
  it("clears a repository whose every version tag is reachable", async () => {
    const [ok, msgs] = await visibility(
      new FakeTagReader(["v1.0.0", "v1.1.0"], ["v1.0.0", "v1.1.0"]),
    );
    ok.should.equal(true, msgs.join("; "));
    msgs[0].should.contain("reachable from HEAD");
  });

  it("reproduces the measured incident: 11 tags in the repo, 0 reachable", async () => {
    const all = [
      "v0.1.0",
      "v0.1.1",
      "v1.0.0",
      "v1.0.1",
      "v1.0.2",
      "v1.1.0",
      "v1.1.1",
      "v1.1.2",
      "v1.2.0",
      "v1.3.0",
      "v1.3.1",
    ];
    const [ok, msgs] = await visibility(new FakeTagReader(all, []));
    ok.should.equal(false);
    const joined = msgs.join(";");
    joined.should.contain(GuardCode.TagNotVisible);
    joined.should.contain("11 version tag(s)");
    joined.should.contain("highest: v1.3.1");
  });

  it("ignores floating major and minor tags, which move by design", async () => {
    // `v3` and `v3.1` are unreachable in this repository, but they are not
    // version tags; treating them as such would refuse every release.
    const [ok] = await visibility(
      new FakeTagReader(["v1.0.0", "v3", "v3.1"], ["v1.0.0"]),
    );
    ok.should.equal(true);
  });

  it("ignores non-version refs entirely", async () => {
    const [ok] = await visibility(
      new FakeTagReader(["v1.0.0", "latest", "release-candidate"], ["v1.0.0"]),
    );
    ok.should.equal(true);
  });

  it("refuses on a shallow clone", async () => {
    const [ok, msgs] = await visibility(new FakeTagReader([], [], true));
    ok.should.equal(false);
    msgs.join(";").should.contain(GuardCode.ShallowClone);
  });
});

describe("TagGuard.Check", () => {
  it("reports a repository-level fault once, not once per arm", async () => {
    const r = await new TagGuard(new FakeTagReader([], [], true)).Check("1.0.0")
      .promise;
    r.isErr().should.equal(true);
    r.unwrapErr().length.should.equal(1);
  });

  it("runs the visibility arm even when no version is supplied", async () => {
    const r = await new TagGuard(new FakeTagReader(["v1.0.0"], [])).Check()
      .promise;
    r.isErr().should.equal(true);
    r.unwrapErr().join(";").should.contain(GuardCode.TagNotVisible);
  });
});
