import {IFileFactory} from "../engine/basicFileFactory";
import {InputConfig} from "./configuration";
import {PromiseResult} from "../resultUtil";
import {IWritable, Writer} from "../engine/writer";
import {Err, Ok, Result} from "@hqoss/monads";

class Versioner {
    constructor(srcWriter: Writer) {
        this.srcWriter = srcWriter;
    }

    private readonly srcWriter: Writer;

    Copy(ff: IFileFactory, config: InputConfig): PromiseResult<string, string[]> {
        const files = [
            ...ff.Scan("versioned_*/**/*"),
            ...ff.Scan("versions.json"),
        ];
        return ff.Read(files)
            .map(x => x.Map(file => IWritable.File(file)))
            .andThenAsync(async x => {
                const r = await this.srcWriter.Sub(config.historyDir).BatchWrite(x);
                return r.match({
                    some: (s): Result<string, string[]> => Err(s),
                    none: (): Result<string, string[]> => Ok("version updated!"),
                });
            });
    }
}

export {Versioner};
