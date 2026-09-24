# Your website — how it works

Live at: https://linhzhang217.github.io/lingyinzhang.com/

## How the folders work

```
lingyinzhang.com/
├── about.txt                  ← your bio and email (edit in TextEdit)
├── Shrink new photos.command  ← double-click after adding photos
├── _originals/                ← full-size scans (stays on your Mac, never uploaded)
└── photos/                    ← website-sized photos (these get uploaded)
    ├── home/                  ← photos on the homepage, side by side
    ├── film/
    │   └── 01 Untitled I/     ← one folder = one film project
    └── polaroid/
        ├── 01 Portrait/       ← one folder = one Polaroid category
        └── 02 Microcosm/
```

- **New project or category:** make a new folder inside `film` or `polaroid`. The folder name is the name on the site.
- **Order:** the number at the start (`01 `, `02 - `) sets the order and is hidden on the site. The first photo in a folder is its cover.
- **Photo titles (shown on hover):** the file name, e.g. `03 - Morning Tide.jpg`. Camera names like `IMG_1234.jpg` or `Image_20260924_0001.jpg` show no title.
- **Removing a photo:** delete it from the `photos` folder.

---

## Adding photos (every time)

1. Drop photos into the right folder inside `photos`.
2. **Double-click `Shrink new photos.command`.** A Terminal window lists what it shrank; close it when it says *Finished*. (Your full-size scans are kept in `_originals`.)
3. Open **GitHub Desktop** → type a short note like `Add new portraits` → **Commit to main** → **Push origin**.
4. About 2 minutes later the site is updated. Reload with **Cmd + Shift + R**.

The first time you double-click the shrink file, macOS may ask whether to open it — click **Open**.

## Keep your originals safe

`_originals` is *not* uploaded to GitHub, so it only exists on this Mac. Back it up (iCloud Drive, an external drive, or Google Drive) like any other important photos.

## Space

GitHub recommends keeping the project under 1 GB. Website-sized photos are about 0.5–1.5 MB each, so that's roughly 700+ photos.

---

## If you ever need to set it up again

1. **GitHub Desktop:** File → Add Local Repository → choose this folder → *create a repository* → Create Repository → **Publish repository** (untick *Keep this code private*).
2. **github.com:** open the project → **Settings → Pages → Source: GitHub Actions**.
3. **Actions** tab → **Publish website** → **Run workflow**.
