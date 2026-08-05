import {
  any,
  array,
  defaulted,
  Infer,
  integer,
  literal,
  object,
  optional,
  record,
  refine,
  string,
  StructError,
  union,
  validate,
} from "superstruct";
import { Err, Ok, Result } from "@hqoss/monads";
import chalk from "chalk";
import {
  BumpTypeName,
  BumpTypeNameSchema,
  RequiresExplicitFile,
} from "./bump/bump-types";

const ConventionFileSchema = object({
  path: defaulted(string(), "COMMIT_CONVENTION.MD"),
  template: defaulted(string(), "var___convention_docs___"),
});

type ConventionFile = Infer<typeof ConventionFileSchema>;

const envCheck = (key: string, def: string) => {
  const ev = process.env[key];
  if (ev) return ev;
  return def;
};

const CommitterSchema = object({
  model: defaulted(string(), envCheck("SG_COMMITTER_MODEL", "gpt-4o-mini")),
  provider: defaulted(string(), envCheck("SG_COMMITTER_PROVIDER", "openai")),
  variations: defaulted(integer(), 3),
  maxDiff: defaulted(integer(), 1000),
});

type CommitterConfig = Infer<typeof CommitterSchema>;

const PluginSchema = object({
  module: string(),
  version: optional(string()),
  config: optional(any()),
});

type Plugin = Infer<typeof PluginSchema>;

const VaeSchema = object({
  verb: string(),
  application: string(),
  example: string(),
});

type Vae = Infer<typeof VaeSchema>;

const ReleaseTypeSchema = union([
  literal(false),
  literal("major"),
  literal("minor"),
  literal("patch"),
]);

type Release = Infer<typeof ReleaseTypeSchema>;

const TypeSchema = object({
  type: string(),
  section: optional(string()),
  scopes: record(
    string(),
    object({
      desc: string(),
      release: ReleaseTypeSchema,
    }),
  ),
  // Docs stuff
  desc: optional(string()),
  vae: optional(VaeSchema),
});

type Type = Infer<typeof TypeSchema>;

const SpecialScopeSchema = record(
  string(),
  object({
    desc: string(),
    release: ReleaseTypeSchema,
  }),
);

type SpecialScope = Infer<typeof SpecialScopeSchema>;

/**
 * A bump entry names a runtime. Most types carry a built-in default path, so the
 * name is all the entry needs.
 *
 * Two rules are enforced here rather than left to review:
 *
 *  * `file` overrides the default path, and an override MUST carry a non-empty
 *    `reason`. If a preset's default is wrong for a repository, the configuration
 *    has to say why out loud, where the next reader will see it.
 *
 *  * A type with NO built-in default MUST name a `file`. `dotnet-version` is such
 *    a type: measured across four authoritative dotnet trees, the version lives in
 *    `App/App.csproj`, in `Version.props`, and twice nowhere at all, so no default
 *    could be right. Requiring the path here turns what would have been a
 *    plausible-looking write to the wrong file into a configuration error.
 */
const BumpSchema = refine(
  object({
    type: BumpTypeNameSchema,
    file: optional(string()),
    reason: optional(string()),
  }),
  "bump",
  (b) => {
    if (b.file === undefined) {
      if (RequiresExplicitFile(b.type))
        return (
          `is a \`${b.type}\` entry, which has no built-in default path and so ` +
          "must name a `file` (with a `reason`). Measured across the " +
          "authoritative dotnet trees, the version field lives in a different " +
          "file in each one, so any default this preset shipped would be wrong " +
          "somewhere and would write to the wrong file rather than complain"
        );
      return b.reason === undefined || b.reason.trim().length > 0
        ? true
        : "has an empty `reason`. Drop it, or state a real one";
    }
    if (b.reason === undefined || b.reason.trim().length === 0)
      return (
        `names \`file: ${b.file}\` but states no \`reason\`. A file is allowed ` +
        "only with a stated reason, so that pointing a bump at a path can never " +
        "be silent"
      );
    return true;
  },
);

type Bump = Infer<typeof BumpSchema>;

const ReleaseConfigurationSchema = object({
  gitlint: defaulted(string(), ".gitlint"),
  committer: defaulted(CommitterSchema, {}),
  conventionMarkdown: defaulted(ConventionFileSchema, {}),
  keywords: defaulted(array(string()), ["BREAKING"]),
  branches: array(string()),
  plugins: optional(array(PluginSchema)),
  types: array(TypeSchema),
  specialScopes: optional(SpecialScopeSchema),
  bumps: optional(array(BumpSchema)),
});

type ReleaseConfigurationValidated = Infer<typeof ReleaseConfigurationSchema>;

interface ReleaseConfiguration {
  gitlint: string;
  committer: CommitterConfig;
  conventionMarkdown: ConventionFile;
  keywords: string[];
  branches: string[];
  plugins?: Plugin[];
  specialScopes?: { [s: string]: { desc: string; release: Release } };
  bumps?: Bump[];
  types: {
    type: string;
    section?: string;
    scopes: { [s: string]: { desc: string; release: Release } };
    // Docs stuff
    desc?: string;
    vae?: Vae;
  }[];
}

function ReleaseConfigurationValid(
  i: unknown,
): Result<ReleaseConfiguration, string[]> {
  const [err, config] = validate(i, ReleaseConfigurationSchema, {
    coerce: true,
  });

  if (err instanceof StructError) {
    return Err(
      err
        .failures()
        .map((f) => `${chalk.cyan(f.path.join("."))}: ${f.message}`),
    );
  }

  return Ok(config as ReleaseConfiguration);
}

export {
  ReleaseConfigurationValid,
  SpecialScope,
  CommitterConfig,
  ReleaseConfiguration,
  ConventionFile,
  ReleaseConfigurationValidated,
  Type,
  Release,
  Vae,
  Plugin,
  Bump,
  BumpTypeName,
  BumpSchema,
  BumpTypeNameSchema,
};
