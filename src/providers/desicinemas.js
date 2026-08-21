// desicinemas.js - Hindi/Punjabi/Bollywood movie site, routed through a CF worker proxy

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

    const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const mediaInfo = await (await fetch(tmdbUrl, { skipSizeCheck: true })).json();
    const title = mediaInfo.title || mediaInfo.name;
    if (!title) return [];

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

    const pageHtml = await (await fetch(proxyPageUrl, { headers: HEADERS, skipSizeCheck: true })).text();
    const $page = cheerio.load(pageHtml);

    const optionBoxes = $page(".MovieList .OptionBx, .OptionBx").toArray();
    const perBox = await Promise.all(optionBoxes.map(async box => {
      try {
        const linkEl = $page("a", box);
        const link = linkEl.attr("href");
        if (!link || link === "#") return null;

        // no Referer here - groundbanks.net hotlink-blocks it and redirects to a dead domain otherwise
        const embedHtml = await (await fetch(link, { headers: { "User-Agent": HEADERS["User-Agent"] }, skipSizeCheck: true })).text();
        const $embed = cheerio.load(embedHtml);
        const iframeSrc = $embed("iframe").attr("src");
        if (!iframeSrc) return null;

        const name = $page("p.AAIco-dns", box).text().trim() || "Desicinemas";
        const linkText = linkEl.text().trim();
        const quality = extractQuality(linkText) !== "Unknown" ? extractQuality(linkText) : extractQuality(iframeSrc);
        return {
          url: iframeSrc,
          quality,
          title: `Desicinemas [${name}]`,
          subtitles: []
        };
      } catch (e) {
        return null;
      }
    }));
    const streams = perBox.filter(Boolean);

    return streams;
  } catch (e) {
    return [];
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
