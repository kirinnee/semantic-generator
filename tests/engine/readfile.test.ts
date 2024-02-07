import {ReadBinary, ReadFile} from "../../src/classLibrary/engine/basicFileFactory";
import {Content} from "../../src/classLibrary/engine/vfs";

describe("Read File", () => {
    it("should fail when file does not exist", async function () {
        const r = await ReadFile("test_ground/sample/noexist.txt").promise;
        expect(r.isErr()).toBe(true);
    });
    it("should return binary if file is a binary", async function () {
        const r = await ReadFile("test_ground/sample/b/logo.png").promise;
        expect(r.isOk()).toBe(true);
        const act = r.unwrap();
        const isBinary = Content.if.Binary(act, () => true, () => false);
        expect(isBinary).toBe(true);
    });
    it("should return string content if file is string", async function () {
        const r = await ReadFile("test_ground/sample/b/er.txt").promise;
        expect(r.isOk()).toBe(true);
        const act = r.unwrap();
        const ex = Content.String("two\n");
        expect(act).toStrictEqual(ex);

    });
});

describe("Read Binary", ()=> {
    it("should read binary if it exist",async function () {
        const r = await ReadBinary("test_ground/sample/b/logo.png").promise;
        expect(r.isOk()).toBe(true);
    });

    it("should fail when binary does not exist",async function () {
        const r = await ReadBinary("test_ground/Wsample/noexist.txt").promise;
        expect(r.isErr()).toBe(true);
    });
});
