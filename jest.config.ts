import type {Config} from "@jest/types";

// Sync object
const config: Config.InitialOptions = {
    preset: "ts-jest",
    testEnvironment: "node",
    verbose: true,
    testMatch: ["**/__tests__/**/*.ts?(x)", "**/?(*.)+(spec|test).ts?(x)"],
    coverageDirectory: "./coverage",
    coverageReporters: ["json", "lcov", "text", "clover"],
    coverageThreshold: {
        global: {
            "branches": 95,
            "functions": 95,
            "lines": 95,
            "statements": -10
        }
    },
};
export default config;
