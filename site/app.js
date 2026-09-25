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
    return `<img class="bl" onload="this.classList.add('in')" src="${p.s}" width="${p.w}" height="${p.h}" alt="${esc(alt)}"
      ${eager ? "" : 'loading="lazy"'} decoding="async">`;
  }

  function subnav(section, groups, current) {
    return `<div class="subnav">${groups.map((g) =>
      `<a href="#/${section}/${g.slug}" class="${g.slug === current ? "active" : ""}">${esc(g.name)}<span class="count">${g.photos.length}</span></a>`
    ).join("")}</div>`;
  }

  /* ---------- pages ---------- */
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let cleanup = null;           // tear-down for the page currently shown (e.g. the ring)

  function home() {
    const list = Array.isArray(S.home) ? S.home : S.home ? [S.home] : [];
    if (list.length < 2) {
      main.innerHTML = list.length
        ? `<div class="home">${img({ ...list[0], s: list[0].l }, "Self-portrait of Lingyin Zhang", true)}</div>` : "";
      return;
    }
    main.innerHTML = `<div class="ring-wrap" tabindex="0" aria-label="Self-portraits — scroll, drag or use the arrow keys to turn">
      <div class="ring">${list.map((p, i) =>
        `<div class="ring-card" data-i="${i}">${img({ ...p, s: p.l }, "Self-portrait of Lingyin Zhang", true)}</div>`).join("")}</div>
      <p class="ring-hint">scroll or drag</p>
    </div>`;
    cleanup = ring(main.querySelector(".ring-wrap"));
  }

  /* the landing-page ring: photos sit on a slowly turning carousel */
  function ring(wrap) {
    const cards = [...wrap.querySelectorAll(".ring-card")];
    const n = cards.length, step = 360 / n;
    const hint = wrap.querySelector(".ring-hint");
    let angle = 0, target = 0, raf = 0, drag = null, idle = 0;

    function frame() {
      angle += (target - angle) * (reduceMotion ? 1 : 0.085);
      const r = cards[0].offsetWidth * (innerWidth < 640 ? 0.62 : n <= 3 ? 0.95 : 1.15);
      cards.forEach((c, i) => {
        const deg = i * step + angle, th = deg * Math.PI / 180;
        const front = (Math.cos(th) + 1) / 2;             // 1 = facing you, 0 = at the back
        c.style.transform = `translate(-50%, -50%) translate3d(${(Math.sin(th) * r).toFixed(1)}px, 0, ${((Math.cos(th) - 1) * r).toFixed(1)}px) rotateY(${(deg * 0.3).toFixed(2)}deg)`;
        c.style.opacity = (0.3 + 0.7 * front).toFixed(3);
        c.style.zIndex = Math.round(front * 100);
        c.style.filter = front > 0.98 ? "none" : `blur(${((1 - front) * 2.5).toFixed(2)}px)`;
      });
      raf = (Math.abs(target - angle) > 0.02 || drag) ? requestAnimationFrame(frame) : 0;
    }
    const go = () => { if (!raf) raf = requestAnimationFrame(frame); };
    const snap = () => { target = Math.round(target / step) * step; go(); };
    const touched = () => { hint.classList.add("gone"); clearTimeout(idle); idle = setTimeout(snap, 160); };
    const toFront = (i) => { const base = -i * step; target = base + Math.round((target - base) / 360) * 360; go(); };

    wrap.addEventListener("wheel", (e) => {
      e.preventDefault();
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      target -= Math.max(-60, Math.min(60, d)) * 0.3;
      touched(); go();
    }, { passive: false });
    wrap.addEventListener("pointerdown", (e) => {
      drag = { x: e.clientX, a: target, moved: 0 };
      wrap.setPointerCapture(e.pointerId); wrap.classList.add("grabbing"); go();
    });
    wrap.addEventListener("pointermove", (e) => {
      if (!drag) return;
      drag.moved = Math.max(drag.moved, Math.abs(e.clientX - drag.x));
      target = drag.a + (e.clientX - drag.x) * 0.35; hint.classList.add("gone");
    });
    const end = (e) => {
      if (!drag) return;
      const tap = drag.moved < 6; drag = null; wrap.classList.remove("grabbing");
      if (tap) {                                    // tap a card at the back to bring it forward
        const hit = document.elementsFromPoint(e.clientX, e.clientY).find((el) => el.classList && el.classList.contains("ring-card"));
        if (hit) { toFront(+hit.dataset.i); return; }
      }
      snap();
    };
    wrap.addEventListener("pointerup", end);
    wrap.addEventListener("pointercancel", end);
    const onKey = (e) => {
      if (!lb.hidden || aboutOpen) return;
      if (e.key === "ArrowRight") { target -= step; hint.classList.add("gone"); go(); }
      if (e.key === "ArrowLeft") { target += step; hint.classList.add("gone"); go(); }
    };
    document.addEventListener("keydown", onKey);
    addEventListener("resize", go);
    frame();
    return () => { cancelAnimationFrame(raf); clearTimeout(idle); document.removeEventListener("keydown", onKey); removeEventListener("resize", go); };
  }

  function sectionIndex(section) {
    const groups = S.sections[section] || [];
    if (!groups.length) { main.innerHTML = `<div><p class="empty">Coming soon.</p></div>`; return; }
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

  /* ---------- About: a panel that slides down from the top ---------- */
  const aboutPanel = document.getElementById("about");
  const aboutLink = document.querySelector('[data-nav="about"]');
  let aboutOpen = false;
  (function fillAbout() {
    const a = S.about || { paragraphs: [], email: "" };
    let d = 0;
    document.getElementById("about-bio").innerHTML =
      a.paragraphs.map((p) => `<p class="reveal" style="--d:${(d++) * 70}ms">${esc(p)}</p>`).join("");
    document.getElementById("about-contact").innerHTML = a.email
      ? `<p class="reveal" style="--d:${(d++) * 70}ms"><a href="mailto:${esc(a.email)}">${esc(a.email)}</a></p>` : "";
  })();
  function setAbout(open) {
    aboutOpen = open;
    document.body.classList.toggle("about-open", open);
    aboutPanel.setAttribute("aria-hidden", String(!open));
    aboutLink.classList.toggle("active", open);
  }
  aboutLink.addEventListener("click", (e) => { e.preventDefault(); setAbout(!aboutOpen); });
  document.getElementById("about-close").onclick = () => setAbout(false);
  document.getElementById("about-backdrop").onclick = () => setAbout(false);
  document.addEventListener("keydown", (e) => { if (aboutOpen && e.key === "Escape") setAbout(false); });

  /* ---------- transitions between pages ---------- */
  const ORDER = { "": 0, film: 1, polaroid: 2 };
  const settle = (anims) => Promise.all(anims.map((a) => a.finished.catch(() => {})));
  const visible = (els) => els.filter((el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; });
  const rnd = (m) => (Math.random() * 2 - 1) * m;

  // same category, different project: the photos drop away, the new ones fall into place
  function fallOut() {
    const items = visible([...main.querySelectorAll(".item")]);
    return settle(items.map((el, i) => el.animate([
      { transform: "none", opacity: 1 },
      { transform: `translateY(${Math.round(innerHeight * 0.75)}px) rotate(${rnd(9).toFixed(1)}deg)`, opacity: 0 },
    ], { duration: 520, delay: i * 26, easing: "cubic-bezier(.55,0,.85,.3)", fill: "forwards" })));
  }
  function fallIn() {
    visible([...main.querySelectorAll(".item")]).forEach((el, i) => el.animate([
      { transform: `translateY(-90px) rotate(${rnd(6).toFixed(1)}deg)`, opacity: 0 },
      { transform: "none", opacity: 1 },
    ], { duration: 760, delay: i * 45, easing: "cubic-bezier(.2,.9,.3,1.12)", fill: "backwards" }));
  }
  // different section (Film ↔ Polaroid ↔ home): the page glides sideways like film advancing
  function slideOut(dir) {
    const v = main.firstElementChild;
    return v ? settle([v.animate([
      { transform: "none", opacity: 1 },
      { transform: `translateX(${-dir * 8}vw)`, opacity: 0 },
    ], { duration: 380, easing: "cubic-bezier(.6,0,.9,.4)", fill: "forwards" })]) : Promise.resolve();
  }
  function slideIn(dir) {
    const v = main.firstElementChild;
    if (!v) return;
    v.animate([
      { transform: `translateX(${dir * 8}vw)`, opacity: 0 },
      { transform: "none", opacity: 1 },
    ], { duration: 700, easing: "cubic-bezier(.2,.8,.2,1)" });
    visible([...v.querySelectorAll(".item")]).forEach((el, i) => el.animate(
      [{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: 120 + i * 35, fill: "backwards" }));
  }

  /* ---------- router ---------- */
  let current = null, navToken = 0;
  async function route() {
    closeLightbox();
    let [section = "", slug = ""] = location.hash.replace(/^#\/?/, "").split("/");
    if (section === "about") {                       // old links to #/about open the panel over the homepage
      setAbout(true);
      if (current) return;
      section = "";
    } else if (aboutOpen) setAbout(false);
    if (!LABELS[section]) { section = ""; slug = ""; }
    slug = decodeURIComponent(slug);
    const next = { section, slug };
    if (current && current.section === next.section && current.slug === next.slug) return;

    const prev = current;
    const kind = !prev || reduceMotion ? null : (prev.section === next.section && next.section ? "fall" : "slide");
    const dir = prev ? (Math.sign(ORDER[next.section] - ORDER[prev.section]) || 1) : 1;
    const my = ++navToken;
    current = next;
    document.querySelectorAll("nav a[data-nav]").forEach((a) =>
      a.dataset.nav !== "about" && a.classList.toggle("active", a.dataset.nav === section));
    document.title = LABELS[section] ? `${LABELS[section]} — Lingyin Zhang` : "Lingyin Zhang — Photography";

    if (kind === "fall") await fallOut(); else if (kind === "slide") await slideOut(dir);
    if (my !== navToken) return;                     // a newer click took over
    if (cleanup) { cleanup(); cleanup = null; }
    if (LABELS[section]) slug ? group(section, slug) : sectionIndex(section); else home();
    window.scrollTo(0, 0);
    if (kind === "fall") fallIn(); else if (kind === "slide") slideIn(dir);
  }

  /* ---------- viewer: large photo + filmstrip + progress line ---------- */
  const lb = document.getElementById("lightbox");
  const lbImg = document.getElementById("lb-img");
  const lbTitle = document.getElementById("lb-title");
  const lbCount = document.getElementById("lb-count");
  const strip = document.getElementById("lb-strip");
  const bar = document.getElementById("lb-bar");
  const prev = document.getElementById("lb-prev");
  const next = document.getElementById("lb-next");
  let list = [], idx = 0, token = 0;

  function show() {
    const p = list[idx];
    const my = ++token;
    // start from the (already loaded) grid-size copy, softly blurred, then sharpen with the large one
    lbImg.classList.add("soft");
    lbImg.src = p.s;
    lbImg.alt = p.title || "";
    const hi = new Image();
    hi.onload = () => {
      if (my !== token) return;
      lbImg.src = p.l;
      requestAnimationFrame(() => requestAnimationFrame(() => lbImg.classList.remove("soft")));
    };
    hi.src = p.l;

    lbTitle.textContent = p.title || "";
    lbCount.textContent = list.length > 1 ? `${idx + 1} / ${list.length}` : "";
    bar.style.width = `${((idx + 1) / list.length) * 100}%`;
    strip.querySelectorAll("button").forEach((b, i) => b.classList.toggle("on", i === idx));
    const on = strip.children[idx];
    if (on) strip.scrollTo({ left: on.offsetLeft - strip.clientWidth / 2 + on.clientWidth / 2 });
    [list[idx + 1], list[idx - 1]].forEach((n) => { if (n) new Image().src = n.l; }); // preload neighbours
  }
  function openLightbox(photos, i) {
    list = photos; idx = i;
    lb.classList.toggle("single", list.length < 2);
    strip.innerHTML = list.map((p, n) =>
      `<button data-i="${n}" aria-label="Photo ${n + 1}"><img class="bl" onload="this.classList.add('in')" src="${p.t || p.s}" alt="" loading="lazy" decoding="async"></button>`
    ).join("");
    lb.hidden = false; document.body.style.overflow = "hidden";
    show();
  }
  function closeLightbox() {
    if (lb.hidden) return;
    lb.hidden = true; document.body.style.overflow = ""; token++; lbImg.removeAttribute("src");
  }
  const step = (d) => { if (list.length > 1) { idx = (idx + d + list.length) % list.length; show(); } };

  prev.onclick = (e) => { e.stopPropagation(); step(-1); };
  next.onclick = (e) => { e.stopPropagation(); step(1); };
  strip.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (b) { idx = +b.dataset.i; show(); }
  });
  document.getElementById("lb-close").onclick = closeLightbox;
  document.getElementById("lb-stage").addEventListener("click", (e) => { if (e.target.id === "lb-stage") closeLightbox(); });
  document.addEventListener("keydown", (e) => {
    if (lb.hidden) return;
    if (e.key === "ArrowRight") step(1);
    else if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "Escape") closeLightbox();
  });
  // scrolling (mouse wheel / trackpad) moves through the photos
  let acc = 0, lock = 0;
  lb.addEventListener("wheel", (e) => {
    e.preventDefault();
    const now = Date.now();
    if (now < lock) return;
    acc += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(acc) > 40) { step(acc > 0 ? 1 : -1); acc = 0; lock = now + 450; }
  }, { passive: false });
  // swipe on phones
  let x0 = null;
  lb.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40 && !e.target.closest(".lb-strip")) step(dx < 0 ? 1 : -1);
    x0 = null;
  });

  window.addEventListener("hashchange", route);
  route();
})();
