import {Err, Ok, Result} from "@hqoss/monads";
import {PR, PromiseResult} from "../src/classLibrary/resultUtil";
import execa from "execa";

describe("PR", function () {
    it("should wrap a async function that results Promise<Result<>> to PromiseResult<>", function () {
        const ex = new PromiseResult<number, string>(Promise.resolve(Ok(5)));
        const act = PR(async (): Promise<Result<number, string>> => {
            return Ok(5);
        });
        expect(act).toStrictEqual(ex);
    });
});

describe("PromiseResult Invert", () => {
    it("should invert a Result<Promise<>> to a PromiseResult<>", function () {
        const ex = new PromiseResult<number, string>(Promise.resolve(Ok(5)));
        const subj = Ok(Promise.resolve(5));
        const act = PromiseResult.Invert(subj);
        expect(act).toStrictEqual(ex);
    });
});
describe("PromiseResult", function () {

    describe("andThenAsync", function () {
        it("should map successful PromiseResults to function that return Promise<Result<>>", function () {
            const ex = new PromiseResult<number, string>(Promise.resolve(Ok(5)));
            const subj = new PromiseResult<number, string>(Promise.resolve(Ok(10)));
            const act = subj.andThenAsync((a) => {
                return Promise.resolve(Ok(a - 5));
            });

            expect(act).toStrictEqual(ex);

        });

        it("should map successful PromiseResults to function that returns PromiseResult<>", function () {
            const ex = new PromiseResult<number, string>(Promise.resolve(Ok(5)));
            const subj = new PromiseResult<number, string>(Promise.resolve(Ok(10)));
            const act = subj.andThenAsync((a) => {
                return new PromiseResult(Promise.resolve(Ok(a - 5)));
            });

            expect(act).toStrictEqual(ex);
        });

        it("should return errors unsuccessful PromiseResults", function () {
            const ex = new PromiseResult<number, string>(Promise.resolve(Err("some error")));
            const subj = new PromiseResult<number, string>(Promise.resolve(Err("some error")));
            const act = subj.andThenAsync((a) => {
                return new PromiseResult(Promise.resolve(Ok(a - 5)));
            });

            expect(act).toStrictEqual(ex);
        });
    });

    describe("andThen", function () {
        it("should map successful PromiseResult<> to function that return Result<>", function () {
            const ex = new PromiseResult<number, string>(Ok(5));
            const subj = new PromiseResult<number, string>(Ok(10));
            const act = subj.andThen((a) => {
                return Ok(a - 5);
            });
            expect(act).toStrictEqual(ex);
        });

        it("should return errors unsuccessful PromiseResults", function () {
            const ex = new PromiseResult<number, string>(Promise.resolve(Err("some error")));
            const subj = new PromiseResult<number, string>(Promise.resolve(Err("some error")));
            const act = subj.andThen((a) => {
                return Ok(a - 5);
            });

            expect(act).toStrictEqual(ex);
        });
    });

    describe("mapAsync", function () {
        it("should map successful PromiseResults to function that return Promise<>", function () {
            const ex = new PromiseResult<number, string>(Promise.resolve(Ok(5)));
            const subj = new PromiseResult<number, string>(Promise.resolve(Ok(10)));
            const act = subj.mapAsync((a) => {
                return Promise.resolve(a - 5);
            });

            expect(act).toStrictEqual(ex);

        });
        it("should return errors unsuccessful Result", function () {
            const ex = new PromiseResult<number, string>(Promise.resolve(Err("some error")));
            const subj = new PromiseResult<number, string>(Promise.resolve(Err("some error")));
            const act = subj.mapAsync((a) => {
                return Promise.resolve(a - 5);
            });

            expect(act).toStrictEqual(ex);
        });
    });

    describe("map", function () {
        it("should map successful PromiseResult<> with function", function () {
            const ex = new PromiseResult<number, string>(Promise.resolve(Ok(5)));
            const subj = new PromiseResult<number, string>(Promise.resolve(Ok(10)));
            const act = subj.map((a) => a - 5);
            expect(act).toStrictEqual(ex);
        });

        it("should map errors if unsuccessful", function () {
            const ex = new PromiseResult<number, string>(Promise.resolve(Err("some error")));
            const subj = new PromiseResult<number, string>(Promise.resolve(Err("some error")));
            const act = subj.map((a) => a - 5);

            expect(act).toStrictEqual(ex);
        });
    });

    describe("run", () => {
        it("should perform side effect and return original if successful", async function () {
            let a = 0;
            const sideEffect = () => a = 17;
            const subj = new PromiseResult<number, string>(Promise.resolve(Ok(5)));

            const act1Result = await subj.run(sideEffect).promise;
            const act1 = act1Result.unwrap();
            expect(act1).toBe(5);
            expect(a).toBe(17);
        });

        it("should skip side effect and return err if result was unsuccessful", async function () {
            let a = 0;
            const sideEffect = () => a = 17;
            const subj = new PromiseResult<number, string>(Promise.resolve(Err("wrong")));

            const act1Result = await subj.run(sideEffect).promise;
            const act1 = act1Result.unwrapErr();
            expect(act1).toBe("wrong");
            expect(a).toBe(0);
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
            expect(act1).toBe(5);
            expect(a).toBe(17);
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
            expect(act1).toBe("wrong");
            expect(a).toBe(0);
        });
    });

    describe("map Err", function () {
        it("should map error if the operation is unsuccessful", function () {

            const ex = new PromiseResult<number, string>(Err("original other"));
            const subj = new PromiseResult<number, string>(Err("original"));
            const mapFunc = (s: string) => `${s} other`;

            const act = subj.mapErr(mapFunc);

            expect(act).toStrictEqual(ex);
        });

        it("should not map error if the operation is not unsuccessful", function () {

            const ex = new PromiseResult<number, string>(Ok(5));
            const subj = new PromiseResult<number, string>(Ok(5));
            const mapFunc = (s: string) => `${s} other`;

            const act = subj.mapErr(mapFunc);

            expect(act).toStrictEqual(ex);
        });
    });

});
