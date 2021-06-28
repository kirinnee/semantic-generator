#! /bin/sh
yarn --prefer-offline
pls ci:build
pls ci:cover
