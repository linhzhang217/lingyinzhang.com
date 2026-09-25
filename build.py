"""
Builds the website from the `photos` folder.

You never need to run this yourself: GitHub runs it automatically every time
you upload photos. It shrinks every photo for fast loading, removes hidden
camera/GPS data, and writes the finished site into the `_site` folder.

Folder rules
  photos/home/                  -> the photos on the homepage (side by side, up to 4)
  photos/film/<Project>/        -> one folder per film project
  photos/polaroid/<Category>/   -> one folder per Polaroid category
A number at the start of a folder or file name ("01 ", "02 - ") only sets the
order and is hidden on the site. A file name becomes the photo's title, unless
it looks like a camera default (IMG_1234, DSC0001, scan 12, 0001 ...).
"""
import json, re, shutil, sys, base64, io
from pathlib import Path
from PIL import Image, ImageOps
try:                                    # lets iPhone .HEIC files work too
    import pillow_heif
    pillow_heif.register_heif_opener()
except ImportError:
    pass

ROOT = Path(__file__).parent
PHOTOS = ROOT / "photos"
OUT = ROOT / "_site"
SECTIONS = ["film", "polaroid"]
EXTS = {".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff", ".heic"}
SIZES = {"t": 360, "s": 1000, "l": 2200}  # long edge in pixels: filmstrip / grid / large view
QUALITY = 80

INLINE = "--inline" in sys.argv          # one-file preview with images embedded

DEFAULT_NAME = re.compile(r"^(img|dsc|dscf|dscn|pxl|scan|scanned|image|photo|untitled|r\d|_mg)?([\s_\-]*\d+)*[\s_\-]*$", re.I)


def natural_key(p):
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", p.name)]


def clean(name):
    """'01 - Night Walk' -> 'Night Walk'"""
    return re.sub(r"^\d+\s*[-_.)]?\s*", "", name).strip()


def title_for(path):
    t = clean(path.stem).replace("_", " ").strip()
    return "" if not t or DEFAULT_NAME.match(path.stem.strip()) or DEFAULT_NAME.match(t) else t


def slug(text):
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return s or "untitled"


def images_in(folder):
    return sorted((f for f in folder.iterdir() if f.suffix.lower() in EXTS and not f.name.startswith(".")),
                  key=natural_key)


def process(src, rel_base):
    try:
        im = Image.open(src)
    except Exception as e:  # HEIC without plugin, broken file...
        print(f"  ! skipped {src.name}: {e}")
        return None
    im = ImageOps.exif_transpose(im).convert("RGB")
    w, h = im.size
    entry = {"w": w, "h": h}
    for key, edge in SIZES.items():
        copy = im.copy()
        copy.thumbnail((edge, edge), Image.LANCZOS)
        buf = io.BytesIO()
        copy.save(buf, "WEBP", quality=QUALITY, method=6)   # no EXIF/GPS is written
        if INLINE:
            entry[key] = "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()
        else:
            rel = f"img/{rel_base}-{key}.webp"
            (OUT / rel).write_bytes(buf.getvalue())
            entry[key] = rel
    return entry


def read_about():
    f = ROOT / "about.txt"
    if not f.exists():
        return {"paragraphs": [], "email": ""}
    paras, email = [], ""
    for block in re.split(r"\n\s*\n", f.read_text(encoding="utf-8").strip()):
        block = " ".join(block.split())
        if re.fullmatch(r"(email:\s*)?\S+@\S+\.\S+", block, re.I):
            email = re.sub(r"^email:\s*", "", block, flags=re.I)
        elif block:
            paras.append(block)
    return {"paragraphs": paras, "email": email}


def main():
    if OUT.exists():
        shutil.rmtree(OUT)
    (OUT / "img").mkdir(parents=True)

    data = {"home": [], "sections": {}, "about": read_about()}

    home = PHOTOS / "home"
    if home.exists():
        data["home"] = [e for i, f in enumerate(images_in(home)[:4], 1)
                        if (e := process(f, f"home-{i}"))]

    for section in SECTIONS:
        groups = []
        base = PHOTOS / section
        folders = sorted((d for d in base.iterdir() if d.is_dir()), key=natural_key) if base.exists() else []
        used = set()
        for folder in folders:
            files = images_in(folder)
            if not files:
                continue
            name = clean(folder.name) or folder.name
            s = slug(name)
            while s in used:
                s += "-2"
            used.add(s)
            print(f"{section} / {name}: {len(files)} photo(s)")
            photos = []
            for i, f in enumerate(files, 1):
                e = process(f, f"{section}-{s}-{i:03d}")
                if e:
                    e["title"] = title_for(f)
                    photos.append(e)
            if photos:
                groups.append({"name": name, "slug": s, "photos": photos})
        data["sections"][section] = groups

    js = "window.SITE = " + json.dumps(data, ensure_ascii=False) + ";"
    tpl = ROOT / "site"
    html = (tpl / "index.html").read_text(encoding="utf-8")
    css = (tpl / "style.css").read_text(encoding="utf-8")
    app = (tpl / "app.js").read_text(encoding="utf-8")

    if INLINE:
        html = html.replace('try { t = localStorage.getItem("theme"); } catch (e) {}', "")
        html = html.replace('<link rel="stylesheet" href="style.css">', f"<style>{css}</style>")
        html = html.replace('<script src="data.js"></script>', f"<script>{js}</script>")
        html = html.replace('<script src="app.js"></script>',
                            "<script>" + app.replace("const REMEMBER_THEME = true", "const REMEMBER_THEME = false") + "</script>")
        target = Path(sys.argv[sys.argv.index("--inline") + 1]) if len(sys.argv) > sys.argv.index("--inline") + 1 else OUT / "preview.html"
        target.write_text(html, encoding="utf-8")
        shutil.rmtree(OUT)
        print(f"preview written to {target}")
        return

    (OUT / "index.html").write_text(html, encoding="utf-8")
    (OUT / "style.css").write_text(css, encoding="utf-8")
    (OUT / "app.js").write_text(app, encoding="utf-8")
    (OUT / "data.js").write_text(js, encoding="utf-8")
    (OUT / ".nojekyll").write_text("")
    if (ROOT / "CNAME").exists():
        shutil.copy(ROOT / "CNAME", OUT / "CNAME")
    print("site built in _site/")


if __name__ == "__main__":
    main()
