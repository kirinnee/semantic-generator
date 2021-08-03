import {PromiseResult} from "../resultUtil";
import {ReleaseConfiguration} from "./configuration";
import {IFileFactory} from "../engine/basicFileFactory";
import {Content, ContentToString, VFile} from "../engine/vfs";
import {IWritable, Writer} from "../engine/writer";
import {WrapAsError} from "../util";
import {Core, SortType} from "@kirinnee/core";
import {Err, Ok, Result} from "@hqoss/monads";

interface GitLintFile {
    content: string
    keyLine: string;
    keyLineIndex: number;
}

class GitlintChecker {

    private readonly fileFact: IFileFactory;
    private readonly writer: Writer;
    private readonly core: Core;

    gitlintFile(rc: ReleaseConfiguration): PromiseResult<GitLintFile, string> {
        return this.fileFact.ReadSingle(rc.gitlint)
            .andThen(x => ContentToString(x.content))
            .andThen(x =>
                WrapAsError("cannot find [contrib-title-conventional-commits]", x.LineBreak().FindIndex(x => x === "[contrib-title-conventional-commits]"))
                    .andThen(index => WrapAsError("no line after [contrib-title-conventional-commits]", [x.LineBreak()[index + 1], index] as [string, number]))
                    .map(([keyLine, keyLineIndex]) => {
                        return {
                            keyLine,
                            keyLineIndex,
                            content: x,
                        };
                    })
            );
    }


    Check(rc: ReleaseConfiguration): PromiseResult<string, string> {
        const rcTypes = rc.types.Map(x => x.type).Sort(SortType.AtoZ);
        return this.gitlintFile(rc)
            .map(gitlintFile => {
                console.log(gitlintFile);
                return gitlintFile.keyLine.Remove("types = ").split(",").TrimAll().Sort(SortType.AtoZ);
            })
            .andThenAsync(async (types): Promise<Result<string, string>> => {
                console.log("rcTypes: ", rcTypes);
                console.log("types: ", types);
                if (this.core.DeepEqual(rcTypes, types)) return Ok(".gitlint properly configured");
                return this.write(rc).andThen((): Result<string, string> => Err(`gitlint does not match: ${rcTypes}`)).promise;
            });
    }

    generateGitLintFile(rc: ReleaseConfiguration): PromiseResult<IWritable, string> {
        const rcTypes = rc.types.Map(x => x.type).Sort(SortType.AtoZ);
        return this.gitlintFile(rc)
            .map(gitlint => gitlint.content.ReplaceAll(gitlint.keyLine, `types = ${rcTypes.join(",")}`, false))
            .map((content): VFile => {
                return {
                    meta: {
                        original: rc.gitlint,
                        from: "",
                    },
                    content: Content.String(content),
                };
            })
            .map(x => IWritable.File(x));
    }

    write(rc: ReleaseConfiguration): PromiseResult<string, string> {
        return this.generateGitLintFile(rc)
            .andThenAsync(async x => {
                const r = await this.writer.Write(x);
                return r.match({
                    none: (): Result<string, string> => Ok("successfully updated gitlint configuration"),
                    some: (s) => Err(s)
                });
            });
    }



    constructor(fileFact: IFileFactory, writer: Writer, core: Core) {
        this.fileFact = fileFact;
        this.writer = writer;
        this.core = core;
    }
}

export {GitlintChecker};
