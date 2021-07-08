import {Err, Ok, Result} from "@hqoss/monads";


function PR<V, E>(func: () => Promise<Result<V, E>>): PromiseResult<V, E> {
    return new PromiseResult<V, E>(func());
}

class PromiseResult<V, E> {

    public static Invert<T, Err>(i: Result<Promise<T>, Err>): PromiseResult<T, Err> {
        return PR(
            async (): Promise<Result<T, Err>> => {
                if (i.isOk()) {
                    const internal = i.unwrap();
                    const v = await internal;
                    return Ok(v);
                }
                return Err(i.unwrapErr());
            }
        );
    }

    public readonly promise: Promise<Result<V, E>>;


    constructor(result: Promise<Result<V, E>> | Result<V, E>) {
        if ((<Promise<Result<V, E>>>result).then && (<Promise<Result<V, E>>>result).catch && (<Promise<Result<V, E>>>result).finally) {
            this.promise = <Promise<Result<V, E>>>result;
        } else {
            this.promise = Promise.resolve(<Result<V, E>>result);
        }
    }

    andThenAsync<X>(func: (v: V) => Promise<Result<X, E>> | PromiseResult<X, E>): PromiseResult<X, E> {
        return PR(
            async (): Promise<Result<X, E>> => {
                const r = await this.promise;
                if (r.isOk()) {
                    const val = r.unwrap();
                    const ret = func(val);
                    if ((<PromiseResult<X, E>>ret).promise) {
                        return (<PromiseResult<X, E>>ret).promise;
                    }
                    return (<Promise<Result<X, E>>>ret);
                }
                return Err(r.unwrapErr());
            }
        );
    }


    run(a: (v: V) => void): PromiseResult<V, E> {
        const closure = async () => {
            const val = await this.promise;
            if (val.isOk()) a(val.unwrap());
            return val;
        };
        return PR(closure);
    }

    runAsync(a: (v: V) => Promise<void>): PromiseResult<V, E> {
        return PR(async () => {
            const p = await this.promise;
            if (p.isOk()) {
                await a(p.unwrap());
            }
            return p;
        });
    }

    andThen<X>(func: (v: V) => Result<X, E>): PromiseResult<X, E> {
        return PR(
            async () => {
                const r = await this.promise;
                return r.andThen(func);
            }
        );
    }


    mapAsync<X>(func: (v: V) => Promise<X>): PromiseResult<X, E> {
        return PR(
            async (): Promise<Result<X, E>> => {
                const r = await this.promise;
                const r2 = r.map(func);
                return PromiseResult.Invert<X, E>(r2).promise;
            }
        );
    }


    map<X>(func: (v: V) => X): PromiseResult<X, E> {
        return PR(async () => {
            const r = await this.promise;
            return r.map(func);
        });
    }

    mapErr<X>(func: (e: E) => X): PromiseResult<V, X> {
        return PR(async () => {
            const r = await this.promise;
            return r.mapErr(func);
        });
    }

}

export {PromiseResult, PR};
