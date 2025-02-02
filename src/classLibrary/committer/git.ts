import { PR, PromiseResult } from "../resultUtil";
import { Err, Ok, Result } from "@hqoss/monads";
import execa from "execa";
import {
  CommitterConfig,
  ReleaseConfiguration,
} from "../release/configuration";
import parseGitDiff from "parse-git-diff";

class Git {
  diffLowLevel(cwd: string, flag: string[]): PromiseResult<string, string[]> {
    return PR(async (): Promise<Result<string, string[]>> => {
      try {
        const { stdout } = await execa("git", ["diff", ...flag], { cwd });
        return Ok(stdout.toString());
      } catch (e) {
        return Err([e.toString()]);
      }
    });
  }

  diffToFiles(diff: string, c: CommitterConfig): string[] {
    return parseGitDiff(diff)
      .files.filter(
        (x) =>
          x.chunks
            .filter((c) => c.type !== "BinaryFilesChunk")
            .Sum(
              (c) => c.changes.filter((x) => x.type != "UnchangedLine").length,
            ) < c.variations,
      )
      .map((x) =>
        x.type == "RenamedFile" ? [x.pathAfter, x.pathBefore] : [x.path],
      )
      .flat();
  }

  diff(cwd: string, rc: ReleaseConfiguration): PromiseResult<string, string[]> {
    return this.diffLowLevel(cwd, ["--staged"])
      .map((diff) => this.diffToFiles(diff, rc.committer).Unique())
      .andThenAsync((files) => this.diffLowLevel(cwd, ["--staged", ...files]));
  }
}

export { Git };
