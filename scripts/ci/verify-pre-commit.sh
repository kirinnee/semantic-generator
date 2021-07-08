#! /bin/sh

pnpm i
pre-commit install --install-hooks
pre-commit run --all
