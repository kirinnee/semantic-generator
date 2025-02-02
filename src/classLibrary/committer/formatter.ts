import { CommitMessage } from "./message";
import { Err, Ok, Result } from "@hqoss/monads";
import * as os from "os";
import wrap from "word-wrap";

class CommitMessageFormatter {
  format(message: CommitMessage): Result<string, string[]> {
    const title =
      `${message.type.trim()}(${message.scope.trim()}): ${message.subject.trim()}`.trim();
    if (title.length > 72) return Err(["Title Max length ≤ 72 characters."]);
    if (title.length < 5) return Err(["Min length ≥ 5 characters"]);

    const wrapOpt = {
      width: 80,
      trim: true,
      indent: "",
      newline: os.EOL,
    };

    const m = message.changes
      .map((change) => `- ${change}`)
      .map((change) => wrap(change, wrapOpt))
      .join(os.EOL);

    const r = wrap(message.reason, wrapOpt);

    const commit = `${title}

${m}

${r}`;
    return Ok(commit);
  }
}

export { CommitMessageFormatter };
