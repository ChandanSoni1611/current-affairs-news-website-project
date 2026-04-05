"use strict";

const CFG = {
  API_KEY: "4f0fd232ab8d4bd2bd6a37668ba6dafc",
  BASE: "https://newsapi.org/v2/top-headlines",
  COUNTRY: "in",
  FALLBACK_SOURCE_INDIA: "google-news-in",
  FALLBACK_COUNTRY: "us",
  PAGE_SIZE: 8,
};

const TOP_SECTIONS = [
  { id: "india-top",     label: "India",         category: "general",       country: "in", color: "var(--c-india)" },
  { id: "business",      label: "Business",      category: "business",      country: "us", color: "var(--c-business)" },
  { id: "technology",    label: "Technology",    category: "technology",    country: "us", color: "var(--c-technology)" },
  { id: "sports",        label: "Sports",        category: "sports",        country: "gb", color: "var(--c-sports)" },
  { id: "entertainment", label: "Entertainment", category: "entertainment", country: "us", color: "var(--c-entertainment)" },
  { id: "health",        label: "Health",        category: "health",        country: "us", color: "var(--c-health)" },
  { id: "science",       label: "Science",       category: "science",       country: "us", color: "var(--c-climate)" },
];

const TAB_CFG = {
  top:           { hero: true, sections: TOP_SECTIONS },
  india:         { category: "general",       country: "in", color: "var(--c-india)",         label: "India News" },
  global:        { global: true,              color: "var(--c-global)",  label: "Global News" },
  business:      { category: "business",      country: "us", color: "var(--c-business)",      label: "Business" },
  technology:    { category: "technology",    country: "us", color: "var(--c-technology)",    label: "Technology" },
  entertainment: { category: "entertainment", country: "us", color: "var(--c-entertainment)", label: "Entertainment" },
  climate:       { category: "science",       country: "us", color: "var(--c-climate)",       label: "Climate & Environment" },
  sports:        { category: "sports",        country: "gb", color: "var(--c-sports)",        label: "Sports" },
  health:        { category: "health",        country: "us", color: "var(--c-health)",        label: "Health & Science" },
};

const GLOBAL_COUNTRIES = [
  { country: "us", label: "United States", flag: "🇺🇸" },
  { country: "gb", label: "United Kingdom", flag: "🇬🇧" },
  { country: "au", label: "Australia", flag: "🇦🇺" },
  { country: "ca", label: "Canada", flag: "🇨🇦" },
  { country: "fr", label: "France", flag: "🇫🇷" },
  { country: "de", label: "Germany", flag: "🇩🇪" },
  { country: "jp", label: "Japan", flag: "🇯🇵" },
];

const S = { tab: "top", loaded: new Set(), page: {}, totalRes: {} };

const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

const D = {
  tabBar:      $("tabBar"),
  tabSlider:   $("tabSlider"),
  mobTabs:     $("mobTabs"),
  mobDrawer:   $("mobDrawer"),
  ham:         $("ham"),
  wSpinner:    $("wSpinner"),
  wInfo:       $("wInfo"),
  wIcon:       $("wIcon"),
  wTemp:       $("wTemp"),
  wLoc:        $("wLoc"),
  tickerInner: $("tickerInner"),
  dateChip:    $("dateChip"),
  searchInput: $("searchInput"),
  sClear:      $("sClear"),
  heroSection: $("heroSection"),
  streamTop:   $("streamTop"),
};

/* ── helpers ── */
function timeAgo(d) {
  if (!d) return "Recently";
  const mins = Math.floor((Date.now() - new Date(d)) / 60000);
  if (Number.isNaN(mins) || mins < 0) return "Recently";
  if (mins < 2) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
function cut(s, n) { return s && s.length > n ? s.slice(0, n - 1) + "…" : (s || ""); }
function safeText(v, fb = "") {
  return String(v ?? fb).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function skCards(n = 4) { return Array(n).fill('<div class="art-skeleton"></div>').join(""); }
function normalizeArticle(a) {
  return { title: a?.title||"", desc: a?.description||"", url: a?.url||"",
           image: a?.urlToImage||"", source: a?.source?.name||"Unknown", time: a?.publishedAt||"" };
}
function cleanArticles(list = []) {
  const seen = new Set();
  return list.map(normalizeArticle).filter(a => {
    if (!a.title || !a.url) return false;
    const t = a.title.trim().toLowerCase();
    if (t === "[removed]" || t === "google news" || t.length < 10) return false;
    if (seen.has(t)) return false;
    seen.add(t); return true;
  });
}
async function fetchJson(url) {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.status === "error") throw new Error(data.message || `HTTP ${res.status}`);
  return data;
}

/* ── news fetcher with India fallback chain ── */
async function getNews(params = {}) {
  if (params.global) return { articles: [] };
  const buildUrl = (obj) => {
    const u = new URL(CFG.BASE);
    Object.entries(obj).forEach(([k,v]) => { if (v!=null && v!=="") u.searchParams.set(k,v); });
    u.searchParams.set("apiKey", CFG.API_KEY);
    return u.toString();
  };
  let articles = [];
  const country = params.country || CFG.COUNTRY;

  if (country === "in") {
    // India: try in → google-news-in → us fallback
    for (const attempt of [
      { country:"in", category:params.category, q:params.q, page:params.page||1, pageSize:params.pageSize||CFG.PAGE_SIZE },
      { sources:CFG.FALLBACK_SOURCE_INDIA, page:params.page||1, pageSize:params.pageSize||CFG.PAGE_SIZE },
      { country:"us", category:params.category, page:params.page||1, pageSize:params.pageSize||CFG.PAGE_SIZE },
    ]) {
      try {
        const d = await fetchJson(buildUrl(attempt));
        articles = cleanArticles(d.articles || []);
        if (articles.length) return { articles, totalResults: d.totalResults || articles.length };
      } catch(e) {}
    }
  } else {
    // Non-India: fetch directly, no country label needed
    try {
      const d = await fetchJson(buildUrl({
        country, category:params.category, q:params.q,
        page:params.page||1, pageSize:params.pageSize||CFG.PAGE_SIZE
      }));
      articles = cleanArticles(d.articles || []);
      return { articles, totalResults: d.totalResults || articles.length };
    } catch(e) {}
  }
  return { articles: [], totalResults: 0 };
}

/* ── weather / date ── */
function initWeather() {
  D.wSpinner.style.display = "none";
  D.wInfo.style.display = "flex";
  D.wIcon.textContent = "🌤️";
  D.wTemp.textContent = "--°";
  D.wLoc.textContent = "Location off";
}
function initDate() {
  D.dateChip.textContent = new Date().toLocaleDateString("en-IN",
    { weekday:"long", year:"numeric", month:"long", day:"numeric" });
}

/* ── ticker ── */
async function loadTicker() {
  try {
    const d = await getNews({ category:"general", country:"in", pageSize:10 });
    D.tickerInner.textContent = d.articles.length
      ? d.articles.map(a => a.title).join("  ◆  ")
      : "No headlines available right now.";
  } catch(e) { D.tickerInner.textContent = "Unable to load headlines."; }
}

/* ── article card ── */
function buildCard(a, color = "var(--ice-500)", idx = 0) {
  const card = document.createElement("div");
  card.className = "art-card";
  card.style.animationDelay = `${idx * 0.055}s`;
  card.style.setProperty("--sec-color", color);
  const title  = safeText(cut(a.title, 100));
  const source = safeText(a.source || "Unknown");
  if (a.image) {
    card.innerHTML = `
      <div class="art-img">
        <img src="${a.image}" alt="${title}" loading="lazy"
             onerror="this.closest('.art-card').classList.add('no-image');this.parentElement.remove();" />
        <span class="art-cat-badge">${source}</span>
      </div>
      <div class="art-body">
        <div class="art-src">${source}</div>
        <div class="art-title">${title}</div>
        <div class="art-foot">
          <span>${timeAgo(a.time)}</span>
          <a class="art-read" href="${a.url}" target="_blank" rel="noopener" onclick="event.stopPropagation()">Read →</a>
        </div>
      </div>`;
  } else {
    card.classList.add("no-image");
    card.innerHTML = `
      <div class="art-body">
        <div class="art-src">${source}</div>
        <div class="art-title">${title}</div>
        <div class="art-foot">
          <span>${timeAgo(a.time)}</span>
          <a class="art-read" href="${a.url}" target="_blank" rel="noopener" onclick="event.stopPropagation()">Read →</a>
        </div>
      </div>`;
  }
  card.addEventListener("click", () => window.open(a.url, "_blank"));
  return card;
}

/* ════════════════════════════════════════════
   HERO — fixed: 2 sidebar cards + More button
   ════════════════════════════════════════════ */
async function loadHero() {
  D.heroSection.innerHTML = `
    <div class="hero-skeletons">
      <div class="sk hero-sk-lead"></div>
      <div class="sk-col"><div class="sk hero-sk-sub"></div><div class="sk hero-sk-sub"></div></div>
    </div>`;
  try {
    const d = await getNews({ category:"general", country:"in", pageSize:12 });
    const arts = d.articles;
    if (!arts.length) {
      D.heroSection.innerHTML = `<div class="err-state"><h3>No top stories available</h3></div>`;
      return;
    }
    const lead         = arts[0];
    const sideArticles = arts.slice(1, 3);   // always grab 2

    D.heroSection.innerHTML = `
      <div class="hero-grid-fill">
        <div class="hero-lead" onclick="window.open('${lead.url}','_blank')">
          ${lead.image ? `<img src="${lead.image}" alt="${safeText(lead.title)}" onerror="this.remove()" />` : ""}
          <div class="hero-lead-overlay"></div>
          <div class="hero-lead-body">
            <span class="hero-lead-cat">Top Story</span>
            <h2>${safeText(cut(lead.title, 130))}</h2>
            <div class="hero-lead-meta">
              <span>${safeText(lead.source||"Unknown")}</span>
              <span>·</span>
              <span>${timeAgo(lead.time)}</span>
            </div>
          </div>
        </div>
        <div class="hero-side-fill" id="heroSideFill"></div>
      </div>
      <div class="hero-more-wrap">
        <button class="btn-load" id="heroMoreBtn">More Top News</button>
      </div>`;

    /* ── populate sidebar with 2 mini-cards ── */
    const side = $("heroSideFill");
    sideArticles.forEach(a => {
      const el = document.createElement("div");
      el.className = "hero-mini-card";
      el.innerHTML = `
        ${a.image ? `<div class="hero-mini-img"><img src="${a.image}" alt="${safeText(a.title)}" loading="lazy" onerror="this.parentElement.remove()" /></div>` : ""}
        <div class="hero-mini-body">
          <div class="hero-mini-src">${safeText(a.source||"News")}</div>
          <h3>${safeText(cut(a.title, 95))}</h3>
          <div class="hero-mini-meta">${timeAgo(a.time)}</div>
        </div>`;
      el.addEventListener("click", () => window.open(a.url, "_blank"));
      side.appendChild(el);
    });

    /* If fewer than 2 side articles, fill remaining slots with text-only placeholders
       so the grid never looks empty */
    while (side.children.length < 2) {
      const ph = document.createElement("div");
      ph.className = "hero-mini-card";
      ph.style.background = "var(--bg-soft)";
      side.appendChild(ph);
    }

    $("heroMoreBtn")?.addEventListener("click", () => switchTab("india"));
  } catch(e) {
    D.heroSection.innerHTML = `<div class="err-state"><h3>${safeText(e.message)}</h3></div>`;
  }
}

/* ════════════════════════════════════════════
   TOP STREAM — sections with proper pagination
   Always show in groups of 4; "More" appends
   next 4 (never re-renders the whole grid).
   ════════════════════════════════════════════ */
async function loadTopStream() {
  D.streamTop.innerHTML = "";
  for (const sec of TOP_SECTIONS) {
    const block = document.createElement("div");
    block.className = "news-section";
    block.style.setProperty("--sec-color", sec.color);
    block.innerHTML = `
      <div class="sec-heading">
        <h2>${sec.label}</h2>
        <span class="sec-count" id="sc-${sec.id}"></span>
      </div>
      <div class="sec-grid" id="sg-${sec.id}">${skCards(4)}</div>
      <div class="load-wrap">
        <button class="btn-load" id="more-${sec.id}" style="display:none;">More ${sec.label} News</button>
      </div>`;
    D.streamTop.appendChild(block);

    getNews({ category:sec.category, country:sec.country, pageSize:40 })
      .then(d => {
        const grid = $(`sg-${sec.id}`);
        const btn  = $(`more-${sec.id}`);
        const all  = d.articles || [];
        let shown  = 0;

        grid.innerHTML = "";

        if (!all.length) {
          grid.innerHTML = `<div class="err-state"><h3>No articles</h3></div>`;
          return;
        }

        /* append next batch of up to 4 cards */
        function appendChunk() {
          const chunk = all.slice(shown, shown + 4);
          chunk.forEach((a, i) => grid.appendChild(buildCard(a, sec.color, shown + i)));
          shown += chunk.length;
          btn.style.display = shown < all.length ? "inline-block" : "none";
        }

        appendChunk();   // first 4

        btn.addEventListener("click", appendChunk);

        const cnt = $(`sc-${sec.id}`);
        if (cnt) cnt.textContent = `${all.length}`;
      })
      .catch(e => {
        const grid = $(`sg-${sec.id}`);
        if (grid) grid.innerHTML = `<div class="err-state"><h3>${safeText(e.message)}</h3></div>`;
      });
  }
}

/* ════════════════════════════════════════════
   CATEGORY PANEL — same append-only approach
   ════════════════════════════════════════════ */
async function loadCategoryPanel(tabId) {
  const cfg   = TAB_CFG[tabId];
  const panel = $(`panel-${tabId}`);
  if (!panel) return;
  if (tabId === "global") { await loadGlobalPanel(); return; }

  panel.innerHTML = `
    <div class="cat-panel-wrap">
      <div class="cat-header" style="--sec-color:${cfg.color}">
        <div class="cat-dot"></div>
        <h1>${cfg.label}</h1>
        <span class="cat-count" id="cc-${tabId}"></span>
      </div>
      <div class="sec-grid" id="cg-${tabId}">${skCards(4)}</div>
      <div class="load-wrap">
        <button class="btn-load" id="cl-${tabId}" style="display:none;">More ${cfg.label} News</button>
      </div>
    </div>`;

  try {
    const d    = await getNews({ category:cfg.category, country:cfg.country, pageSize:40 });
    const grid = $(`cg-${tabId}`);
    const btn  = $(`cl-${tabId}`);
    const all  = d.articles || [];
    let shown  = 0;

    grid.innerHTML = "";

    if (!all.length) {
      grid.innerHTML = `<div class="err-state"><h3>No articles found</h3></div>`;
      return;
    }

    function appendChunk() {
      const chunk = all.slice(shown, shown + 4);
      chunk.forEach((a, i) => grid.appendChild(buildCard(a, cfg.color, shown + i)));
      shown += chunk.length;
      btn.style.display = shown < all.length ? "inline-block" : "none";
    }

    appendChunk();   // first 4

    btn.addEventListener("click", appendChunk);

    const count = $(`cc-${tabId}`);
    if (count) count.textContent = `${all.length} stories`;
  } catch(e) {
    panel.innerHTML = `<div class="err-state"><h3>${safeText(e.message)}</h3></div>`;
  }
}

/* ── global panel ── */
async function loadGlobalPanel() {
  const panel = $("panel-global");
  const color = "var(--c-global)";
  panel.innerHTML = `
    <div class="cat-panel-wrap">
      <div class="cat-header" style="--sec-color:${color}">
        <div class="cat-dot"></div>
        <h1>Global News</h1>
        <span class="cat-count">Top stories from around the world</span>
      </div>
      <div id="global-stream"></div>
    </div>`;
  const stream = $("global-stream");
  for (const c of GLOBAL_COUNTRIES) {
    const block = document.createElement("div");
    block.className = "news-section";
    block.style.setProperty("--sec-color", color);
    block.innerHTML = `
      <div class="sec-heading"><h2>${c.flag} ${c.label}</h2></div>
      <div class="sec-grid" id="gg-${c.country}">${skCards(4)}</div>`;
    stream.appendChild(block);
    getNews({ category:"general", country:c.country, pageSize:4 })
      .then(d => {
        const g = $(`gg-${c.country}`);
        g.innerHTML = "";
        if (!d.articles.length) { g.innerHTML = `<div class="err-state"><h3>No articles</h3></div>`; return; }
        d.articles.forEach((a, i) => g.appendChild(buildCard(a, color, i)));
      })
      .catch(e => {
        const g = $(`gg-${c.country}`);
        if (g) g.innerHTML = `<div class="err-state"><h3>${safeText(e.message)}</h3></div>`;
      });
  }
}

/* ── tab slider ── */
function moveSlider() {
  const active = D.tabBar?.querySelector(".tab.active");
  if (!active || !D.tabSlider) return;
  const bar = D.tabBar.getBoundingClientRect();
  const btn = active.getBoundingClientRect();
  D.tabSlider.style.left  = `${btn.left - bar.left}px`;
  D.tabSlider.style.width = `${btn.width}px`;
}

/* ── tab switching ── */
async function switchTab(tabId) {
  S.tab = tabId;
  $$(".tab").forEach(t => { const a = t.dataset.tab===tabId; t.classList.toggle("active",a); t.setAttribute("aria-selected",a); });
  $$(".mtab").forEach(t => t.classList.toggle("active", t.dataset.tab===tabId));
  moveSlider();
  $$(".panel").forEach(p => p.classList.toggle("active", p.id===`panel-${tabId}`));
  if (tabId !== "top" && !S.loaded.has(tabId)) { S.loaded.add(tabId); await loadCategoryPanel(tabId); }
  window.scrollTo({ top:0, behavior:"smooth" });
}

/* ── init ── */
function initTabs() {
  D.tabBar?.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => switchTab(t.dataset.tab)));
  D.mobTabs?.querySelectorAll(".mtab").forEach(t => t.addEventListener("click", () => switchTab(t.dataset.tab)));
  setTimeout(moveSlider, 100);
  window.addEventListener("resize", moveSlider);
}
function initHam() {
  D.ham?.addEventListener("click", () => {
    const open = D.ham.classList.toggle("open");
    D.mobDrawer?.classList.toggle("open", open);
  });
}
function initSearch() {
  if (!D.searchInput || !D.sClear) return;
  D.searchInput.addEventListener("input", () => {
    D.sClear.style.display = D.searchInput.value.trim() ? "inline" : "none";
  });
  D.sClear.addEventListener("click", () => { D.searchInput.value=""; D.sClear.style.display="none"; });
  D.searchInput.addEventListener("keydown", async e => {
    if (e.key !== "Enter") return;
    const q = D.searchInput.value.trim();
    if (!q) return;
    D.streamTop.innerHTML = `
      <div class="cat-panel-wrap">
        <div class="cat-header" style="--sec-color:var(--ice-500)"><div class="cat-dot"></div><h1>Search Results</h1></div>
        <div class="sec-grid" id="search-grid">${skCards(8)}</div>
      </div>`;
    switchTab("top");
    try {
      const data = await fetchJson(`${CFG.BASE}?q=${encodeURIComponent(q)}&country=us&pageSize=8&apiKey=${CFG.API_KEY}`);
      const arts = cleanArticles(data.articles || []);
      const grid = $("search-grid");
      grid.innerHTML = "";
      if (!arts.length) { grid.innerHTML = `<div class="err-state"><h3>No results found</h3></div>`; return; }
      arts.forEach((a,i) => grid.appendChild(buildCard(a,"var(--ice-500)",i)));
    } catch(e2) {
      const grid = $("search-grid");
      if (grid) grid.innerHTML = `<div class="err-state"><h3>${safeText(e2.message)}</h3></div>`;
    }
  });
}

(async function init() {
  initDate(); initWeather(); initTabs(); initHam(); initSearch();
  await Promise.all([loadHero(), loadTicker(), loadTopStream()]);
})();