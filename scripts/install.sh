#!/bin/sh

set -e

# Only do this on a fresh install, to avoid triggering every time `yarn install`
# is run locally.
if [ ! -d "build/contracts" ]; then
  npm run compile
  node ./scripts/load_deployed_addresses.js
fi
