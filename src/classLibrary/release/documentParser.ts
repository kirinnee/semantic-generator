import {ReleaseConfiguration, Vae} from "./configuration";
import {Core} from "@kirinnee/core";
import {MarkdownTable} from "../../markdown-table";
import {Ok, Result} from "@hqoss/monads";
import {Wrap, WrapAsError} from "../util";
import conventionalCommitsParser from "conventional-commits-parser";
import {ToMap} from "./toMap";

class CommitConventionDocumentParser {

    private readonly rc: ReleaseConfiguration;
    private readonly mdt: MarkdownTable;

    constructor(rc: ReleaseConfiguration, mdt: MarkdownTable, core: Core) {
        this.rc = rc;
        this.mdt = mdt;
        core.AssertExtend();
    }

    generateToc(): string {
        const table = this.mdt.Render(
            [
                ["Type", "Description"],
                ...this.rc.types.Map(x => [`[${x.type}](#${x.type})`, `${x.desc}`]),
            ]
        ).unwrap();
        return `# Types\n\n${table}\n`;
    }

    generateVaeDocs(t: string): Result<string, string> {
        return WrapAsError(`cannot find type entry: ${t}`, this.rc.types.Find(x => x.type == t))
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

    generateScopeDocs(t: string): Result<string, string> {
        return WrapAsError(`cannot find type entry: ${t}`, this.rc.types.Find(x => x.type == t))
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

    generateSpecialScopes(): Result<string, string> {
        return Ok("");
    }

    generateType(): string {
        return "";
    }

    preamble(): string {
        return "";
    }

    generateFullDocs(): string {
        return "";
    }

    GenerateDocument(): string {
        return "";
    }
}

export {CommitConventionDocumentParser};
