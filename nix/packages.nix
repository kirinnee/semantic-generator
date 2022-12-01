{ nixpkgs ? import <nixpkgs> { } }:
let pkgs = {
  atomi = (
    with import (fetchTarball "https://github.com/kirinnee/test-nix-repo/archive/refs/tags/v13.0.0.tar.gz");
    {
      inherit pls sg webstorm;
    }
  );
  "nix 21.05 30th July 2021" = (
    with import (fetchTarball "https://github.com/NixOS/nixpkgs/archive/2262d7863a6af007274a698367484bf4903a3299.tar.gz") { };
    {
      inherit pre-commit git shfmt shellcheck nixpkgs-fmt bash sd gnugrep jq coreutils;
      prettier = nodePackages.prettier;
    }
  );
  "nix Unstable 30th July 2021" = (
    with import (fetchTarball "https://github.com/NixOS/nixpkgs/archive/8ecc61c91a596df7d3293603a9c2384190c1b89a.tar.gz") { };
    {
      pnpm = nodePackages.pnpm;
      nodejs = nodejs-16_x;
    }
  );
}; in
with pkgs;
pkgs."nix Unstable 30th July 2021" //
atomi //
pkgs."nix 21.05 30th July 2021"
