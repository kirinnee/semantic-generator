import {
    ResultAll,
    OptionAllNone,
    Wrap,
    ResultTupleAll,
    PromiseResultTupleAll,
    PadRight
} from "../src/classLibrary/util";
import {Err, None, Ok, Result, Some} from "@hqoss/monads";
import {PromiseResult} from "../src/classLibrary/resultUtil";
import {Kore} from "@kirinnee/core";

const core = new Kore();
core.ExtendPrimitives();

describe("PadRight", () => {
    it("should pad right with space if no padding provided", function () {
        const cases: [string, number, string][] = [
            ["abc", 6, "abc   "],
            ["abcde", 6, "abcde "],
            ["abcdef", 6, "abcdef"],
            ["abcdefg", 6, "abcdefg"],
            ["abc d", 6, "abc d "],
            ["hello!!", 10, "hello!!   "],
        ];

        cases.Each(([a1, a2, e]: [string, number, string]) => {
            expect(PadRight(a1, a2)).toBe(e);
        });
    });

    it("should pad right with the character if padding is provided", function () {
        const cases: [string, number, string][] = [
            ["abc", 6, "abc$$$"],
            ["abcde", 6, "abcde$"],
            ["abcdef", 6, "abcdef"],
            ["abcdefg", 6, "abcdefg"],
            ["abc d", 6, "abc d$"],
            ["hello!!", 10, "hello!!$$$"],
        ];

        cases.Each(([a1, a2, e]: [string, number, string]) => {
            expect(PadRight(a1, a2, "$")).toBe(e);
        });
    });
});

describe("Wrap", () => {
    const a: { [s: string]: string } = {
        "goodbye": "hello",
    };
    it("should wrap null into None", () => {
        const a: string | null = null;
        expect(Wrap(a)).toBe(None);
    });

    it("should wrap undefined into None", () => {


        expect(Wrap(a["hello"])).toBe(None);
    });

    it("should wrap existing into Some", () => {
        expect(Wrap(a["goodbye"]).unwrap()).toStrictEqual(Some("hello").unwrap());
    });
});

describe("ResolveOptionCollection", () => {
    it("should return none if all collection is none", function () {
        const r = [None, None, None, None];
        const act = OptionAllNone(r);
        expect(act.isSome()).toBe(false);
    });

    it("should return some if some of the collect is non-none", function () {
        const s1 = [None, None, Some(1), None];
        const s2 = [None, None, Some("a"), None];
        const s3 = [None, Some({complex: true, simple: "a"}), Some({complex: false, simple: "b"})];
        const s4 = [Some(1), Some(1), Some(1)];
        const e1 = [1];
        const e2 = ["a"];
        const e3 = [{complex: true, simple: "a"}, {complex: false, simple: "b"}];
        const e4 = [1, 1, 1];

        const a1 = OptionAllNone(s1);
        const a2 = OptionAllNone(s2);
        const a3 = OptionAllNone(s3);
        const a4 = OptionAllNone(s4);

        expect(a1.isSome()).toBe(true);
        expect(a1.unwrap()).toStrictEqual(e1);

        expect(a2.isSome()).toBe(true);
        expect(a2.unwrap()).toStrictEqual(e2);

        expect(a3.isSome()).toBe(true);
        expect(a3.unwrap()).toStrictEqual(e3);

        expect(a4.isSome()).toBe(true);
        expect(a4.unwrap()).toStrictEqual(e4);
    });
});

describe("ResolveCollection", () => {
    it("should be successful is all results are successful", function () {
        const r = [Ok("a"), Ok("b"), Ok("c")];
        const act = ResultAll(r);
        expect(act.isOk()).toBe(true);
        expect(act.unwrap()).toStrictEqual(["a", "b", "c"]);
    });

    it("should be fail if one result is unsuccessful", function () {
        const r = [Ok("a"), Ok("b"), Err("c")];
        const act = ResultAll(r);
        expect(act.isOk()).toBe(false);
        expect(act.unwrapErr()).toStrictEqual(["c"]);
    });
});
describe("PromiseResultTupleAll", () => {

    function R<T>(s: T): PromiseResult<T, string> {
        return new PromiseResult(Ok(s));
    }


    it("should return all the PromiseResult as a tuple if all results are successful", async function () {
        const subj = [R("a"), R(false), R(["a", "b", "c"]), R({color: "red", name: "John"}), R(5), R(7)];
        const ex = ["a", false, ["a", "b", "c"], {color: "red", name: "John"}, 5, 7];
        const actResult = await PromiseResultTupleAll(...subj).promise;
        const act = actResult.unwrap();
        expect(act).toStrictEqual(ex);
    });

    it("should return all errors if even 1 result is unsuccessful", async function () {
        const s1 = [R("a"), new PromiseResult(Err("err1")), R(["a", "b", "c"]), R({
            color: "red",
            name: "John"
        }), R(5), R(7)];
        const e1 = ["err1"];
        const a1Result = await PromiseResultTupleAll(...s1).promise;
        const a1 = a1Result.unwrapErr();
        expect(a1).toStrictEqual(e1);

        const s2 = [R("a"), new PromiseResult(Err("err1")), R(["a", "b", "c"]), R({
            color: "red",
            name: "John"
        }), new PromiseResult(Err("err3")), R(7), new PromiseResult(Err("err2")),];
        const e2 = ["err1", "err3", "err2"];
        const a2Result = await PromiseResultTupleAll(...s2).promise;
        const a2 = a2Result.unwrapErr();
        expect(a2).toStrictEqual(e2);
    });
});
describe("ResultTupleAll", () => {

    function R<T>(s: T): Result<T, string> {
        return Ok(s);
    }

    it("should return all the result as a tuple if all results are successful", function () {
        const subj = [R("a"), R(false), R(["a", "b", "c"]), R({color: "red", name: "John"}), R(5), R(7)];
        const ex = ["a", false, ["a", "b", "c"], {color: "red", name: "John"}, 5, 7];
        const act = ResultTupleAll(...subj).unwrap();
        expect(act).toStrictEqual(ex);
    });

    it("should return all errors if even 1 result is unsuccessful", function () {
        const s1 = [R("a"), Err("err1"), R(["a", "b", "c"]), R({color: "red", name: "John"}), R(5), R(7)];
        const e1 = ["err1"];
        const a1 = ResultTupleAll(...s1).unwrapErr();
        expect(a1).toStrictEqual(e1);

        const s2 = [R("a"), Err("err1"), R(["a", "b", "c"]), R({
            color: "red",
            name: "John"
        }), Err("err3"), R(7), Err("err2"),];
        const e2 = ["err1", "err3", "err2"];
        const a2 = ResultTupleAll(...s2).unwrapErr();
        expect(a2).toStrictEqual(e2);
    });
});
