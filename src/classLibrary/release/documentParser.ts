import {ReleaseConfiguration, Vae} from "./configuration";
import {Core} from "@kirinnee/core";
import {MarkdownTable} from "../../markdown-table";
import {Ok, Result} from "@hqoss/monads";
import {ResultAll, ResultTupleAll, Wrap, WrapAsError} from "../util";
import conventionalCommitsParser from "conventional-commits-parser";
import {ToMap} from "./toMap";
import {Resolver} from "../engine/resolver";
import {Content} from "../engine/vfs";

class CommitConventionDocumentParser {

    private readonly mdt: MarkdownTable;
    private readonly varResolver: Resolver;

    constructor(varResolver: Resolver, mdt: MarkdownTable, core: Core) {
        this.mdt = mdt;
        this.varResolver = varResolver;
        core.AssertExtend();
    }

    generateToc(rc: ReleaseConfiguration): string {
        const table = this.mdt.Render(
            [
                ["Type", "Description"],
                ...rc.types.Map(x => [`[${x.type}](#${x.type})`, `${x.desc}`]),
            ]
        ).unwrap();
        return `# Types\n\n${table}\n`;
    }

    generateVaeDocs(rc: ReleaseConfiguration, t: string): Result<string, string> {
        return WrapAsError(`cannot find type entry: ${t}`, rc.types.Find(x => x.type == t))
            .andThen(x => Wrap(x.vae).match({
                none: () => Ok(""),
                some: (s: Vae) => {

                    const {type, scope, subject} = conventionalCommitsParser.sync(s.example);

                    const a = s.application
                        .ReplaceAll("<title>", `**${subject}**`)
                        .ReplaceAll("<scope>", `\`${scope}\``)
                        .ReplaceAll("<type>", `_${type}_`);

                    return this.mdt.Render([
                        ["**V.A.E**", "V.A.E values"],
                        ["verb", s.verb],
                        ["application", `when this commit is applied, it will _${s.verb}_ \`${s.application}\``],
                        ["example", s.example],
                        ["example applied", `when this commit is applied, it will _${s.verb}_ ${a}`]
                    ]);
                }

            }));
    }

    generateScopeDocs(rc: ReleaseConfiguration, t: string): Result<string, string> {
        return WrapAsError(`cannot find type entry: ${t}`, rc.types.Find(x => x.type == t))
            .andThen(x => this.mdt.Render(
                [
                    ["Scope", "Description", "Bump"],
                    ...ToMap(x.scopes).Map((k, v) => {
                        const scope = k === "default" ? k : `\`${k}\``;
                        const bump = v.release === false ? "`nil`" : `\`${v.release}\``;
                        return [scope, v.desc, bump] as [string, string, string];
                    })
                ]
            ));
    }

    generateSpecialScopes(rc: ReleaseConfiguration): string {
        return Wrap(rc.specialScopes).match({
            none: () => "no special scopes",
            some: (s) =>
                this.mdt.Render([
                    ["Scope", "Description", "Bump"]
                    ,
                    ...ToMap(s).Map((k, v) => [
                        `\`${k}\``,
                        v.desc,
                        `\`${v.release || "nil"}\``,
                    ] as [string, string, string])
                ]).unwrap()
        });
    }

    generateType(rc: ReleaseConfiguration, t: string): Result<string, string[]> {
        return ResultTupleAll(
            WrapAsError(`cannot find type entry: ${t}`, rc.types.Find(x => x.type == t)),
            this.generateVaeDocs(rc, t),
            this.generateScopeDocs(rc, t),
        ).map(([type, vae, scope]) => [type, vae === "" ? "" : "\n\n" + vae, "\n\n" + scope] as [typeof type, string, string])
            .map(([type, vae, scope]) =>
                `## ${type.type}

${type.desc}${vae}${scope}`);
    }

    preamble(): string {
        return `This project uses [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/) loosely as the specification
for our commits.

Commit message will be in the format:

\`\`\`
type(scope): title

body
\`\`\`

This page will document the types and scopes used.`;
    }

    generateFullDocs(rc: ReleaseConfiguration): string {

        const types = ResultAll(rc.types.Map(x => this.generateType(rc, x.type)))
            .unwrap().join("\n\n");

        return `${this.preamble()}

${this.generateToc(rc)}
${types}

# Special Scopes

${this.generateSpecialScopes(rc)}`;
    }

    GenerateDocument(rc: ReleaseConfiguration): string {
        const content = this.varResolver.ResolveContent(
            {
                variables: {
                    convention_docs: this.generateFullDocs(rc),
                },
                flags: {},
            },
            [
                {
                    content: Content.String(rc.conventionMarkdown.template),
                    meta: {
                        from: "",
                        original: "",
                    },
                }
            ]
        )[0].content;
        return Wrap(Content.if.String(content, (s) => s)).unwrapOr("");
    }
}

export {CommitConventionDocumentParser};
