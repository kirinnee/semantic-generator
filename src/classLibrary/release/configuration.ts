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
  string,
  StructError,
  union,
  validate,
} from "superstruct";
import { Err, Ok, Result } from "@hqoss/monads";
import chalk from "chalk";

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

const ReleaseConfigurationSchema = object({
  gitlint: defaulted(string(), ".gitlint"),
  committer: defaulted(CommitterSchema, {}),
  conventionMarkdown: defaulted(ConventionFileSchema, {}),
  keywords: defaulted(array(string()), ["BREAKING"]),
  branches: array(string()),
  plugins: optional(array(PluginSchema)),
  types: array(TypeSchema),
  specialScopes: optional(SpecialScopeSchema),
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
  ReleaseConfigurationSchema,
  SpecialScope,
  CommitterConfig,
  ReleaseConfiguration,
  ConventionFile,
  ReleaseConfigurationValidated,
  Type,
  Release,
  Vae,
  Plugin,
};
