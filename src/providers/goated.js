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

const { formatStreamTitle } = require('../lib/streamFormat');

const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const DOMAINS_URL = "https://raw.githubusercontent.com/sapariyaneel/nuvio-plugin/refs/heads/main/domains.json";
const FALLBACK_API_HOST = "https://api.reallyfast.xyz";

// The segment CDN (hls.cdn8012.workers.dev) rejects requests with no Referer - a bare segment
// fetch returns 403, the same fetch with these headers returns 200. The player must send them,
// so they ride along on every stream object.
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Referer": "https://goated.cx/",
  "Origin": "https://goated.cx"
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

async function getApiHost() {
  const d = await getDomains();
  // NOTE: the `goated` key holds the *frontend* domain (goated.cx); the PoW/resolve API lives on a
  // separate host, so the API keys must be checked first or every request 404s against the frontend.
  return (d["reallyfast"] || d["api.reallyfast.xyz"] || FALLBACK_API_HOST).replace(/\/+$/, "");
}

// Pure-JS SHA-256. React Native/Hermes provides neither crypto.subtle nor TextEncoder, so both
// the UTF-8 encoding and the digest are done by hand here. Verified against the standard SHA-256
// test vectors plus several thousand randomised and PoW-shaped inputs before being wired in.
const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
];

function utf8Bytes(str) {
  const out = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 0x80) {
      out.push(code);
    } else if (code < 0x800) {
      out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code >= 0xd800 && code <= 0xdbff && i + 1 < str.length) {
      const next = str.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        const cp = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
        out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
        i++;
      } else {
        out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
      }
    } else {
      out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    }
  }
  return out;
}

function sha256Hex(input) {
  const bytes = utf8Bytes(input);
  const bitLen = bytes.length * 8;

  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  const hi = Math.floor(bitLen / 0x100000000);
  bytes.push((hi >>> 24) & 0xff, (hi >>> 16) & 0xff, (hi >>> 8) & 0xff, hi & 0xff);
  bytes.push((bitLen >>> 24) & 0xff, (bitLen >>> 16) & 0xff, (bitLen >>> 8) & 0xff, bitLen & 0xff);

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  const w = new Array(64);

  for (let pos = 0; pos < bytes.length; pos += 64) {
    for (let i = 0; i < 16; i++) {
      const j = pos + i * 4;
      w[i] = ((bytes[j] << 24) | (bytes[j + 1] << 16) | (bytes[j + 2] << 8) | bytes[j + 3]) >>> 0;
    }
    for (let i = 16; i < 64; i++) {
      const x = w[i - 15], y = w[i - 2];
      const s0 = (((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3)) >>> 0;
      const s1 = (((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10)) >>> 0;
      w[i] = (((w[i - 16] + s0) >>> 0) + ((w[i - 7] + s1) >>> 0)) >>> 0;
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;

    for (let i = 0; i < 64; i++) {
      const S1 = (((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7))) >>> 0;
      const ch = ((e & f) ^ (~e & g)) >>> 0;
      const temp1 = (((((h + S1) >>> 0) + ch) >>> 0) + ((SHA256_K[i] + w[i]) >>> 0)) >>> 0;
      const S0 = (((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10))) >>> 0;
      const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const temp2 = ((S0 + maj) >>> 0);

      h = g; g = f; f = e;
      e = ((d + temp1) >>> 0);
      d = c; c = b; b = a;
      a = ((temp1 + temp2) >>> 0);
    }

    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }

  const parts = [h0, h1, h2, h3, h4, h5, h6, h7];
  let hex = "";
  for (const p of parts) hex += ("00000000" + p.toString(16)).slice(-8);
  return hex;
}

async function solveProofOfWork(apiHost) {
  const resp = await fetch(`${apiHost}/api/challenge`, { skipSizeCheck: true });
  if (!resp.ok) throw new Error("failed to fetch PoW challenge");
  const { challenge, difficulty } = await resp.json();
  const target = "0".repeat(difficulty);
  for (let nonce = 0; nonce < 5000000; nonce++) {
    const hash = sha256Hex(challenge + nonce);
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

async function getTmdbTitleYear(tmdbId, mediaType) {
  try {
    const url = mediaType === "tv"
      ? `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}`
      : `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const resp = await fetch(url, { skipSizeCheck: true });
    if (!resp.ok) return { title: null, year: null };
    const data = await resp.json();
    const title = data.title || data.name || null;
    const releaseDate = data.release_date || data.first_air_date || "";
    const year = releaseDate ? releaseDate.split("-")[0] : null;
    return { title, year };
  } catch (e) {
    return { title: null, year: null };
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

    const [runtimeSeconds, audioBitrateBps, titleYear] = await Promise.all([
      getTmdbRuntimeSeconds(numericTmdbId, mediaType, season, episode),
      getAudioBitrateBps(defaultAudioUrl),
      getTmdbTitleYear(numericTmdbId, mediaType)
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
    const sizeBytes = runtimeSeconds ? (totalBitrateBps * runtimeSeconds) / 8 : undefined;

    return [{
      url: resolveData.url,
      quality,
      title: formatStreamTitle({
        title: titleYear.title,
        year: titleYear.year,
        season: isTv ? (season || 1) : undefined,
        episode: isTv ? (episode || 1) : undefined,
        rawText: "Adaptive",
        sizeBytes,
        url: resolveData.url,
        quality
      }),
      name: "Goated",
      size: runtimeSeconds ? formatBytes((totalBitrateBps * runtimeSeconds) / 8) : "Unknown",
      headers: HEADERS,
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
