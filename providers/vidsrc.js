/**
 * vidsrc - Built from src/vidsrc/
 * Generated: 2026-08-18T09:52:03.591Z
 */

// src/vidsrc/index.js
var TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
var DOMAINS_URL = "https://raw.githubusercontent.com/sapariyaneel/nuvio-plugin/refs/heads/main/domains.json";
var FALLBACK_API_BASE = "https://api.speedracelight.com";
var REQUEST_TIMEOUT_MS = 15e3;
var MAGIC_HEADER = [109, 118, 109, 49];
var cachedDomains = null;
async function getDomains() {
  if (cachedDomains)
    return cachedDomains;
  try {
    const resp = await fetch(DOMAINS_URL, { skipSizeCheck: true, redirect: "follow" });
    cachedDomains = await resp.json();
  } catch (e) {
    cachedDomains = {};
  }
  return cachedDomains;
}
async function getApiBase() {
  const d = await getDomains();
  return (d.speedracelight || FALLBACK_API_BASE).replace(/\/+$/, "");
}
function fetchWithTimeout(url, options) {
  return Promise.race([
    fetch(url, { redirect: "follow", ...options }),
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), REQUEST_TIMEOUT_MS))
  ]);
}
async function fetchWithRetry(url, options, retries) {
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetchWithTimeout(url, options);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}
function fmix(h) {
  h = h >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 2246822507) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}
function rotl(x, n) {
  x = x >>> 0;
  n = n & 31;
  if (n === 0)
    return x >>> 0;
  return (x << n | x >>> 32 - n) >>> 0;
}
function fnv1a(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619) >>> 0;
  }
  return fmix(h);
}
function buildKeystreamState(seed, mediaIdNum) {
  const S = new Array(61);
  let acc = fmix(fnv1a(seed) ^ fmix(mediaIdNum >>> 0 ^ 2654435769)) >>> 0;
  for (let e = 0; e < 8; e++) {
    const idx = acc % 61;
    acc = rotl(acc + 2654435769 >>> 0, 7 + (7 & e));
    S[idx] = (acc ^ fmix(acc)) >>> 0;
    acc = fmix(acc + idx >>> 0);
  }
  return { S, acc: fmix(2779096485 ^ acc) >>> 0 };
}
function nextKeystreamWord(state, counter) {
  const S = state.S;
  const acc = state.acc;
  const idx = acc % S.length;
  const inTable = idx in S ? 1 : 0;
  const mask = 0 - inTable;
  const sVal = S[idx] >>> 0;
  const tVal = (sVal ^ Math.imul(2654435769, counter + 1) >>> 0) >>> 0;
  let l = ((acc ^ tVal) >>> 0 | (acc & tVal & mask) >>> 0) >>> 0;
  l = (rotl(l + acc >>> 0, 31 & idx) ^ rotl(acc, 31 & Math.imul(idx, 7))) >>> 0;
  const nextAcc = fmix(l + 2654435769 >>> 0);
  S[idx] = nextAcc >>> 0;
  state.acc = nextAcc;
  return nextAcc >>> 0;
}
function generateKeystream(seed, mediaIdNum, length) {
  const state = buildKeystreamState(seed, mediaIdNum);
  const out = new Uint8Array(length);
  let counter = 0;
  let i = 0;
  while (i < length) {
    const word = nextKeystreamWord(state, counter++);
    out[i++] = word & 255;
    if (i < length)
      out[i++] = word >>> 8 & 255;
    if (i < length)
      out[i++] = word >>> 16 & 255;
    if (i < length)
      out[i++] = word >>> 24 & 255;
  }
  return out;
}
function base64UrlDecode(str) {
  const norm = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = norm.padEnd(4 * Math.ceil(norm.length / 4), "=");
  if (typeof atob === "function") {
    const bin = atob(padded);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++)
      out[i] = bin.charCodeAt(i);
    return out;
  }
  return new Uint8Array(globalThis.Buffer.from(padded, "base64"));
}
function utf8BytesToString(bytes) {
  if (typeof TextDecoder !== "undefined")
    return new TextDecoder("utf-8").decode(bytes);
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
function decryptSourcesResponse(cipherB64Url, seed, mediaIdNum) {
  const cipherBytes = base64UrlDecode(cipherB64Url);
  const keystream = generateKeystream(seed, mediaIdNum, cipherBytes.length);
  const out = new Uint8Array(cipherBytes.length);
  for (let i = 0; i < cipherBytes.length; i++)
    out[i] = cipherBytes[i] ^ keystream[i];
  for (let i = 0; i < MAGIC_HEADER.length; i++) {
    if (out[i] !== MAGIC_HEADER[i])
      throw new Error("decrypt failed: bad seed or tampered payload");
  }
  return utf8BytesToString(out.subarray(MAGIC_HEADER.length));
}
async function fetchSeed(apiBase, mediaIdNum) {
  const resp = await fetchWithRetry(`${apiBase}/seed?mediaId=${mediaIdNum}`, { skipSizeCheck: true }, 2);
  if (!resp.ok)
    return null;
  const data = await resp.json().catch(() => null);
  return data && data.seed ? data.seed : null;
}
async function fetchAndDecryptSources(apiBase, mediaIdNum, params) {
  const seed = await fetchSeed(apiBase, mediaIdNum);
  if (!seed)
    return null;
  const query = new URLSearchParams({ ...params, enc: "2", seed });
  const resp = await fetchWithRetry(`${apiBase}/cdn/sources-with-title?${query.toString()}`, { skipSizeCheck: true }, 2);
  if (!resp.ok)
    return null;
  const cipherText = await resp.text();
  try {
    const plain = decryptSourcesResponse(cipherText, seed, mediaIdNum);
    return JSON.parse(plain);
  } catch (e) {
    return null;
  }
}
function formatBytes(bytes) {
  if (!bytes)
    return "Unknown";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
function meetsMinSize(sizeStr) {
  const m = String(sizeStr || "").match(/^([\d.]+)\s*(Bytes|KB|MB|GB|TB)$/i);
  if (!m)
    return true;
  const mult = { BYTES: 1 / 1048576, KB: 1 / 1024, MB: 1, GB: 1024, TB: 1048576 };
  return parseFloat(m[1]) * (mult[m[2].toUpperCase()] || 0) >= 150;
}
function qualityRank(quality) {
  if (/^4k$/i.test(quality) || quality === "2160p")
    return 2160;
  const n = parseInt(quality, 10);
  return Number.isFinite(n) ? n : 0;
}
function normalizeQualityLabel(quality) {
  if (/^4k$/i.test(quality))
    return "2160p";
  return quality || "Unknown";
}
function resolveUrl(line, baseUrl) {
  try {
    return new URL(line, baseUrl).toString();
  } catch (e) {
    return line;
  }
}
function parseMasterTopVariant(text, baseUrl) {
  const lines = text.split("\n").map((l) => l.trim());
  let best = null;
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith("#EXT-X-STREAM-INF"))
      continue;
    const urlLine = lines[i + 1];
    if (!urlLine || urlLine.startsWith("#"))
      continue;
    const bandwidthMatch = lines[i].match(/BANDWIDTH=(\d+)/);
    const bandwidth = bandwidthMatch ? parseInt(bandwidthMatch[1], 10) : 0;
    if (!best || bandwidth > best.bandwidth) {
      best = { url: resolveUrl(urlLine, baseUrl), bandwidth };
    }
  }
  return best;
}
async function getTmdbInfo(tmdbId, mediaType, season, episode) {
  try {
    const url = mediaType === "tv" ? `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}` : `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const resp = await fetchWithRetry(url, { skipSizeCheck: true }, 2);
    if (!resp.ok)
      return null;
    const data = await resp.json();
    let runtimeSeconds = data.runtime ? data.runtime * 60 : null;
    if (mediaType === "tv" && season != null && episode != null) {
      const epUrl = `https://api.themoviedb.org/3/tv/${tmdbId}/season/${season}/episode/${episode}?api_key=${TMDB_API_KEY}`;
      const epResp = await fetchWithRetry(epUrl, { skipSizeCheck: true }, 2).catch(() => null);
      if (epResp && epResp.ok) {
        const epData = await epResp.json().catch(() => null);
        if (epData && epData.runtime)
          runtimeSeconds = epData.runtime * 60;
      }
    }
    return {
      title: data.title || data.name || "",
      year: (data.release_date || data.first_air_date || "").slice(0, 4),
      imdbId: data.imdb_id || "",
      runtimeSeconds
    };
  } catch (e) {
    return null;
  }
}
async function buildStream(source, runtimeSeconds) {
  try {
    if (!source.url || !/^https?:\/\//i.test(source.url))
      return null;
    const quality = normalizeQualityLabel(source.quality);
    let bandwidth = 0;
    if (source.url.includes(".m3u8")) {
      const resp = await fetchWithTimeout(source.url, { skipSizeCheck: true }).catch(() => null);
      if (resp && resp.ok) {
        const text = await resp.text();
        const topVariant = parseMasterTopVariant(text, source.url);
        if (topVariant)
          bandwidth = topVariant.bandwidth;
      }
    }
    return {
      url: source.url,
      quality,
      title: `VidSrc 4K ${quality}`,
      name: "VidSrc",
      size: runtimeSeconds && bandwidth ? formatBytes(bandwidth * runtimeSeconds / 8) : "Unknown",
      headers: {},
      subtitles: []
    };
  } catch (e) {
    return null;
  }
}
async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    let numericTmdbId = tmdbId;
    if (typeof tmdbId === "string" && tmdbId.trim().toLowerCase().startsWith("tt")) {
      const findUrl = `https://api.themoviedb.org/3/find/${tmdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;
      const findData = await (await fetchWithTimeout(findUrl, { skipSizeCheck: true })).json();
      const results = mediaType === "tv" ? findData.tv_results : findData.movie_results;
      numericTmdbId = results && results.length ? results[0].id : null;
      if (!numericTmdbId)
        return [];
    }
    numericTmdbId = parseInt(numericTmdbId, 10);
    if (!numericTmdbId)
      return [];
    const info = await getTmdbInfo(numericTmdbId, mediaType, season, episode);
    if (!info)
      return [];
    const apiBase = await getApiBase();
    const isTv = mediaType === "tv";
    const params = {
      title: info.title,
      mediaType: isTv ? "tv" : "movie",
      year: info.year,
      episodeId: String(isTv ? episode || 1 : 1),
      seasonId: String(isTv ? season || 1 : 1),
      tmdbId: String(numericTmdbId),
      imdbId: info.imdbId
    };
    const parsed = await fetchAndDecryptSources(apiBase, numericTmdbId, params);
    if (!parsed || !Array.isArray(parsed.sources) || !parsed.sources.length)
      return [];
    const resolved = await Promise.all(parsed.sources.map((s) => buildStream(s, info.runtimeSeconds)));
    const seenUrls = {};
    const streams = [];
    for (const stream of resolved) {
      if (!stream || seenUrls[stream.url])
        continue;
      seenUrls[stream.url] = true;
      streams.push(stream);
    }
    streams.sort((a, b) => qualityRank(b.quality) - qualityRank(a.quality));
    return streams.filter((s) => meetsMinSize(s.size));
  } catch (e) {
    return [];
  }
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
