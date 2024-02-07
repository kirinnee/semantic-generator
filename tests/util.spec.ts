import {
    ResultAll,
    OptionAllNone,
    Wrap,
    ResultTupleAll,
    PromiseResultTupleAll,
    PadRight, WrapAsError
} from "../src/classLibrary/util";
import {Err, None, Ok, Result, Some} from "@hqoss/monads";
import {PromiseResult} from "../src/classLibrary/resultUtil";
import {Kore} from "@kirinnee/core";
import { should } from "chai";

should();

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
            PadRight(a1, a2).should.be.eq(e);
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
            PadRight(a1, a2, "$").should.be.eq(e);
        });
    });
});

describe("WrapAsError", () => {
    const a: { [s: string]: string } = {
        "goodbye": "hello",
    };
    it("should wrap null into None", () => {
        const a: string | null = null;
        const act = WrapAsError("this is an error", a);
        act.isOk().should.equal(false);
        act.unwrapErr().should.equal("this is an error");
    });

    it("should wrap undefined into None", () => {

        const act = WrapAsError(new Error("some error"), a["hello"]);

        act.isOk().should.equal(false);
        act.unwrapErr().should.deep.equal(new Error("some error"));
    });

    it("should wrap existing into Some", () => {
        const act = WrapAsError({a:false, b: [1,2,3], c: {error: "this is an error"}}, a["goodbye"]);

        act.isOk().should.equal(true);
        act.unwrap().should.equal("hello");
    });
});


describe("Wrap", () => {
    const a: { [s: string]: string } = {
        "goodbye": "hello",
    };
    it("should wrap null into None", () => {
        const a: string | null = null;
        Wrap(a).should.equal(None);
    });

    it("should wrap undefined into None", () => {


        Wrap(a["hello"]).should.equal(None);
    });

    it("should wrap existing into Some", () => {
        Wrap(a["goodbye"]).unwrap().should.deep.equal(Some("hello").unwrap());
    });
});

describe("ResolveOptionCollection", () => {
    it("should return none if all collection is none", function () {
        const r = [None, None, None, None];
        const act = OptionAllNone(r);
        act.isSome().should.equal(false);
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

        a1.isSome().should.equal(true);
        a1.unwrap().should.deep.equal(e1);

        a2.isSome().should.equal(true);
        a2.unwrap().should.deep.equal(e2);

        a3.isSome().should.equal(true);
        a3.unwrap().should.deep.equal(e3);

        a4.isSome().should.equal(true);
        a4.unwrap().should.deep.equal(e4);
    });
});

describe("ResolveCollection", () => {
    it("should be successful is all results are successful", function () {
        const r = [Ok("a"), Ok("b"), Ok("c")];
        const act = ResultAll(r);
        act.isOk().should.equal(true);
        act.unwrap().should.deep.equal(["a", "b", "c"]);
    });

    it("should be fail if one result is unsuccessful", function () {
        const r = [Ok("a"), Ok("b"), Err("c")];
        const act = ResultAll(r);
        act.isOk().should.equal(false);
        act.unwrapErr().should.deep.equal(["c"]);
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
        act.should.deep.equal(ex);
    });

    it("should return all errors if even 1 result is unsuccessful", async function () {
        const s1 = [R("a"), new PromiseResult(Err("err1")), R(["a", "b", "c"]), R({
            color: "red",
            name: "John"
        }), R(5), R(7)];
        const e1 = ["err1"];
        const a1Result = await PromiseResultTupleAll(...s1).promise;
        const a1 = a1Result.unwrapErr();
        a1.should.deep.equal(e1);

        const s2 = [R("a"), new PromiseResult(Err("err1")), R(["a", "b", "c"]), R({
            color: "red",
            name: "John"
        }), new PromiseResult(Err("err3")), R(7), new PromiseResult(Err("err2")),];
        const e2 = ["err1", "err3", "err2"];
        const a2Result = await PromiseResultTupleAll(...s2).promise;
        const a2 = a2Result.unwrapErr();
        a2.should.deep.equal(e2);
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
        act.should.deep.equal(ex);
    });

    it("should return all errors if even 1 result is unsuccessful", function () {
        const s1 = [R("a"), Err("err1"), R(["a", "b", "c"]), R({color: "red", name: "John"}), R(5), R(7)];
        const e1 = ["err1"];
        const a1 = ResultTupleAll(...s1).unwrapErr();
        a1.should.deep.equal(e1);

        const s2 = [R("a"), Err("err1"), R(["a", "b", "c"]), R({
            color: "red",
            name: "John"
        }), Err("err3"), R(7), Err("err2"),];
        const e2 = ["err1", "err3", "err2"];
        const a2 = ResultTupleAll(...s2).unwrapErr();
        a2.should.deep.equal(e2);
    });
});
