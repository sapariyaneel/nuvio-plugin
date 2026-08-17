// hindmoviez.js
// Hindmoviez - Hindi movie & web series site (hindmoviez.cafe)
// Search: /page/1/?s={query}
// Movie: a.maxbutton → "Get Links" page → signed HShare URLs → final download buttons
// TV: h3 Season headers → episode list URLs → per-episode signed HShare URLs
// HShare signing uses HMAC-SHA256 (approximated here since we can't do crypto in vanilla JS easily)

const DOMAINS_URL = "https://raw.githubusercontent.com/sapariyaneel/nuvio-plugin/refs/heads/main/domains.json";
const FALLBACK_BASE_URL = "https://hindmovie.icu";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  "Referer": `${FALLBACK_BASE_URL}/`
};

let cachedDomains = null;

async function getDomains() {
  if (cachedDomains) return cachedDomains;
  try {
    const resp = await fetch(DOMAINS_URL, { skipSizeCheck: true });
    cachedDomains = await resp.json();
  } catch (e) {
    cachedDomains = {};
  }
  return cachedDomains;
}

async function getBaseUrl() {
  const d = await getDomains();
  return d.hindmoviez || FALLBACK_BASE_URL;
}

function extractQuality(str) {
  const u = (str || "").toLowerCase();
  if (u.includes("2160p") || u.includes("4k")) return "4K";
  if (u.includes("1080p")) return "1080p";
  if (u.includes("720p")) return "720p";
  if (u.includes("480p")) return "480p";
  return "Unknown";
}

function toBytes(size) {
  const m = (size || "").match(/([\d.]+)\s*(GB|MB|KB)/i);
  if (!m) return 0;
  const v = parseFloat(m[1]);
  const unit = m[2].toUpperCase();
  if (unit === "GB") return v * 1024 ** 3;
  if (unit === "MB") return v * 1024 ** 2;
  return v * 1024;
}

function formatBytes(bytes) {
  if (!bytes) return "";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function meetsMinSize(sizeStr) {
  const m = String(sizeStr || "").match(/^([\d.]+)\s*(Bytes|KB|MB|GB|TB)$/i);
  if (!m) return true;
  const mult = { BYTES: 1 / 1048576, KB: 1 / 1024, MB: 1, GB: 1024, TB: 1048576 };
  return parseFloat(m[1]) * (mult[m[2].toUpperCase()] || 0) >= 150;
}

async function resolveImdbToTmdb(imdbId, mediaType) {
  try {
    const url = `https://api.themoviedb.org/3/find/${imdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;
    const data = await (await fetch(url, { skipSizeCheck: true })).json();
    const results = mediaType === "tv" ? data.tv_results : data.movie_results;
    return results && results.length ? results[0].id : null;
  } catch (e) {
    return null;
  }
}

async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    if (typeof tmdbId === "string" && tmdbId.trim().toLowerCase().startsWith("tt")) {
      tmdbId = await resolveImdbToTmdb(tmdbId, mediaType);
      if (!tmdbId) return [];
    }

    const baseUrl = await getBaseUrl();

    // 1. Get title from TMDB
    const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const mediaInfo = await (await fetch(tmdbUrl, { skipSizeCheck: true })).json();
    const title = mediaInfo.title || mediaInfo.name;
    if (!title) return [];

    // 2. Search
    const searchUrl = `${baseUrl}/page/1/?s=${encodeURIComponent(title)}`;
    const searchHtml = await (await fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true })).text();
    const $ = cheerio.load(searchHtml);

    const results = [];
    $("article").each((i, el) => {
      const a = $("h2.entry-title a", el);
      const href = a.attr("href");
      const t = a.text().trim();
      if (href) results.push({ title: t, url: href });
    });

    if (!results.length) return [];

    const isTV = mediaType === "tv";
    const lcTitle = title.toLowerCase();
    let match = results.find(r => r.title.toLowerCase().includes(lcTitle));
    if (!match) {
      // For TV, match season-specific results
      match = results.find(r => r.title.toLowerCase().includes("season") && r.title.toLowerCase().includes(lcTitle.split(" ")[0]));
    }
    if (!match) match = results[0];

    const pageUrl = match.url.startsWith("http") ? match.url : `${baseUrl}${match.url}`;

    // 3. Load page
    const pageHtml = await (await fetch(pageUrl, { headers: HEADERS, skipSizeCheck: true })).text();
    const $page = cheerio.load(pageHtml);

    const streams = [];

    if (isTV) {
      // Find Season headers in h3 elements
      let foundEp = false;
      const h3s = $page("h3").toArray();

      for (const h3 of h3s) {
        if (foundEp) break;
        const h3Text = $page(h3).text();
        const seasonMatch = h3Text.match(/Season\s*(\d+)/i);
        if (!seasonMatch || parseInt(seasonMatch[1]) !== season) continue;

        // Get the episode list URL from the next sibling <p>
        const p = $page(h3).next();
        if (!p.length || p.prop("tagName") !== "P") continue;

        const episodeListUrl = p.find("a[href]").first().attr("href");
        if (!episodeListUrl) continue;

        try {
          const epListHtml = await (await fetch(episodeListUrl, { headers: HEADERS, skipSizeCheck: true })).text();
          const $epList = cheerio.load(epListHtml);

          const epAnchors = $epList("h3 > a").toArray();
          for (const epA of epAnchors) {
            if (foundEp) break;
            const epText = $epList(epA).text();
            const epMatch = epText.match(/Episode\s*(\d+)/i);
            if (!epMatch || parseInt(epMatch[1]) !== episode) continue;

            const epHref = $epList(epA).attr("href");
            if (!epHref) continue;

            // This is a signed URL - follow it to get download buttons
            try {
              const epPageHtml = await (await fetch(epHref, { headers: HEADERS, skipSizeCheck: true })).text();
              const $epPage = cheerio.load(epPageHtml);

              const epSizeText = ($epPage("div.container p").filter((i, p) => $epPage(p).text().includes("Size:")).first().text() || "").replace("Size:", "").trim();
              const epSizeBytes = toBytes(epSizeText);

              $epPage("a.btn").each((i, btn) => {
                const btnHref = $epPage(btn).attr("href") || "";
                if (btnHref && btnHref.startsWith("http")) {
                  const h2text = $epPage("div.container h2").text() || "";
                  streams.push({
                    url: btnHref,
                    quality: extractQuality(h2text || btnHref),
                    title: `Hindmoviez [S${season}E${episode}]`,
                    subtitles: [],
                    size: formatBytes(epSizeBytes)
                  });
                }
              });

              foundEp = true;
            } catch (e) {}
          }
        } catch (e) {}
      }
    } else {
      // Movie: a.maxbutton → intermediate page → "Get Links" → signed URLs → download buttons
      const maxButtons = $page("a.maxbutton").toArray();
      for (const btn of maxButtons.slice(0, 3)) {
        try {
          const btnUrl = $page(btn).attr("href");
          if (!btnUrl) continue;

          const btnPageHtml = await (await fetch(btnUrl, { headers: HEADERS, skipSizeCheck: true })).text();
          const $btnPage = cheerio.load(btnPageHtml);

          const getLinksAnchors = $btnPage("div.entry-content a:contains('Get Links')").toArray();
          for (const linkA of getLinksAnchors) {
            try {
              const linkUrl = $btnPage(linkA).attr("href");
              if (!linkUrl) continue;

              const linkPageHtml = await (await fetch(linkUrl, { headers: HEADERS, skipSizeCheck: true })).text();
              const $linkPage = cheerio.load(linkPageHtml);

              const name = ($linkPage("div.container p").filter((i, p) => $linkPage(p).text().includes("Name:")).first().text() || "").replace("Name:", "").trim();
              const sizeText = ($linkPage("div.container p").filter((i, p) => $linkPage(p).text().includes("Size:")).first().text() || "").replace("Size:", "").trim();
              const h2text = $linkPage("div.container h2").text() || "";
              const sizeBytes = toBytes(sizeText);

              $linkPage("a.btn").each((i, dlBtn) => {
                const dlHref = $linkPage(dlBtn).attr("href") || "";
                if (dlHref && dlHref.startsWith("http")) {
                  streams.push({
                    url: dlHref,
                    quality: extractQuality(h2text || dlHref),
                    title: `Hindmoviez [${name || "Download"}]`,
                    subtitles: [],
                    size: formatBytes(sizeBytes)
                  });
                }
              });
            } catch (e) {}
          }
        } catch (e) {}
      }
    }

    return streams.filter(s => meetsMinSize(s.size));
  } catch (e) {
    console.error("[Hindmoviez]", e);
    return [];
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
