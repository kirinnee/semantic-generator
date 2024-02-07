import {BasicFileFactory} from "../../src/classLibrary/engine/basicFileFactory";
import {Kore, SortType} from "@kirinnee/core";
import {Content, VFile, FileMetadata} from "../../src/classLibrary/engine/vfs";

const core = new Kore();
core.ExtendPrimitives();

const cwd = process.cwd();


describe("Basic File Factory", () => {

    const fs = new BasicFileFactory(`${cwd}/test_ground/sample`, core);

    describe("Sub", () => {
        it("should create sub factory that extends the current cwd", function () {
            const ext = new BasicFileFactory(`${cwd}/test_ground/sample/a/1`, core);
            const act = fs.Sub("a/1");
            expect(act).toStrictEqual(ext);
        });
    });

    describe("Read Single", () => {
        it("should read single file", async function () {
            const ex: VFile = {
                content: Content.String("two\n"),
                meta: {
                    original: "b/er.txt",
                    from: `${cwd}/test_ground/sample/b/er.txt`
                }
            };

            const act = await fs.ReadSingle("b/er.txt").promise;
            expect(act.isOk()).toBe(true);
            const file = act.unwrap();
            expect(file).toStrictEqual(ex);
        });

        it("should return error when file does not exist (or other errors)", async function () {
            const act = await fs.ReadSingle("b/nonexist.txt").promise;
            expect(act.isOk()).toBe(false);
        });
    });

    describe("Scan", () => {
        it("should glob relative and absolute path from CWD", () => {

            const ex: FileMetadata[] = [
                {
                    from: `${cwd}/test_ground/sample/b/er.txt`,
                    original: "b/er.txt"
                },
                {
                    from: `${cwd}/test_ground/sample/a/1/yi.txt`,
                    original: "a/1/yi.txt"
                },
                {
                    from: `${cwd}/test_ground/sample/b/san.txt`,
                    original: "b/san.txt"
                },
                {
                    from: `${cwd}/test_ground/sample/b/logo.png`,
                    original: "b/logo.png"
                }
            ].Sort(SortType.AtoZ, x => x.from);

            const actual = fs.Scan("**/*").Sort(SortType.AtoZ, x => x.from);

            expect(ex).toStrictEqual(actual);

        });
    });

    describe("Read", () => {
        it("should read filesMetaData into VFS", async () => {
            const ex: VFile[] = [
                {
                    content: Content.String("two\n"),
                    meta: {
                        from: `${cwd}/test_ground/sample/b/er.txt`,
                        original: "b/er.txt"
                    },
                },
                {
                    content: Content.String("one\n"),
                    meta:
                        {
                            from: `${cwd}/test_ground/sample/a/1/yi.txt`,
                            original: "a/1/yi.txt"
                        },
                },
                {
                    content: Content.String("three\n"),
                    meta:
                        {
                            from: `${cwd}/test_ground/sample/b/san.txt`,
                            original: "b/san.txt"
                        }
                },
            ].Sort(SortType.AtoZ, x => x.meta.original);

            const subj: FileMetadata[] = [
                {
                    from: `${cwd}/test_ground/sample/b/er.txt`,
                    original: "b/er.txt"
                },
                {
                    from: `${cwd}/test_ground/sample/a/1/yi.txt`,
                    original: "a/1/yi.txt"
                },
                {
                    from: `${cwd}/test_ground/sample/b/san.txt`,
                    original: "b/san.txt"
                }
            ];

            const actRaw = await fs.Read(subj).promise;
            expect(actRaw.isOk()).toBe(true);
            const act = actRaw.unwrap();
            const sortedAct = act.Sort(SortType.AtoZ, x => x.meta.original);
            expect(sortedAct).toStrictEqual(ex);

        });
    });
});
