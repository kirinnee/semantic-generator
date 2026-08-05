import { should } from "chai";
import { None, Some } from "@hqoss/monads";
import {
  BumpCommand,
  Quote,
} from "../../src/classLibrary/release/bump/self-command";

should();

/**
 * SUBJECT: the shell command string embedded in the generated .releaserc.yaml as
 * the exec plugin's prepareCmd. It is a SHELL command, so quoting is not
 * cosmetic — an unquoted path with a space in it silently becomes two arguments.
 */
describe("BumpCommand", () => {
  it("quotes both paths and names the bump subcommand", function () {
    BumpCommand(
      None,
      "/usr/bin/node",
      "/opt/sg/dist/semantic-generator.js",
    ).should.equal("'/usr/bin/node' '/opt/sg/dist/semantic-generator.js' bump");
  });

  it("survives a path containing spaces", function () {
    // SUBJECT: a script path with a space, which is normal under nix profiles and
    // macOS "Application Support" style paths.
    BumpCommand(
      None,
      "/usr/bin/node",
      "/home/a b/dist/semantic-generator.js",
    ).should.equal(
      "'/usr/bin/node' '/home/a b/dist/semantic-generator.js' bump",
    );
  });

  it("forwards the config path when one was given", function () {
    // So that `sg release -c other.yaml` bumps from other.yaml too.
    BumpCommand(
      Some("custom/release.yaml"),
      "/usr/bin/node",
      "/opt/sg/x.js",
    ).should.equal(
      "'/usr/bin/node' '/opt/sg/x.js' bump -c 'custom/release.yaml'",
    );
  });

  it("omits the config flag when none was given", function () {
    // The default config filename must NOT appear here — it lives in exactly one
    // place, ConfigReader, so the repository never names two config files.
    const cmd = BumpCommand(None, "/usr/bin/node", "/opt/sg/x.js");
    cmd.should.not.contain("-c");
    cmd.should.not.contain(".yaml'");
  });

  it("escapes an embedded single quote instead of breaking out of the string", function () {
    // SUBJECT: a path containing a single quote. Naive quoting would end the
    // quoted string early and let the rest of the path run as shell words.
    Quote("/tmp/it's here").should.equal(`'/tmp/it'\\''s here'`);
  });
});
