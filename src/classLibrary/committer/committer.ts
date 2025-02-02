import { CommitMessageGenerator } from "./commitMessageGenerator";
import { CommitMessageFormatter } from "./formatter";
import { ReleaseConfiguration } from "../release/configuration";
import { ResultAll } from "../util";
import { PR, PromiseResult } from "../resultUtil";
import { CommitMessage } from "./message";
import { Err, Ok, Result } from "@hqoss/monads";
import { select } from "@inquirer/prompts";
import { IWritable, Writer } from "../engine/writer";
import { Content, VFile } from "../engine/vfs";

class Committer {
  private readonly generator: CommitMessageGenerator;
  private readonly formatter: CommitMessageFormatter;
  private readonly writer: Writer;

  constructor(
    generator: CommitMessageGenerator,
    formatter: CommitMessageFormatter,
    writer: Writer,
  ) {
    this.generator = generator;
    this.formatter = formatter;
    this.writer = writer;
  }

  filterCommits(commits: CommitMessage[]): Result<string[], string[]> {
    const r = commits
      .map((c) => this.formatter.format(c))
      .filter((x) => x.isOk());
    return ResultAll(r).mapErr((x) => x.flat());
  }

  promptUser(commits: string[]): PromiseResult<string, string[]> {
    return PR(async () => {
      try {
        const answer = await select({
          message: "Choose your commit message",
          choices: commits.map((c, i) => ({
            name: c,
            value: c,
            disabled: false,
            description: `Options: ${i}`,
          })),
          pageSize: 15,
        });
        return Ok(answer) as Result<string, string[]>;
      } catch (e) {
        return Err([e.toString()]) as Result<string, string[]>;
      }
    });
  }

  write(commit: string, path: string): PromiseResult<string, string[]> {
    return PR(async (): Promise<Result<string, string[]>> => {
      const vf: VFile = {
        content: Content.String(commit),
        meta: {
          from: "",
          original: path,
        },
      };
      const f = IWritable.File(vf);
      const err = await this.writer.Write(f);
      return err.match({
        none: (): Result<string, string[]> => Ok(commit),
        some: (s): Result<string, string[]> => Err([s]),
      });
    });
  }

  Commit(
    cwd: string,
    rc: ReleaseConfiguration,
    user: string,
    path: string,
  ): PromiseResult<string, string[]> {
    return this.generator
      .Generate(cwd, user, rc)
      .andThen((commits) => this.filterCommits(commits))
      .andThenAsync((commits) => this.promptUser(commits))
      .andThenAsync((commit) => this.write(commit, path));
  }
}

export { Committer };
