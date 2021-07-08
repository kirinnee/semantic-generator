let nixpkgs = import <nixpkgs> { }; in
let pkgs = {
  "nix 21.05 23th June 2021" = (
    with import (fetchTarball "https://github.com/NixOS/nixpkgs/archive/0ccd0d91361dc42dd32ffcfafed1a4fc23d1c8b4.tar.gz") { };
    [
      nodejs
    ]
  );
  "nix Unstable 4th July 2021" = (
    with import (fetchTarball "https://github.com/NixOS/nixpkgs/archive/09c38c29f2c719cd76ca17a596c2fdac9e186ceb.tar.gz") { };
    [
      nodePackages.pnpm
    ]
  );
}; in
nixpkgs.mkShell {
  buildInputs = pkgs."nix 21.05 23th June 2021" ++ pkgs."nix Unstable 4th July 2021";
}
