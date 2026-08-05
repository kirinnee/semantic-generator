#!/usr/bin/env bash
# WF4 BUMP TYPES — sabotage script.
#
# Runs the BUILT bytes in dist/ (not ts-node, not the source) against real files
# in a scratch directory, and asserts THE MUTATION rather than the exit code.
#
# Rules this script follows, each from a real false-green:
#
#  * Nothing concludes from an exit status alone. Every claim about a bump reads
#    the target file back and inspects the field. A command that exited 0 and
#    changed nothing FAILS here.
#
#  * The harness is itself on trial. Checks tagged SELFTEST feed the assertion
#    machinery a case it MUST reject. An assertion that cannot go red proves
#    nothing about the ones that stayed green.
#
#  * Assertions use if/then/else, never `cond && pass || fail`. That idiom runs
#    the failure branch when the success branch returns non-zero (shellcheck
#    SC2015), which in an assertion harness means double-reporting.
#
#  * Structural greps scan the WHOLE dist tree. tsc does not bundle here: it emits
#    ~84 files (42 of them .js, the rest .js.map) and dist/semantic-generator.js is
#    a ~2.9 KB require shim, so a grep scoped to the entry file passes
#    unconditionally. The exact .js count is printed in section 0 each run.
#
#  * stderr is never suppressed on a command whose result is used.

set -u
set -o pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SG="$REPO/dist/semantic-generator.js"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/wf4-bump-sabotage-XXXXXX")"
trap 'rm -rf "$WORK"' EXIT

PASS=0
FAIL=0

pass() {
  PASS=$((PASS + 1))
  printf 'PASS  %s\n' "$1"
}

fail() {
  FAIL=$((FAIL + 1))
  printf 'FAIL  %s\n' "$1"
}

# expect "<pass msg>" "<fail msg>" <command...>
expect() {
  local p="$1" f="$2"
  shift 2
  if "$@"; then pass "$p"; else fail "$f"; fi
}

# refute "<pass msg when ABSENT>" "<fail msg when PRESENT>" <command...>
refute() {
  local p="$1" f="$2"
  shift 2
  if "$@"; then fail "$f"; else pass "$p"; fi
}

# These four are passed BY NAME to expect/refute, so shellcheck cannot see the
# call sites and reports them unreachable (SC2317). They are reached on every run.
# shellcheck disable=SC2317
streq() { [ "$1" = "$2" ]; }
# shellcheck disable=SC2317
strneq() { [ "$1" != "$2" ]; }
# shellcheck disable=SC2317
iszero() { [ "$1" -eq 0 ]; }
# shellcheck disable=SC2317
nonzero() { [ "$1" -ne 0 ]; }

hdr() { printf '\n=== %s ===\n' "$1"; }

# ---------------------------------------------------------------------------
# fixtures
# ---------------------------------------------------------------------------

CONFIG_HEAD='branches:
  - main
types:
  - type: fix
    section: Bug Fixes
    scopes:
      default:
        desc: a fix
        release: patch
'

PKG='{
  "name": "@atomicloud/bun-base",
  "version": "1.3.1",
  "type": "module"
}
'

# MSBuild XML WITH the version field present. Shape of dotnet-lib's Version.props
# (authoritative/dotnet-lib @9b23f046), which is a real measured location.
PROPS_SEEDED='<Project>
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <Version>0.0.0</Version>
  </PropertyGroup>
</Project>
'

# Verbatim shape of a REAL Directory.Build.props (published dotnet-base @606db3d9):
# no version field of any kind. None of the four measured trees has one here.
PROPS_REAL='<Project>
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <LangVersion>latest</LangVersion>
    <Nullable>enable</Nullable>
  </PropertyGroup>
</Project>
'

PUBSPEC='name: dart_lib
version: 1.2.3
environment:
  sdk: ^3.6.0
'

CSPROJ='<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <Version>0.0.0</Version>
  </PropertyGroup>
</Project>
'

# mkcase <name> <bumps-yaml-block>  -> prints the case directory
mkcase() {
  local name="$1" bumps="$2" dir
  dir="$WORK/$name"
  mkdir -p "$dir"
  printf '%s%s' "$CONFIG_HEAD" "$bumps" >"$dir/atomi_release.yaml"
  printf '%s' "$PKG" >"$dir/package.json"
  printf '%s' "$PUBSPEC" >"$dir/pubspec.yaml"
  printf '%s' "$PROPS_SEEDED" >"$dir/Version.props"
  printf '%s' "$PROPS_REAL" >"$dir/Directory.Build.props"
  echo "$dir"
}

# Reads the node version field back OFF DISK. Never from a variable.
nodever() { jq -r '.version' "$1/package.json"; }

runbump() {
  local dir="$1" ver="$2"
  (cd "$dir" && node "$SG" bump "$ver") >"$dir/out.txt" 2>&1
  printf 'note  exit=%d  output=%s\n' "$?" "$(tr '\n' '|' <"$dir/out.txt")"
}

# ---------------------------------------------------------------------------
hdr "0. preconditions"

if [ -f "$SG" ]; then
  pass "built entry exists: dist/semantic-generator.js"
else
  fail "built entry MISSING at $SG — run 'pls build' first"
  printf '\nSUMMARY pass=%d fail=%d\nRESULT: RED\n' "$PASS" "$FAIL"
  exit 1
fi

DIST_FILES="$(find "$REPO/dist" -type f -name '*.js' | wc -l | tr -d ' ')"
printf 'note  dist .js file count (population for every structural grep): %s\n' "$DIST_FILES"
expect "dist is a multi-file emit, so structural greps must scan the tree (count=$DIST_FILES)" \
  "dist has $DIST_FILES js files — this script's no-bundle assumption is wrong" \
  [ "$DIST_FILES" -gt 1 ]

# ---------------------------------------------------------------------------
hdr "1. node-version — MUTATION on <case>/package.json, field .version"

D="$(mkcase node 'bumps:
  - type: node-version
')"
BEFORE="$(nodever "$D")"
(cd "$D" && node "$SG" bump 1.4.0) >"$D/out.txt" 2>&1
EXIT=$?
AFTER="$(nodever "$D")"
printf 'note  before=%s after=%s exit=%d\n' "$BEFORE" "$AFTER" "$EXIT"

expect "pre-state named and confirmed: .version was 1.3.1" \
  "pre-state was '$BEFORE', expected 1.3.1 — fixture is wrong" \
  streq "$BEFORE" "1.3.1"
expect "exits zero on a valid bump" "exited $EXIT: $(cat "$D/out.txt")" iszero "$EXIT"
expect "MUTATION: .version is 1.4.0 on disk" \
  "MUTATION MISSING: .version is '$AFTER', expected 1.4.0" \
  streq "$AFTER" "1.4.0"
expect "before != after, so the bump was not a no-op" \
  "before == after: the command changed nothing" \
  strneq "$BEFORE" "$AFTER"
expect "collateral: the name field survived the rewrite" \
  "collateral damage: the name field did not survive" \
  grep -qF '"name": "@atomicloud/bun-base"' "$D/package.json"

hdr "1b. SELFTEST — the same assertion must REJECT an unbumped file"
# SUBJECT: <case>/package.json in a case where bump was NEVER run. If the check
# above can pass here too, it is vacuous.
D2="$(mkcase node_untouched 'bumps:
  - type: node-version
')"
UNTOUCHED="$(nodever "$D2")"
refute "SELFTEST: an unbumped file reads as '$UNTOUCHED', so the check can go red" \
  "SELFTEST: an unbumped file reads as 1.4.0 — the assertion is vacuous" \
  streq "$UNTOUCHED" "1.4.0"

# ---------------------------------------------------------------------------
hdr "2. dotnet-version — MUTATION on <case>/Version.props, field <Version>"
# This type ships NO default path. Measured at diene.all: the version field lives
# in App/App.csproj (authoritative/dotnet-base @329d76c0), in Version.props
# (authoritative/dotnet-lib @9b23f046), and nowhere at all (dotnet-api @abe5d046,
# published dotnet-base @606db3d9). Directory.Build.props exists in all four and
# carries it in none. So the entry names the file; section 5 proves that an entry
# naming none is refused.

D="$(mkcase dotnet 'bumps:
  - type: dotnet-version
    file: Version.props
    reason: this repo keeps its version in Version.props
')"
expect "pre-state named and confirmed: Version.props <Version> was 0.0.0" \
  "pre-state wrong — fixture is broken" \
  grep -qF '<Version>0.0.0</Version>' "$D/Version.props"
runbump "$D" 2.1.0
expect "MUTATION: Version.props <Version> is 2.1.0 on disk" \
  "MUTATION MISSING: <Version> is not 2.1.0" \
  grep -qF '<Version>2.1.0</Version>' "$D/Version.props"
refute "the old value 0.0.0 is gone" "the old <Version> 0.0.0 is still present" \
  grep -qF '<Version>0.0.0</Version>' "$D/Version.props"
expect "collateral: TargetFramework survived" \
  "collateral damage: TargetFramework did not survive" \
  grep -qF '<TargetFramework>net10.0</TargetFramework>' "$D/Version.props"

hdr "2b. dotnet-version — the OTHER real location, App/App.csproj"
# SUBJECT: <case>/App/App.csproj, the shape measured at dotnet-base @329d76c0.
D="$(mkcase dotnet_csproj 'bumps:
  - type: dotnet-version
    file: App/App.csproj
    reason: this repo keeps its version in the App project
')"
mkdir -p "$D/App"
printf '%s' "$CSPROJ" >"$D/App/App.csproj"
runbump "$D" 2.1.0
expect "MUTATION: App/App.csproj <Version> is 2.1.0 on disk" \
  "MUTATION MISSING: App/App.csproj was not bumped" \
  grep -qF '<Version>2.1.0</Version>' "$D/App/App.csproj"

# ---------------------------------------------------------------------------
hdr "3. dart-version — MUTATION on <case>/pubspec.yaml, top-level version key"

D="$(mkcase dart 'bumps:
  - type: dart-version
')"
expect "pre-state named and confirmed: version was 1.2.3" \
  "pre-state wrong — fixture is broken" \
  grep -qxF 'version: 1.2.3' "$D/pubspec.yaml"
runbump "$D" 1.3.0
expect "MUTATION: top-level version is 1.3.0 on disk" \
  "MUTATION MISSING: top-level version is not 1.3.0" \
  grep -qxF 'version: 1.3.0' "$D/pubspec.yaml"
expect "collateral: the environment block survived" \
  "collateral damage: the environment block did not survive" \
  grep -qF 'sdk: ^3.6.0' "$D/pubspec.yaml"

# ---------------------------------------------------------------------------
hdr "4. all three in ONE pass — three files, three fields"

D="$(mkcase all_three 'bumps:
  - type: node-version
  - type: dotnet-version
    file: Version.props
    reason: this repo keeps its version in Version.props
  - type: dart-version
')"
runbump "$D" 3.0.0
expect "MUTATION: package.json .version is 3.0.0" \
  "package.json was not bumped to 3.0.0" \
  streq "$(nodever "$D")" "3.0.0"
expect "MUTATION: Version.props <Version> is 3.0.0" \
  "Version.props was not bumped to 3.0.0" \
  grep -qF '<Version>3.0.0</Version>' "$D/Version.props"
expect "MUTATION: pubspec.yaml version is 3.0.0" \
  "pubspec.yaml was not bumped to 3.0.0" \
  grep -qxF 'version: 3.0.0' "$D/pubspec.yaml"

# ---------------------------------------------------------------------------
hdr "5. RED — dotnet-version naming NO file must FAIL, not pick something plausible"
# SUBJECT: a bare `- type: dotnet-version`, in a directory holding BOTH
# Directory.Build.props and Version.props — two files a guessing implementation
# could have chosen. Neither may be touched.

D="$(mkcase dotnet_nofile 'bumps:
  - type: dotnet-version
')"
DBP_SNAP="$(cat "$D/Directory.Build.props")"
VP_SNAP="$(cat "$D/Version.props")"
(cd "$D" && node "$SG" bump 2.1.0) >"$D/out.txt" 2>&1
EXIT=$?
printf 'note  exit=%d  output=%s\n' "$EXIT" "$(tr '\n' '|' <"$D/out.txt")"
expect "exits non-zero when dotnet-version names no file" \
  "exited 0 with no file named — it guessed a path" nonzero "$EXIT"
expect "MUTATION ABSENT: Directory.Build.props is byte-identical" \
  "Directory.Build.props was written despite no file being named" \
  streq "$DBP_SNAP" "$(cat "$D/Directory.Build.props")"
expect "MUTATION ABSENT: Version.props is byte-identical" \
  "Version.props was written despite no file being named" \
  streq "$VP_SNAP" "$(cat "$D/Version.props")"
expect "the message says the entry must name a file" \
  "the failure message does not say a file must be named" \
  grep -qF 'must name a' "$D/out.txt"

hdr "5b. RED — a NAMED file that lacks the field must FAIL, not no-op"
# SUBJECT: <case>/Directory.Build.props holding REAL content, named explicitly.
# This is the file that was nearly shipped as the default; it carries no version
# field in ANY of the four measured trees.
D="$(mkcase dotnet_unseeded 'bumps:
  - type: dotnet-version
    file: Directory.Build.props
    reason: deliberately the wrong file, for the sabotage script
')"
SNAP="$(cat "$D/Directory.Build.props")"
(cd "$D" && node "$SG" bump 2.1.0) >"$D/out.txt" 2>&1
EXIT=$?
printf 'note  exit=%d  output=%s\n' "$EXIT" "$(tr '\n' '|' <"$D/out.txt")"
expect "exits non-zero on a named file with no <Version>" \
  "exited 0 on a file with no <Version> — this is the false-green shape" \
  nonzero "$EXIT"
expect "MUTATION ABSENT: the un-seeded file is byte-identical" \
  "the un-seeded file was modified — the never-create rule is broken" \
  streq "$SNAP" "$(cat "$D/Directory.Build.props")"
expect "the message names the missing field rather than failing vaguely" \
  "the failure message does not explain what was missing" \
  grep -qF 'does not declare' "$D/out.txt"

# ---------------------------------------------------------------------------
hdr "6. RED — wrong file for the type must FAIL and mutate nothing"

D="$(mkcase wrong_file 'bumps:
  - type: node-version
    file: pubspec.yaml
    reason: deliberately mismatched, for the sabotage script
')"
PKG_SNAP="$(cat "$D/package.json")"
PUB_SNAP="$(cat "$D/pubspec.yaml")"
(cd "$D" && node "$SG" bump 9.9.9) >"$D/out.txt" 2>&1
EXIT=$?
printf 'note  exit=%d\n' "$EXIT"
expect "exits non-zero when node-version is pointed at pubspec.yaml" \
  "exited 0 on a type/file mismatch" nonzero "$EXIT"
expect "MUTATION ABSENT: pubspec.yaml (the wrong target) is byte-identical" \
  "pubspec.yaml was modified by the node preset" \
  streq "$PUB_SNAP" "$(cat "$D/pubspec.yaml")"
expect "MUTATION ABSENT: package.json (the untargeted file) is byte-identical" \
  "package.json was modified even though it was not the target" \
  streq "$PKG_SNAP" "$(cat "$D/package.json")"

# ---------------------------------------------------------------------------
hdr "7. RED — missing target file must FAIL and mutate nothing"

D="$(mkcase missing_file 'bumps:
  - type: node-version
    file: does/not/exist.json
    reason: deliberately absent, for the sabotage script
')"
PKG_SNAP="$(cat "$D/package.json")"
(cd "$D" && node "$SG" bump 9.9.9) >"$D/out.txt" 2>&1
EXIT=$?
printf 'note  exit=%d\n' "$EXIT"
expect "exits non-zero when the named path does not exist" \
  "exited 0 on a missing target" nonzero "$EXIT"
expect "MUTATION ABSENT: the real package.json is byte-identical" \
  "package.json was bumped despite the entry naming another file" \
  streq "$PKG_SNAP" "$(cat "$D/package.json")"

# ---------------------------------------------------------------------------
hdr "8. RED — naming a file with NO reason must be refused by validation"

D="$(mkcase file_no_reason 'bumps:
  - type: dotnet-version
    file: App/App.csproj
')"
mkdir -p "$D/App"
printf '%s' "$CSPROJ" >"$D/App/App.csproj"
APP_SNAP="$(cat "$D/App/App.csproj")"
(cd "$D" && node "$SG" bump 2.2.0) >"$D/out.txt" 2>&1
EXIT=$?
printf 'note  exit=%d  output=%s\n' "$EXIT" "$(tr '\n' '|' <"$D/out.txt")"
expect "exits non-zero when a file is named with no reason" \
  "exited 0 on a named file with no stated reason" nonzero "$EXIT"
expect "MUTATION ABSENT: App/App.csproj is byte-identical" \
  "the bump was applied despite carrying no reason" \
  streq "$APP_SNAP" "$(cat "$D/App/App.csproj")"

hdr "8b. CONTROL — the IDENTICAL entry PASSES once a reason is added"
# SUBJECT: the same entry, same file, same version. Only `reason` is added. This
# proves check 8 failed because of the missing reason and nothing else.
D="$(mkcase file_with_reason 'bumps:
  - type: dotnet-version
    file: App/App.csproj
    reason: this repo keeps its version in the App project
')"
mkdir -p "$D/App"
printf '%s' "$CSPROJ" >"$D/App/App.csproj"
DBP_SNAP="$(cat "$D/Directory.Build.props")"
(cd "$D" && node "$SG" bump 2.2.0) >"$D/out.txt" 2>&1
EXIT=$?
printf 'note  exit=%d\n' "$EXIT"
expect "exits zero once the reason is stated" \
  "still failed with a reason present: $(cat "$D/out.txt")" iszero "$EXIT"
expect "MUTATION: the NAMED path App/App.csproj is 2.2.0" \
  "the named path was not bumped" \
  grep -qF '<Version>2.2.0</Version>' "$D/App/App.csproj"
expect "MUTATION ABSENT: the unnamed Directory.Build.props is byte-identical" \
  "a file the entry never named was bumped" \
  streq "$DBP_SNAP" "$(cat "$D/Directory.Build.props")"

hdr "8c. node-version DEFAULT vs a named path — only the named one is written"
# SUBJECT: two package.json files. node-version DOES have a default, so this is
# where default-vs-named is actually distinguishable.
D="$(mkcase named_beats_default 'bumps:
  - type: node-version
    file: packages/api/package.json
    reason: the released package is the api workspace, not the root
')"
mkdir -p "$D/packages/api"
printf '%s' "$PKG" >"$D/packages/api/package.json"
ROOT_SNAP="$(cat "$D/package.json")"
runbump "$D" 1.4.0
expect "MUTATION: packages/api/package.json .version is 1.4.0" \
  "the named package.json was not bumped" \
  streq "$(jq -r '.version' "$D/packages/api/package.json")" "1.4.0"
expect "MUTATION ABSENT: the DEFAULT root package.json is byte-identical" \
  "the default path was bumped even though a file was named" \
  streq "$ROOT_SNAP" "$(cat "$D/package.json")"

hdr "8d. the leading-v strip that every replaced bump.sh performs"
# SUBJECT: <case>/package.json given "v1.4.0". Measured at diene.all:
# authoritative/bun-base @efac203a, authoritative/dart-lib @3eecf1e0 and
# authoritative/dotnet-base @329d76c0 all apply ${version#v} before stamping.
# Writing "v1.4.0" into package.json would produce an invalid npm manifest.
D="$(mkcase vprefix 'bumps:
  - type: node-version
')"
runbump "$D" v1.4.0
expect "MUTATION: v1.4.0 was written as 1.4.0, matching the replaced scripts" \
  "expected 1.4.0 on disk, got '$(nodever "$D")'" \
  streq "$(nodever "$D")" "1.4.0"
refute "no v-prefixed version reached the manifest" \
  "the literal v1.4.0 was written into package.json" \
  grep -qF '"version": "v1.4.0"' "$D/package.json"

# ---------------------------------------------------------------------------
hdr "9. RED — an empty bumps list must FAIL rather than report success"

D="$(mkcase empty_bumps 'bumps: []
')"
(cd "$D" && node "$SG" bump 1.4.0) >"$D/out.txt" 2>&1
EXIT=$?
printf 'note  exit=%d  output=%s\n' "$EXIT" "$(tr '\n' '|' <"$D/out.txt")"
expect "exits non-zero on an empty bumps list" \
  "exited 0 with nothing configured — indistinguishable from a real bump" \
  nonzero "$EXIT"
expect "the message says nothing was configured" \
  "the message does not explain that nothing was configured" \
  grep -qF 'nothing to bump' "$D/out.txt"

# ---------------------------------------------------------------------------
hdr "10. the --version flag trap, verified against the CLI's OWN parser"
# A `--version` OPTION on this subcommand would be shadowed by the program's own
# -V/--version, which prints the generator version and exits 0 — a bump that
# reports success and mutates nothing. The version is positional for that reason.
# SUBJECT: <case>/package.json, which must be untouched in every variant below.

D="$(mkcase flag_trap 'bumps:
  - type: node-version
')"
PKG_SNAP="$(cat "$D/package.json")"

(cd "$D" && node "$SG" bump --version 1.4.0) >"$D/flag.txt" 2>&1
FLAG_EXIT=$?
printf 'note  bump --version 1.4.0 exit=%d output=%s\n' \
  "$FLAG_EXIT" "$(tr '\n' '|' <"$D/flag.txt")"
expect "MUTATION ABSENT: '--version' did not silently bump package.json" \
  "'--version' mutated package.json — the flag trap is live" \
  streq "$PKG_SNAP" "$(cat "$D/package.json")"
if iszero "$FLAG_EXIT"; then
  printf 'note  it exited 0 and printed a version string — exactly why the arg is positional\n'
fi

(cd "$D" && node "$SG" bump) >"$D/noarg.txt" 2>&1
NOARG_EXIT=$?
printf 'note  bump with no argument exit=%d output=%s\n' \
  "$NOARG_EXIT" "$(tr '\n' '|' <"$D/noarg.txt")"
expect "a missing version argument is refused, not defaulted" \
  "'bump' with no version exited 0" nonzero "$NOARG_EXIT"
expect "MUTATION ABSENT: no-argument invocation left package.json byte-identical" \
  "a no-argument invocation mutated package.json" \
  streq "$PKG_SNAP" "$(cat "$D/package.json")"

hdr "10b. RED — a version that is not a version must be refused"
(cd "$D" && node "$SG" bump '1.4.0 && echo pwned') >"$D/junk.txt" 2>&1
JUNK_EXIT=$?
printf 'note  exit=%d output=%s\n' "$JUNK_EXIT" "$(tr '\n' '|' <"$D/junk.txt")"
expect "a shell-metacharacter version is refused" \
  "a version containing shell metacharacters was accepted" nonzero "$JUNK_EXIT"
expect "MUTATION ABSENT: package.json byte-identical after the junk version" \
  "package.json was written with an unusable version" \
  streq "$PKG_SNAP" "$(cat "$D/package.json")"

# ---------------------------------------------------------------------------
hdr "11. structural — the wiring shipped in the BUILT tree (whole dist, not the shim)"
# Population for each grep: every .js file under dist/ (count printed in section 0).
# Scoping any of these to dist/semantic-generator.js would pass unconditionally,
# because that file is a 2.9 KB require shim.

check_dist() {
  local label="$1" pattern="$2" hits
  hits="$(grep -rlF "$pattern" "$REPO/dist" --include='*.js' | wc -l | tr -d ' ')"
  if [ "$hits" -ge 1 ]; then
    pass "$label (found in $hits dist file(s))"
  else
    fail "$label — NOT FOUND anywhere in the dist tree"
  fi
}

check_dist "the exec plugin module name shipped" "@semantic-release/exec"
check_dist "the prepareCmd key shipped" "prepareCmd"
# shellcheck disable=SC2016  # the ${...} is a literal that must reach the yaml unexpanded
check_dist "the nextRelease.version template shipped literally" '${nextRelease.version}'
check_dist "the never-create refusal message shipped" "does not declare"
check_dist "the stated-reason rule shipped" "only with a stated reason"
check_dist "the no-default refusal message shipped" "no built-in default path"

# The default paths are asserted as CODE, not as any occurrence of the string.
# tsc preserves comments, and every one of these paths is also named in the
# reasoning comments, so a bare substring grep would pass on prose alone. These
# patterns include the property assignment, which only the code has.
check_dist "node-version default path is code, not just prose" 'defaultFile: "package.json"'
check_dist "dart-version default path is code, not just prose" 'defaultFile: "pubspec.yaml"'
check_dist "dotnet-version ships defaultFile null, i.e. NO default" "defaultFile: null"

hdr "11a. the RETRACTED default must NOT be a default in the shipped code"
# SUBJECT: the built tree. Directory.Build.props is still NAMED in the reasoning
# comments on purpose — that is where the retraction is explained — so the check
# is that it is not ASSIGNED as a defaultFile anywhere.
BAD="$(grep -rF 'defaultFile: "Directory.Build.props"' "$REPO/dist" --include='*.js' | wc -l | tr -d ' ')"
expect "Directory.Build.props is NOT assigned as any preset's defaultFile" \
  "Directory.Build.props is still a defaultFile in $BAD place(s) — the retraction did not ship" \
  iszero "$BAD"

hdr "11b. SELFTEST — the structural checker must go red on an absent string"
ABSENT_HITS="$(grep -rlF "wf4-a-string-that-is-not-in-the-build" "$REPO/dist" --include='*.js' | wc -l | tr -d ' ')"
expect "SELFTEST: a deliberately absent string yields 0 hits, so check_dist can fail" \
  "SELFTEST: an absent string was 'found' — the structural checker is broken" \
  iszero "$ABSENT_HITS"

# ---------------------------------------------------------------------------
hdr "12. D5 — this change adds NO bump script or hook TO THIS REPO"
# SCOPE, stated precisely because the WIDER claim is FALSE and must not be implied:
# D5 says no template should carry bump logic. That is NOT yet true of the node
# trees. Measured 2026-08-05 with `git ls-tree` against the BARE diene.all repo,
# because a filesystem sweep cannot see a bare repository's content at all:
#   authoritative/bun-base     @efac203a  scripts/release/bump.sh  EXISTS
#   authoritative/bun-lib      @9e21ee23  scripts/release/bump.sh  EXISTS
#   authoritative/dart-lib     @3eecf1e0  scripts/release/bump.sh  EXISTS
#   authoritative/dotnet-base  @329d76c0  scripts/release/bump.sh  EXISTS
# Removing those is the node owners' work, not this change's. This section asserts
# only the narrow, checkable thing: this change does not ADD one here.
#
# ABSENCE PROOFS NEED TWO VOCABULARIES, NOT TWO ENGINES. One pattern through two
# matchers only controls for a matcher bug. Vocabularies enumerated below:
#   bare noun            -> "bump script", "bump hook" (code lines only)
#   lifecycle-hook form  -> package.json preversion/version/postversion/prepublishOnly
#   path/script form     -> shell scripts whose filename says bump
#   template form        -> anything under template/
#   this repo's own config -> bump entries in atomi_release.yaml

CHANGED="$( (
  git -C "$REPO" diff --name-only origin/local-install...HEAD
  git -C "$REPO" diff --name-only HEAD
) | sort -u | grep -v '^$')"
printf 'note  population: %s changed/added tracked path(s)\n' "$(printf '%s\n' "$CHANGED" | wc -l | tr -d ' ')"
printf '%s\n' "$CHANGED" | sed 's/^/note    /'

v_report() {
  local label="$1" count="$2" detail="$3"
  if [ "$count" -eq 0 ]; then
    pass "vocabulary [$label]: 0 occurrences"
  else
    fail "vocabulary [$label]: $count occurrence(s) -> $detail"
  fi
}

# vocabulary 1: the bare noun in CODE lines, comments excluded. Prose saying "no
# repository needs a bump hook" documents the rule and is the opposite of a
# violation, so counting it would make this check fail for explaining itself.
# Comment hits are printed as notes so they stay visible rather than dropped.
#
# THIS FILE is also excluded, narrowly and stated out loud: the harness names the
# very thing it searches for, in its own section headers and report labels, so it
# matches itself. Its hits are printed as notes too, so nothing is hidden. Every
# other changed path is still swept.
N1=0
for f in $CHANGED; do
  [ -f "$REPO/$f" ] || continue
  grep -inE 'bump[ _-]?(script|hook)' "$REPO/$f" |
    grep -E ':[[:space:]]*(\*|//|#)' | sed "s|^|note    prose (allowed) $f:|"
  if [ "$f" = "sabotage/wf4-bump-types.sh" ]; then
    grep -inE 'bump[ _-]?(script|hook)' "$REPO/$f" |
      grep -vE ':[[:space:]]*(\*|//|#)' |
      sed "s|^|note    harness self-match (excluded) $f:|"
    continue
  fi
  n="$(grep -inE 'bump[ _-]?(script|hook)' "$REPO/$f" |
    grep -cvE ':[[:space:]]*(\*|//|#)')"
  N1=$((N1 + n))
done
v_report "bare noun in CODE (comments + this harness excluded)" "$N1" "see notes above"

# vocabulary 2: package.json lifecycle + bump-named script keys
printf 'note  package.json scripts keys: %s\n' "$(jq -r '.scripts // {} | keys | join(", ")' "$REPO/package.json")"
N2="$(jq -r '.scripts // {} | keys[]' "$REPO/package.json" |
  grep -cE '^(bump|preversion|version|postversion|prepublishOnly)$')"
v_report "package.json lifecycle/bump script keys" "$N2" "see note above"

# vocabulary 3: shell scripts whose PATH says bump. sabotage/ is excluded because
# that is THIS script, which is a test harness rather than a release bump script.
FOUND3="$(find "$REPO" -path "$REPO/node_modules" -prune -o -path "$REPO/.git" -prune -o \
  -type f -name '*bump*' -print 2>/dev/null | grep -v '/sabotage/' | sed "s|$REPO/||" | tr '\n' ' ')"
printf 'note  files with bump in the PATH (sabotage/ excluded): %s\n' "$FOUND3"
N3_SH="$(printf '%s' "$FOUND3" | tr ' ' '\n' | grep -c '\.sh$')"
v_report "shell scripts named bump*" "$N3_SH" "$FOUND3"

# vocabulary 4: the template/ tree, which is what D5 forbids carrying bump logic.
# Lockfiles are excluded: their base64 integrity hashes contain the letters "bump"
# by coincidence (measured: template/package-lock.json matches inside a sha512
# string). Counting those would be a false positive on pre-existing bytes this
# change never touched. Both populations are printed so the exclusion is visible.
printf 'note  template/ file count: %s, of which lockfiles: %s\n' \
  "$(find "$REPO/template" -type f | wc -l | tr -d ' ')" \
  "$(find "$REPO/template" -type f \( -name '*-lock.json' -o -name '*-lock.yaml' \) | wc -l | tr -d ' ')"
T_HITS="$(grep -rilE 'bump' "$REPO/template" 2>/dev/null | grep -vE '\-lock\.(json|yaml)$' || true)"
N4="$(printf '%s' "$T_HITS" | grep -c . || true)"
v_report "bump under template/ (lockfiles excluded)" "$N4" "$(printf '%s' "$T_HITS" | tr '\n' ' ')"

# vocabulary 5: this repo does not turn the feature on for itself. Deliberate:
# enabling it would change this repo's own release behaviour, which is a separate
# decision from shipping the capability.
N5="$(grep -icE 'bump' "$REPO/atomi_release.yaml")"
v_report "bump entries in this repo's own atomi_release.yaml" "$N5" "n/a"

# ---------------------------------------------------------------------------
hdr "13. D6 one-config-name — exactly one default config filename in src/"
# The bump path must not introduce a second config filename, or WF3's rename
# becomes a two-place change.
printf 'note  occurrences of the default config filename in src/:\n'
grep -rn 'atomi_release' "$REPO/src" | sed 's/^/note    /'
CFG_HITS="$(grep -rn 'atomi_release' "$REPO/src" | wc -l | tr -d ' ')"
expect "exactly one occurrence in src/, so the rename stays a one-line change" \
  "$CFG_HITS occurrences in src/ — a second config filename was introduced" \
  iszero "$((CFG_HITS - 1))"

# ---------------------------------------------------------------------------
printf '\n=== SUMMARY ===\n'
printf 'pass=%d fail=%d\n' "$PASS" "$FAIL"
if [ "$FAIL" -eq 0 ]; then
  printf 'RESULT: GREEN\n'
  exit 0
fi
printf 'RESULT: RED\n'
exit 1
