import {Content, ContentToBuffer, ContentToString} from "../../src/classLibrary/engine/vfs";
import {ReadFile} from "../../src/classLibrary/engine/basicFileFactory";

describe("ContentToString", () => {
    it("should convert string to string without problems", async function () {
        const r = await ReadFile("./test_ground/hello.txt").promise;
        expect(r.isOk()).toBe(true);
        const content = r.unwrap();
        const act = ContentToString(content);
        expect(act.isOk()).toBe(true);
        expect(act.unwrap()).toBe("hello\n");
    });

    it("should convert buffer to string if its valid", function () {
        const subj = Content.Binary(Buffer.from("hello", "utf8"));
        const act = ContentToString(subj);
        expect(act.isOk()).toBe(true);
        expect(act.unwrap()).toBe("hello");
    });

    it("raise error if a binary content is attempted to be converted to string", async function () {
        const r = await ReadFile("./test_ground/resume.pdf").promise;
        expect(r.isOk()).toBe(true);
        const subj = r.unwrap();
        const act = ContentToString(subj);
        expect(act.isOk()).toBe(false);
    });
});

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
