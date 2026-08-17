/**
 * fivemovierulz - Built from src/providers/fivemovierulz.js
 * Generated: 2026-08-17T12:20:48.195Z
 */

// src/providers/fivemovierulz.js
var DOMAINS_URL = "https://raw.githubusercontent.com/sapariyaneel/nuvio-plugin/refs/heads/main/domains.json";
var FALLBACK_BASE_URL = "https://www.5movierulz.vote";
var TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  "Referer": `${FALLBACK_BASE_URL}/`
};
var cachedDomains = null;
async function getDomains() {
  if (cachedDomains)
    return cachedDomains;
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
  return d["5movierulz"] || FALLBACK_BASE_URL;
}
function extractQuality(url) {
  const u = (url || "").toLowerCase();
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
      if (!tmdbId)
        return [];
    }
    const baseUrl = await getBaseUrl();
    const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const mediaInfo = await (await fetch(tmdbUrl, { skipSizeCheck: true })).json();
    const title = mediaInfo.title || mediaInfo.name;
    if (!title)
      return [];
    const searchUrl = `${baseUrl}/?s=${encodeURIComponent(title)}`;
    const searchHtml = await (await fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true })).text();
    const $ = cheerio.load(searchHtml);
    const results = [];
    $("#main .cont_display").each((i, el) => {
      const a = $("a", el).first();
      const href = a.attr("href");
      const t = (a.attr("title") || a.text()).trim().replace(/\(.*$/, "").trim();
      if (href)
        results.push({ title: t, url: href });
    });
    if (!results.length)
      return [];
    const lcTitle = title.toLowerCase();
    let match = results.find((r) => r.title.toLowerCase().includes(lcTitle));
    if (!match)
      match = results[0];
    const pageUrl = match.url.startsWith("http") ? match.url : `${baseUrl}${match.url}`;
    const pageHtml = await (await fetch(pageUrl, { headers: HEADERS, skipSizeCheck: true })).text();
    const $page = cheerio.load(pageHtml);
    const streams = [];
    $page("p a").each((i, a) => {
      const rawText = $page(a).text().trim();
      const text = rawText.toLowerCase();
      const href = $page(a).attr("href") || "";
      if (text.includes("watch online") && href) {
        streams.push({
          url: href,
          quality: extractQuality(rawText) !== "Unknown" ? extractQuality(rawText) : extractQuality(href),
          title: `5movierulz [${rawText}]`,
          subtitles: []
        });
      }
    });
    return streams;
  } catch (e) {
    return [];
  }
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
