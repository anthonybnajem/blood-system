#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

usage() {
  echo "Usage: bash scripts/release-update.sh [patch|minor|major]"
  exit 1
}

if [[ $# -gt 1 ]]; then
  usage
fi

LEVEL="${1:-patch}"
case "$LEVEL" in
  patch|minor|major) ;;
  *) usage ;;
esac

CURRENT_BRANCH="$(git branch --show-current)"
if [[ "$CURRENT_BRANCH" != "main" ]]; then
  echo "Release script must be run from the main branch. Current branch: $CURRENT_BRANCH"
  exit 1
fi

CURRENT_VERSION="$(node -p "require('./package.json').version")"
NEW_VERSION="$(npm version "$LEVEL" --no-git-tag-version)"
NEW_VERSION="${NEW_VERSION#v}"
TAG="v${NEW_VERSION}"

echo "Version bumped: ${CURRENT_VERSION} -> ${NEW_VERSION}"

git add -A
git commit -m "Release ${NEW_VERSION}"
git tag "$TAG"
git push origin main
git push origin "$TAG"

echo "Release pushed: ${TAG}"
