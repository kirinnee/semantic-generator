import * as path from "path";
import { Err, Ok, Result } from "@hqoss/monads";
import { CommitConventionDocumentParser } from "./documentParser";
import { ReleaseConfiguration } from "./configuration";
import { IWritable, Writer } from "../engine/writer";
import { ReadBinary } from "../engine/basicFileFactory";
import { Content, VFile } from "../engine/vfs";
import { PromiseResult } from "../resultUtil";
import { UnifiedDiff } from "../lineDiff";

/**
 * Guards the "generated docs are regenerate-only" rule for the commit
 * convention document.
 *
 * `Write` produces the document exactly as `ReleaseExecutor.Release` does, so
 * the remedy for a failing check is a real command rather than an instruction
 * to hand-edit — which is the thing the rule forbids.
 *
 * `Check` never writes. It regenerates the document in memory and compares it
 * byte-for-byte against the file on disk, so it is safe to run in CI and on a
 * read-only checkout.
 */
class ConventionsChecker {
  private readonly docParser: CommitConventionDocumentParser;
  private readonly writer: Writer;
  private readonly target: string;
  private readonly configPath: string;

  constructor(
    docParser: CommitConventionDocumentParser,
    writer: Writer,
    target: string,
    configPath: string,
  ) {
    this.docParser = docParser;
    this.writer = writer;
    this.target = target;
    this.configPath = configPath;
  }

  /**
   * The document as it should exist on disk. This is the same call
   * `ReleaseExecutor.Release` makes, so the check and the release cannot drift
   * apart.
   */
  Generate(rc: ReleaseConfiguration): string {
    return this.docParser.GenerateDocument(rc);
  }

  private writable(rc: ReleaseConfiguration): IWritable {
    const docs: VFile = {
      content: Content.String(this.Generate(rc)),
      meta: {
        from: "",
        original: rc.conventionMarkdown.path,
      },
    };
    return IWritable.File(docs);
  }

  /**
   * Regenerates the document and writes it to `conventionMarkdown.path`.
   */
  Write(rc: ReleaseConfiguration): PromiseResult<string, string> {
    const target = rc.conventionMarkdown.path;
    return new PromiseResult<string, string>(
      this.writer.Write(this.writable(rc)).then((o) =>
        o.match({
          none: (): Result<string, string> =>
            Ok(`regenerated ${target} from ${this.configPath}`),
          some: (e: string): Result<string, string> =>
            Err(`failed to write ${target}: ${e}`),
        }),
      ),
    );
  }

  /**
   * Compares the bytes on disk against the regenerated document. Ok when they
   * match; Err carrying a readable unified diff when they do not.
   */
  Check(rc: ReleaseConfiguration): PromiseResult<string, string> {
    const target = rc.conventionMarkdown.path;
    const expected = this.Generate(rc);
    const expectedBuffer = Buffer.from(expected, "utf8");

    return ReadBinary(path.resolve(this.target, target))
      .mapErr((e) => `cannot read ${target}: ${e}\n\n${this.remedy(target)}`)
      .andThen((actualBuffer): Result<string, string> => {
        if (expectedBuffer.equals(actualBuffer)) {
          return Ok(`${target} is up to date with ${this.configPath}`);
        }
        return Err(this.report(target, expected, actualBuffer));
      });
  }

  private remedy(target: string): string {
    return [
      `${target} is a GENERATED file: it is produced from the "conventionMarkdown"`,
      `section of ${this.configPath} and is regenerate-only. Hand-edits are not allowed.`,
      ``,
      `To fix: change ${this.configPath}, run "sg conventions", and commit the result.`,
    ].join("\n");
  }

  private report(
    target: string,
    expected: string,
    actualBuffer: Buffer,
  ): string {
    const actual = actualBuffer.toString("utf8");
    const diff = UnifiedDiff(expected, actual, {
      expectedLabel: `expected: regenerated from ${this.configPath}`,
      actualLabel: `actual:   ${target} on disk`,
    });
    return [
      `${target} does not match the document generated from ${this.configPath}.`,
      ``,
      this.remedy(target),
      ``,
      diff,
    ].join("\n");
  }
}

export { ConventionsChecker };
