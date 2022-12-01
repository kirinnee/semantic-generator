{ nixpkgs ? import <nixpkgs> { } }:
let env = import ./env.nix { inherit nixpkgs; }; in
{
  dev = nixpkgs.mkShell {
    buildInputs = env.minimal ++ env.dev ++ env.lint ++ [ ];
  };
  lint-ci = nixpkgs.mkShell {
    buildInputs = env.minimal ++ env.lint ++ [ ];
  };
  ci = nixpkgs.mkShell {
    buildInputs = env.ci;
  };
  releaser = nixpkgs.mkShell {
    buildInputs = env.releaser;
  };
}
