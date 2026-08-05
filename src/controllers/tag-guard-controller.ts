import { Command } from "commander";
import * as path from "path";
import { GitTagReader, TagGuard } from "../classLibrary/release/tag-guard";

export function TagGuardController(c: Command): void {
  // The version is a positional argument, not `--version`: on a commander
  // subcommand a `--version` option is shadowed by the program's own
  // `-V, --version`, which prints the CLI version and exits 0. A guard that
  // exits 0 without checking anything is worse than no guard.
  c.description(
    "Refuse to release onto a version an existing tag already occupies, regardless of who minted the tag.",
  )
    .arguments("[version]")
    .option("--cwd <dir>", "repository to inspect. default: .")
    .action(async function (
      version: string | undefined,
      opts: {
        [s: string]: string;
      },
    ) {
      const cwd = path.resolve(opts.cwd ?? ".");
      const guard = new TagGuard(new GitTagReader(cwd));

      const r = await guard.Check(version).promise;
      r.match({
        // stderr, never suppressed: the release verdict is concluded from this.
        err: (e) => {
          console.error(`tag-guard REFUSED: ${e.length} reason(s)`);
          e.forEach((w) => console.error(`  ${w}`));
          process.exit(1);
        },
        ok: (o) => o.forEach((w) => console.log(`tag-guard OK: ${w}`)),
      });
    });
}
