import {Err, None, Ok, Option, Result, Some} from "@hqoss/monads";
import {PromiseResult} from "./resultUtil";

function Wrap<T>(s?: T | null): Option<T> {
    if (s) {
        return Some(s);
    } else {
        return None;
    }
}


function OptionAllNone<T>(o: Option<T>[]): Option<T[]> {
    const some: T[] = [];
    o.forEach(x => {
        if (x.isSome()) {
            some.push(x.unwrap());
        }
    });
    if (some.length > 0) {
        return Some(some);
    }
    return None;
}


function PromiseResultAll<T, E>(i: PromiseResult<T, E>[]): PromiseResult<T[], E[]> {
    const closure = async () => {
        const a = await Promise.all(i.Map(x => x.promise));
        return ResultAll(a);
    };
    return new PromiseResult<T[], E[]>(closure());

}


function PadRight(s: string, length: number, padding = " "): string {
    return s + padding.Repeat((length - s.length).AtMin(0));
}

type PromiseResultErr<T extends unknown[]> = T extends Array<PromiseResult<unknown, infer E>> ? E : never
type PromiseResultOk<T extends unknown[]> = { [K in keyof T]: T[K] extends PromiseResult<infer U, unknown> ? U : never }
type ResultErr<T extends unknown[]> = T extends Array<Result<unknown, infer E>> ? E : never
type ResultOk<T extends unknown[]> = { [K in keyof T]: T[K] extends Result<infer U, unknown> ? U : never }

function PromiseResultTupleAll<T extends PromiseResult<unknown, unknown>[]>(...i: [...T]): PromiseResult<PromiseResultOk<T>, PromiseResultErr<T>[]> {
    const closure = async (): Promise<Result<PromiseResultOk<T>, PromiseResultErr<T>[]>> => {
        const a = await Promise.all(i.map(x => x.promise));
        return ResultTupleAll(...a) as Result<PromiseResultOk<T>, PromiseResultErr<T>[]>;
    };
    return new PromiseResult<PromiseResultOk<T>, PromiseResultErr<T>[]>(closure());
}

function ResultTupleAll<T extends Result<unknown, unknown>[]>(...i: [...T]): Result<ResultOk<T>, ResultErr<T>[]> {
    const ok: ResultOk<T> = [] as unknown as ResultOk<T>;
    const err: ResultErr<T>[] = [];
    i.forEach(e => {
        if (e.isOk()) {
            ok.push(e.unwrap());
        } else {
            err.push(e.unwrapErr() as ResultErr<T>);
        }
    });
    if (err.length > 0) {
        return Err(err);
    }
    return Ok(ok);
}

function ResultAll<T, E>(i: Result<T, E>[]): Result<T[], E[]> {
    const ok: T[] = [];
    const err: E[] = [];
    i.forEach(e => {
        if (e.isOk()) {
            ok.push(e.unwrap());
        } else {
            err.push(e.unwrapErr());
        }
    });
    if (err.length > 0) {
        return Err(err);
    }
    return Ok(ok);
}

export {
    Wrap,
    ResultAll,
    OptionAllNone,
    PromiseResultAll,
    ResultTupleAll,
    PromiseResultTupleAll,
    PadRight,
};
