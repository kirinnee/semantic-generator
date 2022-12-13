module.exports = {
  require: "ts-node/register",
  parallel: false,
  watch: false,
  "watch-files": ["src/**/*.ts", "tests/**/*.ts"],
  spec: ["tests/**/*.spec.ts"],
};
