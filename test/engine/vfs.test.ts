import {Content, ContentToBuffer} from "../../src/classLibrary/engine/vfs";

describe("ContentToBuffer", () => {

    it("should convert buffer to buffer", function () {
        const subj = Content.Binary(Buffer.from("hello world", "utf8"));
        const ex = Buffer.from("hello world", "utf8");
        const act = ContentToBuffer(subj);
        expect(act).toStrictEqual(ex);
    });

    it("should convert string to buffer", function () {
        const subj = Content.String("hello world");
        const ex = Buffer.from("hello world", "utf8");
        const act = ContentToBuffer(subj);
        expect(act).toStrictEqual(ex);
    });

});
