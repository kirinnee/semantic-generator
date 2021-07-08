import {of, Union} from "ts-union";


interface FileMetadata {
    original: string
    from: string
}

const Content = Union({
    String: of<string>(),
    Binary: of<Buffer>(),
});

type Content = typeof Content.T;

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


export {VFile, FileMetadata, Content, ContentToBuffer};
