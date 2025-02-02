#!/usr/bin/env node

import { Core, Kore } from "@kirinnee/core";
import { program } from "commander";
import * as process from "process";
import { ReleaseController } from "./controllers/release-controller";
import { GitlintController } from "./controllers/gitlint-controller";
import { CommitterController } from "./controllers/committer-controller";

const core: Core = new Kore();
core.ExtendPrimitives();

program.on("command:*", function () {
  console.error(
    "Invalid command: %s\nSee --help for a list of available commands.",
    program.args.join(" "),
  );
  process.exit(1);
});

program
  .name("Semantic Generator")
  .version("var___INJECT_VERSION___")
  .description(
    "Semantic Release configuration generator for conventional commits",
  );

// const docs = program.command("docs");
// DocController(core, docs);

const release = program.command("release");
ReleaseController(core, release);

const gitlint = program.command("gitlint");
GitlintController(core, gitlint);

const committer = program.command("committer");
CommitterController(core, committer);

program.parse(process.argv);
