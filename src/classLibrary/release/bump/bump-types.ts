import { Err, Ok, Result } from "@hqoss/monads";
import yaml from "yaml";
import { Infer, literal, union } from "superstruct";

/**
 * Runtime-named bump presets.
 *
 * Each preset knows a built-in default path and the ONE field it owns inside that
 * file. A release configuration entry may override the path, but never the field:
 * the field is what makes the preset a preset.
 *
 * Two rules are shared by every preset, and both exist to make a bump either
 * visibly correct or visibly red — never quietly nothing:
 *
 *  1. NEVER CREATE A FIELD, ONLY REPLACE ONE. Writing a version field into a file
 *     that does not declare it is a project-shape change, not a bump. If the field
 *     is absent the preset fails and names the file and the field.
 *
 *  2. EXACTLY ONE OCCURRENCE. Zero occurrences is `absent`; two or more is
 *     `ambiguous`. There is no first-match-wins guessing, because a bump that
 *     picks the wrong one of two candidates is worse than a bump that refuses.
 */

/**
 * The runtime-named bump types. This union is the single source of truth for the
 * names: `BumpTypeName` is inferred from it and the preset table is keyed by that
 * inferred type, so a name added here without a preset is a compile error.
 */
const BumpTypeNameSchema = union([
  literal("node-version"),
  literal("dotnet-version"),
  literal("dart-version"),
]);

type BumpTypeName = Infer<typeof BumpTypeNameSchema>;

interface BumpOutcome {
  /** The full new file content, byte-identical to the old one apart from the field. */
  content: string;
  /** The value the field held before the bump, for reporting. */
  from: string;
}

interface BumpPreset {
  readonly type: BumpTypeName;
  /**
   * Built-in default path, relative to the repository root, or `null` when no
   * default can be correct and the configuration must name the file itself.
   */
  readonly defaultFile: string | null;
  /** Human-readable name of the single field this preset owns. */
  readonly field: string;
  Apply(content: string, version: string): Result<BumpOutcome, string>;
}

/**
 * A version has to survive being pasted into JSON, YAML and XML without changing
 * the shape of the host document, so refuse anything with whitespace or markup in
 * it rather than writing a file we would then have to un-write.
 */
const versionPattern = /^[A-Za-z0-9][A-Za-z0-9.+-]*$/;

/**
 * Strips a single leading `v` when a digit follows it, matching the `${version#v}`
 * that every bump script being replaced performs.
 *
 * Measured at diene.all: `authoritative/bun-base` @efac203a, `authoritative/dart-lib`
 * @3eecf1e0 and `authoritative/dotnet-base` @329d76c0 all strip it before stamping.
 * Without this, a tag-shaped `v1.2.3` would be written verbatim into package.json,
 * which is not valid semver for npm — a bump that succeeds and produces a broken
 * manifest.
 */
function NormalizeVersion(version: string): string {
  return /^v\d/.test(version) ? version.slice(1) : version;
}

function ValidVersion(version: string): Result<string, string> {
  if (!versionPattern.test(version)) {
    return Err(
      `${JSON.stringify(version)} is not a usable version: expected only ` +
        `alphanumerics, dot, plus and hyphen, starting with an alphanumeric`,
    );
  }
  return Ok(version);
}

function EscapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function Absent(field: string): string {
  return (
    `does not declare ${field}. The releaser bumps a version, it does not ` +
    `introduce one: adding this field changes the shape of the project, which ` +
    `is the owner's decision, not the releaser's. Add ${field} once, ` +
    `deliberately, then this bump takes over the number`
  );
}

function Ambiguous(field: string, count: number): string {
  return (
    `declares ${field} ${count} times. Refusing to guess which one is the ` +
    `version of record — point the entry at a file with exactly one, or narrow ` +
    `the file down`
  );
}

function IsRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * node-version — package.json, top-level `.version`.
 *
 * Measured on diene/bun-base @ 98157d21 (main): package.json exists and
 * `.version` is "1.3.1". The default needs no override for that node.
 *
 * The file is parsed to prove the field exists and is a string, then rewritten
 * surgically rather than re-serialised, so indentation and key order survive and
 * the repo's formatter has nothing to argue with.
 */
const NodeVersion: BumpPreset = {
  type: "node-version",
  defaultFile: "package.json",
  field: 'a top-level "version" string',

  Apply(content: string, version: string): Result<BumpOutcome, string> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      return Err(`is not valid JSON: ${(e as Error).message}`);
    }
    if (!IsRecord(parsed)) return Err("is not a JSON object at the top level");

    const current = parsed["version"];
    if (current === undefined || current === null)
      return Err(Absent(this.field));
    if (typeof current !== "string")
      return Err(
        `has a top-level "version" that is ${typeof current}, not a string`,
      );

    const probe = new RegExp(
      `("version"\\s*:\\s*")${EscapeRegExp(current)}(")`,
      "g",
    );
    const hits = content.match(probe);
    // The parse above proves the top-level key exists; this count is about the
    // literal being unique in the bytes, so that the surgical rewrite cannot
    // land on a nested "version" that happens to hold the same string.
    if (hits === null || hits.length === 0) return Err(Absent(this.field));
    if (hits.length > 1) return Err(Ambiguous(this.field, hits.length));

    return Ok({
      content: content.replace(probe, `$1${version}$2`),
      from: current,
    });
  },
};

/**
 * dotnet-version — `<Version>`, in a file the CONFIGURATION MUST NAME.
 *
 * THIS PRESET SHIPS WITH NO BUILT-IN DEFAULT PATH, ON PURPOSE.
 *
 * Measured 2026-08-05 by reading the authoritative refs out of the bare
 * `diene.all` repository with `git ls-tree` / `git show` — the population for each
 * tree enumerated FROM THAT TREE rather than from a list of candidate filenames,
 * sweeping <Version>, <VersionPrefix>, <PackageVersion>, <AssemblyVersion> and
 * <FileVersion>:
 *
 *   authoritative/dotnet-base @329d76c0   App/App.csproj:5   <Version>0.0.0</Version>
 *   authoritative/dotnet-lib  @9b23f046   Version.props:3    <Version>1.0.0</Version>
 *   authoritative/dotnet-api  @abe5d046   NONE
 *   published dotnet-base     @606db3d9   NONE
 *
 * Three different answers across four trees: one project file, one dedicated
 * props file, and twice nothing at all. `Directory.Build.props` exists at the
 * identical path in ALL FOUR and carries the version in NONE of them — which is
 * exactly what made it look like the right default. It was wrong everywhere.
 *
 * So no fixed default can be correct, and a default that is wrong everywhere is
 * worse than an absent one: it converts a configuration error into a
 * plausible-looking write to the wrong file. The configuration must therefore
 * name the file, and because a `file` override requires a stated `reason`, every
 * dotnet repo records WHERE its version lives and WHY, next to the fact itself.
 *
 * For dotnet the override is the NORM, not an escape hatch, and its reason is a
 * standing one ("this repo keeps its version in Version.props"). It is not
 * boilerplate to be cleaned up later.
 *
 * Note how much work the exactly-one-occurrence rule is doing here: dotnet-base
 * and dotnet-lib each have <Version> in exactly ONE file, but a DIFFERENT one. A
 * glob with first-match-wins would have silently picked a different file per repo
 * and looked correct in both.
 *
 * A lesson recorded so it is not re-learned: an earlier sweep of this same
 * question ran over the filesystem and returned a confident zero, because
 * `diene.all` is a BARE repository with no working tree and was outside the file
 * set by construction. A matcher control — proving the pattern can go red — does
 * not catch a missing population. Only a positive control on the population does.
 */
const DotnetVersion: BumpPreset = {
  type: "dotnet-version",
  defaultFile: null,
  field: "a <Version> MSBuild property",

  Apply(content: string, version: string): Result<BumpOutcome, string> {
    // Case-insensitive because MSBuild property names are, but the original tag
    // casing is captured and replayed so the file keeps its own style. The
    // trailing `>` in `<Version>` is what keeps this off <VersionPrefix>.
    const probe = /(<Version>)([^<]*)(<\/Version>)/gi;
    const hits = [...content.matchAll(probe)];
    if (hits.length === 0) return Err(Absent(this.field));
    if (hits.length > 1) return Err(Ambiguous(this.field, hits.length));

    const hit = hits[0];
    return Ok({
      content:
        content.slice(0, hit.index) +
        `${hit[1]}${version}${hit[3]}` +
        content.slice((hit.index ?? 0) + hit[0].length),
      from: hit[2],
    });
  },
};

/**
 * dart-version — pubspec.yaml, top-level `version`.
 *
 * Measured 2026-08-05: no pubspec.yaml exists anywhere in the diene tree yet, so
 * this preset has no live node to be shaped by. It is written against the pubspec
 * format itself rather than against one repo's habits, because diene.dart_lib is
 * queued to consume it as THE dart base and will be its first real caller.
 *
 * The match is anchored at column 0, which is what makes it top-level: a nested
 * `version:` under a dependency is always indented, so it can never be hit.
 *
 * Note on the shared exactly-one rule: for this preset it is defence in depth
 * rather than the gate that fires. Measured — `yaml.parse` rejects duplicate
 * mapping keys and multi-document streams before the count is taken, so every
 * two-occurrence input is already red one step earlier. The count stays because
 * it costs nothing and the parser's guarantees are not this preset's to assume.
 */
const DartVersion: BumpPreset = {
  type: "dart-version",
  defaultFile: "pubspec.yaml",
  field: "a top-level version key",

  Apply(content: string, version: string): Result<BumpOutcome, string> {
    let parsed: unknown;
    try {
      parsed = yaml.parse(content);
    } catch (e) {
      return Err(`is not valid YAML: ${(e as Error).message}`);
    }
    if (!IsRecord(parsed)) return Err("is not a YAML mapping at the top level");
    if (parsed["version"] === undefined || parsed["version"] === null)
      return Err(Absent(this.field));

    // `[^\s#]+` is the version token; the trailing group keeps any inline comment
    // and any \r verbatim instead of eating it.
    const probe = /^(version:[ \t]*)([^\s#]+)(.*)$/gm;
    const hits = [...content.matchAll(probe)];
    if (hits.length === 0) return Err(Absent(this.field));
    if (hits.length > 1) return Err(Ambiguous(this.field, hits.length));

    const hit = hits[0];
    return Ok({
      content:
        content.slice(0, hit.index) +
        `${hit[1]}${version}${hit[3]}` +
        content.slice((hit.index ?? 0) + hit[0].length),
      from: hit[2],
    });
  },
};

/**
 * Keyed by the type inferred from `BumpTypeNameSchema`, so adding a name to the
 * schema without adding a preset here fails to compile rather than failing at
 * release time.
 */
const bumpPresets: Record<BumpTypeName, BumpPreset> = {
  "node-version": NodeVersion,
  "dotnet-version": DotnetVersion,
  "dart-version": DartVersion,
};

const bumpTypeNames = Object.keys(bumpPresets) as BumpTypeName[];

/**
 * Types that have no built-in default and therefore REQUIRE the configuration to
 * name a file. Derived from the preset table so it cannot drift out of step with
 * the presets themselves.
 */
function RequiresExplicitFile(t: BumpTypeName): boolean {
  return bumpPresets[t].defaultFile === null;
}

export {
  BumpPreset,
  BumpOutcome,
  BumpTypeName,
  BumpTypeNameSchema,
  bumpPresets,
  bumpTypeNames,
  RequiresExplicitFile,
  NormalizeVersion,
  ValidVersion,
  NodeVersion,
  DotnetVersion,
  DartVersion,
};
