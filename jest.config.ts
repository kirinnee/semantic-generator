import type {Config} from "@jest/types";

// Sync object
const config: Config.InitialOptions = {
    preset: "ts-jest",
    testEnvironment: "node",
    verbose: true,
    testMatch: ["**/__tests__/**/*.ts?(x)", "**/?(*.)+(spec|test).ts?(x)"],
    coverageDirectory: "./coverage",
    coverageReporters: ["json", "lcov", "text", "clover"],
    transform: {
        "^.+\\.tsx?$": "ts-jest",
        "^.+\\.jsx?$": "babel-jest",
    },
    coverageThreshold: {
        global: {
            "branches": 95,
            "functions": 95,
            "lines": 95,
            "statements": -10
        }
    },
    transformIgnorePatterns: [
        "[/\\\\]node_modules[/\\\\].+\\.(js|jsx|ts|tsx)$",
    ]
};
export default config;
