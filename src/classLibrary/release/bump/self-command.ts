import { Option } from "@hqoss/monads";

/**
 * Builds the shell command that re-invokes THIS generator's `bump` subcommand.
 *
 * The releaser owns bumping, so the bump has to run from the same binary that is
 * running the release — not from a globally-resolved `sg`, which may be a
 * different version, and not from `npx`, which would reach the network mid-release.
 * `process.execPath` and `process.argv[1]` are the node binary and the script that
 * node was handed, which is exactly this program.
 *
 * The config path is forwarded when one was given, so `sg release -c other.yaml`
 * bumps from `other.yaml` too. No default filename is named here — that default
 * belongs to ConfigReader and appears in exactly one place in the repository.
 */
function Quote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

function BumpCommand(
  configPath: Option<string>,
  execPath: string = process.execPath,
  scriptPath: string = process.argv[1],
): string {
  const parts = [Quote(execPath), Quote(scriptPath), "bump"];
  if (configPath.isSome()) parts.push("-c", Quote(configPath.unwrap()));
  return parts.join(" ");
}

export { BumpCommand, Quote };
