// vidcodin.js
// Vidcodin (https://vidcodin.net) - TMDB-id-only movie & TV streaming, single JSON API call per title
// API: GET https://stream.fontaine.lol/astral?tmdbId={id}&type=movie|tv&seasonId={s}&episodeId={e}&key={KEY}
//      -> {"qualities":{"360":"as_<hex>","480":"as_<hex>",...}}
// Each as_<hex> value is AES-256-GCM ciphertext (first 12 bytes of the decoded hex are the IV,
// remainder is ciphertext+tag) encrypted with a fixed key baked into the site's JS bundle. Decrypting
// yields the real stream URL, e.g. https://v1.streamrk.site/https%3A%2F%2F<cdn>%2Fconvert-h264%2F...mp4
// Reverse-engineered from the site's obfuscated Vite/React bundle (javascript-obfuscator string-array
// scheme) by extracting and running its own decoder function standalone - not guessed.

// No registry key currently exists for this site (checked against phisher98/TVVVV/domains.json) -
// still wired to the shared registry so it picks up a live API host automatically if one is added
// later, falling back to the hardcoded host in the meantime. The frontend (vidcodin.net) and the
// actual API backend (stream.fontaine.lol) are separate domains that can churn independently.
const DOMAINS_URL = "https://raw.githubusercontent.com/phisher98/TVVVV/refs/heads/main/domains.json";
const FALLBACK_API_HOST = "https://stream.fontaine.lol";
const AES_KEY_HEX = "bfdf4d46136f9e54f85699893a75261e7237a53d9015ee76d120aa54a1943bb0";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Referer": "https://vidcodin.net/",
  "Origin": "https://vidcodin.net"
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

async function getApiUrl() {
  const d = await getDomains();
  const host = d.vidcodin || d["stream.fontaine.lol"] || FALLBACK_API_HOST;
  return `${host.replace(/\/+$/, "")}/astral`;
}

function hexToBytes(hex) {
  const clean = (hex || "").replace(/[^0-9a-fA-F]/g, "");
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) bytes[i / 2] = parseInt(clean.substr(i, 2), 16);
  return bytes;
}

function formatBytes(bytes) {
  if (!bytes) return "";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// The API response never includes a size - the only place it's exposed is the Content-Length header
// on the final CDN URL, so a lightweight HEAD request per stream is the only way to get a real size.
async function probeSize(url) {
  try {
    const res = await fetch(url, { method: "HEAD", headers: HEADERS, skipSizeCheck: true });
    const len = res.headers.get("content-length");
    return len ? formatBytes(parseInt(len, 10)) : "";
  } catch (e) {
    return "";
  }
}

function qualityLabel(n) {
  const num = parseInt(n, 10);
  if (!num) return "Unknown";
  return `${num}p`;
}

// as_<hex>: strip prefix, split IV (first 12 bytes) from AES-GCM ciphertext+tag, decrypt with the
// fixed site key, decode UTF-8 to get the real stream URL.
async function decryptAstralToken(token) {
  try {
    if (!token || !token.startsWith("as_")) return token;
    const raw = hexToBytes(token.slice(3));
    if (raw.length < 28) return null;
    const iv = raw.slice(0, 12);
    const ciphertext = raw.slice(12);
    const keyBytes = hexToBytes(AES_KEY_HEX);
    const key = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["decrypt"]);
    const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
    return new TextDecoder().decode(plainBuf);
  } catch (e) {
    return null;
  }
}

async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    if (typeof tmdbId === "string" && tmdbId.trim().toLowerCase().startsWith("tt")) {
      const url = `https://api.themoviedb.org/3/find/${tmdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;
      const data = await (await fetch(url, { skipSizeCheck: true })).json();
      const results = mediaType === "tv" ? data.tv_results : data.movie_results;
      tmdbId = results && results.length ? results[0].id : null;
      if (!tmdbId) return [];
    }

    const isTv = mediaType === "tv";
    const params = new URLSearchParams({
      tmdbId: String(tmdbId),
      type: isTv ? "tv" : "movie",
      key: AES_KEY_HEX
    });
    if (isTv) {
      params.set("seasonId", String(season || 1));
      params.set("episodeId", String(episode || 1));
    }

    const apiUrl = await getApiUrl();
    const resp = await fetch(`${apiUrl}?${params.toString()}`, { headers: HEADERS, skipSizeCheck: true });
    if (!resp.ok) return [];
    const data = await resp.json().catch(() => null);
    const qualities = data && data.qualities;
    if (!qualities || !Object.keys(qualities).length) return [];

    const entries = Object.entries(qualities);
    const decrypted = await Promise.all(entries.map(async ([q, token]) => {
      const url = await decryptAstralToken(token);
      if (!url || !url.startsWith("http")) return null;
      const size = await probeSize(url);
      return { quality: q, url, size };
    }));

    const streams = decrypted
      .filter(Boolean)
      .map(d => ({
        url: d.url,
        quality: qualityLabel(d.quality),
        title: `Vidcodin ${qualityLabel(d.quality)}`,
        name: "Vidcodin",
        size: d.size,
        subtitles: []
      }));

    streams.sort((a, b) => (parseInt(b.quality, 10) || 0) - (parseInt(a.quality, 10) || 0));
    return streams;
  } catch (e) {
    console.error("[Vidcodin]", e);
    return [];
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
