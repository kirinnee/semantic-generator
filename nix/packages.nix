{ nixpkgs ? import <nixpkgs> { } }:
let
  pkgs = {
    atomi = (
      with import (fetchTarball "https://github.com/kirinnee/test-nix-repo/archive/refs/tags/v15.1.0.tar.gz");
      {
        inherit pls sg webstorm;
      }
    );
    "nix Unstable 11th December 2022" = (
      with import (fetchTarball "https://github.com/NixOS/nixpkgs/archive/f82f0ec1b70b2879c3f3d9a1015a05c73a90a17c.tar.gz") { };
      {
        inherit pre-commit git shfmt shellcheck nixpkgs-fmt bash sd gnugrep jq coreutils;
        prettier = nodePackages.prettier;
        pnpm = nodePackages.pnpm;
        nodejs = nodejs;
      }
    );
  };
in
with pkgs;
atomi //
pkgs."nix Unstable 11th December 2022"
