import {FlagResolver, Values} from "../../src/classLibrary/engine/resolver";
import {Content, VFile, FileMetadata} from "../../src/classLibrary/engine/vfs";
import {Kore} from "@kirinnee/core";

const core = new Kore();
core.ExtendPrimitives();

describe("flag resolver", function () {

    const val: Values = {
        flags: {
            a: true,
            b: true,
            c: false,
            d: false,
        },
        variables: {}
    };
    const flagResolver = new FlagResolver(core);
    describe("resolve meta", () => {


        it("should remove any metadata that contains a false flag", function () {
            const subj: FileMetadata[] = [
                {
                    from: "/abs/url/top/middle/flag___a___first/a.txt",
                    original: "top/middle/flag___a___first/a.txt",
                },
                {
                    from: "/abs/url/top/middle/a.txt",
                    original: "top/middle/a.txt",
                },
                {
                    from: "/abs/url/top/middle/flag___a___flag___b___second/a.txt",
                    original: "top/middle/flag___a___flag___b___second/a.txt",
                },
                {
                    from: "/abs/url/top/middle/flag___a___flag___c___second/a.txt",
                    original: "top/middle/flag___a___flag___c___second/a.txt",
                }
            ];
            const ex: FileMetadata[] = [
                {
                    from: "/abs/url/top/middle/flag___a___first/a.txt",
                    original: "top/middle/first/a.txt",
                },
                {
                    from: "/abs/url/top/middle/a.txt",
                    original: "top/middle/a.txt",
                },
                {
                    from: "/abs/url/top/middle/flag___a___flag___b___second/a.txt",
                    original: "top/middle/second/a.txt",
                },
            ];

            const act = flagResolver.ResolveMeta(val, subj);

            expect(act).toStrictEqual(ex);

        });

    });

    describe("resolve content", () => {
        it("should remove all flags and remove lines with false flag", function () {
            const meta = {from: "from", original: "original"};

            const subj: VFile[] = [
                {
                    content: Content.String(`
                    hello world
                    this line should stay flag___a___ even with flag___b___ two positive flags
                    This line should stay too
                    this line should be flag___c___ gone
                    and this line is fine
                    but this flag___d___ flag___a___ should be gone too
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
                    this line should stay  even with  two positive flags
                    This line should stay too
                    and this line is fine
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

            const act = flagResolver.ResolveContent(val, subj);
            expect(act).toStrictEqual(ex);

        });
    });
});
