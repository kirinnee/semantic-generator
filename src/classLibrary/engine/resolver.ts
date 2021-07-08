import {Content, VFile, FileMetadata} from "./vfs";
import {Core} from "@kirinnee/core";

interface Values {
    variables: { [s: string]: string }
    flags: { [s: string]: boolean }
}

interface Resolver {
    ResolveMeta(v: Values, i: FileMetadata[]): FileMetadata[]

    ResolveContent(v: Values, i: VFile[]): VFile[]
}

class VarResolver implements Resolver {

    constructor(core: Core) {
        core.AssertExtend();
    }

    ResolveContent(v: Values, i: VFile[]): VFile[] {
        const m = this.GetMap(v);
        return i.Map(f => this.ResolveFile(m, f));
    }

    GetMap(v: Values): [string, string][] {
        const ret: [string, string][] = [];
        for (const k in v.variables) {
            ret.push([`var___${k}___`, v.variables[k]]);
        }
        return ret;
    }

    ResolveFile(m: [string, string][], f: VFile): VFile {
        return Content.match(f.content, {
            String(content: string): VFile {
                const newContent = m.reduce((a: string, [key, val]: [string, string]) => a.ReplaceAll(key, val), content);
                return {
                    meta: f.meta,
                    content: Content.String(newContent)
                };
            }, default(): VFile {
                return f;
            }

        });
    }

    ResolveMeta(v: Values, i: FileMetadata[]): FileMetadata[] {
        const m = this.GetMap(v);
        return i.Map(({from, original}) => {
            const newString = m.reduce((a: string, [key, val]: [string, string]) => a.ReplaceAll(key, val), original);
            return {
                from,
                original: newString,
            };
        });
    }


}

class FlagResolver implements Resolver {

    constructor(core: Core) {
        core.AssertExtend();
    }

    GetPassFail(v: Values): [string[], string[]] {
        const pass: string[] = [];
        const fail: string[] = [];

        for (const k in v.flags) {
            const f = `flag___${k}___`;
            if (v.flags[k]) {
                pass.push(f);
            } else {
                fail.push(f);
            }
        }
        return [pass, fail];
    }

    ResolveContent(v: Values, i: VFile[]): VFile[] {
        const [pass, fail] = this.GetPassFail(v);
        return i.Map(f => this.ResolveFile(pass, fail, f));
    }

    ResolveFile(pass: string[], fail: string[], file: VFile): VFile {
        return Content.match(file.content, {
            String(content: string): VFile {
                const stringContent = content.LineBreak()
                    .Where(line => !fail.Any(f => line.includes(f)))
                    .Map(line => pass.concat(fail).reduce((a, b) => a.Remove(b), line))
                    .join("\n");
                return {
                    content: Content.String(stringContent),
                    meta: file.meta
                };
            }, default(): VFile {
                return file;
            }

        });

    }

    ResolveMeta(v: Values, i: FileMetadata[]): FileMetadata[] {

        const [pass, fail] = this.GetPassFail(v);

        return i.Where(x => !fail.Any(falseFlag => x.original.includes(falseFlag)))
            .Map(({original, from}) => {
                pass.concat(fail).Each(x => {
                    original = original.Remove(x);
                });
                return {
                    original: original,
                    from: from,
                };
            });
    }

}


export {Resolver, FlagResolver, VarResolver, Values};
