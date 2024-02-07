import {VarResolver, Values} from "../../src/classLibrary/engine/resolver";
import {Content, VFile, FileMetadata} from "../../src/classLibrary/engine/vfs";
import {Kore} from "@kirinnee/core";

const core = new Kore();
core.ExtendPrimitives();

describe("var resolver", function () {

    const val: Values = {
        flags: {
        },
        variables: {
            a: "Apple",
            b: "Bear",
            c: "Car",
            d: "Dog",
        }
    };
    const varResolver = new VarResolver(core);
    describe("resolve meta", () => {


        it("should replace all variables", function () {
            const ex: FileMetadata[] = [
                {
                    from: "/abs/url/top/middle/var___a___first/a.txt",
                    original: "top/middle/Applefirst/a.txt",
                },
                {
                    from: "/abs/url/top/middle/a.txt",
                    original: "top/middle/a.txt",
                },
                {
                    from: "/abs/url/top/middle/var___a___var___b___second/a.txt",
                    original: "top/middle/AppleBearsecond/a.txt",
                },
                {
                    from: "/abs/url/top/middle/var___a___var___c___second/a.txt",
                    original: "top/middle/AppleCarsecond/a.txt",
                }
            ];

            const subj: FileMetadata[] = [
                {
                    from: "/abs/url/top/middle/var___a___first/a.txt",
                    original: "top/middle/var___a___first/a.txt",
                },
                {
                    from: "/abs/url/top/middle/a.txt",
                    original: "top/middle/a.txt",
                },
                {
                    from: "/abs/url/top/middle/var___a___var___b___second/a.txt",
                    original: "top/middle/var___a___var___b___second/a.txt",
                },
                {
                    from: "/abs/url/top/middle/var___a___var___c___second/a.txt",
                    original: "top/middle/var___a___var___c___second/a.txt",
                }
            ];

            const act = varResolver.ResolveMeta(val, subj);

            expect(act).toStrictEqual(ex);

        });

    });

    describe("resolve content", () => {
        it("should replace all variables", function () {
            const meta = {from: "from", original: "original"};

            const subj: VFile[] = [
                {
                    content: Content.String(`
                    hello world
                    this line should stay var___a___ even with var___b___ two positive flags
                    This line should stay too
                    this line should be var___c___ gone
                    and this line is fine
                    but this var___d___ var___a___ should be gone too
                    good bye
                    `),
                    meta,
                },
                {
                    content: Content.String(`There
                    should be no lines
                    removed from this file
                    `),
                    meta,
                },
                {
                    content: Content.Binary(Buffer.from("hello world", "utf8")),
                    meta,
                }
            ];

            const ex: VFile[] = [
                {
                    content: Content.String(`
                    hello world
                    this line should stay Apple even with Bear two positive flags
                    This line should stay too
                    this line should be Car gone
                    and this line is fine
                    but this Dog Apple should be gone too
                    good bye
                    `),
                    meta,
                },
                {
                    content: Content.String(`There
                    should be no lines
                    removed from this file
                    `),
                    meta,
                },
                {
                    content: Content.Binary(Buffer.from("hello world", "utf8")),
                    meta,
                }
            ];

            const act = varResolver.ResolveContent(val, subj);
            expect(act).toStrictEqual(ex);

        });
    });
});
