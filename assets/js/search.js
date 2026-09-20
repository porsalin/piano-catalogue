(function () {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function highlight(text, q) {
    const t = esc(text);
    if (!q) return t;
    const parts = q.trim().split(/\s+/).filter(Boolean).map(function (w) {
      return w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    });
    if (!parts.length) return t;
    const re = new RegExp("(" + parts.join("|") + ")", "ig");
    return t.replace(re, "<mark>$1</mark>");
  }

  function norm(s) {
    return String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  async function loadIndex(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to load " + url);
    return res.json();
  }

  function initSearch(opts) {
    const input = document.getElementById(opts.inputId || "q");
    const results = document.getElementById(opts.resultsId || "search-results");
    const status = document.getElementById(opts.statusId || "search-status");
    const filterEl = document.getElementById(opts.filterId || "filter-field");
    if (!input || !results) return;

    let rows = [];
    let ready = false;

    status.textContent = "Loading catalogue…";

    loadIndex(opts.indexUrl)
      .then(function (data) {
        rows = data.rows || data;
        ready = true;
        status.textContent =
          rows.length.toLocaleString() + " recordings — type to search.";
        if (input.value.trim()) run();
      })
      .catch(function (err) {
        status.textContent = "Could not load search index.";
        console.error(err);
      });

    let timer = null;
    function schedule() {
      clearTimeout(timer);
      timer = setTimeout(run, 120);
    }
    input.addEventListener("input", schedule);
    if (filterEl) filterEl.addEventListener("change", run);

    function run() {
      if (!ready) return;
      const q = input.value.trim();
      const qn = norm(q);
      const field = filterEl ? filterEl.value : "all";
      if (!qn) {
        results.innerHTML = "";
        status.textContent =
          rows.length.toLocaleString() + " recordings — type to search.";
        return;
      }
      const tokens = qn.split(/\s+/).filter(Boolean);
      const hits = [];
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        let hay = "";
        if (field === "all") hay = r.search || "";
        else hay = norm(r[field] || "");
        let ok = true;
        for (let t = 0; t < tokens.length; t++) {
          if (hay.indexOf(tokens[t]) === -1) {
            ok = false;
            break;
          }
        }
        if (ok) {
          hits.push(r);
          if (hits.length >= 80) break;
        }
      }
      status.textContent =
        hits.length >= 80
          ? "Showing first 80 matches — refine your search."
          : hits.length + " match" + (hits.length === 1 ? "" : "es");
      results.innerHTML = hits
        .map(function (r) {
          const title = highlight(r.title || r.composition || "", q);
          const meta = highlight(r.meta || "", q);
          return (
            '<a class="result-item" href="' +
            esc(r.href) +
            '"><div class="r-title">' +
            title +
            '</div><div class="r-meta">' +
            meta +
            "</div></a>"
          );
        })
        .join("");
    }
  }

  window.PianoCatalogueSearch = { init: initSearch };
})();
