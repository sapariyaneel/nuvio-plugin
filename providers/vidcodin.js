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
const FALLBACK_API_HOST = "https://stream.fontaine.lol";
const AES_KEY_HEX = "bfdf4d46136f9e54f85699893a75261e7237a53d9015ee76d120aa54a1943bb0";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Referer": "https://vidcodin.net/",
  "Origin": "https://vidcodin.net"
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
function getApiUrl() {
  return __async(this, null, function* () {
    const d = yield getDomains();
    const host = d.vidcodin || d["stream.fontaine.lol"] || FALLBACK_API_HOST;
    return `${host.replace(/\/+$/, "")}/astral`;
  });
}
function hexToBytes(hex) {
  const clean = (hex || "").replace(/[^0-9a-fA-F]/g, "");
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2)
    bytes[i / 2] = parseInt(clean.substr(i, 2), 16);
  return bytes;
}
function formatBytes(bytes) {
  if (!bytes)
    return "";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
function probeSize(url) {
  return __async(this, null, function* () {
    try {
      const res = yield fetch(url, { method: "HEAD", headers: HEADERS, skipSizeCheck: true });
      const len = res.headers.get("content-length");
      return len ? formatBytes(parseInt(len, 10)) : "";
    } catch (e) {
      return "";
    }
  });
}
function qualityLabel(n) {
  const num = parseInt(n, 10);
  if (!num)
    return "Unknown";
  return `${num}p`;
}
function decryptAstralToken(token) {
  return __async(this, null, function* () {
    try {
      if (!token || !token.startsWith("as_"))
        return token;
      const raw = hexToBytes(token.slice(3));
      if (raw.length < 28)
        return null;
      const iv = raw.slice(0, 12);
      const ciphertext = raw.slice(12);
      const keyBytes = hexToBytes(AES_KEY_HEX);
      const key = yield crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["decrypt"]);
      const plainBuf = yield crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
      return new TextDecoder().decode(plainBuf);
    } catch (e) {
      return null;
    }
  });
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      if (typeof tmdbId === "string" && tmdbId.trim().toLowerCase().startsWith("tt")) {
        const url = `https://api.themoviedb.org/3/find/${tmdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;
        const data2 = yield (yield fetch(url, { skipSizeCheck: true })).json();
        const results = mediaType === "tv" ? data2.tv_results : data2.movie_results;
        tmdbId = results && results.length ? results[0].id : null;
        if (!tmdbId)
          return [];
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
      const apiUrl = yield getApiUrl();
      const resp = yield fetch(`${apiUrl}?${params.toString()}`, { headers: HEADERS, skipSizeCheck: true });
      if (!resp.ok)
        return [];
      const data = yield resp.json().catch(() => null);
      const qualities = data && data.qualities;
      if (!qualities || !Object.keys(qualities).length)
        return [];
      const entries = Object.entries(qualities);
      const decrypted = yield Promise.all(entries.map((_0) => __async(this, [_0], function* ([q, token]) {
        const url = yield decryptAstralToken(token);
        if (!url || !url.startsWith("http"))
          return null;
        const size = yield probeSize(url);
        return { quality: q, url, size };
      })));
      const streams = decrypted.filter(Boolean).map((d) => ({
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
  });
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
