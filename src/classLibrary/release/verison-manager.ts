import { Option } from "@hqoss/monads";

const defaultVersions = {
  semanticRelease: "23.0.1",
  conventionalChangelogConventionalCommits: "7.0.2",
  commitAnalyzer: "12.0.0",
  releaseNoteGenerator: "12.0.0",
};
class VersionManager {
  semanticRelease: string;
  conventionalChangelogConventionalCommits: string;
  commitAnalyzer: string;
  releaseNoteGenerator: string;

  constructor(
    semanticRelease: Option<string>,
    conventionalChangelogConventionalCommits: Option<string>,
    commitAnalyzer: Option<string>,
    releaseNoteGenerator: Option<string>,
  ) {
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
}

export { VersionManager, defaultVersions };
