let nixpkgs = import <nixpkgs> { }; in
let pkgs = import ./packages.nix { inherit nixpkgs; }; in

nixpkgs.mkShell {
  buildInputs = pkgs;

  shellHook = ''
    pls setup
  '';
}
