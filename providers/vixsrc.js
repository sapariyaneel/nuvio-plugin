/**
 * vixsrc - Built from src/providers/vixsrc.js
 * Generated: 2026-08-17T12:20:48.247Z
 */

// src/providers/vixsrc.js
var TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
var DOMAINS_URL = "https://raw.githubusercontent.com/sapariyaneel/nuvio-plugin/refs/heads/main/domains.json";
var FALLBACK_BASE_URL = "https://vixsrc.to";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Referer": "https://vixsrc.to/",
  "Origin": "https://vixsrc.to"
};
var cachedDomains = null;
async function getDomains() {
  if (cachedDomains)
    return cachedDomains;
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
  return (d.vixsrc || FALLBACK_BASE_URL).replace(/\/+$/, "");
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
function qualityLabelFromHeight(height) {
  if (height >= 2e3)
    return "4K";
  if (height <= 0)
    return "Unknown";
  return `${height}p`;
}
function resolveUrl(urlLine, baseUrl) {
  try {
    return new URL(urlLine, baseUrl).toString();
  } catch (e) {
    return urlLine;
  }
}
function extractMasterPlaylist(html) {
  const start = html.indexOf("window.masterPlaylist");
  if (start === -1)
    return null;
  const block = html.slice(start, start + 600);
  const tokenMatch = block.match(/['"]token['"]\s*:\s*['"]([^'"]+)['"]/);
  const expiresMatch = block.match(/['"]expires['"]\s*:\s*['"]([^'"]+)['"]/);
  const urlMatch = block.match(/url\s*:\s*['"]([^'"]+)['"]/);
  if (!tokenMatch || !expiresMatch || !urlMatch)
    return null;
  const baseUrl = urlMatch[1];
  const separator = baseUrl.indexOf("?") === -1 ? "?" : "&";
  return `${baseUrl}${separator}token=${tokenMatch[1]}&expires=${expiresMatch[1]}&h=1&lang=en`;
}
function parseMasterPlaylist(text, baseUrl) {
  const lines = text.split("\n").map((l) => l.trim());
  const variants = [];
  const subtitles = [];
  let topVariant = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("#EXT-X-MEDIA") && line.indexOf("TYPE=SUBTITLES") !== -1) {
      const uriMatch = line.match(/URI="([^"]+)"/);
      const nameMatch = line.match(/NAME="([^"]+)"/);
      if (uriMatch) {
        subtitles.push({ url: resolveUrl(uriMatch[1], baseUrl), lang: nameMatch ? nameMatch[1] : "Unknown" });
      }
      continue;
    }
    if (!line.startsWith("#EXT-X-STREAM-INF"))
      continue;
    const urlLine = lines[i + 1];
    if (!urlLine || urlLine.startsWith("#"))
      continue;
    const bandwidthMatch = line.match(/BANDWIDTH=(\d+)/);
    const resolutionMatch = line.match(/RESOLUTION=(\d+)x(\d+)/);
    const variant = {
      url: resolveUrl(urlLine, baseUrl),
      bandwidth: bandwidthMatch ? parseInt(bandwidthMatch[1], 10) : 0,
      height: resolutionMatch ? parseInt(resolutionMatch[2], 10) : 0
    };
    variants.push(variant);
    if (!topVariant || variant.height > topVariant.height)
      topVariant = variant;
  }
  return { variants, topVariant, subtitles };
}
async function resolveSubtitleUrl(playlistUrl) {
  try {
    const resp = await fetch(playlistUrl, { headers: HEADERS, skipSizeCheck: true });
    if (!resp.ok)
      return null;
    const text = await resp.text();
    const line = text.split("\n").map((l) => l.trim()).find((l) => l && !l.startsWith("#"));
    return line ? resolveUrl(line, playlistUrl) : null;
  } catch (e) {
    return null;
  }
}
async function getRealSegmentSize(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const resp = await fetch(url, { headers: { ...HEADERS, "Range": "bytes=0-1" }, skipSizeCheck: true });
      const contentRange = resp.headers.get("content-range");
      const match = contentRange && contentRange.match(/\/(\d+)$/);
      if (match)
        return parseInt(match[1], 10);
      const len = resp.headers.get("content-length");
      if (len && parseInt(len, 10) > 2)
        return parseInt(len, 10);
    } catch (e) {
    }
  }
  return null;
}
async function mapWithConcurrency(items, worker, limit) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = [];
  for (let i = 0; i < limit; i++) {
    runners.push((async () => {
      while (true) {
        const index = cursor++;
        if (index >= items.length)
          return;
        results[index] = await worker(items[index]);
      }
    })());
  }
  await Promise.all(runners);
  return results;
}
var SEGMENT_SAMPLE_SIZE = 32;
var SEGMENT_SAMPLE_CONCURRENCY = 8;
var SUBTITLE_CONCURRENCY = 8;
async function measureHlsSize(variantUrl) {
  try {
    const resp = await fetch(variantUrl, { headers: HEADERS, skipSizeCheck: true });
    if (!resp.ok)
      return "Unknown";
    const text = await resp.text();
    const segments = text.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
    if (!segments.length)
      return "Unknown";
    const sampleCount = Math.min(SEGMENT_SAMPLE_SIZE, segments.length);
    const sampleUrls = [];
    for (let i = 0; i < sampleCount; i++) {
      const index = Math.floor((i + 0.5) * segments.length / sampleCount);
      sampleUrls.push(resolveUrl(segments[Math.min(index, segments.length - 1)], variantUrl));
    }
    const lengths = await mapWithConcurrency(sampleUrls, getRealSegmentSize, SEGMENT_SAMPLE_CONCURRENCY);
    const valid = lengths.filter((l) => l && l > 0);
    if (!valid.length)
      return "Unknown";
    const averageSegmentBytes = valid.reduce((a, b) => a + b, 0) / valid.length;
    return formatBytes(averageSegmentBytes * segments.length);
  } catch (e) {
    return "Unknown";
  }
}
async function getTmdbTitle(tmdbId, mediaType) {
  try {
    const type = mediaType === "tv" ? "tv" : "movie";
    const resp = await fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_API_KEY}`, { skipSizeCheck: true });
    if (!resp.ok)
      return null;
    const data = await resp.json();
    const title = type === "tv" ? data.name : data.title;
    const dateStr = type === "tv" ? data.first_air_date : data.release_date;
    const year = dateStr ? dateStr.slice(0, 4) : "";
    return title ? { title, year } : null;
  } catch (e) {
    return null;
  }
}
async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    let numericTmdbId = tmdbId;
    if (typeof tmdbId === "string" && tmdbId.trim().toLowerCase().startsWith("tt")) {
      const findUrl = `https://api.themoviedb.org/3/find/${tmdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;
      const findData = await (await fetch(findUrl, { skipSizeCheck: true })).json();
      const results = mediaType === "tv" ? findData.tv_results : findData.movie_results;
      numericTmdbId = results && results.length ? results[0].id : null;
      if (!numericTmdbId)
        return [];
    }
    numericTmdbId = parseInt(numericTmdbId, 10);
    if (!numericTmdbId)
      return [];
    const baseUrl = await getBaseUrl();
    const isTv = mediaType === "tv";
    const apiPath = isTv ? `/api/tv/${numericTmdbId}/${season || 1}/${episode || 1}` : `/api/movie/${numericTmdbId}`;
    const embedResp = await fetch(`${baseUrl}${apiPath}`, { headers: HEADERS, skipSizeCheck: true });
    if (!embedResp.ok)
      return [];
    const embedData = await embedResp.json().catch(() => null);
    if (!embedData || !embedData.src)
      return [];
    const embedUrl = resolveUrl(embedData.src, baseUrl + "/");
    const embedPageResp = await fetch(embedUrl, { headers: HEADERS, skipSizeCheck: true });
    if (!embedPageResp.ok)
      return [];
    const embedHtml = await embedPageResp.text();
    const masterUrl = extractMasterPlaylist(embedHtml);
    if (!masterUrl)
      return [];
    const masterResp = await fetch(masterUrl, { headers: HEADERS, skipSizeCheck: true });
    if (!masterResp.ok)
      return [];
    const masterText = await masterResp.text();
    const { topVariant, subtitles } = parseMasterPlaylist(masterText, masterUrl);
    if (!topVariant)
      return [];
    const meta = await getTmdbTitle(numericTmdbId, mediaType);
    const [size, resolvedSubtitles] = await Promise.all([
      measureHlsSize(topVariant.url),
      mapWithConcurrency(subtitles, async (s) => {
        const url = await resolveSubtitleUrl(s.url);
        return url ? { url, lang: s.lang } : null;
      }, SUBTITLE_CONCURRENCY)
    ]);
    const quality = qualityLabelFromHeight(topVariant.height);
    const titleSuffix = meta ? `${meta.title}${meta.year ? ` (${meta.year})` : ""}` : "";
    if (!meetsMinSize(size))
      return [];
    return [{
      url: masterUrl,
      quality,
      title: titleSuffix ? `VixSrc ${quality} - ${titleSuffix}` : `VixSrc ${quality}`,
      name: "VixSrc",
      size,
      headers: HEADERS,
      subtitles: resolvedSubtitles.filter(Boolean)
    }];
  } catch (e) {
    return [];
  }
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
