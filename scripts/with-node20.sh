#!/usr/bin/env bash
set -e
set -u
set -o pipefail

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [[ -s "$NVM_DIR/nvm.sh" ]]; then
  # nvm (Unix) found - use it to switch to Node 20
  unset PREFIX
  unset NPM_CONFIG_PREFIX
  unset npm_config_prefix
  # shellcheck disable=SC1090
  source "$NVM_DIR/nvm.sh"
  nvm use 20 >/dev/null
fi
# If nvm not found (e.g. Windows with nvm-windows or direct Node install), use current Node

exec "$@"
