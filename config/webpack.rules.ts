/*===================
 TS LOADER
 ===================== */

import { RuleSetRule } from "webpack";

const rules: RuleSetRule[] = [
    {
        test: /\.tsx?$/,
        exclude: /(node_modules|bower_components)/,
        use: "ts-loader",
    },
];

export { rules };
