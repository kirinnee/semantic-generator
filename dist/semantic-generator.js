"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@kirinnee/core");
const commander_1 = require("commander");
const process = __importStar(require("process"));
const doc_controller_1 = require("./controllers/doc-controller");
const core = new core_1.Kore();
core.ExtendPrimitives();
commander_1.program.on("command:*", function () {
    console.error("Invalid command: %s\nSee --help for a list of available commands.", commander_1.program.args.join(" "));
    process.exit(1);
});
commander_1.program
    .name("Semantic Generator")
    .version("var___INJECT_VERSION___")
    .description("Semantic Release configuration generator for conventional commits");
const docs = commander_1.program.command("docs");
doc_controller_1.DocController(core, docs);
commander_1.program.parse(process.argv);
//# sourceMappingURL=semantic-generator.js.map
