/**
 * vidcore - Built from src/providers/vidcore.js
 * Generated: 2026-08-18T11:59:13.092Z
 */

// src/providers/vidcore.js
var TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
var DOMAINS_URL = "https://raw.githubusercontent.com/sapariyaneel/nuvio-plugin/refs/heads/main/domains.json";
var FALLBACK_API_BASE = "https://hahaevilcraft.site";
var FALLBACK_EMBED_BASE = "https://vidcore.org";
var MIRROR_IDS = [
  "vidsuper-castle",
  "vaplayer",
  "hera",
  "vidrock",
  "vidsuper-vidnest",
  "vidsuper-vixsrc",
  "vidlove",
  "videasy",
  "odin",
  "goated",
  "zinkmovies",
  "multivid"
];
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
async function getBases() {
  const d = await getDomains();
  const apiBase = (d.vidcoreApi || FALLBACK_API_BASE).replace(/\/+$/, "");
  const embedBase = (d.vidcore || FALLBACK_EMBED_BASE).replace(/\/+$/, "");
  return { apiBase, embedBase };
}
function fetchWithTimeout(url, options) {
  return fetch(url, { redirect: "follow", ...options });
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
function qualityLabelFromResolution(width, height) {
  if (width >= 3200 || height >= 2e3)
    return "4K";
  if (width >= 2400 || height >= 1400)
    return "1440p";
  if (width >= 1800 || height >= 1e3)
    return "1080p";
  if (width >= 1200 || height >= 700)
    return "720p";
  if (width >= 800 || height >= 460)
    return "480p";
  if (width >= 600 || height >= 340)
    return "360p";
  if (width > 0 || height > 0)
    return "240p";
  return "Unknown";
}
function qualityRank(quality) {
  if (quality === "4K")
    return 2160;
  const n = parseInt(quality, 10);
  return Number.isFinite(n) ? n : 0;
}
function invertedSortTag(value, max) {
  const clamped = Math.max(0, Math.min(max, Math.floor(value) || 0));
  const inverted = max - clamped;
  const bits = inverted.toString(2).padStart(20, "0");
  return bits.split("").map((bit) => bit === "1" ? "\uFEFF" : "\u200B").join("");
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
    const resolutionMatch = lines[i].match(/RESOLUTION=(\d+)x(\d+)/);
    const bandwidth = bandwidthMatch ? parseInt(bandwidthMatch[1], 10) : 0;
    const width = resolutionMatch ? parseInt(resolutionMatch[1], 10) : 0;
    const height = resolutionMatch ? parseInt(resolutionMatch[2], 10) : 0;
    if (!best || bandwidth > best.bandwidth) {
      best = { url: resolveUrl(urlLine, baseUrl), bandwidth, width, height };
    }
  }
  return best;
}
async function getTmdbRuntimeSeconds(tmdbId, mediaType, season, episode) {
  try {
    const url = mediaType === "tv" ? `https://api.themoviedb.org/3/tv/${tmdbId}/season/${season || 1}/episode/${episode || 1}?api_key=${TMDB_API_KEY}` : `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const resp = await fetchWithTimeout(url, { skipSizeCheck: true });
    if (!resp.ok)
      return null;
    const data = await resp.json();
    const minutes = data.runtime;
    return minutes ? minutes * 60 : null;
  } catch (e) {
    return null;
  }
}
async function getTmdbTitle(tmdbId, mediaType) {
  try {
    const url = mediaType === "tv" ? `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}` : `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const resp = await fetchWithTimeout(url, { skipSizeCheck: true });
    if (!resp.ok)
      return "";
    const data = await resp.json();
    return data.title || data.name || "";
  } catch (e) {
    return "";
  }
}
function parseCompletedEvent(text) {
  const lines = text.split("\n");
  let curEvent = null;
  for (const line of lines) {
    if (line.startsWith("event:")) {
      curEvent = line.slice(6).trim();
    } else if (line.startsWith("data:") && curEvent === "completed") {
      try {
        return JSON.parse(line.slice(5).trim());
      } catch (e) {
        return null;
      }
    }
  }
  return null;
}
async function scrapeMirror(apiBase, referer, mirrorId, tmdbId, mediaType, title) {
  try {
    const params = new URLSearchParams({
      id: mirrorId,
      tmdbId: String(tmdbId),
      type: mediaType,
      starred: "1",
      fallback: "false",
      title: title || "",
      _cb: String(Date.now())
    });
    const resp = await fetchWithTimeout(`${apiBase}/scrape/source?${params.toString()}`, {
      headers: { Referer: referer, Accept: "text/event-stream" },
      skipSizeCheck: true
    });
    if (!resp.ok)
      return null;
    const text = await resp.text();
    const data = parseCompletedEvent(text);
    if (!data || !Array.isArray(data.stream) || !data.stream.length)
      return null;
    return data.stream;
  } catch (e) {
    return null;
  }
}
async function buildStream(mirrorId, entry, runtimeSeconds, referer) {
  try {
    if (entry.type !== "hls" || !entry.playlist || !/^https?:\/\//i.test(entry.playlist))
      return null;
    const headers = { Referer: referer };
    const resp = await fetchWithTimeout(entry.playlist, { headers, skipSizeCheck: true });
    if (!resp.ok)
      return null;
    const topVariant = parseMasterTopVariant(await resp.text(), entry.playlist);
    if (!topVariant)
      return null;
    const quality = qualityLabelFromResolution(topVariant.width, topVariant.height);
    const sortTag = invertedSortTag(qualityRank(quality), 2160);
    return {
      url: entry.playlist,
      quality,
      title: `${sortTag}VidCore ${mirrorId} ${quality}`,
      name: "VidCore",
      size: runtimeSeconds && topVariant.bandwidth ? formatBytes(topVariant.bandwidth * runtimeSeconds / 8) : "Unknown",
      headers,
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
    const { apiBase, embedBase } = await getBases();
    const isTv = mediaType === "tv";
    const referer = isTv ? `${embedBase}/embed/tv/${numericTmdbId}/${season || 1}/${episode || 1}` : `${embedBase}/embed/movie/${numericTmdbId}`;
    const title = await getTmdbTitle(numericTmdbId, mediaType);
    const runtimeSeconds = await getTmdbRuntimeSeconds(numericTmdbId, mediaType, season, episode);
    const mirrorResults = await Promise.all(
      MIRROR_IDS.map((id) => scrapeMirror(apiBase, referer, id, numericTmdbId, mediaType, title))
    );
    const entries = [];
    for (let i = 0; i < mirrorResults.length; i++) {
      const streamList = mirrorResults[i];
      if (!streamList)
        continue;
      for (const entry of streamList) {
        entries.push({ mirrorId: MIRROR_IDS[i], entry });
      }
    }
    if (!entries.length)
      return [];
    const resolved = await Promise.all(
      entries.map((e) => buildStream(e.mirrorId, e.entry, runtimeSeconds, referer))
    );
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
