import {BasicWriter, IWritable, Writer} from "../../src/classLibrary/engine/writer";
import * as fs from "fs";
import rimraf from "rimraf";
import {Content, VFile} from "../../src/classLibrary/engine/vfs";
import {ReadBinary} from "../../src/classLibrary/engine/basicFileFactory";
import {FaviconFile, FaviconImage} from "favicons";
import {Kore} from "@kirinnee/core";
import mkdirp = require("mkdirp");


const core = new Kore();
core.ExtendPrimitives();

beforeAll(() => {
    rimraf.sync("test_ground/write_test");
    fs.mkdirSync("test_ground/write_test");
    fs.writeFileSync("test_ground/write_test/.gitkeep", Buffer.from("", "utf8"));
});

afterAll(() => {
    rimraf.sync("test_ground/write_test");
    fs.mkdirSync("test_ground/write_test");
    fs.writeFileSync("test_ground/write_test/.gitkeep", Buffer.from("", "utf8"));
});

describe("BasicWriter", function () {

    const writer: Writer = new BasicWriter(core, "test_ground/write_test");

    describe("BatchWrite", function () {
        it("should write File objects", async function () {
            const subj1: VFile = {
                content: Content.String("sample1"),
                meta: {
                    from: "",
                    original: "sample1.txt"
                }
            };

            const subj2: VFile = {
                content: Content.String("sample2"),
                meta: {
                    from: "",
                    original: "sample2.txt"
                }
            };

            const result = await writer.BatchWrite([IWritable.File(subj1), IWritable.File(subj2)]);
            expect(result.isNone()).toBe(true);
            {
                // sample1 assert
                const r = await ReadBinary("test_ground/write_test/sample1.txt").promise;
                expect(r.isOk()).toBe(true);
                const act = r.unwrap().toString("utf8");
                expect(act).toBe("sample1");
            }
            {
                // sample2 assert
                const r = await ReadBinary("test_ground/write_test/sample2.txt").promise;
                expect(r.isOk()).toBe(true);
                const act = r.unwrap().toString("utf8");
                expect(act).toBe("sample2");
            }

        });

        it("should write FaviconImages", async function () {
            const subj1: FaviconImage = {
                name: "sample4/sample3.txt",
                contents: Buffer.from("this is sample 3", "utf8"),
            };

            const subj2: FaviconImage = {
                name: "sample/a/b/c/d/sample4.txt",
                contents: Buffer.from("this is sample 4", "utf8"),
            };

            const result = await writer.BatchWrite([IWritable.FaviconImage(subj1), IWritable.FaviconImage(subj2)]);
            expect(result.isNone()).toBe(true);
            {
                // sample1 assert
                const r = await ReadBinary("test_ground/write_test/sample4/sample3.txt").promise;
                expect(r.isOk()).toBe(true);
                const act = r.unwrap().toString("utf8");
                expect(act).toBe("this is sample 3");
            }
            {
                // sample2 assert
                const r = await ReadBinary("test_ground/write_test/sample/a/b/c/d/sample4.txt").promise;
                expect(r.isOk()).toBe(true);
                const act = r.unwrap().toString("utf8");
                expect(act).toBe("this is sample 4");
            }
        });

        it("should write FaviconFiles", async function () {
            const subj1: FaviconFile = {

                name: "path/next/sample10.txt",
                contents: "this is sample 10",
            };

            const subj2: FaviconFile = {

                name: "path/next/more/nest/sample11.txt",
                contents: "this is sample 11",
            };

            const result = await writer.BatchWrite([IWritable.FaviconFile(subj1), IWritable.FaviconFile(subj2)]);
            expect(result.isNone()).toBe(true);
            {
                // sample1 assert
                const r = await ReadBinary("test_ground/write_test/path/next/sample10.txt").promise;
                expect(r.isOk()).toBe(true);
                const act = r.unwrap().toString("utf8");
                expect(act).toBe("this is sample 10");
            }
            {
                // sample2 assert
                const r = await ReadBinary("test_ground/write_test/path/next/more/nest/sample11.txt").promise;
                expect(r.isOk()).toBe(true);
                const act = r.unwrap().toString("utf8");
                expect(act).toBe("this is sample 11");
            }
        });

        it("should fail if file is already a directory", async function () {
            await mkdirp("test_ground/write_test/tmp");
            const writable = IWritable.FaviconFile({name: "tmp", contents: "hello"});
            const r = await writer.Write(writable);
            expect(r.isSome()).toBe(true);
        });
    });

    describe("Path", function () {
        it("should return Path", function () {
            expect(writer.Path).toBe("test_ground/write_test");
        });
    });

    describe("Sub", function () {
        it("should return a sub writer", function () {
            const ex = new BasicWriter(core,"test_ground/write_test/a/b");
            const subj = new BasicWriter(core,"test_ground/write_test");
            const act = subj.Sub("a/b");
            expect(act).toStrictEqual(ex);
        });
    });



});
