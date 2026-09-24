#!/bin/bash
# Double-click this file after adding new photos, before committing in GitHub Desktop.
# It makes big scans website-sized (max 3000 px, good-quality JPEG) and keeps the
# full-size original in the _originals folder, which is never uploaded.
cd "$(dirname "$0")" || exit 1
echo "Shrinking new photos for the website..."
echo ""
count=0
while IFS= read -r -d '' f; do
  size=$(stat -f%z "$f")
  w=$(sips -g pixelWidth "$f" 2>/dev/null | awk '/pixelWidth/{print $2}')
  h=$(sips -g pixelHeight "$f" 2>/dev/null | awk '/pixelHeight/{print $2}')
  [ -z "$w" ] && continue
  long=$(( w > h ? w : h ))
  ext="${f##*.}"
  lower=$(echo "$ext" | tr 'A-Z' 'a-z')
  isjpg=0; { [ "$lower" = "jpg" ] || [ "$lower" = "jpeg" ]; } && isjpg=1
  # already website-sized: leave it alone
  if [ "$long" -le 3000 ] && [ "$size" -le 2500000 ] && [ "$isjpg" = 1 ]; then continue; fi

  backup="_originals/$f"
  mkdir -p "$(dirname "$backup")"
  [ -e "$backup" ] || cp -p "$f" "$backup"

  if [ "$isjpg" = 1 ]; then out="$f"; else out="${f%.*}.jpg"; fi
  tmp="$(dirname "$f")/.shrinking-tmp.jpg"
  args=(-s format jpeg -s formatOptions 88)
  [ "$long" -gt 3000 ] && args+=(-Z 3000)
  if sips "${args[@]}" "$f" --out "$tmp" >/dev/null 2>&1; then
    mv -f "$tmp" "$out"
    [ "$isjpg" = 0 ] && rm -f "$f"
    count=$((count + 1))
    echo "  done: $f"
  else
    rm -f "$tmp"
    echo "  could not shrink: $f"
  fi
done < <(find photos -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.tif' -o -iname '*.tiff' -o -iname '*.heic' \) ! -name '.*' -print0)

echo ""
echo "Finished: $count photo(s) shrunk. Full-size copies are in the _originals folder."
echo "You can close this window and commit in GitHub Desktop."
