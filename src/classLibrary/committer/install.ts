import { IWritable, Writer } from "../engine/writer";
import { Content, VFile } from "../engine/vfs";
import { None, Option, Some } from "@hqoss/monads";
import * as fs from "node:fs";

class CommitHookInstaller {
  private readonly writer: Writer;

  constructor(writer: Writer) {
    this.writer = writer;
  }

  makeExec(path: string): Option<string> {
    try {
      fs.chmodSync(path, "755");
      return None;
    } catch (err) {
      return Some(err.toString());
    }
  }

  async Install(): Promise<Option<string>> {
    const file = `#!/bin/sh

COMMIT_MSG_FILE=$1
COMMIT_SOURCE=$2

if [ "$COMMIT_SOURCE" = '' ]; then
    # without message
    exec < /dev/tty && pls run -- committer generate "" "$COMMIT_MSG_FILE"
else
    # with message
    exec < /dev/tty && pls run -- committer generate "$(cat $COMMIT_MSG_FILE)" "$COMMIT_MSG_FILE"
    exec < /dev/tty && \${EDITOR:-vi} "$COMMIT_MSG_FILE"
fi`;

    const prepareCommitMsg = "./.git/hooks/prepare-commit-msg";

    const vf: VFile = {
      content: Content.String(file),
      meta: {
        from: "",
        original: prepareCommitMsg,
      },
    };
    const f = IWritable.File(vf);
    const r = await this.writer.Write(f);
    return r.match({
      none: (): Option<string> => this.makeExec(prepareCommitMsg),
      some: (s): Option<string> => Some(s),
    });
  }
}

export { CommitHookInstaller };
