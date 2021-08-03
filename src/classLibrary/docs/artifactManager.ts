import {IWritable, Writer} from "../engine/writer";
import {IFileFactory} from "../engine/basicFileFactory";
import {PromiseResult} from "../resultUtil";
import {Err, Ok, Result} from "@hqoss/monads";

class ArtifactManager {

    private readonly targetWriter: Writer;

    constructor(targetWriter: Writer) {
        this.targetWriter = targetWriter;
    }

    Copy(ff: IFileFactory): PromiseResult<string, string[]> {
        return ff.Read(ff.Scan("**/*"))
            .andThenAsync(async files => {
                const r = await this.targetWriter.BatchWrite(files.Map(x => IWritable.File(x)));
                return r.match({
                    some: (err: string[]): Result<string, string[]> => Err(err),
                    none: (): Result<string, string[]> => Ok("Build folder created"),
                });
            });
    }
}

export {ArtifactManager};
