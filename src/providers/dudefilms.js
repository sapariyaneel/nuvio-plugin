// dudefilms.js
// DudeFilms - Hindi/Bollywood/South Indian movie & series site (dudefilms.sarl)
// Search: /page/1/?s={query}
// Download links: a.maxbutton → redirect pages with more maxbutton links → final stream URLs
// Uses Cinemeta for metadata enhancement

const DOMAINS_URL = "https://raw.githubusercontent.com/sapariyaneel/nuvio-plugin/refs/heads/main/domains.json";
const FALLBACK_BASE_URL = "https://dudefilms.casa";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const CINEMETA_URL = "https://v3-cinemeta.strem.io/meta";
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
  return d.dudefilms || FALLBACK_BASE_URL;
}

function extractQuality(url) {
  const u = (url || "").toLowerCase();
  if (u.includes("2160p") || u.includes("4k")) return "4K";
  if (u.includes("1080p")) return "1080p";
  if (u.includes("720p")) return "720p";
  if (u.includes("480p")) return "480p";
  return "Unknown";
}

// Quality headings on this theme look like "Download X (2023) {Hindi-English} 480p [650MB]" -
// the bracketed size is the only place file size appears on the site.
function extractSize(text) {
  const m = (text || "").match(/\[([\d.]+\s*(?:GB|MB|KB))\]/i);
  return m ? m[1] : "";
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
    $("div.simple-grid-grid-post").each((i, el) => {
      const href = $("h3 a", el).attr("href");
      const t = $("h3", el).text().trim();
      if (href) results.push({ title: t, url: href });
    });

    if (!results.length) return [];

    const isTV = mediaType === "tv";
    const lcTitle = title.toLowerCase();
    let match = results.find(r => r.title.toLowerCase().includes(lcTitle));
    if (!match) match = results[0];

    const pageUrl = match.url.startsWith("http") ? match.url : `${baseUrl}${match.url}`;

    // 3. Load show page
    const pageHtml = await (await fetch(pageUrl, { headers: HEADERS, skipSizeCheck: true })).text();
    const $page = cheerio.load(pageHtml);

    const streams = [];

    if (isTV) {
      // Find season headers (h4 with "Season N") then follow links to episode pages
      let found = false;
      const h4s = $page("h4").toArray();

      for (const h4 of h4s) {
        if (found) break;
        const h4Text = $page(h4).text();
        const seasonMatch = h4Text.match(/\bSeason\s*(\d+)\b/i);
        if (!seasonMatch || parseInt(seasonMatch[1]) !== season) continue;

        let sibling = $page(h4).next();
        while (sibling.length && sibling.prop("tagName") === "P") {
          const seasonButtons = sibling.find("a.maxbutton").toArray();
          for (const btn of seasonButtons) {
            if (found) break;
            const seasonPageUrl = $page(btn).attr("href");
            if (!seasonPageUrl) continue;

            try {
              const seasonPageHtml = await (await fetch(seasonPageUrl, { headers: HEADERS, skipSizeCheck: true })).text();
              const $seasonPage = cheerio.load(seasonPageHtml);

              const epButtons = $seasonPage("a.maxbutton-ep").toArray();
              for (const epBtn of epButtons) {
                const epText = $seasonPage(epBtn).text();
                const epMatch = epText.match(/(?:Episode|Ep|E)\s*(\d+)/i);
                if (!epMatch || parseInt(epMatch[1]) !== episode) continue;

                const epUrl = $seasonPage(epBtn).attr("href");
                if (!epUrl) continue;

                // This URL is a final stream link. The button label (e.g. "Episode 3 [720p]")
                // sometimes carries quality info that the URL itself doesn't - check both.
                const quality = extractQuality(epText) !== "Unknown" ? extractQuality(epText) : extractQuality(epUrl);
                streams.push({
                  url: epUrl,
                  quality,
                  title: `DudeFilms [S${season}E${episode}]`,
                  subtitles: []
                });
                found = true;
                break;
              }
            } catch (e) {}
          }
          sibling = sibling.next();
        }
      }
    } else {
      // Movie: each quality heading ("... 480p [650MB]") is followed by a <p> with one
      // a.maxbutton link - group by heading so the size can travel through the redirect hop.
      const headings = $page("h4").toArray();
      for (const h4 of headings) {
        const headingText = $page(h4).text().trim();
        const size = extractSize(headingText);
        const headingQuality = extractQuality(headingText);

        let sibling = $page(h4).next();
        let hops = 0;
        let btnUrl = null;
        while (sibling.length && hops < 3) {
          const found = sibling.find("a.maxbutton").attr("href") || (sibling.is("a.maxbutton") ? sibling.attr("href") : null);
          if (found) { btnUrl = found; break; }
          if (sibling.is("h4")) break;
          sibling = sibling.next();
          hops++;
        }
        if (!btnUrl) continue;

        try {
          const btnHtml = await (await fetch(btnUrl, { headers: HEADERS, skipSizeCheck: true })).text();
          const $btn = cheerio.load(btnHtml);
          $btn("a.maxbutton").each((i, a) => {
            const href = $btn(a).attr("href");
            if (href && href.startsWith("http")) {
              const linkText = $btn(a).text() || "";
              const quality = extractQuality(linkText) !== "Unknown" ? extractQuality(linkText)
                : (headingQuality !== "Unknown" ? headingQuality : extractQuality(href));
              streams.push({
                url: href,
                quality,
                title: linkText.trim() ? `DudeFilms [${linkText.trim()}]` : "DudeFilms",
                size,
                subtitles: []
              });
            }
          });
        } catch (e) {}
      }
    }

    return streams;
  } catch (e) {
    console.error("[DudeFilms]", e);
    return [];
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
