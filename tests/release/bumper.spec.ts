import { should } from "chai";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { Bumper } from "../../src/classLibrary/release/bump/bumper";
import { Bump } from "../../src/classLibrary/release/configuration";

should();

/**
 * These tests bump REAL FILES ON DISK and then read the bytes back. Nothing here
 * concludes from a return value alone.
 *
 * Every green case asserts the field's value on disk BEFORE the bump as well as
 * after. That pre-assertion is what makes the post-assertion mean something: a
 * bumper that silently did nothing would satisfy "no error" and would still fail
 * the pair, because the before and after values are asserted to differ.
 */

const PKG = `{
  "name": "@atomicloud/bun-base",
  "version": "1.3.1",
  "type": "module"
}
`;

const PROPS = `<Project>
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <Version>0.0.0</Version>
  </PropertyGroup>
</Project>
`;

const PUBSPEC = `name: dart_lib
version: 1.2.3
environment:
  sdk: ^3.6.0
`;

describe("Bumper", () => {
  let dir: string;

  beforeEach(function () {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "sg-bump-"));
  });

  afterEach(function () {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const write = (rel: string, content: string): void => {
    const p = path.join(dir, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content, "utf8");
  };

  /** Reads the bytes back off the filesystem. Never from memory. */
  const read = (rel: string): string =>
    fs.readFileSync(path.join(dir, rel), "utf8");

  const bump = (bumps: Bump[], version: string) =>
    new Bumper(dir).Bump(bumps, version).promise;

  describe("node-version, default path", () => {
    it("writes the version into package.json .version on disk", async function () {
      // SUBJECT: <tmp>/package.json, field: top-level "version". Shell: none —
      // this is an in-process call, so no shell quoting is involved.
      write("package.json", PKG);
      JSON.parse(read("package.json")).version.should.equal("1.3.1");

      const r = await bump([{ type: "node-version" }], "1.4.0");
      r.isOk().should.be.true;

      const after = read("package.json");
      JSON.parse(after).version.should.equal("1.4.0");
      after.should.equal(`{
  "name": "@atomicloud/bun-base",
  "version": "1.4.0",
  "type": "module"
}
`);

      const report = r.unwrap();
      report.length.should.equal(1);
      report[0].file.should.equal("package.json");
      report[0].from.should.equal("1.3.1");
      report[0].to.should.equal("1.4.0");
      report[0].overridden.should.be.false;
    });
  });

  describe("dotnet-version, which has NO default path", () => {
    const REASON = "this repo keeps its version in Version.props";

    it("writes the version into the NAMED file's <Version> on disk", async function () {
      // SUBJECT: <tmp>/Version.props, field: the <Version> element. The path is
      // named by the entry because this type ships no default — measured, the
      // version lives in a different file in every authoritative dotnet tree.
      write("Version.props", PROPS);
      read("Version.props").should.contain("<Version>0.0.0</Version>");

      const r = await bump(
        [{ type: "dotnet-version", file: "Version.props", reason: REASON }],
        "2.1.0",
      );
      r.isOk().should.be.true;

      const after = read("Version.props");
      after.should.contain("<Version>2.1.0</Version>");
      after.should.not.contain("<Version>0.0.0</Version>");
      after.should.contain("<TargetFramework>net10.0</TargetFramework>");
      r.unwrap()[0].from.should.equal("0.0.0");
    });

    it("also works when the named file is a project file", async function () {
      // SUBJECT: <tmp>/App/App.csproj — the OTHER real measured location
      // (dotnet-base @329d76c0). Same preset, different named path, no default
      // involved either way.
      write(
        "App/App.csproj",
        `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <Version>0.0.0</Version>
  </PropertyGroup>
</Project>
`,
      );
      const r = await bump(
        [
          {
            type: "dotnet-version",
            file: "App/App.csproj",
            reason: "this repo keeps its version in the App project",
          },
        ],
        "2.1.0",
      );
      r.isOk().should.be.true;
      read("App/App.csproj").should.contain("<Version>2.1.0</Version>");
    });

    it("RED: refuses an entry that names no file, and writes nothing", async function () {
      // SUBJECT: a bare `{type: dotnet-version}` reaching the engine. The schema
      // rejects this first, so this is the engine's own defence in depth. Two
      // candidate files are present, either of which a guessing implementation
      // could have picked — neither may be touched.
      write("Directory.Build.props", PROPS);
      write("Version.props", PROPS);

      const r = await bump([{ type: "dotnet-version" }], "2.1.0");
      r.isErr().should.be.true;
      r.unwrapErr()[0].should.contain("no built-in default path");
      r.unwrapErr()[0].should.contain("must name a");

      read("Directory.Build.props").should.equal(PROPS);
      read("Version.props").should.equal(PROPS);
    });
  });

  describe("dart-version, default path", () => {
    it("writes the version into pubspec.yaml version on disk", async function () {
      // SUBJECT: <tmp>/pubspec.yaml, field: the column-0 `version` key.
      write("pubspec.yaml", PUBSPEC);
      read("pubspec.yaml").should.contain("\nversion: 1.2.3\n");

      const r = await bump([{ type: "dart-version" }], "1.3.0");
      r.isOk().should.be.true;

      const after = read("pubspec.yaml");
      after.should.equal(`name: dart_lib
version: 1.3.0
environment:
  sdk: ^3.6.0
`);
      r.unwrap()[0].from.should.equal("1.2.3");
    });
  });

  describe("all three types in one pass", () => {
    it("mutates all three files, each in its own field", async function () {
      // SUBJECT: three files in one tmp dir, one entry each. Population: the
      // three shipped runtime types, no others.
      write("package.json", PKG);
      write("Version.props", PROPS);
      write("pubspec.yaml", PUBSPEC);

      const r = await bump(
        [
          { type: "node-version" },
          {
            type: "dotnet-version",
            file: "Version.props",
            reason: "this repo keeps its version in Version.props",
          },
          { type: "dart-version" },
        ],
        "3.0.0",
      );
      r.isOk().should.be.true;
      r.unwrap().length.should.equal(3);

      JSON.parse(read("package.json")).version.should.equal("3.0.0");
      read("Version.props").should.contain("<Version>3.0.0</Version>");
      read("pubspec.yaml").should.contain("\nversion: 3.0.0\n");
    });
  });

  describe("the file override, on a type that HAS a default", () => {
    it("writes the override path and leaves the default path untouched", async function () {
      // SUBJECT: two files — packages/api/package.json (the override target) and
      // the root package.json (node-version's default, which must NOT be written).
      // node-version is used here precisely because it HAS a default, so there is
      // a default for the override to be distinguished from.
      write("package.json", PKG);
      write("packages/api/package.json", PKG);

      const r = await bump(
        [
          {
            type: "node-version",
            file: "packages/api/package.json",
            reason: "the released package is the api workspace, not the root",
          },
        ],
        "1.4.0",
      );
      r.isOk().should.be.true;

      JSON.parse(read("packages/api/package.json")).version.should.equal(
        "1.4.0",
      );
      // The control that matters: the default path is byte-identical.
      read("package.json").should.equal(PKG);

      const report = r.unwrap()[0];
      report.file.should.equal("packages/api/package.json");
      report.overridden.should.be.true;
      (report.reason as string).should.equal(
        "the released package is the api workspace, not the root",
      );
    });
  });

  describe("RED arms", () => {
    it("wrong file: a missing target errors and writes nothing", async function () {
      // SUBJECT: an override pointing at <tmp>/does/not/exist.json, with a real
      // package.json present in the same dir to prove the failure is about the
      // named path and not about the directory being empty.
      write("package.json", PKG);

      const r = await bump(
        [
          {
            type: "node-version",
            file: "does/not/exist.json",
            reason: "deliberately wrong, for the test",
          },
        ],
        "1.4.0",
      );
      r.isErr().should.be.true;
      r.unwrapErr()[0].should.contain("does/not/exist.json");
      r.unwrapErr()[0].should.contain("cannot be read");

      // The mutation assertion, not the exit code: the real file is untouched.
      read("package.json").should.equal(PKG);
    });

    it("wrong field: a file lacking the field errors and writes nothing", async function () {
      // SUBJECT: <tmp>/Directory.Build.props containing the REAL dotnet-base
      // content, which declares no <Version>. This is the un-seeded dotnet case
      // and it must be red, not a silent success.
      const real = `<Project>
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <Nullable>enable</Nullable>
  </PropertyGroup>
</Project>
`;
      write("Directory.Build.props", real);

      const r = await bump(
        [
          {
            type: "dotnet-version",
            file: "Directory.Build.props",
            reason: "deliberately the wrong file, for the test",
          },
        ],
        "2.1.0",
      );
      r.isErr().should.be.true;
      r.unwrapErr()[0].should.contain("Directory.Build.props");
      r.unwrapErr()[0].should.contain("does not declare");
      r.unwrapErr()[0].should.contain("dotnet-version");

      read("Directory.Build.props").should.equal(real);
    });

    it("wrong field: pointing the node type at a dart file errors and writes nothing", async function () {
      // SUBJECT: <tmp>/pubspec.yaml handed to node-version via an override.
      // Both files exist, so this isolates the type/file mismatch itself.
      write("pubspec.yaml", PUBSPEC);
      write("package.json", PKG);

      const r = await bump(
        [
          {
            type: "node-version",
            file: "pubspec.yaml",
            reason: "deliberately mismatched, for the test",
          },
        ],
        "1.4.0",
      );
      r.isErr().should.be.true;
      r.unwrapErr()[0].should.contain("is not valid JSON");

      read("pubspec.yaml").should.equal(PUBSPEC);
      read("package.json").should.equal(PKG);
    });

    it("ATOMICITY: a later failure leaves an earlier target unwritten", async function () {
      // SUBJECT: package.json (entry 1, would succeed) and Directory.Build.props
      // (entry 2, has no <Version> so it fails). This is the control against a
      // half-applied bump leaving the repo claiming two versions at once.
      write("package.json", PKG);
      write(
        "Directory.Build.props",
        "<Project>\n  <PropertyGroup />\n</Project>\n",
      );

      const r = await bump(
        [{ type: "node-version" }, { type: "dotnet-version" }],
        "1.4.0",
      );
      r.isErr().should.be.true;

      // package.json would have been a perfectly valid bump on its own; it must
      // still be byte-identical.
      read("package.json").should.equal(PKG);
      JSON.parse(read("package.json")).version.should.equal("1.3.1");
    });

    it("CONTROL for the atomicity claim: entry 1 alone DOES write", async function () {
      // SUBJECT: the same package.json and the same entry 1, without the failing
      // entry 2. Proves the previous test's untouched file is caused by the
      // rollback and not by entry 1 being inert.
      write("package.json", PKG);

      const r = await bump([{ type: "node-version" }], "1.4.0");
      r.isOk().should.be.true;
      JSON.parse(read("package.json")).version.should.equal("1.4.0");
    });

    it("refuses two entries claiming the same file", async function () {
      // SUBJECT: <tmp>/package.json, reached twice — once via node-version's
      // default and once via an explicit path naming the same file. Two entries
      // cannot both be the version of record for one file.
      write("package.json", PKG);

      const r = await bump(
        [
          { type: "node-version" },
          {
            type: "node-version",
            file: "package.json",
            reason: "same file on purpose, for the test",
          },
        ],
        "1.4.0",
      );
      r.isErr().should.be.true;
      r.unwrapErr()[0].should.contain("already claimed");
      read("package.json").should.equal(PKG);
    });

    it("refuses an empty bump list instead of reporting a success", async function () {
      // SUBJECT: an empty `bumps` list. A zero-entry run that exits green is
      // indistinguishable from a bump that worked, which is the false-green
      // shape this whole item is guarding against.
      const r = await bump([], "1.4.0");
      r.isErr().should.be.true;
      r.unwrapErr()[0].should.contain("nothing to bump");
    });

    it("accepts a tag-shaped version and writes it WITHOUT the v", async function () {
      // SUBJECT: <tmp>/package.json given the version "v1.4.0". The bump scripts
      // being replaced all strip the v, and npm would reject "v1.4.0" as a
      // manifest version, so the byte written must be 1.4.0.
      write("package.json", PKG);

      const r = await bump([{ type: "node-version" }], "v1.4.0");
      r.isOk().should.be.true;

      JSON.parse(read("package.json")).version.should.equal("1.4.0");
      read("package.json").should.not.contain("v1.4.0");
      r.unwrap()[0].to.should.equal("1.4.0");
    });

    it("refuses an unusable version before writing anything", async function () {
      // SUBJECT: the version string "1.4.0 && rm -rf /", with a bumpable
      // package.json present so the only reason to fail is the version.
      write("package.json", PKG);

      const r = await bump([{ type: "node-version" }], "1.4.0 && rm -rf /");
      r.isErr().should.be.true;
      r.unwrapErr()[0].should.contain("not a usable version");

      read("package.json").should.equal(PKG);
    });
  });

  describe("Resolve", () => {
    it("returns the preset default when no file is given", function () {
      Bumper.Resolve({ type: "node-version" })?.should.equal("package.json");
      Bumper.Resolve({ type: "dart-version" })?.should.equal("pubspec.yaml");
    });

    it("returns null for a type with no default, rather than guessing", function () {
      // SUBJECT: dotnet-version with no file. Null is what makes the engine and
      // the schema able to refuse instead of writing somewhere plausible.
      (Bumper.Resolve({ type: "dotnet-version" }) === null).should.be.true;
    });

    it("returns the named file when one is given", function () {
      Bumper.Resolve({
        type: "dotnet-version",
        file: "App/App.csproj",
        reason: "this repo keeps its version in the App project",
      })?.should.equal("App/App.csproj");
    });
  });
});
