var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
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
const FALLBACK_API_HOST = "https://api.speedracelight.com";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Referer": "https://www.cineby.at/",
  "Origin": "https://www.cineby.at"
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
function getApiHost() {
  return __async(this, null, function* () {
    const d = yield getDomains();
    return (d["speedracelight"] || d["api.speedracelight.com"] || FALLBACK_API_HOST).replace(/\/+$/, "");
  });
}
const SHA256_CONSTANTS = [
  1116352408,
  1899447441,
  3049323471,
  3921009573,
  961987163,
  1508970993,
  2453635748,
  2870763221,
  3624381080,
  310598401,
  607225278,
  1426881987,
  1925078388,
  2162078206,
  2614888103,
  3248222580
];
const MAGIC_BYTES = [109, 118, 109, 49];
function isCustomBranch(e) {
  return (e * (e + 1) & 1) === 0;
}
function fmix32(h) {
  h = h >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 2246822507) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909) >>> 0;
  h = (h ^ h >>> 16) >>> 0;
  return h;
}
function rotl32(x, n) {
  x = x >>> 0;
  n &= 31;
  if (n === 0)
    return x >>> 0;
  return (x << n | x >>> 32 - n) >>> 0;
}
const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function pureBase64Decode(b64) {
  let clean = "";
  for (let i = 0; i < b64.length; i++) {
    const ch = b64.charAt(i);
    if (ch !== "=" && BASE64_CHARS.indexOf(ch) !== -1)
      clean += ch;
  }
  let bin = "";
  for (let i = 0; i < clean.length; i += 4) {
    const n0 = BASE64_CHARS.indexOf(clean.charAt(i));
    const n1 = BASE64_CHARS.indexOf(clean.charAt(i + 1));
    const n2 = i + 2 < clean.length ? BASE64_CHARS.indexOf(clean.charAt(i + 2)) : -1;
    const n3 = i + 3 < clean.length ? BASE64_CHARS.indexOf(clean.charAt(i + 3)) : -1;
    bin += String.fromCharCode(n0 << 2 | n1 >> 4);
    if (n2 !== -1)
      bin += String.fromCharCode((n1 & 15) << 4 | n2 >> 2);
    if (n3 !== -1)
      bin += String.fromCharCode((n2 & 3) << 6 | n3);
  }
  return bin;
}
function base64UrlToBytes(str) {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/").padEnd(4 * Math.ceil(str.length / 4), "=");
  const bin = typeof atob === "function" ? atob(b64) : pureBase64Decode(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++)
    bytes[i] = bin.charCodeAt(i);
  return bytes;
}
function fnv1a32(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++)
    h = Math.imul(h ^ str.charCodeAt(i), 16777619) >>> 0;
  return fmix32(h);
}
function makeKeystreamState(seedStr, mediaId) {
  const slots = new Array(61);
  let n = fmix32(fnv1a32(seedStr) ^ fmix32(mediaId >>> 0 ^ 2654435769)) >>> 0;
  for (let i = 0; i < 8; i++) {
    if (isCustomBranch(i)) {
      const slot = n % 61;
      n = rotl32(n + 2654435769 >>> 0, 7 + (7 & i));
      slots[slot] = (n ^ fmix32(n)) >>> 0;
      n = fmix32(n + slot >>> 0);
    } else {
      slots[i] = SHA256_CONSTANTS[15 & i];
    }
  }
  return { slots, acc: fmix32(2779096485 ^ n) >>> 0 };
}
function nextKeystreamWord(state, counter) {
  const slots = state.slots;
  const prevAcc = state.acc;
  const slotIdx = prevAcc % 61;
  const hasSlot = slotIdx in slots ? -1 : 0;
  const slotVal = slots[slotIdx] >>> 0;
  const mix = (slotVal ^ Math.imul(2654435769, counter + 1) >>> 0) >>> 0;
  const combined = ((prevAcc ^ mix) >>> 0 | (prevAcc & mix & hasSlot) >>> 0) >>> 0;
  const rotated = (rotl32(combined + prevAcc >>> 0, 31 & slotIdx) ^ rotl32(prevAcc, 31 & Math.imul(slotIdx, 7))) >>> 0;
  const newAcc = fmix32(rotated + 2654435769 >>> 0);
  slots[slotIdx] = newAcc >>> 0;
  state.acc = newAcc;
  return newAcc >>> 0;
}
function generateKeystream(seedStr, mediaId, length) {
  const state = makeKeystreamState(seedStr, mediaId);
  const out = new Uint8Array(length);
  let idx = 0, counter = 0;
  while (idx < length) {
    const word = nextKeystreamWord(state, counter++);
    out[idx++] = 255 & word;
    if (idx < length)
      out[idx++] = word >>> 8 & 255;
    if (idx < length)
      out[idx++] = word >>> 16 & 255;
    if (idx < length)
      out[idx++] = word >>> 24 & 255;
  }
  return out;
}
function utf8BytesToString(bytes) {
  let result = "";
  let i = 0;
  while (i < bytes.length) {
    const b0 = bytes[i++];
    if (b0 < 128) {
      result += String.fromCharCode(b0);
    } else if ((b0 & 224) === 192) {
      const b1 = bytes[i++];
      result += String.fromCharCode((b0 & 31) << 6 | b1 & 63);
    } else if ((b0 & 240) === 224) {
      const b1 = bytes[i++], b2 = bytes[i++];
      result += String.fromCharCode((b0 & 15) << 12 | (b1 & 63) << 6 | b2 & 63);
    } else if ((b0 & 248) === 240) {
      const b1 = bytes[i++], b2 = bytes[i++], b3 = bytes[i++];
      let code = (b0 & 7) << 18 | (b1 & 63) << 12 | (b2 & 63) << 6 | b3 & 63;
      code -= 65536;
      result += String.fromCharCode(55296 + (code >> 10), 56320 + (code & 1023));
    } else {
      result += String.fromCharCode(b0);
    }
  }
  return result;
}
function decryptSourcesPayload(cipherText, seedStr, mediaId) {
  const cipherBytes = base64UrlToBytes(cipherText);
  const keystream = generateKeystream(seedStr, mediaId, cipherBytes.length);
  const plain = new Uint8Array(cipherBytes.length);
  for (let i = 0; i < cipherBytes.length; i++)
    plain[i] = cipherBytes[i] ^ keystream[i];
  for (let i = 0; i < MAGIC_BYTES.length; i++) {
    if (plain[i] !== MAGIC_BYTES[i])
      throw new Error("decrypt failed: bad seed or tampered payload");
  }
  const body = plain.subarray(MAGIC_BYTES.length);
  return utf8BytesToString(body);
}
function resolveTmdbId(id) {
  return __async(this, null, function* () {
    if (typeof id === "string" && id.trim().toLowerCase().startsWith("tt"))
      return null;
    return String(id);
  });
}
function getTmdbMeta(tmdbId, mediaType) {
  return __async(this, null, function* () {
    const type = mediaType === "tv" ? "tv" : "movie";
    const url = `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
    const resp = yield fetch(url, { skipSizeCheck: true });
    if (!resp.ok)
      return null;
    const data = yield resp.json();
    const title = type === "tv" ? data.name : data.title;
    const dateStr = type === "tv" ? data.first_air_date : data.release_date;
    const year = dateStr ? dateStr.slice(0, 4) : "";
    const imdbId = data.external_ids && data.external_ids.imdb_id || data.imdb_id || "";
    return { title, year, imdbId };
  });
}
function qualityRank(q) {
  if (!q)
    return 0;
  if (/4k/i.test(q))
    return 2160;
  const n = parseInt(q, 10);
  return Number.isFinite(n) ? n : 0;
}
function formatBytes(bytes) {
  if (!bytes)
    return "Unknown";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
const SEGMENT_SAMPLE_SIZE = 5;
function getRealSegmentSize(url) {
  return __async(this, null, function* () {
    try {
      const head = yield fetch(url, { method: "HEAD", headers: HEADERS, skipSizeCheck: true });
      const len = head.headers.get("content-length");
      if (len)
        return parseInt(len, 10);
    } catch (e) {
    }
    try {
      const ranged = yield fetch(url, { headers: __spreadProps(__spreadValues({}, HEADERS), { "Range": "bytes=0-1" }), skipSizeCheck: true });
      const contentRange = ranged.headers.get("content-range");
      const match = contentRange && contentRange.match(/\/(\d+)$/);
      if (match)
        return parseInt(match[1], 10);
    } catch (e) {
    }
    return null;
  });
}
function estimateHlsSize(playlistUrl) {
  return __async(this, null, function* () {
    try {
      const resp = yield fetch(playlistUrl, { headers: HEADERS, skipSizeCheck: true });
      if (!resp.ok)
        return "Unknown";
      const text = yield resp.text();
      const segmentUrls = text.split("\n").map((l) => l.trim()).filter((l) => l.startsWith("http"));
      if (!segmentUrls.length)
        return "Unknown";
      const sampleUrls = segmentUrls.filter((_, i) => i % Math.ceil(segmentUrls.length / SEGMENT_SAMPLE_SIZE) === 0).slice(0, SEGMENT_SAMPLE_SIZE);
      const lengths = yield Promise.all(sampleUrls.map(getRealSegmentSize));
      const validLengths = lengths.filter((l) => l && l > 0);
      if (!validLengths.length)
        return "Unknown";
      const avgSegmentBytes = validLengths.reduce((a, b) => a + b, 0) / validLengths.length;
      const estimatedTotal = avgSegmentBytes * segmentUrls.length;
      return formatBytes(estimatedTotal);
    } catch (e) {
      return "Unknown";
    }
  });
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      let numericTmdbId = tmdbId;
      if (typeof tmdbId === "string" && tmdbId.trim().toLowerCase().startsWith("tt")) {
        const findUrl = `https://api.themoviedb.org/3/find/${tmdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;
        const findData = yield (yield fetch(findUrl, { skipSizeCheck: true })).json();
        const results = mediaType === "tv" ? findData.tv_results : findData.movie_results;
        numericTmdbId = results && results.length ? results[0].id : null;
        if (!numericTmdbId)
          return [];
      }
      numericTmdbId = parseInt(numericTmdbId, 10);
      if (!numericTmdbId)
        return [];
      const meta = yield getTmdbMeta(numericTmdbId, mediaType);
      if (!meta || !meta.title)
        return [];
      const apiHost = yield getApiHost();
      const isTv = mediaType === "tv";
      const seedResp = yield fetch(`${apiHost}/seed?mediaId=${numericTmdbId}`, { headers: HEADERS, skipSizeCheck: true });
      if (!seedResp.ok)
        return [];
      const seedData = yield seedResp.json().catch(() => null);
      if (!seedData || !seedData.seed)
        return [];
      const params = new URLSearchParams({
        title: meta.title,
        mediaType: isTv ? "tv" : "movie",
        year: meta.year || "",
        episodeId: String(isTv ? episode || 1 : 1),
        seasonId: String(isTv ? season || 1 : 1),
        tmdbId: String(numericTmdbId),
        imdbId: meta.imdbId || "",
        enc: "2",
        seed: seedData.seed
      });
      const sourcesResp = yield fetch(`${apiHost}/cdn/sources-with-title?${params.toString()}`, { headers: HEADERS, skipSizeCheck: true });
      if (!sourcesResp.ok)
        return [];
      const cipherText = yield sourcesResp.text();
      let payload;
      try {
        const plainText = decryptSourcesPayload(cipherText, seedData.seed, numericTmdbId);
        payload = JSON.parse(plainText);
      } catch (e) {
        console.error("[Cineby] decrypt failed:", e.message);
        return [];
      }
      const sources = payload && payload.sources || [];
      if (!sources.length)
        return [];
      const subtitles = (payload && payload.subtitles || []).filter((s) => s && s.url).map((s) => ({ url: s.url, lang: s.lang || s.language || "Unknown" }));
      const streams = yield Promise.all(sources.filter((s) => s && s.url).map((s) => __async(this, null, function* () {
        const size = yield estimateHlsSize(s.url);
        return {
          url: s.url,
          quality: s.quality || "Unknown",
          title: `Cineby ${s.quality || "Unknown"}`,
          name: "Cineby",
          size,
          headers: HEADERS,
          subtitles
        };
      })));
      streams.sort((a, b) => qualityRank(b.quality) - qualityRank(a.quality));
      return streams;
    } catch (e) {
      console.error("[Cineby]", e);
      return [];
    }
  });
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
