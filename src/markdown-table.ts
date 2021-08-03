import {Err, Ok, Result} from "@hqoss/monads";
import {Core} from "@kirinnee/core";
import {PadRight} from "./classLibrary/util";

class MarkdownTable {


    constructor(core: Core) {
        core.AssertExtend();
    }

    Render(s: string[][]): Result<string, string> {
        // Check at least 2 rows
        if (s.length < 2) return Err("Need at least 2 rows");
        // Check if its complete matrix
        const width = s[0].length;
        if (s.Any(x => x.length != width)) return Err("Not a complete matrix");

        const maxWidths: number[] = [];


        for (let i = 0; i < width; i++) {
            const col = s.Map(x => x[i]);
            maxWidths.push(col.Max(x => x.length).length);
        }

        const formatted = s.Map(row => `| ${row.Map((x, i) => PadRight(x, maxWidths[i])).join(" | ")} |`);
        const separator = `| ${maxWidths.Map(x => "-".Repeat(x)).join(" | ")} |`;
        const all = [formatted[0], separator, ...formatted.Skip(1)].join("\n");
        return Ok(all);
    }
}

export {MarkdownTable};
