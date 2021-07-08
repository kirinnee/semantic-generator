import {None, Option, Some} from "@hqoss/monads";
import {ContentToBuffer, VFile} from "./vfs";
import {of, Union} from "ts-union";
import favicons, {FaviconFile, FaviconImage} from "favicons";
import * as fs from "graceful-fs";
import * as path from "path";
import mkdirp from "mkdirp";
import {OptionAllNone} from "../util";
import {Core} from "@kirinnee/core";


const IWritable = Union({
    File: of<VFile>(),
    FaviconImage: of<FaviconImage>(),
    FaviconFile: of<FaviconFile>(),
});

type IWritable = typeof IWritable.T;

interface Writer {
    Path: string

    Sub(p: string): Writer;

    Write(target: IWritable): Promise<Option<string>>

    BatchWrite(targets: IWritable[]): Promise<Option<string[]>>
}

class BasicWriter implements Writer {

    private readonly target: string;
    private readonly core: Core;

    constructor(core: Core, target: string) {
        core.AssertExtend();
        this.core = core;
        this.target = target;
    }

    Sub(p: string): Writer {
        return new BasicWriter(this.core, path.join(this.target, p));
    }

    async BatchWrite(targets: IWritable[]): Promise<Option<string[]>> {
        const allWrites = await Promise.all(targets.Map(x => this.Write(x)));
        return OptionAllNone(allWrites);
    }

    async Write(target: IWritable): Promise<Option<string>> {
        const targetDir = this.target;
        const [filePath, buffer] = IWritable.match(target, {
            FaviconFile(p: favicons.FaviconFile): [string, Buffer] {
                return [path.resolve(targetDir, p.name), Buffer.from(p.contents, "utf8")];
            },
            FaviconImage(p: favicons.FaviconImage): [string, Buffer] {
                return [path.resolve(targetDir, p.name), p.contents];
            },
            File(p: VFile): [string, Buffer] {
                return [
                    path.resolve(targetDir, p.meta.original),
                    ContentToBuffer(p.content),
                ];
            }
        });

        const dir = path.dirname(filePath);
        try {
            await mkdirp(dir);
            fs.writeFileSync(filePath, buffer);
            return None;
        } catch (err) {
            return Some(err.toString());
        }
    }

    get Path(): string {
        return this.target;
    }
}


export {IWritable, BasicWriter, Writer};
