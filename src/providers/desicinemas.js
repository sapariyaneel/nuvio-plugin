// desicinemas.js
// Desicinemas - Hindi/Punjabi/Bollywood movie site (desicinemas.to)
// Uses a Cloudflare Worker proxy for requests
// Stream links: found from .MovieList .OptionBx items → iframe extraction

const { formatStreamTitle } = require('../lib/streamFormat');

// No registry key currently exists for this site (checked against our shared domains.json registry) -
// still wired to the shared registry so it picks up a live domain automatically if one is added later,
// falling back to the hardcoded domain in the meantime.
const DOMAINS_URL = "https://raw.githubusercontent.com/sapariyaneel/nuvio-plugin/refs/heads/main/domains.json";
const FALLBACK_BASE_URL = "https://desicinemas.to";
const PROXY = "https://desicinemas.phisherdesicinema.workers.dev/";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:139.0) Gecko/20100101 Firefox/139.0",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  "Referer": FALLBACK_BASE_URL,
  "Connection": "keep-alive",
  "Cache-Control": "no-cache"
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
  return d.desicinemas || FALLBACK_BASE_URL;
}

function extractQuality(url) {
  const u = (url || "").toLowerCase();
  if (u.includes("2160p") || u.includes("4k")) return "4K";
  if (u.includes("1080p")) return "1080p";
  if (u.includes("720p")) return "720p";
  if (u.includes("480p")) return "480p";
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
      if (!tmdbId) return [];
    }
    const baseUrl = await getBaseUrl();

    // 1. Get title from TMDB
    const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const mediaInfo = await (await fetch(tmdbUrl, { skipSizeCheck: true })).json();
    const title = mediaInfo.title || mediaInfo.name;
    if (!title) return [];

    // 2. Search via proxy
    const searchUrl = `${PROXY}?url=${encodeURIComponent(`${baseUrl}/?s=${encodeURIComponent(title)}`)}`;
    const searchHtml = await (await fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true })).text();
    const $ = cheerio.load(searchHtml);

    const results = [];
    $(".MovieList li, .MovieList .TPostMv").each((i, el) => {
      const href = $("a", el).attr("href");
      const t = $("h2", el).text().trim();
      if (href) results.push({ title: t, url: href });
    });

    if (!results.length) return [];

    const lcTitle = title.toLowerCase();
    let match = results.find(r => r.title.toLowerCase().includes(lcTitle));
    if (!match) match = results[0];

    const pageUrl = match.url.startsWith("http") ? match.url : `${baseUrl}${match.url}`;
    const proxyPageUrl = `${PROXY}?url=${encodeURIComponent(pageUrl)}`;

    // 3. Load page via proxy to get option boxes
    const pageHtml = await (await fetch(proxyPageUrl, { headers: HEADERS, skipSizeCheck: true })).text();
    const $page = cheerio.load(pageHtml);

    const streams = [];

    const optionBoxes = $page(".MovieList .OptionBx, .OptionBx").toArray();
    for (const box of optionBoxes) {
      try {
        const linkEl = $page("a", box);
        const link = linkEl.attr("href");
        if (!link || link === "#") continue;

        // Fetch the embed page without our own Referer - groundbanks.net treats desicinemas.to as a
        // hotlink-protection trigger and serves a meta-refresh to a dead domain instead of the real page.
        const embedHtml = await (await fetch(link, { headers: { "User-Agent": HEADERS["User-Agent"] }, skipSizeCheck: true })).text();
        const $embed = cheerio.load(embedHtml);
        const iframeSrc = $embed("iframe").attr("src");
        if (!iframeSrc) continue;

        const name = $page("p.AAIco-dns", box).text().trim() || "Desicinemas";
        const linkText = linkEl.text().trim();
        const quality = extractQuality(linkText) !== "Unknown" ? extractQuality(linkText) : extractQuality(iframeSrc);
        const year = (mediaInfo.release_date || mediaInfo.first_air_date || "").slice(0, 4) || undefined;
        streams.push({
          url: iframeSrc,
          quality,
          title: formatStreamTitle({
            title,
            year,
            rawText: `${name} ${linkText}`,
            url: iframeSrc,
            quality
          }),
          subtitles: []
        });
      } catch (e) {}
    }

    return streams;
  } catch (e) {
    console.error("[Desicinemas]", e);
    return [];
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
