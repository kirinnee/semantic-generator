import {CommitConventionDocumentParser} from "./documentParser";
import {ReleaseParser} from "./releaseParser";
import {IWritable, Writer} from "../engine/writer";
import yaml from "yaml";
import {ReleaseConfiguration} from "./configuration";
import {Content, VFile} from "../engine/vfs";
import {Err, Result} from "@hqoss/monads";
import {Executor, Runtime} from "../executor/executor";
import {PromiseResult} from "../resultUtil";

class ReleaseExecutor {

    private readonly docParser: CommitConventionDocumentParser;
    private readonly releaseParser: ReleaseParser;
    private readonly writer: Writer;
    private readonly exectuor: Executor;
    private readonly target: string;

    async Release(config: ReleaseConfiguration): Promise<Result<Runtime, string[]>> {
        const docContent = this.docParser.GenerateDocument(config);
        const releaseRcContent = yaml.stringify(this.releaseParser.GenerateReleaseRc(config));
        const docs: VFile = {
            content: Content.String(docContent),
            meta: {
                from: "",
                original: config.conventionMarkdown.path,
            },
        };

        const releaseRc: VFile = {
            content: Content.String(releaseRcContent),
            meta: {
                from: "",
                original: ".releaserc.yaml",
            },
        };

        const r = await this.writer.BatchWrite([
            IWritable.File(docs),
            IWritable.File(releaseRc),
        ]);
        return await r.match({
            none: () => this.exectuor.Release(this.target, [
                "@semantic-release/commit-analyzer",
                "@semantic-release/release-notes-generator",
                ...(config.plugins?.Map(x => x.module) ?? [])
            ]),
            some: (s: string[]): PromiseResult<Runtime, string[]> => new PromiseResult(
                Promise.resolve<Result<Runtime,string[]>>(Err(s))
            ),
        }).promise;

    }

    constructor(docParser: CommitConventionDocumentParser, releaseParser: ReleaseParser, writer: Writer, exectuor: Executor, target: string) {
        this.docParser = docParser;
        this.releaseParser = releaseParser;
        this.writer = writer;
        this.exectuor = exectuor;
        this.target = target;
    }

}

export {ReleaseExecutor};
