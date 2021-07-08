interface ButtonConfig {
    text: string
    to: string
}

interface GitHubConfig {
    org: string
    project: string
}

interface Link {
    name: string
    url: string
}

interface Feature {
    title: string
    desc: string
    svg: string
}

interface Tab {
    name: string,
    folder: string,
    id?: string
}

type HeadNode = { [s: string]: string, tagName: string }

interface InputConfig {
    title: string
    organization: string
    description: string
    button: string
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

export {MetaConfig, InputConfig, Feature, HeadNode};
