import { Command } from "commander";
import * as path from "path";
import { ConfigLinter } from "../classLibrary/release/config-linter";

const DEFAULT_CONFIG = "atomi_release.yaml";

export function ConfigLintController(c: Command): void {
  c.description(
    "Lint the release configuration without running a release. Exits non-zero with a named reason for every violation.",
  )
    .option(
      "-c, --config <cfg>",
      `path to configuration. default: ${DEFAULT_CONFIG}`,
    )
    .action(async function (opts: { [s: string]: string }) {
      const cwd = path.resolve(".");
      const configPath = opts.config ?? DEFAULT_CONFIG;
      const linter = new ConfigLinter(cwd);

      const r = await linter.Lint(configPath).promise;
      r.match({
        // stderr, never suppressed: the caller concludes from this output.
        err: (e) => {
          console.error(
            `config-lint FAILED: ${e.length} violation(s) in ${configPath}`,
          );
          e.forEach((w) => console.error(`  ${w}`));
          process.exit(1);
        },
        ok: (o) => console.log(`config-lint OK: ${o}`),
      });
    });
}
