{ pkgs, packages, env, shellHook }:

with env;
{
  default = pkgs.mkShell {
    buildInputs = system ++ main ++ dev ++ infra ++ lint;
    inherit shellHook;
  };
  ci = pkgs.mkShell {
    buildInputs = system ++ main ++ lint ++ ci;
    inherit shellHook;
  };
  releaser = pkgs.mkShell {
    buildInputs = system ++ main ++ lint ++ releaser;
    inherit shellHook;
  };
}
