{ nixpkgs ? import <nixpkgs> { } }:
let pkgs = {
  pls = (
    let p = import ./pls.nix { inherit nixpkgs; }; in
    with p;
    [
      pls
      please
      plz
    ]
  );
  "nix 21.05 30th July 2021" = (
    let n = import (fetchTarball "https://github.com/NixOS/nixpkgs/archive/2262d7863a6af007274a698367484bf4903a3299.tar.gz") { }; in
    with n;
    [
      pre-commit
      git
      shfmt
      shellcheck
      nixpkgs-fmt
      nodePackages.prettier
      bash
      sd
      gnugrep
    ]
  );
  "nix Unstable 30th July 2021" = (
    let n = import (fetchTarball "https://github.com/NixOS/nixpkgs/archive/8ecc61c91a596df7d3293603a9c2384190c1b89a.tar.gz") { }; in
    with n;
    [
      nodePackages.pnpm
      nodejs-16_x
    ]
  );

}; in
with pkgs;
pkgs."nix Unstable 30th July 2021" ++
pls ++
pkgs."nix 21.05 30th July 2021"
