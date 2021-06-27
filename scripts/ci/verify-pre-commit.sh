#! /bin/sh

yarn --prefer-offline
pre-commit install --install-hooks
pre-commit run --all
