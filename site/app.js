(function () {
  const REMEMBER_THEME = true;
  const S = window.SITE;
  const main = document.getElementById("main");
  const root = document.documentElement;
  const LABELS = { film: "Film", polaroid: "Polaroid" };

  document.getElementById("year").textContent = new Date().getFullYear();

  /* ---------- theme ---------- */
  document.getElementById("toggle").onclick = () => {
    const t = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = t;
    if (REMEMBER_THEME) { try { localStorage.setItem("theme", t); } catch (e) {} }
  };

  /* ---------- helpers ---------- */
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function img(p, alt, eager) {
    return `<img src="${p.s}" width="${p.w}" height="${p.h}" alt="${esc(alt)}"
      ${eager ? "" : 'loading="lazy"'} decoding="async">`;
  }

  function subnav(section, groups, current) {
    return `<div class="subnav">${groups.map((g) =>
      `<a href="#/${section}/${g.slug}" class="${g.slug === current ? "active" : ""}">${esc(g.name)}<span class="count">${g.photos.length}</span></a>`
    ).join("")}</div>`;
  }

  /* ---------- pages ---------- */
  function home() {
    const list = Array.isArray(S.home) ? S.home : S.home ? [S.home] : [];
    main.innerHTML = list.length
      ? `<div class="home" style="--n:${list.length}">${list.map((p) => img({ ...p, s: p.l }, "Self-portrait of Lingyin Zhang", true)).join("")}</div>`
      : "";
  }

  function about() {
    const a = S.about;
    main.innerHTML = `<div class="about">
      ${a.paragraphs.map((p) => `<p>${esc(p)}</p>`).join("")}
      ${a.email ? `<p><a href="mailto:${esc(a.email)}">${esc(a.email)}</a></p>` : ""}
    </div>`;
  }

  function sectionIndex(section) {
    const groups = S.sections[section] || [];
    if (!groups.length) { main.innerHTML = `<p class="empty">Coming soon.</p>`; return; }
    main.innerHTML = `<div class="${section}">
      ${subnav(section, groups, null)}
      <div class="grid">${groups.map((g, i) => {
        const c = g.photos[0];
        return `<a class="item cover" href="#/${section}/${g.slug}" style="--ar:${(c.w / c.h).toFixed(4)}">
          ${img(c, g.name, i < 6)}<div class="label">${esc(g.name)}</div></a>`;
      }).join("")}</div></div>`;
  }

  function group(section, slug) {
    const groups = S.sections[section] || [];
    const g = groups.find((x) => x.slug === slug);
    if (!g) return sectionIndex(section);
    main.innerHTML = `<div class="${section}">
      ${subnav(section, groups, slug)}
      <div class="grid">${g.photos.map((p, i) =>
        `<div class="item" data-i="${i}" style="--ar:${(p.w / p.h).toFixed(4)}">
          ${img(p, p.title || g.name, i < 6)}
          ${p.title ? `<div class="hover-title">${esc(p.title)}</div>` : ""}
        </div>`).join("")}</div></div>`;
    main.querySelectorAll(".item").forEach((el) =>
      el.addEventListener("click", () => openLightbox(g.photos, +el.dataset.i)));
  }

  /* ---------- router ---------- */
  function route() {
    closeLightbox();
    const [section, slug] = location.hash.replace(/^#\/?/, "").split("/");
    document.querySelectorAll("[data-nav]").forEach((a) =>
      a.classList.toggle("active", a.dataset.nav === section));
    if (section === "about") about();
    else if (LABELS[section]) slug ? group(section, decodeURIComponent(slug)) : sectionIndex(section);
    else home();
    const label = section === "about" ? "About" : LABELS[section];
    document.title = label ? `${label} — Lingyin Zhang` : "Lingyin Zhang — Photography";
    window.scrollTo(0, 0);
  }

  /* ---------- lightbox ---------- */
  const lb = document.getElementById("lightbox");
  const lbImg = document.getElementById("lb-img");
  const lbCap = document.getElementById("lb-cap");
  const prev = document.getElementById("lb-prev");
  const next = document.getElementById("lb-next");
  let list = [], idx = 0;

  function show() {
    const p = list[idx];
    lbImg.src = p.l;
    lbImg.alt = p.title || "";
    const count = list.length > 1 ? `${idx + 1} / ${list.length}` : "";
    lbCap.textContent = [p.title, count].filter(Boolean).join("   ·   ");
    prev.hidden = next.hidden = list.length < 2;
    [list[idx + 1], list[idx - 1]].forEach((n) => { if (n) new Image().src = n.l; }); // preload neighbours
  }
  function openLightbox(photos, i) {
    list = photos; idx = i; show();
    lb.hidden = false; document.body.style.overflow = "hidden";
  }
  function closeLightbox() {
    if (lb.hidden) return;
    lb.hidden = true; document.body.style.overflow = ""; lbImg.removeAttribute("src");
  }
  const step = (d) => { if (list.length > 1) { idx = (idx + d + list.length) % list.length; show(); } };

  prev.onclick = (e) => { e.stopPropagation(); step(-1); };
  next.onclick = (e) => { e.stopPropagation(); step(1); };
  document.getElementById("lb-close").onclick = closeLightbox;
  lb.addEventListener("click", (e) => { if (e.target === lb) closeLightbox(); });
  document.addEventListener("keydown", (e) => {
    if (lb.hidden) return;
    if (e.key === "ArrowRight") step(1);
    else if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "Escape") closeLightbox();
  });
  let x0 = null;
  lb.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
    x0 = null;
  });

  window.addEventListener("hashchange", route);
  route();
})();
