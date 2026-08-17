// multimovies.js
// MultiMovies - Hindi/Bollywood/Anime provider via multimovies.autos with WordPress player extraction

const DOMAINS_URL = "https://raw.githubusercontent.com/sapariyaneel/nuvio-plugin/refs/heads/main/domains.json";
const FALLBACK_URL = "https://multimovies.motorcycles";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
};

let cachedBaseUrl = null;

// The domain in domains.json can rotate to one that's dead/unreachable (confirmed: this
// happened to HDhub4u earlier, and multimovies.makeup is currently unreachable too) - trusting
// it unconditionally means every call for the rest of the process uses a dead domain. Verify it
// actually responds before caching it, falling back to FALLBACK_URL otherwise.
async function isReachable(url) {
  try {
    const resp = await fetch(url, { headers: HEADERS, skipSizeCheck: true, redirect: "follow" });
    return resp.status < 500;
  } catch (e) {
    return false;
  }
}

async function getBaseUrl() {
  if (cachedBaseUrl) return cachedBaseUrl;
  let candidate = FALLBACK_URL;
  try {
    const resp = await fetch(DOMAINS_URL, { skipSizeCheck: true, redirect: "follow" });
    const data = await resp.json();
    if (data.MultiMovies) candidate = data.MultiMovies;
  } catch (e) {}

  cachedBaseUrl = (await isReachable(candidate)) ? candidate : FALLBACK_URL;
  return cachedBaseUrl;
}

async function resolveImdbToTmdb(imdbId, mediaType) {
  try {
    const url = `https://api.themoviedb.org/3/find/${imdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;
    const data = await (await fetch(url, { skipSizeCheck: true, redirect: "follow" })).json();
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

    const BASE_URL = await getBaseUrl();

    // Step 1: Get title from TMDB
    const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const mediaInfo = await (await fetch(tmdbUrl, { skipSizeCheck: true, redirect: "follow" })).json();
    const title = mediaInfo.title || mediaInfo.name;
    if (!title) return [];

    // Step 2: Search MultiMovies
    const searchResp = await fetch(`${BASE_URL}/?s=${encodeURIComponent(title)}`, {
      headers: HEADERS,
      skipSizeCheck: true,
      redirect: "follow"
    });
    const searchHtml = await searchResp.text();
    const $ = cheerio.load(searchHtml);

    const results = [];
    $("div.result-item").each((i, el) => {
      const a = $(el).find("article > div.details > div.title > a");
      const href = a.attr("href");
      const name = a.text().trim();
      if (href && name) results.push({ href, name });
    });

    if (results.length === 0) return [];

    const isMovie = mediaType === "movie";
    const match = results.find(r =>
      r.name.toLowerCase().includes(title.toLowerCase())
    ) || results[0];

    // Step 3: Load content page
    const pageResp = await fetch(match.href, { headers: HEADERS, skipSizeCheck: true, redirect: "follow" });
    const pageHtml = await pageResp.text();
    const $p = cheerio.load(pageHtml);

    const streams = [];

    if (!isMovie && mediaType === "tv") {
      // TV Series: get episode list
      const episodes = [];
      $p("#seasons ul.episodios li").each((seasonIdx, sEl) => {
        $p(sEl).find("li").each((epIdx, epEl) => {
          const href = $p(epEl).find("div.episodiotitle > a").attr("href");
          if (href) {
            episodes.push({
              href,
              season: seasonIdx + 1,
              episode: epIdx + 1
            });
          }
        });
      });

      // Simpler: iterate directly over all li in all episodios lists
      if (episodes.length === 0) {
        let seasonNum = 1;
        $p("#seasons ul.episodios").each((sIdx, sList) => {
          seasonNum = sIdx + 1;
          $p(sList).find("li").each((eIdx, epEl) => {
            const href = $p(epEl).find("div.episodiotitle > a").attr("href");
            if (href) {
              episodes.push({ href, season: seasonNum, episode: eIdx + 1 });
            }
          });
        });
      }

      const targetEp = episodes.find(ep =>
        ep.season === parseInt(season || 1) && ep.episode === parseInt(episode || 1)
      ) || episodes[0];

      if (!targetEp) return [];

      // Load episode page and get player options
      const epResp = await fetch(targetEp.href, { headers: HEADERS, skipSizeCheck: true, redirect: "follow" });
      const epHtml = await epResp.text();
      const $ep = cheerio.load(epHtml);

      const epItems = [];
      $ep("ul#playeroptionsul li").each((i, el) => {
        epItems.push({
          post: $ep(el).attr("data-post"),
          nume: $ep(el).attr("data-nume"),
          type: $ep(el).attr("data-type")
        });
      });

      for (const item of epItems.slice(0, 5)) {
        if (!item.post || !item.nume || (item.nume || "").includes("trailer")) continue;
        const embedUrl = await fetchEmbedUrl(BASE_URL, item.post, item.nume, item.type, match.href);
        if (embedUrl && !embedUrl.includes("youtube")) {
          const resolvedUrl = await resolveEmbed(embedUrl, BASE_URL);
          if (resolvedUrl) {
            const streamReferer = new URL(embedUrl).origin + "/";
            const streamHeaders = resolvedUrl.includes(".m3u8") || resolvedUrl.includes(".mp4")
              ? { Referer: streamReferer, "User-Agent": HEADERS["User-Agent"] }
              : undefined;
            const quality = resolvedUrl.includes(".m3u8")
              ? await getMasterPlaylistQuality(resolvedUrl, streamReferer)
              : "Unknown";

            streams.push({
              url: resolvedUrl,
              quality,
              title: "MultiMovies",
              headers: streamHeaders,
              subtitles: []
            });
          }
        }
      }

      return streams;
    }

    // Movie: get player options directly
    const playerItems = [];
    $p("ul#playeroptionsul li").each((i, el) => {
      playerItems.push({
        post: $p(el).attr("data-post"),
        nume: $p(el).attr("data-nume"),
        type: $p(el).attr("data-type")
      });
    });

    for (const item of playerItems.slice(0, 5)) {
      if (!item.post || !item.nume || (item.nume || "").includes("trailer")) continue;
      const embedUrl = await fetchEmbedUrl(BASE_URL, item.post, item.nume, item.type, match.href);
      if (embedUrl && !embedUrl.includes("youtube")) {
        const resolvedUrl = await resolveEmbed(embedUrl, BASE_URL);
        if (resolvedUrl) {
          const streamReferer = new URL(embedUrl).origin + "/";
          const streamHeaders = resolvedUrl.includes(".m3u8") || resolvedUrl.includes(".mp4")
            ? { Referer: streamReferer, "User-Agent": HEADERS["User-Agent"] }
            : undefined;
          const quality = resolvedUrl.includes(".m3u8")
            ? await getMasterPlaylistQuality(resolvedUrl, streamReferer)
            : "Unknown";

          streams.push({
            url: resolvedUrl,
            quality,
            title: "MultiMovies",
            headers: streamHeaders,
            subtitles: []
          });
        }
      }
    }

    return streams;
  } catch (e) {
    return [];
  }
}

async function fetchEmbedUrl(baseUrl, post, nume, type, referer) {
  try {
    const resp = await fetch(`${baseUrl}/wp-admin/admin-ajax.php`, {
      method: "POST",
      headers: {
        ...HEADERS,
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
        "Referer": baseUrl
      },
      body: `action=doo_player_ajax&post=${post}&nume=${nume}&type=${type}`,
      skipSizeCheck: true,
      redirect: "follow"
    });
    const data = await resp.json();
    const embedUrl = data.embed_url || "";

    // Extract real URL from possible HTML wrappers
    const srcMatch = embedUrl.match(/SRC="(https?:[^"]+)"/i);
    if (srcMatch) return srcMatch[1].trim();

    const urlMatch = embedUrl.match(/"(https?[^"]+)"/);
    if (urlMatch) return urlMatch[1].trim();

    return embedUrl.replace(/^"|"$/g, "").trim();
  } catch(e) {
    return null;
  }
}

// Dean Edwards-style JS packer decoder (eval(function(p,a,c,k,e,d){...}(payload,radix,count,keywords)))
// used by JWPlayer-based embed hosts (vibuxer.com and similar) to hide the real m3u8 URL from plain
// regex scraping of the raw HTML - the URL only exists inside this eval'd blob until unpacked.
function unpackJsPacker(html) {
  const marker = "eval(function(p,a,c,k,e,d)";
  const start = html.indexOf(marker);
  if (start === -1) return null;

  const openIdx = html.indexOf("(", start);
  let depth = 0, inStr = null, i = openIdx;
  for (; i < html.length; i++) {
    const c = html[i];
    if (inStr) {
      if (c === "\\") { i++; continue; }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === "'" || c === '"') { inStr = c; continue; }
    if (c === "(") depth++;
    else if (c === ")") { depth--; if (depth === 0) break; }
  }
  const callExpr = html.slice(openIdx + 1, i);
  const fnEnd = callExpr.indexOf("}(");
  if (fnEnd === -1) return null;
  const argsStr = callExpr.slice(fnEnd + 2, -1);

  const args = [];
  let cur = "", d2 = 0, inStr2 = null;
  for (let j = 0; j < argsStr.length; j++) {
    const c = argsStr[j];
    if (inStr2) {
      cur += c;
      if (c === "\\") { cur += argsStr[++j]; continue; }
      if (c === inStr2) inStr2 = null;
      continue;
    }
    if (c === "'" || c === '"') { inStr2 = c; cur += c; continue; }
    if (c === "[" || c === "{" || c === "(") d2++;
    if (c === "]" || c === "}" || c === ")") d2--;
    if (c === "," && d2 === 0) { args.push(cur); cur = ""; continue; }
    cur += c;
  }
  args.push(cur);
  if (args.length < 4) return null;

  const stripQuotes = (s) => {
    s = s.trim();
    if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
      return s.slice(1, -1).replace(/\\(.)/g, "$1");
    }
    return s;
  };

  const payload = stripQuotes(args[0]);
  const radix = parseInt(args[1].trim(), 10);
  const count = parseInt(args[2].trim(), 10);
  const keywords = stripQuotes(args[3].split(".split(")[0]).split("|");

  const dict = {};
  let c = count;
  while (c--) dict[c.toString(radix)] = keywords[c] || c.toString(radix);

  return payload.replace(/\b\w+\b/g, (word) => (dict[word] !== undefined ? dict[word] : word));
}

// Some mirror chains (modiplay.xyz -> proxy.php -> vibuxer.com) hand the video off through a
// plain <iframe src="..."> or an inline `EMBED_URL = '...'` JS assignment before the page that
// actually has the packed player script. None of this needs real JS execution - the intermediate
// pages are static HTML - but resolveEmbed only ever looked at the *first* page's own content, so
// it never found the real stream when a mirror needed one of these extra static hops.
function nextEmbedHop(html, baseUrl) {
  const $ = cheerio.load(html);
  const iframeSrc = $("iframe").first().attr("src");
  if (iframeSrc && iframeSrc.startsWith("http")) return iframeSrc;
  if (iframeSrc && iframeSrc.startsWith("/")) return new URL(iframeSrc, baseUrl).toString();

  const varMatch = html.match(/EMBED_URL\s*=\s*['"]([^'"]+)['"]/);
  if (varMatch) return varMatch[1];

  return null;
}

async function resolveEmbed(url, referer, depth) {
  if (!url || !url.startsWith("http")) return null;
  if ((depth || 0) > 3) return null; // guard against a redirect loop between mirrors

  // If it's already a direct stream
  if (url.includes(".m3u8") || url.includes(".mp4")) return url;

  // Try to load the embed page and find stream
  try {
    // vibuxer.com (and likely other mirrors in this chain) validates Referer against the
    // requesting origin only, not the full path+query - sending the previous hop's exact URL
    // (e.g. ".../proxy.php?p=streamhg&c=...") as Referer gets served a placeholder error page
    // instead of the real player. Trimming to just the origin matches what a real cross-site
    // iframe navigation sends under a standard "strict-origin" referrer policy.
    let refererOrigin = referer;
    try { refererOrigin = referer ? new URL(referer).origin + "/" : referer; } catch (e) {}

    const resp = await fetch(url, {
      headers: { ...HEADERS, "Referer": refererOrigin },
      skipSizeCheck: true,
      redirect: "follow"
    });
    const text = await resp.text();

    // Check for deaddrive.xyz style
    if (url.includes("deaddrive.xyz")) {
      const $ = cheerio.load(text);
      const firstServer = $("ul.list-server-items > li").first().attr("data-video");
      return firstServer || null;
    }

    const m3u8 = text.match(/(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/i);
    if (m3u8) return m3u8[1];

    const mp4 = text.match(/(https?:\/\/[^\s"']+\.mp4[^\s"']*)/i);
    if (mp4) return mp4[1];

    // JWPlayer embeds (vibuxer.com etc) hide the real stream URL in packed/eval'd JS.
    const unpacked = unpackJsPacker(text);
    if (unpacked) {
      const packedM3u8 = unpacked.match(/(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/i);
      if (packedM3u8) return packedM3u8[1];
      const packedMp4 = unpacked.match(/(https?:\/\/[^\s"']+\.mp4[^\s"']*)/i);
      if (packedMp4) return packedMp4[1];
    }

    const hop = nextEmbedHop(text, url);
    if (hop && hop !== url) return resolveEmbed(hop, url, (depth || 0) + 1);

    return null; // No real stream found - do not fall back to the embed page URL itself
  } catch(e) {
    return null;
  }
}

// Guessing quality from substrings in the URL is unreliable here: the signed query params on
// this CDN's m3u8 URLs are random tokens that can coincidentally contain "4k"/"1080p"/etc (seen
// in practice: a token ending "...gsp-M4k" made a genuine 1080p stream get labeled "4K"). These
// URLs are real HLS master playlists with honest EXT-X-STREAM-INF BANDWIDTH/RESOLUTION tags, so
// read the actual top variant's resolution instead of guessing from the URL string.
function qualityLabelFromHeight(height) {
  if (height >= 2000) return "4K";
  if (height >= 1000) return "1080p";
  if (height >= 700) return "720p";
  if (height >= 450) return "480p";
  if (height > 0) return "360p";
  return "Unknown";
}

// The app's player rejects data: URIs outright ("Cannot open file 'data:...'" - confirmed live
// in the app, it treats the url field as a plain file path/http(s) source, not a decodable
// playlist blob), so a synthesized in-memory master delivered as a data: URI is not viable here.
// That means the only working delivery is a real http(s) master URL, and this master's audio is a
// separate #EXT-X-MEDIA group rather than muxed into the video - pointing the player at one bare
// video-only variant plays picture with no sound (confirmed by fetching a variant directly: it's
// plain #EXTINF/.ts segments, no audio-track association at all). Every other provider in this
// repo with this same HLS shape (vidrock.js, goated.js, vixsrc.js) returns the master URL as a
// single adaptive stream and lets the player's own ABR pick the variant plus its matching audio
// group - matching that proven pattern here instead of the variant-splitting attempt above.
async function getMasterPlaylistQuality(m3u8Url, referer) {
  try {
    const text = await (await fetch(m3u8Url, {
      headers: { ...HEADERS, Referer: referer },
      skipSizeCheck: true,
      redirect: "follow"
    })).text();

    let best = null;
    const lines = text.split("\n").map(l => l.trim());
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].startsWith("#EXT-X-STREAM-INF")) continue;
      const urlLine = lines[i + 1];
      if (!urlLine || urlLine.startsWith("#")) continue;

      const bandwidthMatch = lines[i].match(/BANDWIDTH=(\d+)/);
      const resolutionMatch = lines[i].match(/RESOLUTION=(\d+)x(\d+)/);
      const bandwidth = bandwidthMatch ? parseInt(bandwidthMatch[1], 10) : 0;
      const height = resolutionMatch ? parseInt(resolutionMatch[2], 10) : 0;

      if (!best || bandwidth > best.bandwidth) best = { bandwidth, height };
    }
    return best ? qualityLabelFromHeight(best.height) : "Unknown";
  } catch (e) {
    return "Unknown";
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
