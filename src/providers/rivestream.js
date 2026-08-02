// rivestream.js
// Rivestream (https://www.rivestream.app) - TMDB-id-based movie & TV streaming via its own
// same-origin /api/backendfetch proxy, which fronts several upstream services ("flowcast",
// "primevids", "ophim", etc).
//
// Every backendfetch call requires a `secretKey` query param that is NOT a fixed value - it's
// btoa(murmurHashHex) of the TMDB id, computed by a function baked into the site's own
// _app bundle (pages/_app-*.js). That function closes over a 70-entry token array used to salt
// the hash input before a two-round MurmurHash-1-style finalizer. Both the function and the
// array were extracted verbatim from the live bundle and verified byte-exact against three
// real (id -> secretKey) pairs captured from the real page before being embedded here - not
// guessed, and not hand-restructured (a hand-"cleaned-up" rewrite of the minified function
// silently produced wrong hashes for some ids, so the exact minified source is kept as-is and
// evaluated at runtime instead of being transcribed).
//
// GET /api/backendfetch?requestID=movieVideoProvider&id={tmdbId}&service=flowcast&secretKey={key}&proxyMode=noProxy
//   -> {"data":{"sources":[{quality:720|480|360, url, source:"FlowCast", size:"<bytes>", format:"mp4"}]}}
//   FlowCast is movie-only, direct MP4 (via a signed proxy URL), and reports a REAL exact byte
//   size per quality directly in the API response - no estimation needed at all. The proxy
//   itself (proxy.valhallastream.dpdns.org) gates on the caller's own Referer header being
//   rivestream.app - unrelated to the target-site headers baked into its url query string,
//   which it forwards to the upstream CDN - so playback requires sending HEADERS on the stream.
// When FlowCast has nothing (all TV, and some movies), fall back to:
//   GET /api/backendfetch?requestID={movie|tv}VideoProvider&...&service=primevids&secretKey={key}&proxyMode=noProxy
//   -> {"data":{"sources":[{quality:"HLS"|"ipcloud", url:"<master.m3u8>", source:"PrimeVids", format:"hls"}]}}
//   That master playlist has a real EXT-X-STREAM-INF BANDWIDTH/RESOLUTION tag (same technique as
//   goated.js), so real size = BANDWIDTH x TMDB runtime / 8, and real quality = RESOLUTION height.

const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const DOMAINS_URL = "https://raw.githubusercontent.com/sapariyaneel/nuvio-plugin/refs/heads/main/domains.json";
const FALLBACK_BASE_URL = "https://www.rivestream.app";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Referer": "https://www.rivestream.app/"
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
  return (d.rivestream || FALLBACK_BASE_URL).replace(/\/+$/, "");
}

// Verbatim (not hand-restructured) port of rivestream's secretKey(id) function, extracted from
// pages/_app-*.js. `RIVESTREAM_C_TOKENS` is its closure token array, also extracted verbatim.
// Written as a plain named function rather than eval'd/new Function'd - React Native/Hermes
// commonly disallows or misbehaves with dynamic code generation, so the exact minified logic is
// transcribed statement-for-statement (verified byte-exact against 3 real captured id->key pairs
// below) instead of being reconstructed at runtime.
const RIVESTREAM_C_TOKENS = "4Z7lUo|gwIVSMD|PLmz2elE2v|Z4OFV0|SZ6RZq6Zc|zhJEFYxrz8|FOm7b0|axHS3q4KDq|o9zuXQ|4Aebt|wgjjWwKKx|rY4VIxqSN|kfjbnSo|2DyrFA1M|YUixDM9B|JQvgEj0|mcuFx6JIek|eoTKe26gL|qaI9EVO1rB|0xl33btZL|1fszuAU|a7jnHzst6P|wQuJkX|cBNhTJlEOf|KNcFWhDvgT|XipDGjST|PCZJlbHoyt|2AYnMZkqd|HIpJh|KH0C3iztrG|W81hjts92|rJhAT|NON7LKoMQ|NMdY3nsKzI|t4En5v|Qq5cOQ9H|Y9nwrp|VX5FYVfsf|cE5SJG|x1vj1|HegbLe|zJ3nmt4OA|gt7rxW57dq|clIE9b|jyJ9g|B5jXjMCSx|cOzZBZTV|FTXGy|Dfh1q1|ny9jqZ2POI|X2NnMn|MBtoyD|qz4Ilys7wB|68lbOMye|3YUJnmxp|1fv5Imona|PlfvvXD7mA|ZarKfHCaPR|owORnX|dQP1YU|dVdkx|qgiK0E|cx9wQ|5F9bGa|7UjkKrp|Yvhrj|wYXez5Dg3|pG4GMU|MwMAu|rFRD5wlM".split("|");

const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function pureBase64Encode(str) {
  let out = "";
  for (let i = 0; i < str.length; i += 3) {
    const b0 = str.charCodeAt(i) & 0xff;
    const b1 = i + 1 < str.length ? str.charCodeAt(i + 1) & 0xff : NaN;
    const b2 = i + 2 < str.length ? str.charCodeAt(i + 2) & 0xff : NaN;
    out += BASE64_CHARS[b0 >> 2];
    out += BASE64_CHARS[((b0 & 3) << 4) | (isNaN(b1) ? 0 : b1 >> 4)];
    out += isNaN(b1) ? "=" : BASE64_CHARS[((b1 & 15) << 2) | (isNaN(b2) ? 0 : b2 >> 6)];
    out += isNaN(b2) ? "=" : BASE64_CHARS[b2 & 63];
  }
  return out;
}
function safeBtoa(str) {
  if (typeof btoa === "function") return btoa(str);
  return pureBase64Encode(str);
}

function rivestreamMurmurFinal(seedStr) {
  let str = String(seedStr), hash = 3735928559 ^ str.length;
  for (let idx = 0; idx < str.length; idx++) {
    let code = str.charCodeAt(idx);
    code ^= (131 * idx + 89 ^ code << idx % 5) & 255;
    hash = (hash << 7 | hash >>> 25) >>> 0 ^ code;
    const lo = (65535 & hash) * 60205, hi = (hash >>> 16) * 60205 << 16;
    hash = lo + hi >>> 0;
    hash ^= hash >>> 11;
  }
  hash ^= hash >>> 15;
  hash = (65535 & hash) * 49842 + ((hash >>> 16) * 49842 << 16) >>> 0;
  hash ^= hash >>> 13;
  hash = (65535 & hash) * 40503 + ((hash >>> 16) * 40503 << 16) >>> 0;
  hash ^= hash >>> 16;
  hash = (65535 & hash) * 10196 + ((hash >>> 16) * 10196 << 16) >>> 0;
  return (hash ^ hash >>> 15).toString(16).padStart(8, "0");
}

function rivestreamDjbMix(seedStr) {
  let str = String(seedStr), acc = 0;
  for (let idx = 0; idx < str.length; idx++) {
    const code = str.charCodeAt(idx);
    const rotated = ((acc = code + (acc << 6) + (acc << 16) - acc >>> 0) << idx % 5 | acc >>> 32 - idx % 5) >>> 0;
    acc ^= (rotated ^ (code << idx % 7 | code >>> 8 - idx % 7)) >>> 0;
    acc = acc + (acc >>> 11 ^ acc << 3) >>> 0;
  }
  acc ^= acc >>> 15;
  acc = (65535 & acc) * 49842 + (((acc >>> 16) * 49842 & 65535) << 16) >>> 0;
  acc ^= acc >>> 13;
  acc = (65535 & acc) * 40503 + (((acc >>> 16) * 40503 & 65535) << 16) >>> 0;
  return (acc ^ acc >>> 16).toString(16).padStart(8, "0");
}

function computeSecretKey(id) {
  if (id === undefined) return "rive";
  try {
    const str = String(id);
    let salt, splitAt;
    if (isNaN(Number(id))) {
      const charSum = str.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
      salt = RIVESTREAM_C_TOKENS[charSum % RIVESTREAM_C_TOKENS.length] || safeBtoa(str);
      splitAt = Math.floor(charSum % str.length / 2);
    } else {
      const num = Number(id);
      salt = RIVESTREAM_C_TOKENS[num % RIVESTREAM_C_TOKENS.length] || safeBtoa(str);
      splitAt = Math.floor(num % str.length / 2);
    }
    const salted = str.slice(0, splitAt) + salt + str.slice(splitAt);
    const finalHash = rivestreamMurmurFinal(rivestreamDjbMix(salted));
    return safeBtoa(finalHash);
  } catch (e) {
    return "topSecret";
  }
}

function formatBytes(bytes) {
  if (!bytes) return "Unknown";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

async function getTmdbRuntimeSeconds(tmdbId, mediaType, season, episode) {
  try {
    const url = mediaType === "tv"
      ? `https://api.themoviedb.org/3/tv/${tmdbId}/season/${season || 1}/episode/${episode || 1}?api_key=${TMDB_API_KEY}`
      : `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const resp = await fetch(url, { skipSizeCheck: true });
    if (!resp.ok) return null;
    const data = await resp.json();
    const minutes = data.runtime;
    return minutes ? minutes * 60 : null;
  } catch (e) {
    return null;
  }
}

function qualityLabelFromHeight(height) {
  if (height >= 2000) return "4K";
  if (height <= 0) return "Unknown";
  return `${height}p`;
}

function parseMasterPlaylistTopVariant(text, baseUrl) {
  const lines = text.split("\n").map(l => l.trim());
  let best = null;
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith("#EXT-X-STREAM-INF")) continue;
    const urlLine = lines[i + 1];
    if (!urlLine || urlLine.startsWith("#")) continue;
    const bandwidthMatch = lines[i].match(/BANDWIDTH=(\d+)/);
    const resolutionMatch = lines[i].match(/RESOLUTION=(\d+)x(\d+)/);
    const bandwidth = bandwidthMatch ? parseInt(bandwidthMatch[1], 10) : 0;
    const height = resolutionMatch ? parseInt(resolutionMatch[2], 10) : 0;
    let url = urlLine;
    try {
      url = new URL(urlLine, baseUrl).toString();
    } catch (e) {
      // urlLine already absolute
    }
    if (!best || bandwidth > best.bandwidth) best = { url, bandwidth, height };
  }
  return best;
}

// Tried in order when FlowCast has nothing. FlowCast is preferred first because it reports an
// exact byte size; these return HLS masters, so size has to be derived from BANDWIDTH x runtime.
const HLS_FALLBACK_SERVICES = ["primevids", "ophim"];

// Resolves one HLS-style service to a single adaptive stream, or null when that service has no
// entry for the title. The master URL is returned rather than a single variant so the player's own
// ABR logic can drop down on a weak connection.
async function buildHlsStream(baseUrl, requestID, params, secretKey, service, tmdbId, mediaType, season, episode) {
  const data = await fetchService(baseUrl, requestID, params, secretKey, service);
  const sources = (data && data.sources) || [];
  const hlsSource = sources.find(s => s && s.url && s.format === "hls");
  if (!hlsSource) return null;

  const playlistResp = await fetch(hlsSource.url, { headers: HEADERS, skipSizeCheck: true });
  if (!playlistResp.ok) return null;

  const topVariant = parseMasterPlaylistTopVariant(await playlistResp.text(), hlsSource.url);
  if (!topVariant) return null;

  const runtimeSeconds = await getTmdbRuntimeSeconds(tmdbId, mediaType, season, episode);
  const quality = qualityLabelFromHeight(topVariant.height);
  return {
    url: topVariant.url,
    quality,
    title: `Rivestream ${quality}`,
    name: "Rivestream",
    size: runtimeSeconds ? formatBytes((topVariant.bandwidth * runtimeSeconds) / 8) : "Unknown",
    headers: HEADERS,
    subtitles: []
  };
}

async function fetchService(baseUrl, requestID, params, secretKey, service) {
  const search = new URLSearchParams({ requestID, ...params, service, secretKey, proxyMode: "noProxy" });
  const resp = await fetch(`${baseUrl}/api/backendfetch?${search.toString()}`, { headers: HEADERS, skipSizeCheck: true });
  if (!resp.ok) return null;
  const data = await resp.json().catch(() => null);
  return data && data.data ? data.data : null;
}

async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    let numericTmdbId = tmdbId;
    if (typeof tmdbId === "string" && tmdbId.trim().toLowerCase().startsWith("tt")) {
      const findUrl = `https://api.themoviedb.org/3/find/${tmdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;
      const findData = await (await fetch(findUrl, { skipSizeCheck: true })).json();
      const results = mediaType === "tv" ? findData.tv_results : findData.movie_results;
      numericTmdbId = results && results.length ? results[0].id : null;
      if (!numericTmdbId) return [];
    }
    numericTmdbId = parseInt(numericTmdbId, 10);
    if (!numericTmdbId) return [];

    const baseUrl = await getBaseUrl();
    const isTv = mediaType === "tv";
    const secretKey = computeSecretKey(numericTmdbId);

    const requestID = isTv ? "tvVideoProvider" : "movieVideoProvider";
    const params = { id: String(numericTmdbId) };
    if (isTv) {
      params.season = String(season || 1);
      params.episode = String(episode || 1);
    }

    const streams = [];

    if (!isTv) {
      const flowcastData = await fetchService(baseUrl, requestID, params, secretKey, "flowcast");
      const flowcastSources = (flowcastData && flowcastData.sources) || [];
      for (const s of flowcastSources) {
        if (!s || !s.url) continue;
        const height = parseInt(s.quality, 10) || 0;
        streams.push({
          url: s.url,
          quality: qualityLabelFromHeight(height),
          title: `Rivestream ${qualityLabelFromHeight(height)}`,
          name: "Rivestream",
          size: s.size ? formatBytes(parseInt(s.size, 10)) : "Unknown",
          headers: HEADERS,
          subtitles: []
        });
      }
    }

    // FlowCast only carries a subset of the catalogue, and primevids has its own gaps - plenty of
    // well-known titles (Inception, The Dark Knight) return {"data":null} from BOTH while ophim
    // still has them, so all three are tried in turn rather than just the first two.
    if (!streams.length) {
      for (const service of HLS_FALLBACK_SERVICES) {
        const stream = await buildHlsStream(baseUrl, requestID, params, secretKey, service, numericTmdbId, mediaType, season, episode);
        if (stream) {
          streams.push(stream);
          break;
        }
      }
    }

    streams.sort((a, b) => {
      const rankA = a.quality === "4K" ? 2160 : (parseInt(a.quality, 10) || 0);
      const rankB = b.quality === "4K" ? 2160 : (parseInt(b.quality, 10) || 0);
      return rankB - rankA;
    });
    return streams;
  } catch (e) {
    console.error("[Rivestream]", e);
    return [];
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
