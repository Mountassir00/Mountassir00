#!/usr/bin/env bash
# EVENT LAB — procédure de version.
# Règle projet : avant de poursuivre vers une nouvelle version, la version
# courante est (1) documentée dans CHANGELOG.md, (2) commitée, (3) archivée
# en zip dans event-lab/archives/, (4) étiquetée par un tag git annoté,
# (5) poussée sur le dépôt distant.
#
# Usage : event-lab/scripts/release.sh 0.1.0 "Titre court de la version"
set -euo pipefail

VERSION="${1:?Usage: release.sh X.Y.Z \"titre\"}"
TITLE="${2:-Version $VERSION}"
TAG="v$VERSION"

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"
LAB="event-lab"
CHANGELOG="$LAB/CHANGELOG.md"
ARCHIVE_DIR="$LAB/archives"
ARCHIVE="$ARCHIVE_DIR/event-lab-$TAG.zip"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
TRAILERS="${RELEASE_TRAILERS:-Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Q1d36DqAuFxVFuBTWNXxVZ}"

[[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "Version invalide : $VERSION"; exit 1; }
grep -q "^## \[$VERSION\]" "$CHANGELOG" || { echo "STOP : aucune entrée '## [$VERSION]' dans $CHANGELOG. Documenter avant de versionner."; exit 1; }
if git rev-parse -q --verify "refs/tags/$TAG" >/dev/null; then echo "STOP : le tag $TAG existe déjà (une version publiée ne se modifie pas)."; exit 1; fi
[[ -f "$ARCHIVE" ]] && { echo "STOP : l'archive $ARCHIVE existe déjà."; exit 1; }

# 1. Commit du contenu de la version
git add -A "$LAB"
if ! git diff --cached --quiet; then
  git commit -q -F - <<EOF
$TAG — $TITLE

Contenu de la version $VERSION. Détail : event-lab/CHANGELOG.md

$(printf "%b" "$TRAILERS")
EOF
fi

# 2. Archive figée du contenu commité (hors dossier archives)
mkdir -p "$ARCHIVE_DIR"
git archive --format=zip --prefix="event-lab-$TAG/" -o "$ARCHIVE" HEAD -- "$LAB" ":(exclude)$ARCHIVE_DIR"
( cd "$ARCHIVE_DIR" && sha256sum "$(basename "$ARCHIVE")" >> SHA256SUMS )
CONTENT_SHA="$(git rev-parse --short HEAD)"

git add "$ARCHIVE" "$ARCHIVE_DIR/SHA256SUMS"
git commit -q -F - <<EOF
$TAG — archive figée

Archive : $ARCHIVE (contenu du commit $CONTENT_SHA)

$(printf "%b" "$TRAILERS")
EOF

# 3. Tag annoté
NOTES="$(awk -v v="$VERSION" '$0 ~ "^## \\["v"\\]" {f=1; next} f && /^## \[/ {exit} f {print}' "$CHANGELOG")"
git tag -a "$TAG" -m "$TAG — $TITLE" -m "$NOTES"

# 4. Push (branche + tag) avec reprises
push() {
  local n=0 delay=2
  until git push "$@"; do
    n=$((n+1)); [[ $n -ge 4 ]] && return 1
    echo "Push échoué, nouvel essai dans ${delay}s..."; sleep "$delay"; delay=$((delay*2))
  done
}
push -u origin "$BRANCH" || echo "AVERTISSEMENT : push de la branche échoué."
push origin "$TAG" || echo "AVERTISSEMENT : push du tag $TAG refusé ou échoué — l'archive zip sur la branche reste la référence."

echo "OK : $TAG figé (contenu $CONTENT_SHA, archive $ARCHIVE)."
