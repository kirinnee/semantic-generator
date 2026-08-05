import { None, Option } from "@hqoss/monads";

const defaultVersions = {
  semanticRelease: "23.0.1",
  conventionalChangelogConventionalCommits: "7.0.2",
  commitAnalyzer: "12.0.0",
  releaseNoteGenerator: "12.0.0",
  // Pinned to 6.x deliberately. Verified against the registry: 6.0.3 peers
  // `semantic-release >=18.0.0`, which the 23.0.1 default above satisfies, while
  // 7.x peers `>=24.1.0` and would not.
  exec: "6.0.3",
};
class VersionManager {
  semanticRelease: string;
  conventionalChangelogConventionalCommits: string;
  commitAnalyzer: string;
  releaseNoteGenerator: string;
  exec: string;

  constructor(
    semanticRelease: Option<string>,
    conventionalChangelogConventionalCommits: Option<string>,
    commitAnalyzer: Option<string>,
    releaseNoteGenerator: Option<string>,
    exec: Option<string> = None,
  ) {
    this.exec = exec.unwrapOr(defaultVersions.exec);
    this.semanticRelease = semanticRelease.unwrapOr(
      defaultVersions.semanticRelease,
    );
    this.conventionalChangelogConventionalCommits =
      conventionalChangelogConventionalCommits.unwrapOr(
        defaultVersions.conventionalChangelogConventionalCommits,
      );
    this.commitAnalyzer = commitAnalyzer.unwrapOr(
      defaultVersions.commitAnalyzer,
    );
    this.releaseNoteGenerator = releaseNoteGenerator.unwrapOr(
      defaultVersions.releaseNoteGenerator,
    );
  }

  get defaultPackages(): string[] {
    return [
      `semantic-release@${this.semanticRelease}`,
      `conventional-changelog-conventionalcommits@${this.conventionalChangelogConventionalCommits}`,
      `@semantic-release/commit-analyzer@${this.commitAnalyzer}`,
      `@semantic-release/release-notes-generator@${this.releaseNoteGenerator}`,
    ];
  }

  /**
   * Installed only when the configuration declares bumps, so a repository that
   * does not bump does not grow a dependency it never invokes.
   */
  get bumpPackages(): string[] {
    return [`@semantic-release/exec@${this.exec}`];
  }
}

export { VersionManager, defaultVersions };
