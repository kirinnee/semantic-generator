#! /bin/sh

# file cache
file_cache="file://${NIX_CACHE_PATH}"

preScript() {
	# substitutes
	caches="https://cache.nixos.org/"

	# add file cache if exist
	[ "${NIX_CACHE_PATH}" != '' ] && caches="${caches} ${file_cache}"

	# setup environment
	nix-env -i -f ./ci-env.nix --substituters "${caches}"
}

postScript() {
	# update file cache if it exist
	if [ "${NIX_CACHE_PATH}" != '' ]; then
		nix copy --to "${file_cache}" --all
		cache_info="$NIX_CACHE_PATH/nix-cache-info"
		if grep -Exq "^Priority: .*$" "${cache_info}"; then
			echo "Priority already set"
		else
			echo "Priority: 10" >>"${cache_info}"
		fi
	fi
}
