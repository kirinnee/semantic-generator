import { should } from "chai";
import {
  BumpPreset,
  DartVersion,
  DotnetVersion,
  NodeVersion,
  NormalizeVersion,
  RequiresExplicitFile,
  ValidVersion,
  bumpPresets,
  bumpTypeNames,
} from "../../src/classLibrary/release/bump/bump-types";

should();

/**
 * Every assertion below is about the BYTES the preset produces, never about
 * whether the call merely succeeded. A preset that returned its input unchanged
 * would satisfy "did not error" perfectly, so each green case is paired with an
 * explicit control proving the assertion rejects exactly that no-op.
 */

describe("bump presets", () => {
  describe("the preset table", () => {
    it("covers every runtime name, and each preset is keyed by its own type", function () {
      // SUBJECT: the keys of bumpPresets vs the `type` each preset reports.
      bumpTypeNames.should.deep.equal([
        "node-version",
        "dotnet-version",
        "dart-version",
      ]);
      bumpTypeNames.forEach((n) => bumpPresets[n].type.should.equal(n));
    });

    it("pins the built-in default path of each type", function () {
      // SUBJECT: the default paths. Pinned because a silent change to one of
      // these would move where a release writes its version.
      NodeVersion.defaultFile?.should.equal("package.json");
      DartVersion.defaultFile?.should.equal("pubspec.yaml");
      // dotnet-version deliberately has NONE. Measured across four authoritative
      // dotnet trees, the version field lives in App/App.csproj (dotnet-base
      // @329d76c0), in Version.props (dotnet-lib @9b23f046), and nowhere at all
      // (dotnet-api @abe5d046, published dotnet-base @606db3d9). Directory.Build.props
      // exists in all four and carries it in none, so any default would be wrong
      // somewhere and would write to the wrong file instead of complaining.
      (DotnetVersion.defaultFile === null).should.be.true;
    });

    it("marks exactly the defaultless types as requiring an explicit file", function () {
      // SUBJECT: RequiresExplicitFile, which is what the schema consults.
      RequiresExplicitFile("dotnet-version").should.be.true;
      RequiresExplicitFile("node-version").should.be.false;
      RequiresExplicitFile("dart-version").should.be.false;
    });
  });

  describe("NormalizeVersion", () => {
    /**
     * SUBJECT: the version string as handed to the bump, before any file is read.
     * Measured at diene.all — authoritative/bun-base @efac203a,
     * authoritative/dart-lib @3eecf1e0 and authoritative/dotnet-base @329d76c0
     * every one of them applies `${version#v}` before stamping. These presets
     * replace those scripts, so they must agree on this.
     */
    it("strips a single leading v before a digit", function () {
      NormalizeVersion("v1.2.3").should.equal("1.2.3");
      NormalizeVersion("v0.0.1").should.equal("0.0.1");
      NormalizeVersion("v10.20.30").should.equal("10.20.30");
    });

    it("leaves a version with no leading v alone", function () {
      NormalizeVersion("1.2.3").should.equal("1.2.3");
    });

    it("does NOT strip a v that is not a version prefix", function () {
      // SUBJECT: strings where the leading v is part of the value. Stripping
      // blindly would corrupt these.
      NormalizeVersion("version").should.equal("version");
      NormalizeVersion("vNext").should.equal("vNext");
    });

    it("leaves a doubled v alone, because vv is not a version prefix", function () {
      // Deliberately DIFFERENT from bash `${version#v}`, which would strip one v
      // unconditionally and also turn "version" into "ersion". The guard here is
      // "a single v immediately followed by a digit", which is the only form that
      // is actually a tag prefix. "vv1.2.3" is malformed input, not a v-prefixed
      // version, so it is not silently reinterpreted into one.
      NormalizeVersion("vv1.2.3").should.equal("vv1.2.3");
    });
  });

  describe("ValidVersion", () => {
    // SUBJECT: the version string itself, before any file is touched.
    ["1.3.1", "0.0.1", "2.0.0-rc.1", "1.0.0+build.5", "10.20.30"].forEach((v) =>
      it(`accepts ${v}`, function () {
        ValidVersion(v).isOk().should.be.true;
      }),
    );

    [
      "",
      " 1.0.0",
      "1.0.0 ",
      "1.0.0\n",
      '1.0"0',
      "<1.0.0>",
      "$(x)",
      "a b",
    ].forEach((v) =>
      it(`rejects ${JSON.stringify(v)}`, function () {
        ValidVersion(v).isErr().should.be.true;
      }),
    );
  });

  /**
   * node-version. SUBJECT: package.json bytes, field = the top-level "version"
   * string. Shape taken from diene/bun-base @ 98157d21 (main), whose real
   * .version is "1.3.1".
   */
  describe("node-version", () => {
    const pkg = `{
  "name": "@atomicloud/bun-base",
  "version": "1.3.1",
  "type": "module",
  "dependencies": {
    "zod": "^3.24.1"
  }
}
`;

    it("writes the new version into the top-level version field", function () {
      const r = NodeVersion.Apply(pkg, "1.4.0");
      r.isOk().should.be.true;
      const out = r.unwrap();

      out.from.should.equal("1.3.1");
      // Assert the WHOLE file, so a bump that also disturbed key order,
      // indentation or the dependency block would fail here.
      out.content.should.equal(`{
  "name": "@atomicloud/bun-base",
  "version": "1.4.0",
  "type": "module",
  "dependencies": {
    "zod": "^3.24.1"
  }
}
`);
      // And the field really parses to the new value, not just looks right.
      JSON.parse(out.content).version.should.equal("1.4.0");
    });

    it("CONTROL: that same assertion rejects an inert no-op", function () {
      // SUBJECT: the assertion used in the test above, applied to unchanged
      // bytes. If this passed, the green case would be worthless.
      JSON.parse(pkg).version.should.not.equal("1.4.0");
      pkg.should.not.equal(NodeVersion.Apply(pkg, "1.4.0").unwrap().content);
    });

    it("RED, field absent: refuses a package.json with no version key", function () {
      // SUBJECT: a package.json that is valid JSON but declares no version.
      const r = NodeVersion.Apply('{\n  "name": "x"\n}\n', "1.4.0");
      r.isErr().should.be.true;
      r.unwrapErr().should.contain("does not declare");
      r.unwrapErr().should.contain("does not introduce one");
    });

    it("RED, ambiguous: refuses two identical version literals", function () {
      // SUBJECT: a package.json where a nested object repeats the same version
      // string, so a surgical rewrite could land on the wrong one.
      const twice = `{
  "version": "1.3.1",
  "pinned": {
    "version": "1.3.1"
  }
}
`;
      const r = NodeVersion.Apply(twice, "1.4.0");
      r.isErr().should.be.true;
      r.unwrapErr().should.contain("2 times");
      r.unwrapErr().should.contain("Refusing to guess");
    });

    it("RED, wrong file: refuses a pubspec.yaml handed to the node preset", function () {
      // SUBJECT: dart bytes fed to the node preset — the wrong-file case.
      const r = NodeVersion.Apply("name: x\nversion: 1.3.1\n", "1.4.0");
      r.isErr().should.be.true;
      r.unwrapErr().should.contain("is not valid JSON");
    });

    it("RED, wrong field type: refuses a non-string version", function () {
      // SUBJECT: `"version": 3` — present, but not a version string.
      const r = NodeVersion.Apply('{\n  "version": 3\n}\n', "1.4.0");
      r.isErr().should.be.true;
      r.unwrapErr().should.contain("not a string");
    });
  });

  /**
   * dotnet-version. SUBJECT: MSBuild XML bytes, field = the <Version> property.
   *
   * This preset has NO default path, so every fixture below stands in for a file
   * the configuration named explicitly. The shapes are the two real ones measured
   * in the authoritative trees: a project file carrying <Version>
   * (dotnet-base @329d76c0, App/App.csproj:5) and a dedicated props file carrying
   * it (dotnet-lib @9b23f046, Version.props:3).
   */
  describe("dotnet-version", () => {
    // Shape of dotnet-lib's Version.props, which is a real measured location.
    const props = `<Project>

  <!-- Shared .NET defaults applied to every project in the repository. -->
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <Version>0.0.0</Version>
    <Nullable>enable</Nullable>
  </PropertyGroup>

</Project>
`;

    it("writes the new version into the Version element", function () {
      const r = DotnetVersion.Apply(props, "2.1.0");
      r.isOk().should.be.true;
      const out = r.unwrap();

      out.from.should.equal("0.0.0");
      out.content.should.equal(`<Project>

  <!-- Shared .NET defaults applied to every project in the repository. -->
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <Version>2.1.0</Version>
    <Nullable>enable</Nullable>
  </PropertyGroup>

</Project>
`);
    });

    it("CONTROL: that same assertion rejects an inert no-op", function () {
      // SUBJECT: unchanged Directory.Build.props bytes.
      props.should.contain("<Version>0.0.0</Version>");
      props.should.not.contain("<Version>2.1.0</Version>");
      DotnetVersion.Apply(props, "2.1.0")
        .unwrap()
        .content.should.not.equal(props);
    });

    it("RED, field absent: refuses a REAL Directory.Build.props verbatim", function () {
      // SUBJECT: the actual Directory.Build.props content measured at
      // dotnet-base 606db3d9. It declares no version field — and neither does the
      // Directory.Build.props of any of the four trees measured. This is the file
      // that was very nearly shipped as the default, so pointing a bump at it must
      // be loudly red rather than a silent no-op.
      const real = `<Project>

  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <LangVersion>latest</LangVersion>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>

</Project>
`;
      const r = DotnetVersion.Apply(real, "2.1.0");
      r.isErr().should.be.true;
      r.unwrapErr().should.contain("does not declare");
      r.unwrapErr().should.contain("<Version>");
    });

    it("RED, ambiguous: refuses two Version elements", function () {
      // SUBJECT: props declaring <Version> in two PropertyGroups.
      const twice = `<Project>
  <PropertyGroup>
    <Version>0.0.0</Version>
  </PropertyGroup>
  <PropertyGroup Condition="'$(CI)' == 'true'">
    <Version>0.0.1</Version>
  </PropertyGroup>
</Project>
`;
      const r = DotnetVersion.Apply(twice, "2.1.0");
      r.isErr().should.be.true;
      r.unwrapErr().should.contain("2 times");
    });

    it("does not mistake VersionPrefix for Version", function () {
      // SUBJECT: <VersionPrefix>, a different MSBuild property that shares a
      // prefix. It must not be treated as the field, in either direction.
      const prefixOnly = `<Project>
  <PropertyGroup>
    <VersionPrefix>0.0.0</VersionPrefix>
  </PropertyGroup>
</Project>
`;
      DotnetVersion.Apply(prefixOnly, "2.1.0").isErr().should.be.true;

      const both = `<Project>
  <PropertyGroup>
    <VersionPrefix>9.9.9</VersionPrefix>
    <Version>0.0.0</Version>
  </PropertyGroup>
</Project>
`;
      const out = DotnetVersion.Apply(both, "2.1.0").unwrap();
      out.content.should.contain("<VersionPrefix>9.9.9</VersionPrefix>");
      out.content.should.contain("<Version>2.1.0</Version>");
    });

    it("RED, wrong file: refuses a package.json handed to the dotnet preset", function () {
      // SUBJECT: node bytes fed to the dotnet preset.
      const r = DotnetVersion.Apply('{\n  "version": "1.3.1"\n}\n', "2.1.0");
      r.isErr().should.be.true;
      r.unwrapErr().should.contain("does not declare");
    });
  });

  /**
   * dart-version. SUBJECT: pubspec.yaml bytes, field = the top-level `version`
   * key. Fixtures are synthetic and stated as such: measured 2026-08-05, no
   * pubspec.yaml exists anywhere in the diene tree yet, so there is nothing to
   * copy a shape from. diene.dart_lib is queued to be the first real consumer.
   */
  describe("dart-version", () => {
    const pubspec = `name: dart_lib
description: A dart library
version: 1.2.3
environment:
  sdk: ^3.6.0

dependencies:
  meta:
    version: ^1.16.0
`;

    it("writes the new version into the top-level version key", function () {
      const r = DartVersion.Apply(pubspec, "1.3.0");
      r.isOk().should.be.true;
      const out = r.unwrap();

      out.from.should.equal("1.2.3");
      out.content.should.equal(`name: dart_lib
description: A dart library
version: 1.3.0
environment:
  sdk: ^3.6.0

dependencies:
  meta:
    version: ^1.16.0
`);
    });

    it("leaves an INDENTED version key alone", function () {
      // SUBJECT: `    version: ^1.16.0` under dependencies.meta — a nested key
      // that column-0 anchoring must never touch. This is the control that
      // makes the top-level claim mean something.
      const out = DartVersion.Apply(pubspec, "1.3.0").unwrap();
      out.content.should.contain("    version: ^1.16.0");
      out.content.should.not.contain("    version: 1.3.0");
    });

    it("CONTROL: that same assertion rejects an inert no-op", function () {
      // SUBJECT: unchanged pubspec.yaml bytes.
      pubspec.should.contain("\nversion: 1.2.3\n");
      pubspec.should.not.contain("\nversion: 1.3.0\n");
      DartVersion.Apply(pubspec, "1.3.0")
        .unwrap()
        .content.should.not.equal(pubspec);
    });

    it("preserves an inline comment after the version", function () {
      // SUBJECT: `version: 1.2.3 # managed by the releaser`.
      const withComment = "name: x\nversion: 1.2.3 # managed by the releaser\n";
      const out = DartVersion.Apply(withComment, "1.3.0").unwrap();
      out.content.should.equal(
        "name: x\nversion: 1.3.0 # managed by the releaser\n",
      );
    });

    it("RED, field absent: refuses a pubspec with no version key", function () {
      // SUBJECT: a pubspec declaring name and sdk but no version.
      const r = DartVersion.Apply(
        "name: dart_lib\nenvironment:\n  sdk: ^3.6.0\n",
        "1.3.0",
      );
      r.isErr().should.be.true;
      r.unwrapErr().should.contain("does not declare");
    });

    it("RED, field absent: refuses a version key with no value", function () {
      // SUBJECT: `version:` with an empty value — present as a key, absent as a
      // value. It must not be read as a bumpable field.
      const r = DartVersion.Apply("name: x\nversion:\n", "1.3.0");
      r.isErr().should.be.true;
      r.unwrapErr().should.contain("does not declare");
    });

    it("RED, ambiguous: refuses two top-level version keys", function () {
      // SUBJECT: a pubspec with `version:` twice at column 0.
      //
      // It IS refused, but NOT by the exactly-one-occurrence check. Measured:
      // `yaml.parse` rejects duplicate mapping keys first, so the red comes from
      // the earlier parse gate and the ambiguity branch is never reached. Every
      // two-hit input constructible here (plain duplicate, quoted duplicate,
      // flow duplicate, multi-document) is rejected by the parser. Stated rather
      // than dressed up: for dart the occurrence count is defence in depth, and
      // the live demonstrations of that branch are node-version and
      // dotnet-version above.
      const r = DartVersion.Apply(
        "name: x\nversion: 1.2.3\nfoo: bar\nversion: 4.5.6\n",
        "1.3.0",
      );
      r.isErr().should.be.true;
      r.unwrapErr().should.contain("is not valid YAML");
      r.unwrapErr().should.contain("Map keys must be unique");
    });

    it("RED: refuses a multi-document stream rather than bumping the first doc", function () {
      // SUBJECT: two YAML documents separated by `---`, each with a column-0
      // version. Two hits, and the parse gate refuses it.
      const r = DartVersion.Apply(
        "version: 1.2.3\n---\nversion: 4.5.6\n",
        "1.3.0",
      );
      r.isErr().should.be.true;
      r.unwrapErr().should.contain("multiple documents");
    });

    it("ignores a column-0-looking version inside a block scalar", function () {
      // SUBJECT: `version: 9.9.9` living INSIDE a block scalar value, which is
      // indented and therefore not a top-level key. Exactly one real hit, and it
      // is the right one.
      const src = "name: x\ndesc: |\n  version: 9.9.9\nversion: 1.2.3\n";
      const out = DartVersion.Apply(src, "1.3.0").unwrap();
      out.from.should.equal("1.2.3");
      out.content.should.equal(
        "name: x\ndesc: |\n  version: 9.9.9\nversion: 1.3.0\n",
      );
    });

    it("RED, wrong file: refuses Directory.Build.props handed to the dart preset", function () {
      // SUBJECT: dotnet bytes fed to the dart preset.
      const r = DartVersion.Apply(
        "<Project>\n  <PropertyGroup>\n    <Version>0.0.0</Version>\n  </PropertyGroup>\n</Project>\n",
        "1.3.0",
      );
      r.isErr().should.be.true;
    });
  });

  describe("every preset", () => {
    const presets: BumpPreset[] = [NodeVersion, DotnetVersion, DartVersion];

    presets.forEach((p) =>
      it(`${p.type} refuses an unusable version before touching content`, function () {
        // SUBJECT: the bumper's version guard is upstream of Apply, so this
        // documents that a preset given junk cannot silently write it. Each
        // preset is handed content that DOES declare its field, so the only
        // reason to fail is the version itself.
        const content = {
          "node-version": '{"version": "1.0.0"}',
          "dotnet-version": "<Project><Version>1.0.0</Version></Project>",
          "dart-version": "version: 1.0.0\n",
        }[p.type];
        ValidVersion("1.0.0 ; rm -rf /").isErr().should.be.true;
        // And the preset itself is a pure transform: it is the guard, not the
        // preset, that rejects this. Recorded so nobody assumes otherwise.
        p.Apply(content, "1.1.0").isOk().should.be.true;
      }),
    );
  });
});
