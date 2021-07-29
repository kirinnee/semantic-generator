import {of, Union} from "ts-union";
import {Err, Ok, Result} from "@hqoss/monads";
import {isText} from "istextorbinary";


interface FileMetadata {
    original: string
    from: string
}

const Content = Union({
    String: of<string>(),
    Binary: of<Buffer>(),
});

type Content = typeof Content.T;

function ContentToString(c: Content): Result<string, string> {
    return Content.match(c, {
        String: (s: string) => Ok(s),
        Binary: (b: Buffer) => isText(null, b) ? Ok(b.toString("utf8")) : Err("Expect string but got binary"),
    });
}

function ContentToBuffer(c: Content): Buffer {
    return Content.match(c, {
        String: (s: string) => Buffer.from(s, "utf8"),
        Binary: (b: Buffer) => b,
    });
}

interface VFile {
    meta: FileMetadata;
    content: Content;
}


export {VFile, FileMetadata, Content, ContentToBuffer, ContentToString};
