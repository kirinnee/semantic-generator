let nixpkgs = import <nixpkgs> { }; in
let
  pkgs = import ./packages.nix { inherit nixpkgs; };
  PROJECT_ROOT = builtins.getEnv "PWD";
in
nixpkgs.buildEnv {
  name = "ci-env";

  paths = pkgs;
}
