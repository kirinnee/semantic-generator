{ pkgs, packages }:
with packages;
{
  system = [
    coreutils
    sd
    bash
    xcbuild
  ];

  dev = [
  ];

  infra = [
  ];

  main = [
    pls
    node
    pnpm
    infisical
  ];

  lint = [
    # core
    treefmt
    gitlint
    shellcheck
    sg
  ];

  ci = [

  ];

  releaser = [
  ];

}
