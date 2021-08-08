{ nixpkgs ? import <nixpkgs> { } }:
let pkgs = import ./packages.nix { inherit nixpkgs; }; in
with pkgs;
{
  minimal = [
    pls
    git
    coreutils
    nodejs
    pnpm
    jq
    sd
  ];
  lint = [
    bash
    gitlint
    pre-commit
    nixpkgs-fmt
    prettier
    sg # for linting gitlint file
    shfmt
    shellcheck
  ];
  ci = [
    jq
    sd
    coreutils
    pnpm
    node
    pls
  ];
  releaser = [
    pnpm
    sg
    prettier
  ];
}
