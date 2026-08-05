import { Command } from "commander";
import * as path from "path";
import { Wrap } from "../classLibrary/util";
import { Bumper } from "../classLibrary/release/bump/bumper";
import { bumpTypeNames } from "../classLibrary/release/bump/bump-types";
import { ConfigReader } from "../classLibrary/release/config-reader";

/**
 * `sg bump <version>` — writes the release version into every file the release
 * configuration's `bumps` list names.
 *
 * The version is a POSITIONAL argument on purpose. A `--version` option here
 * would be shadowed by the program's own `-V, --version`, which prints the
 * generator's version and exits 0 — a bump that silently did nothing and reported
 * success. Positional arguments cannot be captured that way.
 */
export function BumpController(c: Command): void {
  c.argument("<version>", "the version to write, e.g. 1.4.0")
    .option(
      "-c, --config <cfg>",
      "path to the release configuration. default: the release config default",
    )
    .description(
      `write a release version into the files named by the release configuration's ` +
        `bumps list. Types: ${bumpTypeNames.join(", ")}`,
    )
    .action(async function (version: string, opts: { [s: string]: string }) {
      let error = false;
      try {
        const cwd = path.resolve(".");
        // The config path default lives in ConfigReader and NOWHERE else, so the
        // repository keeps exactly one config filename. Do not add a second.
        const configPath = Wrap(opts.config);
        const bumper = new Bumper(cwd);

        const r = await new ConfigReader()
          .Read(configPath)
          .andThenAsync((cfg) => bumper.Bump(cfg.bumps ?? [], version)).promise;

        r.match({
          err: (e) => {
            e.forEach((w) => console.warn(w));
            error = true;
          },
          ok: (reports) => {
            reports.forEach((b) =>
              console.log(
                `${b.file}: ${b.from} -> ${b.to} (${b.type}, ${b.field})` +
                  (b.overridden ? ` [override: ${b.reason}]` : ""),
              ),
            );
          },
        });
      } catch (err) {
        console.warn(err);
        error = true;
      }
      if (error) process.exit(1);
    });
}
