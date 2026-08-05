import * as fs from "fs";
import * as path from "path";
import rimraf from "rimraf";
import { Kore } from "@kirinnee/core";
import { should } from "chai";
import { ReleaseConfiguration } from "../../src/classLibrary/release/configuration";
import { CommitConventionDocumentParser } from "../../src/classLibrary/release/documentParser";
import { ConventionsChecker } from "../../src/classLibrary/release/conventions-checker";
import { BasicWriter } from "../../src/classLibrary/engine/writer";
import { VarResolver } from "../../src/classLibrary/engine/resolver";
import { MarkdownTable } from "../../src/markdown-table";
import mkdirp = require("mkdirp");

should();
const core = new Kore();
core.ExtendPrimitives();

const groundDir = "test_ground/conventions_check";
const configName = "atomi_release.yaml";

const configuration: ReleaseConfiguration = {
  gitlint: ".gitlint",
  committer: {
    model: "gpt-4o-mini",
    provider: "openai",
    variations: 3,
    maxDiff: 1000,
  },
  conventionMarkdown: {
    // Deliberately nested and containing a space: the real repository config
    // uses "docs/developer/03-Commit Conventions.md".
    path: "docs/developer/03-Commit Conventions.md",
    template: `---
id: commit-conventions
title: Commit Conventions
---

var___convention_docs___
`,
  },
  keywords: ["BREAKING"],
  branches: ["main"],
  specialScopes: {
    "no-release": {
      desc: "Prevent release from happening",
      release: false,
    },
  },
  types: [
    {
      type: "feat",
      desc: "A new feature",
      scopes: {
        default: { desc: "any part of the project", release: "minor" },
        core: { desc: "the core library", release: "minor" },
      },
      vae: {
        verb: "add",
        application: "<title> to <scope>",
        example: "feat(core): add a brand new thing",
      },
    },
    {
      type: "fix",
      desc: "A bug fix",
      scopes: {
        default: { desc: "any part of the project", release: "patch" },
      },
    },
  ],
};

const docPath = path.join(groundDir, configuration.conventionMarkdown.path);

function checker(): ConventionsChecker {
  const docParser = new CommitConventionDocumentParser(
    new VarResolver(core),
    new MarkdownTable(core),
    core,
  );
  return new ConventionsChecker(
    docParser,
    new BasicWriter(core, groundDir),
    groundDir,
    configName,
  );
}

describe("ConventionsChecker", function () {
  const subject = checker();

  beforeEach(function () {
    rimraf.sync(groundDir);
    mkdirp.sync(groundDir);
  });

  after(function () {
    rimraf.sync(groundDir);
  });

  describe("Write", function () {
    it("should write the generated document to conventionMarkdown.path", async function () {
      fs.existsSync(docPath).should.equal(false);

      const r = await subject.Write(configuration).promise;
      r.isOk().should.equal(true);
      r.unwrap().should.contain("docs/developer/03-Commit Conventions.md");

      fs.existsSync(docPath).should.equal(true);
      const written = fs.readFileSync(docPath).toString("utf8");
      written.should.equal(subject.Generate(configuration));
    });

    it("should write exactly the bytes the document parser generates", async function () {
      await subject.Write(configuration).promise;
      const onDisk = fs.readFileSync(docPath);
      const generated = Buffer.from(subject.Generate(configuration), "utf8");
      onDisk.equals(generated).should.equal(true);
    });
  });

  describe("Check", function () {
    it("should fail when the document does not exist at all", async function () {
      fs.existsSync(docPath).should.equal(false);

      const r = await subject.Check(configuration).promise;
      r.isOk().should.equal(false);
      r.unwrapErr().should.contain("cannot read");
      r.unwrapErr().should.contain("sg conventions");
    });

    it("should pass against a freshly generated document", async function () {
      await subject.Write(configuration).promise;

      const r = await subject.Check(configuration).promise;
      r.isOk().should.equal(true);
      r.unwrap().should.contain("is up to date");
    });

    it("should fail with a diff when the document is hand-edited, and pass again once regenerated", async function () {
      await subject.Write(configuration).promise;

      // --- arrange the hand-edit, and prove the hand-edit actually happened ---
      const needle = "A new feature";
      const replacement = "A new feature, but hand-edited";

      const pristine = fs.readFileSync(docPath);
      const pristineText = pristine.toString("utf8");
      // If the needle were absent the "edit" would silently no-op and the
      // check would go green for the wrong reason. Assert the precondition.
      pristineText.should.contain(needle);

      const editedText = pristineText.replace(needle, replacement);
      editedText.should.not.equal(pristineText);
      fs.writeFileSync(docPath, Buffer.from(editedText, "utf8"));

      // Assert the MUTATION, not just the verdict: the bytes on disk changed.
      const edited = fs.readFileSync(docPath);
      edited.equals(pristine).should.equal(false);

      // --- the check must go red, and say why ---
      const red = await subject.Check(configuration).promise;
      red.isOk().should.equal(false);
      const err = red.unwrapErr();
      err.should.contain("does not match");
      err.should.contain("regenerate-only");
      err.should.contain("sg conventions");
      err.should.contain("@@");
      // both sides of the edit are visible in the diff
      err.should.contain(needle);
      err.should.contain(replacement);

      // --- Check must not repair the file: it is read-only ---
      fs.readFileSync(docPath).equals(edited).should.equal(true);

      // --- regenerating must restore the exact bytes and go green ---
      const rewrite = await subject.Write(configuration).promise;
      rewrite.isOk().should.equal(true);
      fs.readFileSync(docPath).equals(pristine).should.equal(true);

      const green = await subject.Check(configuration).promise;
      green.isOk().should.equal(true);
    });

    it("should fail on a whitespace-only hand-edit, because the comparison is byte-exact", async function () {
      await subject.Write(configuration).promise;

      const pristine = fs.readFileSync(docPath);
      const edited = Buffer.concat([pristine, Buffer.from("\n", "utf8")]);
      fs.writeFileSync(docPath, edited);

      // Assert the mutation: exactly one byte longer.
      const onDisk = fs.readFileSync(docPath);
      onDisk.length.should.equal(pristine.length + 1);
      onDisk.equals(pristine).should.equal(false);

      const r = await subject.Check(configuration).promise;
      r.isOk().should.equal(false);
      r.unwrapErr().should.contain("does not match");
    });

    it("should fail when the document is truncated to nothing", async function () {
      await subject.Write(configuration).promise;

      const pristine = fs.readFileSync(docPath);
      pristine.length.should.be.above(0);
      fs.writeFileSync(docPath, Buffer.from("", "utf8"));
      fs.readFileSync(docPath).length.should.equal(0);

      const r = await subject.Check(configuration).promise;
      r.isOk().should.equal(false);
      r.unwrapErr().should.contain("does not match");
    });

    it("should fail when the config changes but the document is left stale", async function () {
      await subject.Write(configuration).promise;
      const stale = fs.readFileSync(docPath);

      const changed: ReleaseConfiguration = {
        ...configuration,
        types: [
          ...configuration.types,
          {
            type: "chore",
            desc: "Housekeeping",
            scopes: { default: { desc: "anything", release: false } },
          },
        ],
      };

      // Assert the mutation is on the CONFIG side: the generated document
      // genuinely differs now, while the file on disk is untouched.
      subject
        .Generate(changed)
        .should.not.equal(subject.Generate(configuration));
      fs.readFileSync(docPath).equals(stale).should.equal(true);

      const r = await subject.Check(changed).promise;
      r.isOk().should.equal(false);
      r.unwrapErr().should.contain("chore");
    });
  });
});
