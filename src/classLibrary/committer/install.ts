import { IWritable, Writer } from "../engine/writer";
import { Content, VFile } from "../engine/vfs";
import { Option } from "@hqoss/monads";

class CommitHookInstaller {
  private readonly writer: Writer;

  constructor(writer: Writer) {
    this.writer = writer;
  }

  async Install(): Promise<Option<string>> {
    const file = `#!/bin/sh

COMMIT_MSG_FILE=$1
COMMIT_SOURCE=$2

exec < /dev/tty && pls run -- committer generate "$(cat $COMMIT_MSG_FILE)" "$COMMIT_MSG_FILE" "$COMMIT_SOURCE"`;

    const vf: VFile = {
      content: Content.String(file),
      meta: {
        from: "",
        original: "./.git/hooks/prepare-commit-msg",
      },
    };
    const f = IWritable.File(vf);
    return await this.writer.Write(f);
  }
}

export { CommitHookInstaller };
