#!/usr/bin/env bash
# WF4 tag-collision guard — end-to-end sabotage proof against REAL git repositories.
#
# WHY THIS EXISTS SEPARATELY FROM THE UNIT SUITE
# ---------------------------------------------
# tests/release/tag-guard.spec.ts drives the guard through a FakeTagReader. That
# proves the decision logic. It cannot prove two things this file must prove:
#
#   1. GitTagReader itself — the real `git for-each-ref` / `git tag --merged` /
#      `git rev-parse --is-shallow-repository` calls. A fake reader cannot fail
#      the way a real git invocation fails.
#   2. MINTER-INSENSITIVITY. The TagReader interface deliberately exposes no
#      tagger, so a minter-sensitive guard is unrepresentable in the fake — which
#      means the fake CANNOT demonstrate the property. Only a real annotated tag,
#      carrying a real tagger, can. Two of the four tags that blocked a release on
#      this fleet were the human owner's own (v1.0.1, v1.0.2 by `kirinnee`), and a
#      minter-sensitive guard would have waved them through.
#
# It runs against the BUILT dist bytes, not the TypeScript sources.
#
# DISCIPLINE THIS SCRIPT HOLDS ITSELF TO
#   - Every arm ASSERTS ITS OWN SUBJECT before concluding: an arm that claims
#     "an owner-minted tag is refused" first proves the tag really is owner-minted.
#     A setup step that silently no-ops otherwise produces a false green.
#   - Every refusal arm is paired with a MUST-DIFFER control that goes green, so a
#     guard that refuses unconditionally cannot pass this file.
#   - stderr is never suppressed on a command we conclude from; it is captured and
#     printed.
#   - No `set -e`: it makes a guard unreachable by aborting before the check that
#     was written to catch the failure.

set -u

CLI="${CLI:-}"
if [ -z "$CLI" ]; then
  CLI="$(cd "$(dirname "$0")/.." && pwd)/dist/semantic-generator.js"
fi

if [ ! -f "$CLI" ]; then
  echo "FATAL: built CLI not found at $CLI — run 'pnpm build' first." >&2
  exit 2
fi

PASS=0
FAIL=0
WORKROOT="$(mktemp -d)"
trap 'rm -rf "$WORKROOT"' EXIT

echo "== WF4 tag-collision guard — end-to-end proof =="
echo "CLI under test : $CLI"
echo "CLI bytes sha  : $(sha256sum "$CLI" | cut -d' ' -f1)"
echo "git version    : $(git --version)"
echo "shell          : bash $BASH_VERSION"
echo "scratch root   : $WORKROOT"
echo

# ---------------------------------------------------------------------------
# assertion helpers. Each prints the SUBJECT it examined, not just a verdict.
# ---------------------------------------------------------------------------

ok() {
  PASS=$((PASS + 1))
  echo "  PASS  $1"
}

bad() {
  FAIL=$((FAIL + 1))
  echo "  FAIL  $1"
}

# assert_subject <description> <actual> <expected>
# Proves the fixture is what the arm claims it is, BEFORE the arm concludes.
assert_subject() {
  local what="$1" actual="$2" expected="$3"
  if [ "$actual" = "$expected" ]; then
    ok "SUBJECT $what == '$expected'"
  else
    bad "SUBJECT $what: expected '$expected', got '$actual' — fixture did not take effect, arm below proves nothing"
  fi
}

# run_guard <repo> [version...] -> sets GUARD_RC, GUARD_OUT (stdout+stderr, whole)
run_guard() {
  local repo="$1"
  shift
  # stderr is MERGED, never discarded: the verdict is concluded from this output.
  # Read whole; no `head`, which would race SIGPIPE.
  GUARD_OUT="$(cd "$repo" && node "$CLI" tag-guard "$@" 2>&1)"
  GUARD_RC=$?
}

# expect_refusal <label> <code>
expect_refusal() {
  local label="$1" code="$2"
  if [ "$GUARD_RC" -eq 0 ]; then
    bad "$label — expected refusal, got exit 0. output: $GUARD_OUT"
    return
  fi
  case "$GUARD_OUT" in
    *"$code"*) ok "$label — refused (exit $GUARD_RC) with code '$code'" ;;
    *) bad "$label — refused (exit $GUARD_RC) but WITHOUT code '$code'. output: $GUARD_OUT" ;;
  esac
}

# expect_clear <label> <needle>
expect_clear() {
  local label="$1" needle="$2"
  if [ "$GUARD_RC" -ne 0 ]; then
    bad "$label — expected exit 0, got $GUARD_RC. output: $GUARD_OUT"
    return
  fi
  case "$GUARD_OUT" in
    *"$needle"*) ok "$label — cleared (exit 0) saying '$needle'" ;;
    *) bad "$label — exit 0 but output lacked '$needle'. output: $GUARD_OUT" ;;
  esac
}

# new_repo <name> -> path, with one commit on branch `main`
new_repo() {
  local name="$1"
  local d="$WORKROOT/$name"
  mkdir -p "$d"
  (
    cd "$d" || exit 1
    git init -q -b main
    git config user.name "machine-releaser"
    git config user.email "machine@eng.atomi.cloud"
    git config commit.gpgsign false
    git config tag.gpgsign false
    echo "seed" >file.txt
    git add file.txt
    git commit -q -m "chore: seed"
  )
  echo "$d"
}

# ===========================================================================
echo "-- ARM 1/2: a version an existing tag occupies is refused; a free one is not"
# ===========================================================================
R1="$(new_repo collision)"
(cd "$R1" && git tag v1.0.0)
assert_subject "tag v1.0.0 exists in the repo" \
  "$(cd "$R1" && git tag --list v1.0.0)" "v1.0.0"

run_guard "$R1" 1.0.0
expect_refusal "ARM1 occupied version 1.0.0" "tag-collision"

# MUST-DIFFER CONTROL. Without this, a guard hardcoded to refuse would pass ARM1.
run_guard "$R1" 2.0.0
expect_clear "ARM2 CONTROL free version 2.0.0" "is free"
echo

# ===========================================================================
echo "-- ARM 3: an OWNER-MINTED annotated tag is refused (the fleet's live case)"
# ===========================================================================
R3="$(new_repo owner-minted)"
(
  cd "$R3" || exit 1
  # Mint as the human owner, exactly as the two blocking tags were.
  GIT_COMMITTER_NAME="kirinnee" GIT_COMMITTER_EMAIL="kirinnee@example.com" \
    git -c user.name="kirinnee" -c user.email="kirinnee@example.com" \
    tag -a v1.0.1 -m "release 1.0.1"
)
# SUBJECT: prove the tag really carries the owner as tagger. If this line fails,
# the refusal below is about an ordinary tag and proves nothing about minters.
assert_subject "tagger of v1.0.1" \
  "$(cd "$R3" && git for-each-ref --format='%(taggername)' refs/tags/v1.0.1)" "kirinnee"
assert_subject "v1.0.1 is an ANNOTATED tag object" \
  "$(cd "$R3" && git cat-file -t "$(cd "$R3" && git rev-parse v1.0.1)")" "tag"

run_guard "$R3" 1.0.1
expect_refusal "ARM3 owner-minted (kirinnee) tag v1.0.1" "tag-collision"
echo

# ===========================================================================
echo "-- ARM 4: a MACHINE-minted annotated tag is refused IDENTICALLY"
# ===========================================================================
# Paired with ARM 3 this is the actual minter-insensitivity proof: two different
# minters, one verdict. Either arm alone would be consistent with a guard that
# happened to care about identity.
R4="$(new_repo machine-minted)"
(
  cd "$R4" || exit 1
  GIT_COMMITTER_NAME="atomi-bot" GIT_COMMITTER_EMAIL="bot@eng.atomi.cloud" \
    git -c user.name="atomi-bot" -c user.email="bot@eng.atomi.cloud" \
    tag -a v1.0.1 -m "release 1.0.1"
)
assert_subject "tagger of v1.0.1" \
  "$(cd "$R4" && git for-each-ref --format='%(taggername)' refs/tags/v1.0.1)" "atomi-bot"

run_guard "$R4" 1.0.1
expect_refusal "ARM4 machine-minted (atomi-bot) tag v1.0.1" "tag-collision"
echo

# ===========================================================================
echo "-- ARM 5: a LIGHTWEIGHT tag (no tagger at all) is refused too"
# ===========================================================================
R5="$(new_repo lightweight)"
(cd "$R5" && git tag v1.0.2)
assert_subject "v1.0.2 is NOT an annotated tag object" \
  "$(cd "$R5" && git cat-file -t "$(cd "$R5" && git rev-parse v1.0.2)")" "commit"
assert_subject "v1.0.2 has an empty taggername" \
  "$(cd "$R5" && git for-each-ref --format='%(taggername)' refs/tags/v1.0.2)" ""

run_guard "$R5" 1.0.2
expect_refusal "ARM5 lightweight tag v1.0.2" "tag-collision"
echo

# ===========================================================================
echo "-- ARM 6/7: the MEASURED INCIDENT — a tag HEAD cannot reach"
# ===========================================================================
R6="$(new_repo unreachable)"
(
  cd "$R6" || exit 1
  git checkout -q -b side
  echo side >side.txt
  git add side.txt
  git commit -q -m "chore: side"
  git tag v1.0.0
  git checkout -q main
)
# SUBJECT: this is the exact condition that fooled the releaser — the reachable
# tag set is EMPTY while the tag exists. Prove both halves.
assert_subject "tags reachable from HEAD (the set the releaser computed from)" \
  "$(cd "$R6" && git tag --merged HEAD | tr -d '[:space:]')" ""
assert_subject "v1.0.0 nonetheless exists in the repository" \
  "$(cd "$R6" && git for-each-ref --format='%(refname:strip=2)' refs/tags)" "v1.0.0"

# 6: the pre-computation arm — this is what protects `sg release`, which cannot
# know the version yet.
run_guard "$R6"
expect_refusal "ARM6 visibility arm, 1 tag unreachable" "tag-not-visible"

# 7: the class fix — an unreachable tag still blocks its own version.
run_guard "$R6" 1.0.0
expect_refusal "ARM7 unreachable tag still blocks version 1.0.0" "tag-collision"
echo

# ===========================================================================
echo "-- ARM 8: CONTROL — every version tag reachable, so the guard clears"
# ===========================================================================
R8="$(new_repo all-reachable)"
(cd "$R8" && git tag v1.0.0 && git tag v1.1.0)
assert_subject "both tags reachable from HEAD" \
  "$(cd "$R8" && git tag --merged HEAD | sort | tr '\n' ',' | sed 's/,$//')" "v1.0.0,v1.1.0"

run_guard "$R8"
expect_clear "ARM8 CONTROL all tags reachable" "reachable from HEAD"
echo

# ===========================================================================
echo "-- ARM 9: CONTROL — floating major/minor tags must NOT trip the guard"
# ===========================================================================
# semantic-release-major-tag mints `v3`/`v3.1` and MOVES them, so they are
# routinely unreachable. Reading them as version tags would refuse every release
# — a guard that cries wolf gets switched off, which is a way of failing.
R9="$(new_repo floating)"
(
  cd "$R9" || exit 1
  git tag v1.0.0
  git checkout -q -b side
  echo s >s.txt
  git add s.txt
  git commit -q -m "chore: s"
  git tag v3
  git tag v3.1
  git checkout -q main
)
assert_subject "v3 and v3.1 are unreachable from HEAD" \
  "$(cd "$R9" && git tag --merged HEAD | sort | tr '\n' ',' | sed 's/,$//')" "v1.0.0"

run_guard "$R9"
expect_clear "ARM9 CONTROL floating v3/v3.1 ignored" "reachable from HEAD"
echo

# ===========================================================================
echo "-- ARM 10: a shallow clone REFUSES rather than reporting a clear result"
# ===========================================================================
R10src="$(new_repo shallow-src)"
(
  cd "$R10src" || exit 1
  echo more >more.txt
  git add more.txt
  git commit -q -m "chore: more"
)
R10="$WORKROOT/shallow"
git clone -q --depth 1 "file://$R10src" "$R10" 2>&1
assert_subject "clone reports itself shallow" \
  "$(cd "$R10" && git rev-parse --is-shallow-repository)" "true"

run_guard "$R10" 9.9.9
expect_refusal "ARM10 shallow clone" "shallow-clone"
echo

# ===========================================================================
echo "-- ARM 11: 'I could not look' is not 'it is clear'"
# ===========================================================================
R11="$WORKROOT/not-a-repo"
mkdir -p "$R11"
assert_subject "directory is not a git repository" \
  "$(cd "$R11" && git rev-parse --is-inside-work-tree 2>/dev/null || echo NOT_A_REPO)" "NOT_A_REPO"

run_guard "$R11" 1.0.0
expect_refusal "ARM11 not a git repository" "not-a-git-repo"
echo

# ===========================================================================
echo "-- ARM 12: the v-prefix is not a way past the guard"
# ===========================================================================
R12="$(new_repo prefix)"
(cd "$R12" && git tag v2.5.0)
run_guard "$R12" 2.5.0
expect_refusal "ARM12 bare '2.5.0' against tag 'v2.5.0'" "tag-collision"

R12b="$(new_repo prefix-b)"
(cd "$R12b" && git tag 2.6.0)
run_guard "$R12b" v2.6.0
expect_refusal "ARM12b 'v2.6.0' against bare tag '2.6.0'" "tag-collision"
echo

# ===========================================================================
echo "-- ARM 13: a malformed version is refused, not guessed at"
# ===========================================================================
R13="$(new_repo malformed)"
run_guard "$R13" 1.2
expect_refusal "ARM13 '1.2' is not a full version" "invalid-version"
echo

# ===========================================================================
# ===========================================================================
echo "-- ARM 14: the SHIPPED BUNDLE cannot read a tag's identity at all"
# ===========================================================================
# ARM 3+4 prove the guard does not ACT on the minter. This arm proves it cannot
# LEARN it: a structural check on the bytes that actually ship.
#
# VOCABULARY ENUMERATED (stated, because an absence claim is only as wide as its
# word list, and two engines agreeing on one pattern controls for a matcher bug
# and NOT for whether the pattern spans the concept):
#   taggername  taggeremail  taggerdate  tagger
#   committername  committeremail  committerdate
#   creator  creatordate
#   authorname  authoremail
# These are git ref-format tokens. The subject is deliberately the TOKEN SET and
# not English words: the guard's own refusal message legitimately contains the
# words "author" and "minted", so an English-word sweep would report a false hit
# and, worse, invite someone to delete the explanation to make the check pass.
IDENT_TOKENS="taggername taggeremail taggerdate tagger committername committeremail committerdate creator creatordate authorname authoremail"

# SUBJECT: the whole emitted tree, NOT the entry file.
#
# The first draft of this arm scanned "$CLI" alone and printed a confident PASS.
# The must-differ control below caught it: `tsc` does not bundle. It emits 40
# separate .js files and dist/semantic-generator.js is a 2.9 KB entry point that
# only requires the others — the guard's actual bytes live in
# dist/classLibrary/release/tag-guard.js. Scanning the entry file for a token
# that lives in a sibling module examines nothing and always passes. That is the
# inert-check shape this fleet has hit eleven times tonight, and it survived
# writing precisely because its output looked like the answer.
DIST_DIR="$(dirname "$CLI")"
DIST_FILE_COUNT="$(find "$DIST_DIR" -name '*.js' -type f | wc -l)"

BUNDLE_HITS=""
for tok in $IDENT_TOKENS; do
  # -F: fixed string, so no metachar in the token can silently widen or narrow
  # the match. stderr merged; we conclude from this.
  if grep -rFql "$tok" "$DIST_DIR" 2>&1; then
    BUNDLE_HITS="$BUNDLE_HITS $tok"
  fi
done
if [ -n "$BUNDLE_HITS" ]; then
  bad "ARM14 shipped tree CAN read tag identity — tokens present:$BUNDLE_HITS"
else
  ok "ARM14 shipped tree ($DIST_FILE_COUNT .js files under $DIST_DIR) contains none of the $(echo "$IDENT_TOKENS" | wc -w) tag-identity tokens ($IDENT_TOKENS)"
fi

# MUST-DIFFER CONTROL for ARM14. Without it, a typo in the loop, an unreadable
# path, or an empty token list would print the same reassuring PASS while having
# examined nothing. Assert the SAME instrument, over the SAME population, finds a
# token that IS there. This control has already earned its place once: it caught
# the wrong-subject draft described above.
if grep -rFql "for-each-ref" "$DIST_DIR" 2>&1; then
  ok "ARM14 CONTROL the same grep over the same tree DOES find 'for-each-ref' (instrument is live)"
else
  bad "ARM14 CONTROL grep found neither identity tokens NOR 'for-each-ref' — the check examined nothing and its PASS above is meaningless"
fi
echo

echo "== RESULT =="
echo "arms passed : $PASS"
echo "arms failed : $FAIL"
if [ "$FAIL" -ne 0 ]; then
  echo "VERDICT: FAILED"
  exit 1
fi
echo "VERDICT: ALL PASS"
