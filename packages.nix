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
  "nix 21.05 23th June 2021" = (
    let n = import (fetchTarball "https://github.com/NixOS/nixpkgs/archive/0ccd0d91361dc42dd32ffcfafed1a4fc23d1c8b4.tar.gz") { }; in
    with n;
    [
      pre-commit
      git
      shfmt
      shellcheck
      nixpkgs-fmt
      nodePackages.prettier
      bash
      nodejs
      sd
      gnugrep
    ]
  );
  "nix Unstable 4th July 2021" = (
    let n = import (fetchTarball "https://github.com/NixOS/nixpkgs/archive/09c38c29f2c719cd76ca17a596c2fdac9e186ceb.tar.gz") { }; in
    with n;
    [
      nodePackages.npm
      nodePackages.pnpm
    ]
  );
}; in
with pkgs;
pkgs."nix Unstable 4th July 2021" ++ pls ++ pkgs."nix 21.05 23th June 2021"
