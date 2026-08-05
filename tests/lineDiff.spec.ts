import { SplitLines, UnifiedDiff } from "../src/classLibrary/lineDiff";
import { should } from "chai";

should();

describe("SplitLines", function () {
  it("should report an empty body as zero lines without a trailing newline", function () {
    const act = SplitLines("");
    act.lines.length.should.equal(0);
    act.trailingNewline.should.equal(false);
  });

  it("should separate the trailing newline from the line content", function () {
    const act = SplitLines("a\nb\n");
    act.lines.should.deep.equal(["a", "b"]);
    act.trailingNewline.should.equal(true);
  });

  it("should flag a body that does not end with a newline", function () {
    const act = SplitLines("a\nb");
    act.lines.should.deep.equal(["a", "b"]);
    act.trailingNewline.should.equal(false);
  });

  it("should treat a lone newline as one empty line", function () {
    const act = SplitLines("\n");
    act.lines.should.deep.equal([""]);
    act.trailingNewline.should.equal(true);
  });
});

describe("UnifiedDiff", function () {
  it("should return an empty string for identical bodies", function () {
    UnifiedDiff("a\nb\nc\n", "a\nb\nc\n").should.equal("");
  });

  it("should render a replaced line as a - and a + with the surrounding context", function () {
    const expected = "one\ntwo\nthree\nfour\nfive\n";
    const actual = "one\ntwo\nTHREE\nfour\nfive\n";
    const act = UnifiedDiff(expected, actual);
    act.should.equal(
      [
        "--- expected",
        "+++ actual",
        "@@ -1,5 +1,5 @@",
        " one",
        " two",
        "-three",
        "+THREE",
        " four",
        " five",
      ].join("\n"),
    );
  });

  it("should render an inserted line as a + only", function () {
    const act = UnifiedDiff("a\nb\n", "a\ninserted\nb\n");
    act.should.equal(
      [
        "--- expected",
        "+++ actual",
        "@@ -1,2 +1,3 @@",
        " a",
        "+inserted",
        " b",
      ].join("\n"),
    );
  });

  it("should render a deleted line as a - only", function () {
    const act = UnifiedDiff("a\ngone\nb\n", "a\nb\n");
    act.should.equal(
      [
        "--- expected",
        "+++ actual",
        "@@ -1,3 +1,2 @@",
        " a",
        "-gone",
        " b",
      ].join("\n"),
    );
  });

  it("should use the supplied labels", function () {
    const act = UnifiedDiff("a\n", "b\n", {
      expectedLabel: "generated",
      actualLabel: "on disk",
    });
    act.should.contain("--- generated");
    act.should.contain("+++ on disk");
  });

  it("should split distant changes into separate hunks", function () {
    const base: string[] = [];
    for (let i = 1; i <= 20; i++) base.push(`line ${i}`);
    const expected = base.join("\n") + "\n";
    const mutated = base.slice();
    mutated[1] = "CHANGED 2";
    mutated[17] = "CHANGED 18";
    const actual = mutated.join("\n") + "\n";

    const act = UnifiedDiff(expected, actual);
    const hunks = act.split("\n").filter((x) => x.startsWith("@@"));
    hunks.length.should.equal(2);
    hunks[0].should.equal("@@ -1,5 +1,5 @@");
    hunks[1].should.equal("@@ -15,6 +15,6 @@");
  });

  it("should merge changes that are close enough to share context", function () {
    const base: string[] = [];
    for (let i = 1; i <= 12; i++) base.push(`line ${i}`);
    const mutated = base.slice();
    mutated[3] = "CHANGED 4";
    mutated[6] = "CHANGED 7";

    const act = UnifiedDiff(base.join("\n") + "\n", mutated.join("\n") + "\n");
    act
      .split("\n")
      .filter((x) => x.startsWith("@@"))
      .length.should.equal(1);
  });

  it("should report a difference that lives only in the trailing newline", function () {
    const act = UnifiedDiff("a\nb\n", "a\nb");
    act.should.equal(
      [
        "--- expected",
        "+++ actual",
        "(lines are identical; only the trailing newline differs)",
        "\\ actual has no newline at end of file",
      ].join("\n"),
    );
  });

  it("should note the missing trailing newline on the expected side", function () {
    const act = UnifiedDiff("a\nb", "a\nb\n");
    act.should.contain("\\ expected has no newline at end of file");
  });

  it("should fall back to a summary when the bodies are too large to diff", function () {
    const a: string[] = [];
    const b: string[] = [];
    for (let i = 0; i < 10; i++) {
      a.push(`a${i}`);
      b.push(`b${i}`);
    }
    const act = UnifiedDiff(a.join("\n"), b.join("\n"), { maxCells: 10 });
    act.should.contain("too large to diff");
    act.should.contain("first difference at line 1");
  });
});
