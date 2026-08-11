// vixsrc.js
// VixSrc (https://vixsrc.to) - TMDB-id-based movie & TV streaming via its own embed player.
// Flow: GET {base}/api/movie/{tmdbId}            (or /api/tv/{tmdbId}/{season}/{episode})
//       -> {"src":"/embed/{internalId}?token=..&t=..&expires=..&lang=en&skin=vixsrc&canPlayFHD=1"}
//       The site's own page chunk (app/movie/[id]/page-*.js) does exactly this and drops the
//       returned `src` straight into an <iframe>, so the embed path is the only supported entry
//       point - the TMDB id alone is not enough, the internal content id only exists in that
//       response. A 404 here simply means VixSrc has no copy of that title/episode.
//       GET {base}{src} -> HTML embed page carrying `window.masterPlaylist`:
//         { params: { 'token': '<32 hex>', 'expires': '<unix>' }, url: 'https://vixsrc.to/playlist/{id}' }
//       Note this token is a FRESH playlist token, unrelated to the token in the `src` query
//       string, and it is bound to the exact query shape below.
//       GET {playlistUrl}[?|&]token=..&expires=..&h=1&lang=en -> HLS master playlist.
//
// The `h=1&lang=en` suffix is mandatory: requesting the same playlist url with only
// token+expires returns 403 Forbidden. For TV the `url` field already ends in `?b=1`, so the
// parameters must be appended with `&` rather than `?` (a `?` there also 403s) - both branches
// were confirmed live against Fight Club (movie) and Game of Thrones S1E1 (tv).
//
// The master playlist is a real one with genuine EXT-X-STREAM-INF BANDWIDTH/RESOLUTION tags, and
// audio is a separate EXT-X-MEDIA group referenced by the video variants rather than muxed into
// them (same shape as goated.js). Pointing a player at a single video variant therefore plays
// picture with no sound, so the master url itself is returned as one adaptive entry and the
// player's own ABR logic picks the variant plus its matching audio group.
//
// Size is measured, not guessed. The advertised BANDWIDTH values here are flat rounded ceilings
// (a 1080p variant declares exactly 4500000), and BANDWIDTH x runtime / 8 overstates the real
// file by more than 2x, so that shortcut is deliberately not used. The per-segment filename
// suffix (`0000-0750.ts`) looks like a per-segment bitrate but is a coarsely quantized bucket
// that runs ~50% below the real byte count, so it is not used either. Instead a fixed set of
// real segment URLs is sampled for their true byte length via Content-Range and scaled by the
// real segment count. Validated against ground truth: every one of Fight Club's 2087 1080p
// segments was measured individually (2.015 GB actual); this sampler returns 2.14 GB (+6%).

const { formatStreamTitle } = require('../lib/streamFormat');

const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const DOMAINS_URL = "https://raw.githubusercontent.com/sapariyaneel/nuvio-plugin/refs/heads/main/domains.json";
const FALLBACK_BASE_URL = "https://vixsrc.to";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Referer": "https://vixsrc.to/",
  "Origin": "https://vixsrc.to"
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
  return (d.vixsrc || FALLBACK_BASE_URL).replace(/\/+$/, "");
}

function formatBytes(bytes) {
  if (!bytes) return "Unknown";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function qualityLabelFromHeight(height) {
  if (height >= 2000) return "4K";
  if (height <= 0) return "Unknown";
  return `${height}p`;
}

function resolveUrl(urlLine, baseUrl) {
  try {
    return new URL(urlLine, baseUrl).toString();
  } catch (e) {
    return urlLine;
  }
}

// Pulls the `window.masterPlaylist = { params: { 'token': .., 'expires': .. }, url: '..' }` block
// out of the embed page. Scoped to that block rather than the whole document because the page
// carries several other unrelated token/expires pairs (window.streams, thumbnails, analytics)
// that would otherwise win the match and produce a 403 playlist url.
function extractMasterPlaylist(html) {
  const start = html.indexOf("window.masterPlaylist");
  if (start === -1) return null;
  const block = html.slice(start, start + 600);

  const tokenMatch = block.match(/['"]token['"]\s*:\s*['"]([^'"]+)['"]/);
  const expiresMatch = block.match(/['"]expires['"]\s*:\s*['"]([^'"]+)['"]/);
  const urlMatch = block.match(/url\s*:\s*['"]([^'"]+)['"]/);
  if (!tokenMatch || !expiresMatch || !urlMatch) return null;

  const baseUrl = urlMatch[1];
  const separator = baseUrl.indexOf("?") === -1 ? "?" : "&";
  return `${baseUrl}${separator}token=${tokenMatch[1]}&expires=${expiresMatch[1]}&h=1&lang=en`;
}

function parseMasterPlaylist(text, baseUrl) {
  const lines = text.split("\n").map(l => l.trim());
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

    if (!line.startsWith("#EXT-X-STREAM-INF")) continue;
    const urlLine = lines[i + 1];
    if (!urlLine || urlLine.startsWith("#")) continue;

    const bandwidthMatch = line.match(/BANDWIDTH=(\d+)/);
    const resolutionMatch = line.match(/RESOLUTION=(\d+)x(\d+)/);
    const variant = {
      url: resolveUrl(urlLine, baseUrl),
      bandwidth: bandwidthMatch ? parseInt(bandwidthMatch[1], 10) : 0,
      height: resolutionMatch ? parseInt(resolutionMatch[2], 10) : 0
    };
    variants.push(variant);
    if (!topVariant || variant.height > topVariant.height) topVariant = variant;
  }

  return { variants, topVariant, subtitles };
}

// Subtitle entries in the master are themselves tiny HLS playlists wrapping a single .vtt file.
// Players expect a real subtitle url, so unwrap one level to the actual .vtt.
async function resolveSubtitleUrl(playlistUrl) {
  try {
    const resp = await fetch(playlistUrl, { headers: HEADERS, skipSizeCheck: true });
    if (!resp.ok) return null;
    const text = await resp.text();
    const line = text.split("\n").map(l => l.trim()).find(l => l && !l.startsWith("#"));
    return line ? resolveUrl(line, playlistUrl) : null;
  } catch (e) {
    return null;
  }
}

// The CDN answers a ranged GET with `Content-Range: bytes 0-1/TOTAL`, which is the real full
// byte length of the segment without downloading it. Retried briefly because the edge rate-limits
// bursts and drops requests rather than queueing them.
async function getRealSegmentSize(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const resp = await fetch(url, { headers: { ...HEADERS, "Range": "bytes=0-1" }, skipSizeCheck: true });
      const contentRange = resp.headers.get("content-range");
      const match = contentRange && contentRange.match(/\/(\d+)$/);
      if (match) return parseInt(match[1], 10);
      const len = resp.headers.get("content-length");
      if (len && parseInt(len, 10) > 2) return parseInt(len, 10);
    } catch (e) {
      // retry below
    }
  }
  return null;
}

// Runs `limit` workers over the queue instead of firing every request at once. The edge starts
// dropping ranged requests above roughly a dozen in flight (a concurrency-40 sweep lost ~89% of
// them), which would silently skew the average toward whichever segments happened to survive.
async function mapWithConcurrency(items, worker, limit) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = [];
  for (let i = 0; i < limit; i++) {
    runners.push((async () => {
      while (true) {
        const index = cursor++;
        if (index >= items.length) return;
        results[index] = await worker(items[index]);
      }
    })());
  }
  await Promise.all(runners);
  return results;
}

const SEGMENT_SAMPLE_SIZE = 32;
const SEGMENT_SAMPLE_CONCURRENCY = 8;
// Some episodes advertise 30+ subtitle languages; unwrapping them all at once hits the same edge
// rate limiting that drops ranged segment requests, so these are throttled too.
const SUBTITLE_CONCURRENCY = 8;

// Samples segments at the midpoint of 32 equal strata rather than at evenly spaced indices.
// The final segment of these playlists is a sub-second runt (~30 KB against a ~1 MB norm), and
// an evenly spaced sampler always lands on it, dragging the average down. Simulated against the
// fully measured Fight Club playlist, this stratified layout holds mean error near 0% with a
// worst case of ~13%, versus swings past 45% for naive spacing.
async function measureHlsSize(variantUrl) {
  try {
    const resp = await fetch(variantUrl, { headers: HEADERS, skipSizeCheck: true });
    if (!resp.ok) return "Unknown";
    const text = await resp.text();
    const segments = text.split("\n").map(l => l.trim()).filter(l => l && !l.startsWith("#"));
    if (!segments.length) return "Unknown";

    const sampleCount = Math.min(SEGMENT_SAMPLE_SIZE, segments.length);
    const sampleUrls = [];
    for (let i = 0; i < sampleCount; i++) {
      const index = Math.floor((i + 0.5) * segments.length / sampleCount);
      sampleUrls.push(resolveUrl(segments[Math.min(index, segments.length - 1)], variantUrl));
    }

    const lengths = await mapWithConcurrency(sampleUrls, getRealSegmentSize, SEGMENT_SAMPLE_CONCURRENCY);
    const valid = lengths.filter(l => l && l > 0);
    if (!valid.length) return "Unknown";

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
    if (!resp.ok) return null;
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
      if (!numericTmdbId) return [];
    }
    numericTmdbId = parseInt(numericTmdbId, 10);
    if (!numericTmdbId) return [];

    const baseUrl = await getBaseUrl();
    const isTv = mediaType === "tv";

    const apiPath = isTv
      ? `/api/tv/${numericTmdbId}/${season || 1}/${episode || 1}`
      : `/api/movie/${numericTmdbId}`;

    // 404 here is the normal "VixSrc doesn't carry this title" answer, not an error worth logging.
    const embedResp = await fetch(`${baseUrl}${apiPath}`, { headers: HEADERS, skipSizeCheck: true });
    if (!embedResp.ok) return [];
    const embedData = await embedResp.json().catch(() => null);
    if (!embedData || !embedData.src) return [];

    const embedUrl = resolveUrl(embedData.src, baseUrl + "/");
    const embedPageResp = await fetch(embedUrl, { headers: HEADERS, skipSizeCheck: true });
    if (!embedPageResp.ok) return [];
    const embedHtml = await embedPageResp.text();

    const masterUrl = extractMasterPlaylist(embedHtml);
    if (!masterUrl) return [];

    const masterResp = await fetch(masterUrl, { headers: HEADERS, skipSizeCheck: true });
    if (!masterResp.ok) return [];
    const masterText = await masterResp.text();

    const { topVariant, subtitles } = parseMasterPlaylist(masterText, masterUrl);
    if (!topVariant) return [];

    const meta = await getTmdbTitle(numericTmdbId, mediaType);

    const [size, resolvedSubtitles] = await Promise.all([
      measureHlsSize(topVariant.url),
      mapWithConcurrency(subtitles, async (s) => {
        const url = await resolveSubtitleUrl(s.url);
        return url ? { url, lang: s.lang } : null;
      }, SUBTITLE_CONCURRENCY)
    ]);

    const quality = qualityLabelFromHeight(topVariant.height);
    const richTitle = formatStreamTitle({
      title: meta && meta.title,
      year: meta && meta.year,
      season: isTv ? (season || 1) : undefined,
      episode: isTv ? (episode || 1) : undefined,
      sizeLabel: size,
      url: masterUrl,
      quality
    });

    return [{
      url: masterUrl,
      quality,
      title: richTitle,
      name: "VixSrc",
      size,
      headers: HEADERS,
      subtitles: resolvedSubtitles.filter(Boolean)
    }];
  } catch (e) {
    console.error("[VixSrc]", e);
    return [];
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
