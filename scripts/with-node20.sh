#!/usr/bin/env bash
set -euo pipefail

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [[ ! -s "$NVM_DIR/nvm.sh" ]]; then
  echo "nvm was not found at $NVM_DIR. Install nvm first." >&2
  exit 1
fi

# npm can inject PREFIX and break nvm runtime switching.
unset PREFIX
unset NPM_CONFIG_PREFIX
unset npm_config_prefix

# shellcheck disable=SC1090
source "$NVM_DIR/nvm.sh"
nvm use 20 >/dev/null

exec "$@"
