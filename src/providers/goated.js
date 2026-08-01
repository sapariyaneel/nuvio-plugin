// goated.js
// Goated (https://goated.cx) - TMDB-id-based movie & TV streaming via api.reallyfast.xyz.
// Flow: GET  {api}/api/challenge -> {"challenge":"<32 hex chars>","difficulty":N,"expiresIn":90}
//       solve a hashcash-style proof-of-work: find the smallest integer nonce such that
//       SHA-256(challenge + nonce) as lowercase hex starts with N zero chars.
//       POST {api}/api/resolve  {mediaType,id,season?,episode?,challenge,nonce}
//       -> {"url":"<signed master.m3u8>","subtitles":[],"source":"Orbit","format":"hls","availableSources":[...]}
//       POST {api}/api/subtitles {mediaType,id,season?,episode?,challenge,nonce} (needs its own fresh PoW)
//       -> {"subtitles":[{language,label,url,source}]}
// Reverse-engineered from the site's own Next.js chunk (0uuddzztlcrep.js) which contains the PoW
// solver and both fetch calls verbatim - not guessed. No auth, cookies, or special headers required;
// confirmed working cold from a plain Node process with no browser session.
//
// The resolved playlist is a real HLS *master* playlist with genuine EXT-X-STREAM-INF
// BANDWIDTH/RESOLUTION tags per quality, video and audio as separate tracks joined only through
// that master (audio is an EXT-X-MEDIA group, referenced by the video variants, not muxed into
// them). Pointing a player straight at one quality's video-only variant plays picture with no
// sound, so a single adaptive stream entry is returned - the master URL itself - and the player's
// own ABR logic picks quality and the matching audio group, same as it would on the real site.
// Size is still a real, not guessed, number: highest-quality video BANDWIDTH + the default audio
// track's real bitrate (read from its own playlist's EXT-X-BITRATE tag) x TMDB runtime / 8.

const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const DOMAINS_URL = "https://raw.githubusercontent.com/sapariyaneel/nuvio-plugin/refs/heads/main/domains.json";
const FALLBACK_API_HOST = "https://api.reallyfast.xyz";

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

async function getApiHost() {
  const d = await getDomains();
  return (d.goated || d["reallyfast"] || d["api.reallyfast.xyz"] || FALLBACK_API_HOST).replace(/\/+$/, "");
}

async function sha256Hex(str) {
  const bytes = new TextEncoder().encode(str);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function solveProofOfWork(apiHost) {
  const resp = await fetch(`${apiHost}/api/challenge`, { skipSizeCheck: true });
  if (!resp.ok) throw new Error("failed to fetch PoW challenge");
  const { challenge, difficulty } = await resp.json();
  const target = "0".repeat(difficulty);
  for (let nonce = 0; nonce < 5000000; nonce++) {
    const hash = await sha256Hex(challenge + nonce);
    if (hash.startsWith(target)) return { challenge, nonce: String(nonce) };
  }
  throw new Error("PoW solve timed out");
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

function formatBytes(bytes) {
  if (!bytes) return "Unknown";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function resolveUrl(urlLine, baseUrl) {
  try {
    return new URL(urlLine, baseUrl).toString();
  } catch (e) {
    return urlLine;
  }
}

function parseMasterPlaylist(text, baseUrl) {
  const lines = text.split("\n").map(l => l.trim());
  const variants = [];
  let defaultAudioUrl = null;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("#EXT-X-MEDIA") && lines[i].includes("TYPE=AUDIO") && !defaultAudioUrl) {
      const uriMatch = lines[i].match(/URI="([^"]+)"/);
      const isDefault = /DEFAULT=YES/.test(lines[i]);
      if (uriMatch && (isDefault || !defaultAudioUrl)) defaultAudioUrl = resolveUrl(uriMatch[1], baseUrl);
      continue;
    }
    if (!lines[i].startsWith("#EXT-X-STREAM-INF")) continue;
    const attrLine = lines[i];
    const urlLine = lines[i + 1];
    if (!urlLine || urlLine.startsWith("#")) continue;

    const bandwidthMatch = attrLine.match(/BANDWIDTH=(\d+)/);
    const resolutionMatch = attrLine.match(/RESOLUTION=(\d+)x(\d+)/);
    const bandwidth = bandwidthMatch ? parseInt(bandwidthMatch[1], 10) : 0;
    const height = resolutionMatch ? parseInt(resolutionMatch[2], 10) : 0;

    variants.push({ url: resolveUrl(urlLine, baseUrl), bandwidth, height });
  }
  return { variants, defaultAudioUrl };
}

async function getAudioBitrateBps(audioPlaylistUrl) {
  if (!audioPlaylistUrl) return 0;
  try {
    const text = await (await fetch(audioPlaylistUrl, { skipSizeCheck: true })).text();
    const match = text.match(/#EXT-X-BITRATE:(\d+)/);
    return match ? parseInt(match[1], 10) * 1000 : 0;
  } catch (e) {
    return 0;
  }
}

function qualityLabelFromHeight(height) {
  if (height >= 2000) return "4K";
  if (height <= 0) return "Unknown";
  return `${height}p`;
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

    const apiHost = await getApiHost();
    const isTv = mediaType === "tv";

    const resolvePow = await solveProofOfWork(apiHost);
    const resolveBody = {
      mediaType: isTv ? "tv" : "movie",
      id: String(numericTmdbId),
      challenge: resolvePow.challenge,
      nonce: resolvePow.nonce
    };
    if (isTv) {
      resolveBody.season = season || 1;
      resolveBody.episode = episode || 1;
    }

    const resolveResp = await fetch(`${apiHost}/api/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(resolveBody),
      skipSizeCheck: true
    });
    if (!resolveResp.ok) return [];
    const resolveData = await resolveResp.json().catch(() => null);
    if (!resolveData || !resolveData.url) return [];

    const playlistResp = await fetch(resolveData.url, { skipSizeCheck: true });
    if (!playlistResp.ok) return [];
    const playlistText = await playlistResp.text();
    const { variants, defaultAudioUrl } = parseMasterPlaylist(playlistText, resolveData.url);
    if (!variants.length) return [];

    const topVariant = variants.slice().sort((a, b) => b.height - a.height)[0];

    const [runtimeSeconds, audioBitrateBps] = await Promise.all([
      getTmdbRuntimeSeconds(numericTmdbId, mediaType, season, episode),
      getAudioBitrateBps(defaultAudioUrl)
    ]);

    let subtitles = [];
    try {
      const subPow = await solveProofOfWork(apiHost);
      const subBody = {
        mediaType: isTv ? "tv" : "movie",
        id: String(numericTmdbId),
        challenge: subPow.challenge,
        nonce: subPow.nonce
      };
      if (isTv) {
        subBody.season = season || 1;
        subBody.episode = episode || 1;
      }
      const subResp = await fetch(`${apiHost}/api/subtitles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subBody),
        skipSizeCheck: true
      });
      if (subResp.ok) {
        const subData = await subResp.json().catch(() => null);
        subtitles = ((subData && subData.subtitles) || [])
          .filter(s => s && s.url)
          .map(s => ({ url: s.url, lang: s.label || s.language || "Unknown" }));
      }
    } catch (e) {
      // subtitles are best-effort; playback still works without them
    }

    const totalBitrateBps = topVariant.bandwidth + audioBitrateBps;
    const quality = qualityLabelFromHeight(topVariant.height);

    return [{
      url: resolveData.url,
      quality,
      title: `Goated ${quality} (Adaptive)`,
      name: "Goated",
      size: runtimeSeconds ? formatBytes((totalBitrateBps * runtimeSeconds) / 8) : "Unknown",
      subtitles
    }];
  } catch (e) {
    console.error("[Goated]", e);
    return [];
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
