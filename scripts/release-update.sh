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

# Ensure main branch
CURRENT_BRANCH="$(git branch --show-current)"
if [[ "$CURRENT_BRANCH" != "main" ]]; then
  echo "❌ Must be on main branch. Current: $CURRENT_BRANCH"
  exit 1
fi

# Get versions
CURRENT_VERSION="$(node -p "require('./package.json').version")"
NEW_VERSION="$(npm version "$LEVEL" --no-git-tag-version)"
NEW_VERSION="${NEW_VERSION#v}"
TAG="v${NEW_VERSION}"

echo "🚀 Version bumped: ${CURRENT_VERSION} → ${NEW_VERSION}"

# Commit & push
git add -A
git commit -m "Release ${NEW_VERSION}"
git tag "$TAG"
git push origin main
git push origin "$TAG"

echo "🚀 Release pushed: ${TAG}"
echo "GitHub Actions will now build and publish:"
echo "  - Windows Release"
echo "  - Mac Release (only if Apple signing secrets are configured)"
