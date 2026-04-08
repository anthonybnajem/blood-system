#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

usage() {
  echo "Usage: bash scripts/release-update.sh [patch|minor|major]"
  exit 1
}

build_local_installers() {
  local version="$1"
  local desktop_dir="$HOME/Desktop"
  local win_artifact="dist/release/Blood System-Setup-${version}.exe"
  local mac_artifact="dist/release/Blood System-${version}-arm64.dmg"

  echo "📦 Building local Windows installer..."
  npm run desktop:dist:win

  echo "📦 Building local macOS installer..."
  npm run desktop:dist:mac

  if [[ ! -f "$win_artifact" ]]; then
    echo "❌ Windows installer not found: $win_artifact"
    exit 1
  fi

  if [[ ! -f "$mac_artifact" ]]; then
    echo "❌ macOS DMG not found: $mac_artifact"
    exit 1
  fi

  mkdir -p "$desktop_dir"
  cp "$win_artifact" "$desktop_dir/"
  cp "$mac_artifact" "$desktop_dir/"

  echo "📁 Copied installers to Desktop:"
  echo "  - $desktop_dir/$(basename "$win_artifact")"
  echo "  - $desktop_dir/$(basename "$mac_artifact")"
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

build_local_installers "$NEW_VERSION"

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
