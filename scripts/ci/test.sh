#! /bin/sh

pnpm i
pls ci:build
pls ci:cover
