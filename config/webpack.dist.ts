import * as path from "path";
import { opti } from "./webpack.optimizer";
import webpack, { DefinePlugin, Entry } from "webpack";
import { rules } from "./webpack.rules";
import { Kore } from "@kirinnee/core";
import { ExtractVersion } from "./version_extractor";

const core = new Kore();
core.ExtendPrimitives();

const entry: Entry = {
    "semantic-generator": "./src/semantic-generator.ts",
};

function GenerateConfig(
    entry: Entry,
    filename: string,
    mode: "development" | "production" | "none"
): webpack.Configuration {
    const outDir = path.resolve(__dirname, "../dist");
    const config: webpack.Configuration = {
        entry: entry,
        output: {
            path: outDir,
            filename: filename,
            libraryTarget: "umd",
            globalObject: "(typeof window !== 'undefined' ? window : this)",
        },
        plugins: [
            new webpack.BannerPlugin({ banner: "#!/usr/bin/env node", raw: true }),
            new DefinePlugin({
                VERSION: JSON.stringify(ExtractVersion()),
            }),
        ],
        resolve: {
            extensions: [".ts", ".tsx", ".js"],
        },
        mode: mode,
        module: { rules },
        target: "node",
        node: { __dirname: false, __filename: false },
    };
    if (mode === "production") config.optimization = opti;
    return config;
}

module.exports = [
    GenerateConfig(entry, "[name].min.js", "production"),
    GenerateConfig(entry, "[name].js", "development"),
];
