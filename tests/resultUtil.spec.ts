import {Err, Ok, Result} from "@hqoss/monads";
import {PR, PromiseResult} from "../src/classLibrary/resultUtil";
import execa from "execa";
import {should, use} from "chai";
import chaiAsPromised from "chai-as-promised";

use(chaiAsPromised)

should();



describe("PR", function () {

    it("should wrap an async function that results Promise<Result<>> to PromiseResult<>", async function () {
        const ex = Ok(5);
        const act = PR(async (): Promise<Result<number, string>> => {
            return Ok(5);
        });

        const expected = ex.unwrap();
        const actual = (await act.promise).unwrap();

        expected.should.deep.equals(actual);
    });
});

describe("PromiseResult Invert", () => {
    it("should invert a Result<Promise<>> to a PromiseResult<>", async function () {
        const ex = new PromiseResult<number, string>(Promise.resolve(Ok(5)));
        const subj = Ok(Promise.resolve(5));
        const act = PromiseResult.Invert(subj);

        const expected = (await ex.promise).unwrap();
        const actual = (await act.promise).unwrap();

        expected.should.deep.equals(actual);
    });
});
describe("PromiseResult", function () {

    describe("andThenAsync", function () {
        it("should map successful PromiseResults to function that return Promise<Result<>>", async function () {
            const ex = new PromiseResult<number, string>(Promise.resolve(Ok(5)));
            const subj = new PromiseResult<number, string>(Promise.resolve(Ok(10)));
            const act = subj.andThenAsync((a) => {
                return Promise.resolve(Ok(a - 5));
            });

            const expected = (await ex.promise).unwrap();
            const actual = (await act.promise).unwrap();

            expected.should.deep.equals(actual);

        });

        it("should map successful PromiseResults to function that returns PromiseResult<>", async function () {
            const ex = new PromiseResult<number, string>(Promise.resolve(Ok(5)));
            const subj = new PromiseResult<number, string>(Promise.resolve(Ok(10)));
            const act = subj.andThenAsync((a) => {
                return new PromiseResult(Promise.resolve(Ok(a - 5)));
            });

            const expected = (await ex.promise).unwrap();
            const actual = (await act.promise).unwrap();

            expected.should.deep.equals(actual);
        });

        it("should return errors unsuccessful PromiseResults", async function () {
            const ex = new PromiseResult<number, string>(Promise.resolve(Err("some error")));
            const subj = new PromiseResult<number, string>(Promise.resolve(Err("some error")));
            const act = subj.andThenAsync((a) => {
                return new PromiseResult(Promise.resolve(Ok(a - 5)));
            });

            const expected = (await ex.promise).unwrapErr();
            const actual = (await act.promise).unwrapErr();

            expected.should.deep.equals(actual);

        });
    });

    describe("andThen", function () {
        it("should map successful PromiseResult<> to function that return Result<>", async function () {
            const ex = new PromiseResult<number, string>(Ok(5));
            const subj = new PromiseResult<number, string>(Ok(10));
            const act = subj.andThen((a) => {
                return Ok(a - 5);
            });

            const expected = (await ex.promise).unwrap();
            const actual = (await act.promise).unwrap();

            expected.should.deep.equals(actual);

        });

        it("should return errors unsuccessful PromiseResults", async function () {
            const ex = new PromiseResult<number, string>(Promise.resolve(Err("some error")));
            const subj = new PromiseResult<number, string>(Promise.resolve(Err("some error")));
            const act = subj.andThen((a) => {
                return Ok(a - 5);
            });
            const expected = (await ex.promise).unwrapErr();
            const actual = (await act.promise).unwrapErr();

            expected.should.deep.equals(actual);
        });
    });

    describe("mapAsync", function () {
        it("should map successful PromiseResults to function that return Promise<>", async function () {
            const ex = new PromiseResult<number, string>(Promise.resolve(Ok(5)));
            const subj = new PromiseResult<number, string>(Promise.resolve(Ok(10)));
            const act = subj.mapAsync((a) => {
                return Promise.resolve(a - 5);
            });
            const expected = (await ex.promise).unwrap();
            const actual = (await act.promise).unwrap();

            expected.should.deep.equals(actual);

        });
        it("should return errors unsuccessful Result", async function () {
            const ex = new PromiseResult<number, string>(Promise.resolve(Err("some error")));
            const subj = new PromiseResult<number, string>(Promise.resolve(Err("some error")));
            const act = subj.mapAsync((a) => {
                return Promise.resolve(a - 5);
            });

            const expected = (await ex.promise).unwrapErr();
            const actual = (await act.promise).unwrapErr();

            expected.should.deep.equals(actual);
        });
    });

    describe("map", function () {
        it("should map successful PromiseResult<> with function", async function () {
            const ex = new PromiseResult<number, string>(Promise.resolve(Ok(5)));
            const subj = new PromiseResult<number, string>(Promise.resolve(Ok(10)));
            const act = subj.map((a) => a - 5);

            const expected = (await ex.promise).unwrap();
            const actual = (await act.promise).unwrap();

            expected.should.deep.equals(actual);
        });

        it("should map errors if unsuccessful", async function () {
            const ex = new PromiseResult<number, string>(Promise.resolve(Err("some error")));
            const subj = new PromiseResult<number, string>(Promise.resolve(Err("some error")));
            const act = subj.map((a) => a - 5);

            const expected = (await ex.promise).unwrapErr();
            const actual = (await act.promise).unwrapErr();

            expected.should.deep.equals(actual);
        });
    });

    describe("run", () => {
        it("should perform side effect and return original if successful", async function () {
            let a = 0;
            const sideEffect = () => a = 17;
            const subj = new PromiseResult<number, string>(Promise.resolve(Ok(5)));

            const act1Result = await subj.run(sideEffect).promise;
            const act1 = act1Result.unwrap();
            act1.should.equal(5);
            a.should.equal(17);
        });

        it("should skip side effect and return err if result was unsuccessful", async function () {
            let a = 0;
            const sideEffect = () => a = 17;
            const subj = new PromiseResult<number, string>(Promise.resolve(Err("wrong")));

            const act1Result = await subj.run(sideEffect).promise;
            const act1 = act1Result.unwrapErr();
            act1.should.equal("wrong");
            a.should.equal(0);
        });
    });

    describe("runAsync", () => {
        it("should perform async side effect and return original if successful", async function () {
            let a = 0;
            const sideEffect = async () => {
                await execa("echo", ["hello", "world"]);
                a = 17;
            };
            const subj = new PromiseResult<number, string>(Promise.resolve(Ok(5)));

            const act1Result = await subj.runAsync(sideEffect).promise;
            const act1 = act1Result.unwrap();
            act1.should.equal(5);
            a.should.equal(17);
        });

        it("should skip async side effect and return err if result was unsuccessful", async function () {
            let a = 0;
            const sideEffect = async () => {
                await execa("echo", ["hello", "world"]);
                a = 17;
            };
            const subj = new PromiseResult<number, string>(Promise.resolve(Err("wrong")));

            const act1Result = await subj.runAsync(sideEffect).promise;
            const act1 = act1Result.unwrapErr();
            act1.should.equal("wrong");
            a.should.equal(0);
        });
    });

    describe("map Err", function () {
        it("should map error if the operation is unsuccessful", async function () {

            const ex = new PromiseResult<number, string>(Err("original other"));
            const subj = new PromiseResult<number, string>(Err("original"));
            const mapFunc = (s: string) => `${s} other`;

            const act = subj.mapErr(mapFunc);

            const expected = (await ex.promise).unwrapErr();
            const actual = (await act.promise).unwrapErr();

            expected.should.deep.equals(actual);
        });

        it("should not map error if the operation is not unsuccessful",async  function () {

            const ex = new PromiseResult<number, string>(Ok(5));
            const subj = new PromiseResult<number, string>(Ok(5));
            const mapFunc = (s: string) => `${s} other`;

            const act = subj.mapErr(mapFunc);

            const expected = (await ex.promise).unwrap();
            const actual = (await act.promise).unwrap();

            expected.should.deep.equals(actual);
        });
    });

});
