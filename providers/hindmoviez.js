var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
const DOMAINS_URL = "https://raw.githubusercontent.com/sapariyaneel/nuvio-plugin/refs/heads/main/domains.json";
const FALLBACK_BASE_URL = "https://hindmovie.icu";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  "Referer": `${FALLBACK_BASE_URL}/`
};
let cachedDomains = null;
function getDomains() {
  return __async(this, null, function* () {
    if (cachedDomains)
      return cachedDomains;
    try {
      const resp = yield fetch(DOMAINS_URL, { skipSizeCheck: true });
      cachedDomains = yield resp.json();
    } catch (e) {
      cachedDomains = {};
    }
    return cachedDomains;
  });
}
function getBaseUrl() {
  return __async(this, null, function* () {
    const d = yield getDomains();
    return d.hindmoviez || FALLBACK_BASE_URL;
  });
}
function extractQuality(str) {
  const u = (str || "").toLowerCase();
  if (u.includes("2160p") || u.includes("4k"))
    return "4K";
  if (u.includes("1080p"))
    return "1080p";
  if (u.includes("720p"))
    return "720p";
  if (u.includes("480p"))
    return "480p";
  return "Unknown";
}
function toBytes(size) {
  const m = (size || "").match(/([\d.]+)\s*(GB|MB|KB)/i);
  if (!m)
    return 0;
  const v = parseFloat(m[1]);
  const unit = m[2].toUpperCase();
  if (unit === "GB")
    return v * 1024 ** 3;
  if (unit === "MB")
    return v * 1024 ** 2;
  return v * 1024;
}
function formatBytes(bytes) {
  if (!bytes)
    return "";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
function resolveImdbToTmdb(imdbId, mediaType) {
  return __async(this, null, function* () {
    try {
      const url = `https://api.themoviedb.org/3/find/${imdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;
      const data = yield (yield fetch(url, { skipSizeCheck: true })).json();
      const results = mediaType === "tv" ? data.tv_results : data.movie_results;
      return results && results.length ? results[0].id : null;
    } catch (e) {
      return null;
    }
  });
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      if (typeof tmdbId === "string" && tmdbId.trim().toLowerCase().startsWith("tt")) {
        tmdbId = yield resolveImdbToTmdb(tmdbId, mediaType);
        if (!tmdbId)
          return [];
      }
      const baseUrl = yield getBaseUrl();
      const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
      const mediaInfo = yield (yield fetch(tmdbUrl, { skipSizeCheck: true })).json();
      const title = mediaInfo.title || mediaInfo.name;
      if (!title)
        return [];
      const searchUrl = `${baseUrl}/page/1/?s=${encodeURIComponent(title)}`;
      const searchHtml = yield (yield fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $ = cheerio.load(searchHtml);
      const results = [];
      $("article").each((i, el) => {
        const a = $("h2.entry-title a", el);
        const href = a.attr("href");
        const t = a.text().trim();
        if (href)
          results.push({ title: t, url: href });
      });
      if (!results.length)
        return [];
      const isTV = mediaType === "tv";
      const lcTitle = title.toLowerCase();
      let match = results.find((r) => r.title.toLowerCase().includes(lcTitle));
      if (!match) {
        match = results.find((r) => r.title.toLowerCase().includes("season") && r.title.toLowerCase().includes(lcTitle.split(" ")[0]));
      }
      if (!match)
        match = results[0];
      const pageUrl = match.url.startsWith("http") ? match.url : `${baseUrl}${match.url}`;
      const pageHtml = yield (yield fetch(pageUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $page = cheerio.load(pageHtml);
      const streams = [];
      if (isTV) {
        let foundEp = false;
        const h3s = $page("h3").toArray();
        for (const h3 of h3s) {
          if (foundEp)
            break;
          const h3Text = $page(h3).text();
          const seasonMatch = h3Text.match(/Season\s*(\d+)/i);
          if (!seasonMatch || parseInt(seasonMatch[1]) !== season)
            continue;
          const p = $page(h3).next();
          if (!p.length || p.prop("tagName") !== "P")
            continue;
          const episodeListUrl = p.find("a[href]").first().attr("href");
          if (!episodeListUrl)
            continue;
          try {
            const epListHtml = yield (yield fetch(episodeListUrl, { headers: HEADERS, skipSizeCheck: true })).text();
            const $epList = cheerio.load(epListHtml);
            const epAnchors = $epList("h3 > a").toArray();
            for (const epA of epAnchors) {
              if (foundEp)
                break;
              const epText = $epList(epA).text();
              const epMatch = epText.match(/Episode\s*(\d+)/i);
              if (!epMatch || parseInt(epMatch[1]) !== episode)
                continue;
              const epHref = $epList(epA).attr("href");
              if (!epHref)
                continue;
              try {
                const epPageHtml = yield (yield fetch(epHref, { headers: HEADERS, skipSizeCheck: true })).text();
                const $epPage = cheerio.load(epPageHtml);
                const epSizeText = ($epPage("div.container p").filter((i, p2) => $epPage(p2).text().includes("Size:")).first().text() || "").replace("Size:", "").trim();
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
              } catch (e) {
              }
            }
          } catch (e) {
          }
        }
      } else {
        const maxButtons = $page("a.maxbutton").toArray();
        for (const btn of maxButtons.slice(0, 3)) {
          try {
            const btnUrl = $page(btn).attr("href");
            if (!btnUrl)
              continue;
            const btnPageHtml = yield (yield fetch(btnUrl, { headers: HEADERS, skipSizeCheck: true })).text();
            const $btnPage = cheerio.load(btnPageHtml);
            const getLinksAnchors = $btnPage("div.entry-content a:contains('Get Links')").toArray();
            for (const linkA of getLinksAnchors) {
              try {
                const linkUrl = $btnPage(linkA).attr("href");
                if (!linkUrl)
                  continue;
                const linkPageHtml = yield (yield fetch(linkUrl, { headers: HEADERS, skipSizeCheck: true })).text();
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
              } catch (e) {
              }
            }
          } catch (e) {
          }
        }
      }
      return streams;
    } catch (e) {
      console.error("[Hindmoviez]", e);
      return [];
    }
  });
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
