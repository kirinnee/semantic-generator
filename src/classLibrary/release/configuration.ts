import {
    any,
    array,
    defaulted,
    Infer,
    literal,
    object,
    optional,
    record,
    string,
    StructError,
    union,
    validate
} from "superstruct";
import {Err, Ok, Result} from "@hqoss/monads";
import chalk from "chalk";

const ConventionFileSchema = object({
    path: defaulted(string(), "COMMIT_CONVENTION.MD"),
    template: defaulted(string(), "var___convention_docs___"),
});

type ConventionFile = Infer<typeof ConventionFileSchema>

const PluginSchema = object({
    module: string(),
    config: optional(any())
});

type Plugin = Infer<typeof PluginSchema>

const VaeSchema = object({
    verb: string(),
    application: string(),
    example: string(),
});

type Vae = Infer<typeof VaeSchema>

const ReleaseTypeSchema = union([
    literal(false),
    literal("major"),
    literal("minor"),
    literal("patch"),
]);

type Release = Infer<typeof ReleaseTypeSchema>

const TypeSchema = object({
    type: string(),
    section: optional(string()),
    scopes: record(string(), ReleaseTypeSchema),
    // Docs stuff
    desc: optional(string()),
    vae: optional(VaeSchema),
});

type Type = Infer<typeof TypeSchema>

const SpecialScopeSchema = record(string(), object({
    desc: string(),
    release: ReleaseTypeSchema,
}));

type SpecialScope = Infer<typeof SpecialScopeSchema>

const ReleaseConfigurationSchema = object({
    gitlint: defaulted(string(), ".gitlint"),
    conventionMarkdown: defaulted(ConventionFileSchema, {}),
    keywords: defaulted(array(string()), ["BREAKING"]),
    branches: array(string()),
    plugins: optional(array(PluginSchema)),
    types: array(TypeSchema),
    specialScopes: optional(SpecialScopeSchema),
});

type ReleaseConfigurationValidated = Infer<typeof ReleaseConfigurationSchema>

interface ReleaseConfiguration {
    gitlint: string
    conventionMarkdown: ConventionFile
    keywords: string[]
    branches: string[]
    plugins?: Plugin[]
    specialScopes?: { [s: string]: { desc: string, release: Release } }
    types: {
        type: string,
        section?: string,
        scopes: { [s: string]: Release },
        // Docs stuff
        desc?: string,
        vae?: Vae,
    }[]
}

function ReleaseConfigurationValid(i: unknown): Result<ReleaseConfiguration, string[]> {

    const [err, config] = validate(i, ReleaseConfigurationSchema, {coerce: true});

    if (err instanceof StructError) {
        return Err(err.failures().map(f => `${chalk.cyan(f.path.join("."))}: ${f.message}`));
    }

    return Ok(config as ReleaseConfiguration);
}

export {
    ReleaseConfigurationValid,
    SpecialScope,
    ReleaseConfiguration,
    ConventionFile,
    ReleaseConfigurationValidated,
    Type,
    Release,
    Vae,
    Plugin,
};
