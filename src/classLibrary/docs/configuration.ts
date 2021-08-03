import {array, boolean, Describe, object, optional, string, StructError, validate} from "superstruct";
import chalk from "chalk";
import {Err, Ok, Result} from "@hqoss/monads";

interface ButtonConfig {
    text: string
    to: string
}

const ButtonConfigSchema: Describe<ButtonConfig> = object({
    text: string(),
    to: string(),
});

interface GitHubConfig {
    org: string
    project: string
}

const GitHubConfigSchema: Describe<GitHubConfig> = object({
    org: string(),
    project: string(),
});

interface Link {
    name: string
    url: string
}

const LinkSchema: Describe<Link> = object({
    name: string(),
    url: string(),
});

interface Feature {
    title: string
    desc: string
    svg: string
}

const FeatureSchema: Describe<Feature> = object({
    title: string(),
    desc: string(),
    svg: string(),
});

interface Tab {
    name: string,
    folder: string,
    id?: string
}

const TabSchema: Describe<Tab> = object({
    name: string(),
    folder: string(),
    id: optional(string()),
});

type HeadNode = { [s: string]: string, tagName: string }

interface InputConfig {
    title: string
    organization: string
    description: string
    github: GitHubConfig
    logo: string
    color: string
    url: string
    historyDir: string
    staticDir: string
    landing: {
        enable: boolean,
        button?: ButtonConfig
        features?: Feature[]
    }
    navbar: {
        logoUrl?: string
        prelinks?: Link[]
        tabs: Tab[]
        postlinks?: Link[]
    }
}

const InputConfigSchema: Describe<InputConfig> = object({
    title: string(),
    organization: string(),
    description: string(),
    github: GitHubConfigSchema,
    logo: string(),
    color: string(),
    url: string(),
    historyDir: string(),
    staticDir: string(),
    landing: object({
        enable: boolean(),
        button: optional(ButtonConfigSchema),
        features: optional(array(FeatureSchema))
    }),
    navbar: object({
        logoUrl: optional(string()),
        prelinks: optional(array(LinkSchema)),
        tabs: array(TabSchema),
        postlinks: optional(array(LinkSchema)),
    })
});

function InputConfigValid(i: unknown): Result<InputConfig, string[]> {
    const [err, config] = validate(i, InputConfigSchema);
    if (err instanceof StructError) {
        return Err(err.failures().map(f => `${chalk.cyan(f.path.join("."))}: ${f.message}`));
    }
    return Ok(config as InputConfig);

}

interface MetaConfig {
    title: string
    organization: string
    description: string
    github: GitHubConfig
    logo: string
    favicon: string
    landing: {
        enable: boolean
        button?: ButtonConfig
    }
    url: string
    pwaHead: HeadNode[]
    navbar: {
        logoUrl?: string
        preLinks: Link[]
        tabs: Tab[]
        postLinks: Link[]
    }
}

export {MetaConfig, InputConfig, Feature, HeadNode, InputConfigValid};
