import {ReleaseConfiguration} from "./configuration";
import {Core} from "@kirinnee/core";
import {MarkdownTable} from "../../markdown-table";

class CommitConventionDocumentParser {

    private readonly rc: ReleaseConfiguration;
    private readonly mdt: MarkdownTable

    constructor(rc: ReleaseConfiguration, mdt: MarkdownTable, core: Core) {
        this.rc = rc;
        this.mdt = mdt;
        core.AssertExtend();
    }

    generateToc(): string {
        const table = this.mdt.Render(
            this.rc.types.Map(x => [`[${x.type}](#${x.type})`, `${x.desc}`])
        );
        return `# Types\n\n${table}\n`;
    }

    generateVaeDocs(): string {
        return "";
    }

    generateScopeDocs(t: string): string {
        return "";
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
