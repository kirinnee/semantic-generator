#! /bin/sh

# import library
script=$(readlink -f "$0")
scriptPath=$(dirname "${script}")
. "${scriptPath}/lib.sh"

preScript

yarn --prefer-offline
pre-commit install --install-hooks
pre-commit run --all

postScript
