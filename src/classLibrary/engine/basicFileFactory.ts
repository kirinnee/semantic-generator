import {Content, FileMetadata, VFile} from "./vfs";
import FastGlob from "fast-glob";
import * as path from "path";
import {Core} from "@kirinnee/core";
import * as fs from "graceful-fs";
import {isText} from "istextorbinary";
import {Err, Ok, Result} from "@hqoss/monads";
import {PromiseResultAll} from "../util";
import {PromiseResult} from "../resultUtil";

function ReadBinary(path: string): PromiseResult<Buffer, string> {
    return new PromiseResult<Buffer, string>(new Promise<Result<Buffer, string>>(r => {
        fs.readFile(path, function (err, data) {
            if (err) {
                r(Err(err.message));
                return;
            }
            r(Ok(data));
        });
    }));
}

function ReadFile(path: string): PromiseResult<Content, string> {
    return new PromiseResult<Content, string>(new Promise<Result<Content, string>>(r => {
        fs.readFile(path, function (err, data) {
            if (err) {
                r(Err(err.message));
                return;
            }
            if (isText(null, data)) {
                const stringContent = Content.String(data.toString("utf8"));
                r(Ok(stringContent));
                return;
            } else {
                const content = Content.Binary(data);
                r(Ok(content));
            }
        });
    }));
}


interface IFileFactory {
    Scan(glob: string): FileMetadata[];

    ReadSingle(path: string): PromiseResult<VFile, string>;

    Read(f: FileMetadata[]): PromiseResult<VFile[], string[]>;

    Sub(path: string): IFileFactory;
}

class BasicFileFactory implements IFileFactory {

    private readonly core: Core;
    private readonly targetDir: string;

    constructor(targetDir: string, core: Core) {
        core.AssertExtend();
        this.core = core;
        this.targetDir = targetDir;
    }

    Sub(p: string): IFileFactory {
        return new BasicFileFactory(path.join(this.targetDir, p), this.core);
    }

    ReadSingle(p: string): PromiseResult<VFile, string> {
        const targetDir = this.targetDir;
        const readPath = path.resolve(targetDir, p);
        return ReadFile(readPath)
            .map(c => {
                return {
                    meta: {
                        original: p,
                        from: readPath,
                    },
                    content: c
                };
            });
    }


    Read(files: FileMetadata[]): PromiseResult<VFile[], string[]> {

        return PromiseResultAll(
            files.Map(meta =>
                ReadFile(meta.from)
                    .map(content => {
                        return {
                            content,
                            meta,
                        };
                    })
            )
        );
    }

    Scan(g: string): FileMetadata[] {
        const targetDir = this.targetDir;
        const files = FastGlob.sync(g, {dot: true, cwd: targetDir});

        return files.Map(x => {
            return {
                from: path.resolve(targetDir, x),
                original: x,
            };
        });
    }


}


export {IFileFactory, BasicFileFactory, ReadFile, ReadBinary};
