import { CommitConventionDocumentParser } from "../release/documentParser";
import { generateObject } from "ai";
import { Git } from "./git";
import {
  CommitterConfig,
  ReleaseConfiguration,
} from "../release/configuration";
import { CommitMessage, CommitMessageSchema } from "./message";
import { PromiseResult } from "../resultUtil";
import { AILoader } from "../ai-loader";
import { Core } from "@kirinnee/core";

class CommitMessageGenerator {
  private readonly docParser: CommitConventionDocumentParser;
  private readonly loader: AILoader;
  private readonly git: Git;

  constructor(
    core: Core,
    docParser: CommitConventionDocumentParser,
    loader: AILoader,
    git: Git,
  ) {
    core.AssertExtend();
    this.docParser = docParser;
    this.loader = loader;
    this.git = git;
  }

  get gitlintRules(): string {
    return `
### Title (T) Rules

- Max length ≤ 72 characters.
- No trailing whitespace.
- No trailing punctuation.
- No hard tabs (\`\\t\`).
- No specified words (e.g., "WIP").
- No leading whitespace.
- Must match regex.
- Min length ≥ 5 characters.

### Body (B) Rules

- Lines ≤ 80 characters.
- No trailing whitespace.
- No hard tabs.
- First line empty.
- Min length ≥ 20 characters.
- Must include message.
- Reference changed files.
- Must match regex.
`.trim();
  }

  prompt(markdown: string, rules: string, diff: string, user: string): string {
    const u =
      user.trim().length === 0
        ? ""
        : `<user-intention>
${user}
</user-intention>`;

    return `
<gitlint-rules>
${rules}
</gitlint-rules>

<commit-convention>
${markdown}
</commit-convention>

${u}

<diff>
${diff}
</diff>

<guidelines>
- keep points, descriptions, everything clear and concise
- don't capitalize the start of lines
- look through all diff and try to capture all changes
</guidelines>

<instruction>
You are a professional developer than aims to write top
quality code and profession commit messages. You are to
look through all the changes provided in "diff" and create
a concise git commit message to capture all the difference 
made. 

Follow "gitlint rules" strictly (new-line when necessary) 
and "commit convention" to write a detailed commit message.

The commit message should follow the "commit convention" format.

The body should contain 2 section:
- summary of key changes (in point form)
- why and reson of changes in concise prose

Convert these into a JSON object for processing.
</instruction>
`;
  }

  async aiGenerate(
    prompt: string,
    config: CommitterConfig,
  ): Promise<CommitMessage> {
    const model = this.loader.Load({
      model: config.model,
      provider: config.provider,
    });
    const { object } = await generateObject({
      model,
      schema: CommitMessageSchema,
      prompt,
    });
    return object as CommitMessage;
  }

  async aiGenerateX(
    variations: number,
    prompt: string,
    rc: ReleaseConfiguration,
  ): Promise<CommitMessage[]> {
    return await Promise.all(
      [].Fill(variations, () => this.aiGenerate(prompt, rc.committer)),
    );
  }

  Generate(
    cwd: string,
    user: string,
    rc: ReleaseConfiguration,
  ): PromiseResult<CommitMessage[], string[]> {
    const conv = this.docParser.GenerateDocument(rc);
    const rules = this.gitlintRules;
    return this.git
      .diff(cwd, rc)
      .map<string>((d) => this.prompt(conv, rules, d, user))
      .mapAsync(async (p) => this.aiGenerateX(rc.committer.variations, p, rc));
  }
}

export { CommitMessageGenerator };
