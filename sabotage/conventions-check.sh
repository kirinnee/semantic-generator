#!/usr/bin/env bash
#
# Sabotage harness for `sg conventions --check` (enforces D9: releaser-generated
# docs are regenerate-only).
#
# WHAT THIS PROVES, AND WHAT IT DOES NOT
# --------------------------------------
# A check that has never been shown to go red is a candidate, not a control.
# Every arm below therefore does two separate things:
#
#   1. asserts the SABOTAGE ITSELF LANDED  (sha256 / byte length / existence
#      changed in the direction intended), because a setup step that silently
#      no-ops produces a false green; and
#   2. only then reads the check's verdict.
#
# The subject of every arm is named in its banner: which file, which bytes,
# which side of the config/doc pair.
#
# The arms run against the COMMITTED bytes of HEAD (materialised with
# `git show HEAD:<path>` into a throwaway sandbox) driven by a dist/ REBUILT
# from that same committed source. Nothing here reads the dirty worktree.
#
# Usage:  bash sabotage/conventions-check.sh
# Writes: sabotage/conventions-check.out  (and the same text to stdout)
# Exit:   0 iff every arm behaved as specified.

set -u
set -o pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLI="$ROOT/dist/semantic-generator.js"
CONFIG_REL="atomi_release.yaml"
DOC_REL="docs/developer/03-Commit Conventions.md"
OUT_FILE="$ROOT/sabotage/conventions-check.out"

WORK=""
CHECK_EC=0

pass=0
fail=0

banner() {
  echo
  echo "=============================================================================="
  echo "$*"
  echo "=============================================================================="
}

ok() {
  echo "  PASS  $*"
  pass=$((pass + 1))
}

bad() {
  echo "  FAIL  $*"
  fail=$((fail + 1))
}

sha() {
  sha256sum "$1" | cut -d' ' -f1
}

size() {
  wc -c <"$1" | tr -d ' '
}

# Materialise a sandbox holding ONLY the two files the command reads, taken
# from the committed tree at HEAD.
new_sandbox() {
  new_sandbox_named "$1" "$CONFIG_REL" with-doc
}

# As above, but the config is written under an arbitrary name (so the WF3
# end state, where the config is renamed, can be staged) and the generated doc
# is optional.
new_sandbox_named() {
  local name="$1" cfgname="$2" withdoc="$3"
  local dir="$WORK/$name"
  rm -rf "$dir"
  mkdir -p "$dir/$(dirname "$DOC_REL")"
  git -C "$ROOT" show "HEAD:$CONFIG_REL" >"$dir/$cfgname"
  if [ "$withdoc" = "with-doc" ]; then
    git -C "$ROOT" show "HEAD:$DOC_REL" >"$dir/$DOC_REL"
  fi
  echo "$dir"
}

run_write_args() {
  local sb="$1" out="$2"
  shift 2
  (cd "$sb" && node "$CLI" conventions "$@") >"$out" 2>&1
  CHECK_EC=$?
}

run_check() {
  local sb="$1" out="$2"
  shift 2
  (cd "$sb" && node "$CLI" conventions --check "$@") >"$out" 2>&1
  CHECK_EC=$?
}

run_write() {
  local sb="$1" out="$2"
  (cd "$sb" && node "$CLI" conventions) >"$out" 2>&1
  CHECK_EC=$?
}

show() {
  echo "  --- command output (whole, unpiped) ------------------------------------"
  sed 's/^/  | /' "$1"
  echo "  ------------------------------------------------------------------------"
}

main() {
  echo "sabotage/conventions-check.sh"
  echo "repo   : $ROOT"
  echo "HEAD   : $(git -C "$ROOT" rev-parse HEAD)"
  echo "subject: sg conventions --check   (D9: generated docs are regenerate-only)"
  echo "config : $CONFIG_REL"
  echo "doc    : $DOC_REL"

  WORK="$(mktemp -d)"
  trap 'rm -rf "$WORK"' EXIT

  # ---------------------------------------------------------------- PREFLIGHT
  banner "P1  the arms will run against COMMITTED bytes"
  echo "  subject of this control: the working tree status of src/, tests/,"
  echo "  $CONFIG_REL and the generated doc. .pre-commit-config.yaml is"
  echo "  deliberately OUT of scope: it is a /nix/store symlink that this machine"
  echo "  rewrites on every direnv load and that is never committed."
  local dirty
  dirty="$(git -C "$ROOT" status --porcelain -- src tests "$CONFIG_REL" "$DOC_REL")"
  if [ -z "$dirty" ]; then
    ok "P1 subject paths are clean; HEAD == what the arms will read"
  else
    echo "  uncommitted changes in the subject paths:"
    printf '%s\n' "$dirty" | while IFS= read -r line; do echo "  | $line"; done
    bad "P1 subject paths are dirty; arms would not be reading committed bytes"
  fi

  banner "P2  rebuild dist/ from the committed source"
  local buildlog="$WORK/build.log"
  (cd "$ROOT" && pls build) >"$buildlog" 2>&1
  local build_ec=$?
  show "$buildlog"
  if [ "$build_ec" -eq 0 ] && [ -f "$CLI" ]; then
    ok "P2 build exited 0 and produced $CLI"
  else
    bad "P2 build exited $build_ec (dist present: $([ -f "$CLI" ] && echo yes || echo no))"
  fi

  banner "P3  the rebuilt dist/ actually contains the new code"
  echo "  subject: the FILES tsc emitted under dist/, named individually."
  echo "  tsc does NOT bundle -- dist/semantic-generator.js is a small require"
  echo "  shim -- so a structural grep over the entry file alone examines almost"
  echo "  nothing and would pass unconditionally. These are the emitted modules"
  echo "  this feature consists of."
  local missing=0 f
  for f in \
    dist/controllers/conventions-controller.js \
    dist/classLibrary/release/conventions-checker.js \
    dist/classLibrary/lineDiff.js; do
    if [ -f "$ROOT/$f" ]; then
      echo "  present: $f"
    else
      echo "  MISSING: $f"
      missing=$((missing + 1))
    fi
  done
  if [ "$missing" -eq 0 ]; then
    ok "P3 all 3 expected emitted modules exist under dist/"
  else
    bad "P3 $missing of 3 expected emitted modules are missing from dist/"
  fi
  local hits
  hits="$(grep -rlF "ConventionsChecker" "$ROOT/dist" | wc -l | tr -d ' ')"
  echo "  files mentioning 'ConventionsChecker' (population: every file under dist/): $hits"

  banner "P4  --check and --config are on the SUBCOMMAND'S OWN parser"
  echo "  subject: the help commander itself emits for 'conventions', not the"
  echo "  program-level help. A flag silently swallowed by an outer parser exits"
  echo "  0 and checks nothing -- the way a subcommand --version is shadowed by"
  echo "  the program-level -V, --version."
  local helpout="$WORK/help.out"
  (cd "$ROOT" && node "$CLI" conventions --help) >"$helpout" 2>&1
  local help_ec=$?
  show "$helpout"
  if [ "$help_ec" -eq 0 ]; then
    ok "P4 'conventions --help' exits 0"
  else
    bad "P4 'conventions --help' exited $help_ec"
  fi
  if grep -Fq -- "--check" "$helpout"; then
    ok "P4 commander lists --check on the conventions subcommand"
  else
    bad "P4 commander does NOT list --check on the conventions subcommand"
  fi
  if grep -Fq -- "--config" "$helpout"; then
    ok "P4 commander lists --config on the conventions subcommand"
  else
    bad "P4 commander does NOT list --config on the conventions subcommand"
  fi

  # --------------------------------------------------------------------- A1
  banner "A1  GREEN ARM  -- committed doc vs committed config"
  local sb out doc cfg
  sb="$(new_sandbox a1)"
  doc="$sb/$DOC_REL"
  out="$WORK/a1.out"
  echo "  doc sha256: $(sha "$doc")"
  run_check "$sb" "$out"
  show "$out"
  echo "  exit code : $CHECK_EC"
  if [ "$CHECK_EC" -eq 0 ]; then
    ok "A1 committed bytes pass the check (exit 0)"
  else
    bad "A1 committed bytes FAIL the check (exit $CHECK_EC) -- the repo is in violation"
  fi

  # --------------------------------------------------------------------- A2
  banner "A2  RED ARM  -- hand-edit the doc BODY (the real historical drift)"
  echo "  subject: the 'fix' scope table row inside the generated doc."
  echo "  The edit reintroduces the exact drift a076d18 left in this repo for two"
  echo "  years: config says 'old-nix derivations', doc said 'nix derivations'."
  sb="$(new_sandbox a2)"
  doc="$sb/$DOC_REL"
  out="$WORK/a2.out"
  local needle="Fixes in old-nix derivations in the repository"
  local replacement="Fixes in nix derivations in the repository"
  local sha_before sha_after
  sha_before="$(sha "$doc")"

  if grep -Fq "$needle" "$doc"; then
    ok "A2 precondition: the needle is present, so the edit cannot no-op"
  else
    bad "A2 precondition FAILED: needle absent; any verdict below is meaningless"
  fi

  # Neither string contains a sed metacharacter or a '/', so this substitution
  # is literal. It is still only trusted because the sha comparison below
  # proves it landed.
  sed -i "s/old-nix derivations in the repository/nix derivations in the repository/" "$doc"
  sha_after="$(sha "$doc")"
  echo "  doc sha256 before: $sha_before"
  echo "  doc sha256 after : $sha_after"
  if [ "$sha_before" != "$sha_after" ]; then
    ok "A2 MUTATION ASSERTED: the bytes on disk actually changed"
  else
    bad "A2 MUTATION DID NOT LAND: bytes unchanged; the arm proves nothing"
  fi

  run_check "$sb" "$out"
  show "$out"
  echo "  exit code : $CHECK_EC"
  if [ "$CHECK_EC" -ne 0 ]; then
    ok "A2 hand-edited doc is REJECTED (exit $CHECK_EC)"
  else
    bad "A2 hand-edited doc was ACCEPTED (exit 0) -- the check is inert"
  fi
  if grep -Fq "$replacement" "$out" && grep -Fq "$needle" "$out"; then
    ok "A2 the diff names both sides of the edit"
  else
    bad "A2 the diff does not name both sides of the edit"
  fi
  if grep -Fq "regenerate-only" "$out" && grep -Fq "sg conventions" "$out"; then
    ok "A2 the failure states the rule and a runnable remedy"
  else
    bad "A2 the failure does not state the rule and remedy"
  fi

  # --------------------------------------------------------------------- A3
  banner "A3  RED ARM  -- one whitespace byte appended to the doc"
  echo "  subject: the final byte of the generated doc. This separates a"
  echo "  byte-exact comparison from a trimmed/normalised one."
  sb="$(new_sandbox a3)"
  doc="$sb/$DOC_REL"
  out="$WORK/a3.out"
  local size_before size_after
  size_before="$(size "$doc")"
  sha_before="$(sha "$doc")"
  printf '\n' >>"$doc"
  size_after="$(size "$doc")"
  sha_after="$(sha "$doc")"
  echo "  doc bytes before: $size_before   after: $size_after"
  if [ "$size_after" -eq $((size_before + 1)) ] && [ "$sha_before" != "$sha_after" ]; then
    ok "A3 MUTATION ASSERTED: exactly one byte longer, sha changed"
  else
    bad "A3 MUTATION DID NOT LAND as specified (before=$size_before after=$size_after)"
  fi
  run_check "$sb" "$out"
  show "$out"
  echo "  exit code : $CHECK_EC"
  if [ "$CHECK_EC" -ne 0 ]; then
    ok "A3 a whitespace-only hand-edit is REJECTED (exit $CHECK_EC)"
  else
    bad "A3 a whitespace-only hand-edit was ACCEPTED (exit 0)"
  fi

  # --------------------------------------------------------------------- A4
  banner "A4  RED ARM  -- the doc is missing entirely"
  echo "  subject: the existence of the generated doc."
  sb="$(new_sandbox a4)"
  doc="$sb/$DOC_REL"
  out="$WORK/a4.out"
  rm -f "$doc"
  if [ ! -e "$doc" ]; then
    ok "A4 MUTATION ASSERTED: the doc is gone from the sandbox"
  else
    bad "A4 MUTATION DID NOT LAND: the doc still exists"
  fi
  run_check "$sb" "$out"
  show "$out"
  echo "  exit code : $CHECK_EC"
  if [ "$CHECK_EC" -ne 0 ]; then
    ok "A4 a missing doc is REJECTED (exit $CHECK_EC)"
  else
    bad "A4 a missing doc was ACCEPTED (exit 0)"
  fi

  # --------------------------------------------------------------------- A5
  banner "A5  RED ARM  -- drift on the CONFIG side, doc untouched"
  echo "  subject: $CONFIG_REL. The doc keeps its committed bytes; the config"
  echo "  gains a scope. This is the direction real drift took in a076d18, and it"
  echo "  proves the check regenerates from the config rather than comparing the"
  echo "  doc to a stored copy of itself."
  sb="$(new_sandbox a5)"
  doc="$sb/$DOC_REL"
  cfg="$sb/$CONFIG_REL"
  out="$WORK/a5.out"
  local doc_sha_before cfg_sha_before cfg_sha_after doc_sha_after
  doc_sha_before="$(sha "$doc")"
  cfg_sha_before="$(sha "$cfg")"

  local anchors
  anchors="$(grep -c '^      config:$' "$cfg")"
  echo "  anchor '^      config:\$' occurrences in the config: $anchors"
  if [ "$anchors" -eq 1 ]; then
    ok "A5 precondition: exactly one anchor line, so the injection is unambiguous"
  else
    bad "A5 precondition FAILED: $anchors anchor lines; the injection is ambiguous"
  fi
  sed -i 's/^      config:$/      sabotage-scope:\n        desc: injected by the sabotage harness\n        release: false\n      config:/' "$cfg"

  cfg_sha_after="$(sha "$cfg")"
  doc_sha_after="$(sha "$doc")"
  echo "  config sha256 before: $cfg_sha_before"
  echo "  config sha256 after : $cfg_sha_after"
  echo "  doc    sha256 before: $doc_sha_before"
  echo "  doc    sha256 after : $doc_sha_after"
  if [ "$cfg_sha_before" != "$cfg_sha_after" ]; then
    ok "A5 MUTATION ASSERTED: the config bytes changed"
  else
    bad "A5 MUTATION DID NOT LAND: the config is unchanged"
  fi
  if [ "$doc_sha_before" = "$doc_sha_after" ]; then
    ok "A5 CONTROL: the doc was NOT touched, so only the config moved"
  else
    bad "A5 CONTROL FAILED: the doc changed too; the arm is not isolated"
  fi

  run_check "$sb" "$out"
  show "$out"
  echo "  exit code : $CHECK_EC"
  if [ "$CHECK_EC" -ne 0 ]; then
    ok "A5 a doc left stale by a config change is REJECTED (exit $CHECK_EC)"
  else
    bad "A5 a doc left stale by a config change was ACCEPTED (exit 0)"
  fi
  if grep -Fq "sabotage-scope" "$out"; then
    ok "A5 the diff names the scope that was added to the config"
  else
    bad "A5 the diff does not name the newly added scope"
  fi

  # --------------------------------------------------------------------- A6
  banner "A6  NON-MUTATION CONTROL  -- rewrite the doc with IDENTICAL bytes"
  echo "  subject: the discrimination of the check itself. If A2/A3/A4 went red"
  echo "  merely because the file had been written to, this arm would go red too"
  echo "  and the red arms above would carry no information."
  sb="$(new_sandbox a6)"
  doc="$sb/$DOC_REL"
  out="$WORK/a6.out"
  sha_before="$(sha "$doc")"
  cat "$doc" >"$doc.tmp" && mv "$doc.tmp" "$doc"
  touch "$doc"
  sha_after="$(sha "$doc")"
  echo "  doc sha256 before: $sha_before"
  echo "  doc sha256 after : $sha_after"
  if [ "$sha_before" = "$sha_after" ]; then
    ok "A6 NON-MUTATION ASSERTED: the file was rewritten, bytes identical"
  else
    bad "A6 the no-op rewrite changed the bytes; the control is invalid"
  fi
  run_check "$sb" "$out"
  show "$out"
  echo "  exit code : $CHECK_EC"
  if [ "$CHECK_EC" -eq 0 ]; then
    ok "A6 an identical rewrite is ACCEPTED (exit 0) -- the check reads content"
  else
    bad "A6 an identical rewrite was REJECTED (exit $CHECK_EC) -- the check is not content-based"
  fi

  # --------------------------------------------------------------------- A7
  banner "A7  READ-ONLY CONTROL  -- --check must not repair the file"
  echo "  subject: the doc's bytes across a failing --check run. A check that"
  echo "  silently rewrites the file would go green on the second CI run and"
  echo "  hide the violation instead of reporting it."
  sb="$(new_sandbox a7)"
  doc="$sb/$DOC_REL"
  out="$WORK/a7.out"
  printf '\nhand written paragraph\n' >>"$doc"
  sha_before="$(sha "$doc")"
  run_check "$sb" "$out"
  sha_after="$(sha "$doc")"
  show "$out"
  echo "  exit code : $CHECK_EC"
  echo "  doc sha256 before check: $sha_before"
  echo "  doc sha256 after  check: $sha_after"
  if [ "$CHECK_EC" -ne 0 ]; then
    ok "A7 the tampered doc is REJECTED (exit $CHECK_EC)"
  else
    bad "A7 the tampered doc was ACCEPTED (exit 0)"
  fi
  if [ "$sha_before" = "$sha_after" ]; then
    ok "A7 --check left the file byte-identical"
  else
    bad "A7 --check MODIFIED the file; it is not read-only"
  fi

  # --------------------------------------------------------------------- A8
  banner "A8  UNREADABLE-CONFIG CONTROL  -- must not pass when it cannot read"
  echo "  subject: the -c flag pointed at a path that does not exist. A checker"
  echo "  that exits 0 when its input is missing reports 'safe' for the wrong"
  echo "  reason -- the single most common way a guard turns inert."
  sb="$(new_sandbox a8)"
  out="$WORK/a8.out"
  if [ ! -e "$sb/definitely-not-here.yaml" ]; then
    ok "A8 precondition: the config path really is absent"
  else
    bad "A8 precondition FAILED: the path exists"
  fi
  run_check "$sb" "$out" -c definitely-not-here.yaml
  show "$out"
  echo "  exit code : $CHECK_EC"
  if [ "$CHECK_EC" -ne 0 ]; then
    ok "A8 an unreadable config is REJECTED (exit $CHECK_EC)"
  else
    bad "A8 an unreadable config was ACCEPTED (exit 0) -- inert guard"
  fi

  # --------------------------------------------------------------------- A9
  banner "A9  REMEDY ARM  -- 'sg conventions' repairs what --check rejects"
  echo "  subject: the doc's bytes before and after the remedy command. D9's"
  echo "  remedy has to be a runnable command; if it were not, the only way to"
  echo "  clear the check would be the hand-edit D9 forbids."
  sb="$(new_sandbox a9)"
  doc="$sb/$DOC_REL"
  out="$WORK/a9.out"
  local sha_committed
  sha_committed="$(sha "$doc")"
  printf '\nhand written paragraph\n' >>"$doc"
  sha_before="$(sha "$doc")"
  if [ "$sha_committed" != "$sha_before" ]; then
    ok "A9 MUTATION ASSERTED: the doc no longer matches the committed bytes"
  else
    bad "A9 MUTATION DID NOT LAND"
  fi

  run_check "$sb" "$WORK/a9-pre.out"
  local pre_ec=$CHECK_EC
  echo "  --check before remedy exit: $pre_ec"

  run_write "$sb" "$out"
  show "$out"
  echo "  write exit code : $CHECK_EC"
  sha_after="$(sha "$doc")"
  echo "  doc sha256 committed : $sha_committed"
  echo "  doc sha256 tampered  : $sha_before"
  echo "  doc sha256 after 'sg conventions' : $sha_after"

  run_check "$sb" "$WORK/a9-post.out"
  local post_ec=$CHECK_EC
  show "$WORK/a9-post.out"
  echo "  --check after remedy exit: $post_ec"

  if [ "$pre_ec" -ne 0 ]; then
    ok "A9 the tampered doc was RED before the remedy"
  else
    bad "A9 the tampered doc was already green; the arm proves nothing"
  fi
  if [ "$sha_after" = "$sha_committed" ]; then
    ok "A9 'sg conventions' restored the exact committed bytes"
  else
    bad "A9 'sg conventions' did not restore the committed bytes"
  fi
  if [ "$post_ec" -eq 0 ]; then
    ok "A9 --check is GREEN after the remedy"
  else
    bad "A9 --check is still red after the remedy (exit $post_ec)"
  fi

  # ==========================================================================
  # B-SERIES -- the -c/--config half.
  #
  # This is a DIFFERENT question from the A-series and is stated separately on
  # purpose. A-series asks "does the check refuse a stale hand-edited doc?"
  # (D9). B-series asks "does the command read the config I named?" (D6 /
  # WF3's rename). They are adjacent, not the same, and an answer to one is
  # not an answer to the other.
  # ==========================================================================
  local committed_doc_sha
  committed_doc_sha="$(git -C "$ROOT" show "HEAD:$DOC_REL" | sha256sum | cut -d' ' -f1)"

  banner "B1  WRITE ARM  -- renamed config (the WF3 end state), doc absent"
  echo "  subject: docs/developer/03-Commit Conventions.md as an OUTPUT. The"
  echo "  sandbox holds release.yaml and no atomi_release.yaml at all."
  echo "  The exit code is not the finding here; the file appearing is."
  sb="$(new_sandbox_named b1 release.yaml no-doc)"
  doc="$sb/$DOC_REL"
  out="$WORK/b1.out"
  if [ ! -e "$sb/$CONFIG_REL" ]; then
    ok "B1 precondition: the old config name is absent from the sandbox"
  else
    bad "B1 precondition FAILED: $CONFIG_REL exists; the arm cannot isolate the flag"
  fi
  if [ ! -e "$doc" ]; then
    ok "B1 precondition: the doc does not exist before the run"
  else
    bad "B1 precondition FAILED: the doc already exists"
  fi
  run_write_args "$sb" "$out" -c release.yaml
  show "$out"
  echo "  exit code : $CHECK_EC"
  if [ -f "$doc" ]; then
    sha_after="$(sha "$doc")"
    echo "  doc sha256 written   : $sha_after"
    echo "  doc sha256 committed : $committed_doc_sha"
    ok "B1 MUTATION ASSERTED: the doc did not exist before and exists now"
    if [ "$sha_after" = "$committed_doc_sha" ]; then
      ok "B1 the written bytes are identical to the committed doc"
    else
      bad "B1 the written bytes differ from the committed doc"
    fi
  else
    bad "B1 MUTATION DID NOT LAND: no file was written (exit was $CHECK_EC)"
  fi
  if [ "$CHECK_EC" -eq 0 ]; then
    ok "B1 'conventions -c release.yaml' exits 0 on the WF3 end state"
  else
    bad "B1 'conventions -c release.yaml' exited $CHECK_EC on the WF3 end state"
  fi

  banner "B2  WRITE ARM, NEGATIVE  -- -c points at a config that is not there"
  echo "  subject: the -c path on the WRITE path specifically. Without this the"
  echo "  B1 exit 0 cannot be told apart from a command that ignores -c."
  sb="$(new_sandbox_named b2 release.yaml no-doc)"
  doc="$sb/$DOC_REL"
  out="$WORK/b2.out"
  if [ ! -e "$sb/nope.yaml" ]; then
    ok "B2 precondition: nope.yaml really is absent"
  else
    bad "B2 precondition FAILED: nope.yaml exists"
  fi
  run_write_args "$sb" "$out" -c nope.yaml
  show "$out"
  echo "  exit code : $CHECK_EC"
  if [ "$CHECK_EC" -ne 0 ]; then
    ok "B2 a missing config is REJECTED on the write path (exit $CHECK_EC)"
  else
    bad "B2 a missing config was ACCEPTED on the write path (exit 0)"
  fi
  if grep -Fq "nope.yaml" "$out"; then
    ok "B2 the failure names the config path it could not read"
  else
    bad "B2 the failure does not name the config path"
  fi
  if [ ! -e "$doc" ]; then
    ok "B2 NON-MUTATION ASSERTED: nothing was written on the failing path"
  else
    bad "B2 a doc was written despite the config being unreadable"
  fi

  banner "B3  WRITE DISCRIMINATOR  -- BOTH config names present, -c must decide"
  echo "  subject: which of two present configs the write path actually read."
  echo "  B1 and B2 together still cannot separate 'read release.yaml' from"
  echo "  'ignored -c and found atomi_release.yaml anyway', because in a sandbox"
  echo "  holding only one config both behaviours look identical. Here both"
  echo "  names exist; only release.yaml carries the marker."
  sb="$(new_sandbox_named b3 release.yaml no-doc)"
  doc="$sb/$DOC_REL"
  cfg="$sb/release.yaml"
  out="$WORK/b3.out"
  git -C "$ROOT" show "HEAD:$CONFIG_REL" >"$sb/$CONFIG_REL"
  local marker="MARKER-ONLY-IN-RELEASE-YAML"
  sed -i "s/desc: Fixes in configuration/desc: $marker/" "$cfg"

  if grep -Fq "$marker" "$cfg"; then
    ok "B3 MUTATION ASSERTED: the marker is in release.yaml"
  else
    bad "B3 MUTATION DID NOT LAND: the marker is not in release.yaml"
  fi
  if grep -Fq "$marker" "$sb/$CONFIG_REL"; then
    bad "B3 CONTROL FAILED: the marker leaked into $CONFIG_REL; it cannot discriminate"
  else
    ok "B3 CONTROL: the marker is absent from $CONFIG_REL, so it discriminates"
  fi
  if [ -f "$sb/$CONFIG_REL" ] && [ -f "$cfg" ]; then
    ok "B3 precondition: BOTH config names are present in the sandbox"
  else
    bad "B3 precondition FAILED: both config names are not present"
  fi

  run_write_args "$sb" "$out" -c release.yaml
  show "$out"
  echo "  exit code : $CHECK_EC"
  if [ "$CHECK_EC" -eq 0 ] && [ -f "$doc" ]; then
    ok "B3 the write succeeded and produced a file"
  else
    bad "B3 the write did not produce a file (exit $CHECK_EC)"
  fi
  if [ -f "$doc" ] && grep -Fq "$marker" "$doc"; then
    ok "B3 the written doc carries the marker -- -c release.yaml WAS read"
  else
    bad "B3 the written doc has no marker -- -c was ignored and $CONFIG_REL was read"
  fi

  banner "B4  CHECK DISCRIMINATOR  -- --check must honour -c too"
  echo "  subject: which of two present configs --check regenerated from. The"
  echo "  doc on disk is the committed one, which matches $CONFIG_REL exactly."
  echo "  If --check ignored -c it would read $CONFIG_REL and go GREEN. Honouring"
  echo "  -c means regenerating from the marked release.yaml and going RED."
  sb="$(new_sandbox_named b4 release.yaml with-doc)"
  doc="$sb/$DOC_REL"
  cfg="$sb/release.yaml"
  out="$WORK/b4.out"
  git -C "$ROOT" show "HEAD:$CONFIG_REL" >"$sb/$CONFIG_REL"
  sed -i "s/desc: Fixes in configuration/desc: $marker/" "$cfg"
  sha_before="$(sha "$doc")"
  if [ "$sha_before" = "$committed_doc_sha" ]; then
    ok "B4 precondition: the doc on disk is byte-identical to the committed doc"
  else
    bad "B4 precondition FAILED: the doc is not the committed one"
  fi

  run_check "$sb" "$WORK/b4-control.out" -c "$CONFIG_REL"
  echo "  CONTROL, --check -c $CONFIG_REL (the UNMARKED config) exit: $CHECK_EC"
  if [ "$CHECK_EC" -eq 0 ]; then
    ok "B4 CONTROL: against the unmarked config the same doc is GREEN"
  else
    bad "B4 CONTROL FAILED: the doc is red even against the unmarked config; B4 proves nothing"
  fi

  run_check "$sb" "$out" -c release.yaml
  show "$out"
  echo "  exit code : $CHECK_EC"
  if [ "$CHECK_EC" -ne 0 ]; then
    ok "B4 --check -c release.yaml is RED -- it regenerated from the named config"
  else
    bad "B4 --check -c release.yaml is GREEN -- it ignored -c and read $CONFIG_REL"
  fi
  if grep -Fq "$marker" "$out"; then
    ok "B4 the diff names the marker that exists only in release.yaml"
  else
    bad "B4 the diff does not name the marker"
  fi
  sha_after="$(sha "$doc")"
  if [ "$sha_before" = "$sha_after" ]; then
    ok "B4 --check left the doc byte-identical, as on the A-series"
  else
    bad "B4 --check MODIFIED the doc"
  fi

  # ------------------------------------------------------------------ SUMMARY
  banner "SUMMARY"
  echo "  population: 4 preflight controls (P1-P4), 9 D9 arms (A1-A9) and 4"
  echo "  config-flag arms (B1-B4), run against the committed bytes of HEAD with"
  echo "  a dist/ rebuilt from that same source."
  echo "  assertions executed: $((pass + fail))"
  echo "  passed: $pass"
  echo "  failed: $fail"
  echo
  if [ "$fail" -eq 0 ]; then
    echo "  RESULT: every arm behaved as specified."
    echo
    echo "  D9 half (--check refuses a stale generated doc). Shown ABLE TO GO RED"
    echo "  on four distinct sabotages -- doc body, doc trailing byte, missing"
    echo "  doc, config-side drift -- each with the sabotage itself asserted to"
    echo "  have landed, and ABLE TO STAY GREEN on a byte-identical rewrite."
    echo "  STRONG."
    echo
    echo "  D6/WF3 half (-c reads a renamed config). Shown to WRITE on the"
    echo "  renamed end state with the written bytes asserted, to go RED on a"
    echo "  missing config without writing anything, and -- with BOTH config"
    echo "  names present and only the named one marked -- to follow the marker"
    echo "  on the write path and on the check path. That last pair is what"
    echo "  separates 'read my config' from 'ignored my flag and found"
    echo "  atomi_release.yaml anyway'. STRONG."
    return 0
  fi
  echo "  RESULT: $fail assertion(s) failed. Read the arms above before"
  echo "  concluding anything about the check."
  return 1
}

mkdir -p "$(dirname "$OUT_FILE")"
main 2>&1 | tee "$OUT_FILE"
exit "${PIPESTATUS[0]}"
