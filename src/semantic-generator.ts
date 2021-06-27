import { Core, Kore } from "@kirinnee/core";
import { program } from "commander";

const core: Core = new Kore();
core.ExtendPrimitives();

declare global {
  const VERSION: string;
}

program.on("command:*", function () {
    console.error(
        "Invalid command: %s\nSee --help for a list of available commands.",
        program.args.join(" ")
    );
    process.exit(1);
});

program
    .name("Semantic Generator")
    .version(VERSION)
    .description(
        "Semantic Release configuration generator for conventional commits"
    );

program.parse(process.argv);
