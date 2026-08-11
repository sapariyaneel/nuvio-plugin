// vidrock.js
// Vidrock (https://vidrock.net) - TMDB-id-based movie & TV streaming.
// Flow: GET {api}/movie/{tmdbId}  |  GET {api}/tv/{tmdbId}/{season}/{episode}
//       -> {"<ServerName>":{"url":"<base64url blob>|null","language":"English","flag":"us","type":"hls"}, ...}
//       Server names seen live: Nova, Atlas, Orion, Lyra, Luna, Vega, Astra, Hindi. Entries with a
//       null url are servers that have nothing for that title and are skipped.
//       Each non-null `url` is AES-256-GCM ciphertext, base64url encoded, laid out as
//       [12-byte IV][ciphertext][16-byte GCM auth tag], decrypting to a plain master.m3u8 URL.
//
// The key and the exact blob layout were read out of the site's own Vite bundle
// (/assets/index-*.js, functions bQ/wQ/EQ/SQ + fetchStreamSources) rather than guessed, and both
// were confirmed against live movie and TV responses before being embedded here.
//
// NOTE ON THE CRYPTO: the site does this with crypto.subtle, which does not work in the
// React Native/Hermes runtime this provider actually runs in (neither do TextDecoder/Buffer), so
// AES-256 is implemented here in plain JS. Only the CTR half of GCM is needed: GCM encryption is
// AES-CTR keystream over J0+1, J0+2, ... with J0 = IV||0x00000001 for a 12-byte IV, so decryption
// is that same keystream XORed back over the ciphertext. The 16-byte auth tag is stripped, not
// verified - verifying it would require a GHASH implementation to defend against an attacker who
// already controls the response body, which buys nothing here. The AES core is verified against
// the FIPS-197 AES-256 test vector at load-time cost of nothing (see the vector in the tests).
//
// Every source resolves to a real HLS *master* playlist carrying genuine EXT-X-STREAM-INF
// BANDWIDTH/RESOLUTION tags, so both quality and size are real numbers, never guesses:
// quality = the top variant's real resolution, size = that variant's real BANDWIDTH x the real
// TMDB runtime / 8 (same technique as goated.js). The master URL itself is returned rather than a
// single variant so the player's own ABR logic can drop down on a weak connection.
//
// Both CDN families gate on request headers and fail closed without them - Orion's worker returns
// 404 unless BOTH Referer and Origin are vidrock.net, and cdn1.1shows.app returns 403 without a
// Referer - so HEADERS is attached to every returned stream.

const { formatStreamTitle } = require('../lib/streamFormat');

const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const DOMAINS_URL = "https://raw.githubusercontent.com/sapariyaneel/nuvio-plugin/refs/heads/main/domains.json";
const FALLBACK_BASE_URL = "https://vidrock.net";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
  "Referer": "https://vidrock.net/",
  "Origin": "https://vidrock.net"
};

// Extracted verbatim from the site bundle (const xQ). Raw AES-256 key, hex encoded.
const STREAM_KEY_HEX = "7f3e9c2a8b5d1f4e6a9c3b7d2e5f8a1c4b6d9e2f5a8c1b4d7e9f2a5c8b1d4e7f";
const GCM_IV_LENGTH = 12;
const GCM_TAG_LENGTH = 16;

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
  return (d.vidrock || FALLBACK_BASE_URL).replace(/\/+$/, "");
}

// --- Pure-JS AES-256 (encrypt-only block function, which is all CTR-mode decryption needs) ---

const AES_SBOX = new Uint8Array(256);
const AES_RCON = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36, 0x6c, 0xd8, 0xab, 0x4d];

(function buildSbox() {
  const pow = new Uint8Array(256);
  const log = new Uint8Array(256);
  let x = 1;
  for (let i = 0; i < 256; i++) {
    pow[i] = x;
    log[x] = i;
    x = (x ^ ((x << 1) & 0xff) ^ ((x & 0x80) ? 0x1b : 0)) & 0xff;
  }
  AES_SBOX[0] = 0x63;
  for (let i = 1; i < 256; i++) {
    const inverse = pow[(255 - log[i]) % 255];
    let s = inverse;
    let rotated = inverse;
    for (let k = 0; k < 4; k++) {
      rotated = ((rotated << 1) | (rotated >>> 7)) & 0xff;
      s ^= rotated;
    }
    AES_SBOX[i] = (s ^ 0x63) & 0xff;
  }
})();

function gfMultiply(a, b) {
  let result = 0;
  while (b) {
    if (b & 1) result ^= a;
    a = ((a << 1) ^ ((a & 0x80) ? 0x1b : 0)) & 0xff;
    b >>= 1;
  }
  return result & 0xff;
}

function expandAesKey(key) {
  const words = key.length / 4;
  const rounds = words + 6;
  const schedule = new Uint8Array(16 * (rounds + 1));
  schedule.set(key);
  for (let i = words; i < 4 * (rounds + 1); i++) {
    let t0 = schedule[(i - 1) * 4];
    let t1 = schedule[(i - 1) * 4 + 1];
    let t2 = schedule[(i - 1) * 4 + 2];
    let t3 = schedule[(i - 1) * 4 + 3];
    if (i % words === 0) {
      const first = t0;
      t0 = AES_SBOX[t1] ^ AES_RCON[i / words - 1];
      t1 = AES_SBOX[t2];
      t2 = AES_SBOX[t3];
      t3 = AES_SBOX[first];
    } else if (words > 6 && i % words === 4) {
      t0 = AES_SBOX[t0];
      t1 = AES_SBOX[t1];
      t2 = AES_SBOX[t2];
      t3 = AES_SBOX[t3];
    }
    schedule[i * 4] = schedule[(i - words) * 4] ^ t0;
    schedule[i * 4 + 1] = schedule[(i - words) * 4 + 1] ^ t1;
    schedule[i * 4 + 2] = schedule[(i - words) * 4 + 2] ^ t2;
    schedule[i * 4 + 3] = schedule[(i - words) * 4 + 3] ^ t3;
  }
  return { schedule, rounds };
}

// Encrypts `state` (16 bytes) in place. AES state is column-major: byte index = column * 4 + row.
function aesEncryptBlock(state, keySchedule) {
  const schedule = keySchedule.schedule;
  const rounds = keySchedule.rounds;
  for (let i = 0; i < 16; i++) state[i] ^= schedule[i];
  for (let round = 1; round <= rounds; round++) {
    for (let i = 0; i < 16; i++) state[i] = AES_SBOX[state[i]];

    let tmp = state[1]; state[1] = state[5]; state[5] = state[9]; state[9] = state[13]; state[13] = tmp;
    tmp = state[2]; state[2] = state[10]; state[10] = tmp;
    tmp = state[6]; state[6] = state[14]; state[14] = tmp;
    tmp = state[15]; state[15] = state[11]; state[11] = state[7]; state[7] = state[3]; state[3] = tmp;

    if (round !== rounds) {
      for (let column = 0; column < 4; column++) {
        const o = column * 4;
        const a0 = state[o], a1 = state[o + 1], a2 = state[o + 2], a3 = state[o + 3];
        state[o] = gfMultiply(a0, 2) ^ gfMultiply(a1, 3) ^ a2 ^ a3;
        state[o + 1] = a0 ^ gfMultiply(a1, 2) ^ gfMultiply(a2, 3) ^ a3;
        state[o + 2] = a0 ^ a1 ^ gfMultiply(a2, 2) ^ gfMultiply(a3, 3);
        state[o + 3] = gfMultiply(a0, 3) ^ a1 ^ a2 ^ gfMultiply(a3, 2);
      }
    }
    for (let i = 0; i < 16; i++) state[i] ^= schedule[round * 16 + i];
  }
  return state;
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}

const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

// Own base64 decoder rather than relying on atob - RN exposes it, but this provider's only
// hard dependency should be fetch, and a 20-line decoder is cheaper than a runtime surprise.
function base64UrlToBytes(str) {
  const normalized = str.replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "");
  const out = new Uint8Array(Math.floor((normalized.length * 3) / 4));
  let accumulator = 0;
  let bits = 0;
  let outIndex = 0;
  for (let i = 0; i < normalized.length; i++) {
    const value = BASE64_CHARS.indexOf(normalized.charAt(i));
    if (value < 0) continue;
    accumulator = (accumulator << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[outIndex++] = (accumulator >> bits) & 0xff;
    }
  }
  return out.subarray(0, outIndex);
}

// Manual UTF-8 decode - TextDecoder isn't reliably present in the Hermes runtime this runs under.
function utf8BytesToString(bytes) {
  let result = "";
  let i = 0;
  while (i < bytes.length) {
    const b0 = bytes[i++];
    if (b0 < 0x80) {
      result += String.fromCharCode(b0);
    } else if ((b0 & 0xe0) === 0xc0) {
      const b1 = bytes[i++];
      result += String.fromCharCode(((b0 & 0x1f) << 6) | (b1 & 0x3f));
    } else if ((b0 & 0xf0) === 0xe0) {
      const b1 = bytes[i++], b2 = bytes[i++];
      result += String.fromCharCode(((b0 & 0x0f) << 12) | ((b1 & 0x3f) << 6) | (b2 & 0x3f));
    } else if ((b0 & 0xf8) === 0xf0) {
      const b1 = bytes[i++], b2 = bytes[i++], b3 = bytes[i++];
      let code = ((b0 & 0x07) << 18) | ((b1 & 0x3f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f);
      code -= 0x10000;
      result += String.fromCharCode(0xd800 + (code >> 10), 0xdc00 + (code & 0x3ff));
    } else {
      result += String.fromCharCode(b0);
    }
  }
  return result;
}

let cachedKeySchedule = null;

// GCM with a 12-byte IV uses J0 = IV || 0x00000001, and the payload keystream starts at J0 + 1,
// so the first ciphertext block is XORed with AES(IV || 0x00000002).
function decryptStreamUrl(encoded) {
  const all = base64UrlToBytes(encoded);
  if (all.length <= GCM_IV_LENGTH + GCM_TAG_LENGTH) throw new Error("ciphertext too short");
  if (!cachedKeySchedule) cachedKeySchedule = expandAesKey(hexToBytes(STREAM_KEY_HEX));

  const body = all.subarray(GCM_IV_LENGTH, all.length - GCM_TAG_LENGTH);
  const plain = new Uint8Array(body.length);
  const counterBlock = new Uint8Array(16);
  counterBlock.set(all.subarray(0, GCM_IV_LENGTH), 0);

  let counter = 2;
  for (let offset = 0; offset < body.length; offset += 16) {
    counterBlock[12] = (counter >>> 24) & 0xff;
    counterBlock[13] = (counter >>> 16) & 0xff;
    counterBlock[14] = (counter >>> 8) & 0xff;
    counterBlock[15] = counter & 0xff;

    const keystream = new Uint8Array(16);
    keystream.set(counterBlock);
    aesEncryptBlock(keystream, cachedKeySchedule);

    const blockLength = Math.min(16, body.length - offset);
    for (let i = 0; i < blockLength; i++) plain[offset + i] = body[offset + i] ^ keystream[i];
    counter++;
  }
  return utf8BytesToString(plain);
}

// --- HLS / metadata helpers ---

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

// Movie details (title/year) come free off the same TMDB response used for runtime, so this is
// only a genuinely separate request for TV (series title isn't on the season/episode endpoint).
async function getTmdbTitleInfo(tmdbId, mediaType) {
  try {
    const url = mediaType === "tv"
      ? `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}`
      : `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const resp = await fetch(url, { skipSizeCheck: true });
    if (!resp.ok) return null;
    const data = await resp.json();
    const title = mediaType === "tv" ? data.name : data.title;
    const dateStr = mediaType === "tv" ? data.first_air_date : data.release_date;
    const year = dateStr ? dateStr.slice(0, 4) : null;
    return title ? { title, year } : null;
  } catch (e) {
    return null;
  }
}

// Some of these CDNs letterbox into the encoded frame (e.g. 1280x534 for a scope-ratio 720p
// master), so height alone under-reports quality. Width is the reliable axis; height is only a
// fallback for the rare variant that omits a resolution width.
function qualityLabelFromResolution(width, height) {
  if (width >= 3200 || height >= 2000) return "4K";
  if (width >= 2400 || height >= 1400) return "1440p";
  if (width >= 1800 || height >= 1000) return "1080p";
  if (width >= 1200 || height >= 700) return "720p";
  if (width >= 800 || height >= 460) return "480p";
  if (width >= 600 || height >= 340) return "360p";
  if (width > 0 || height > 0) return "240p";
  return "Unknown";
}

function qualityRank(quality) {
  if (quality === "4K") return 2160;
  const n = parseInt(quality, 10);
  return Number.isFinite(n) ? n : 0;
}

function resolveUrl(line, baseUrl) {
  try {
    return new URL(line, baseUrl).toString();
  } catch (e) {
    return line;
  }
}

function parseMasterTopVariant(text, baseUrl) {
  const lines = text.split("\n").map(l => l.trim());
  let best = null;
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith("#EXT-X-STREAM-INF")) continue;
    const urlLine = lines[i + 1];
    if (!urlLine || urlLine.startsWith("#")) continue;

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

// Resolves one server entry into a stream, or null when its playlist is dead/unreadable. The
// master URL is what gets returned so the player keeps its ABR ladder; only the metadata is taken
// from the top variant.
async function buildStream(serverName, entry, runtimeSeconds, mediaInfo) {
  try {
    const masterUrl = decryptStreamUrl(entry.url);
    if (!/^https?:\/\//i.test(masterUrl)) return null;

    const resp = await fetch(masterUrl, { headers: HEADERS, skipSizeCheck: true });
    if (!resp.ok) return null;
    const topVariant = parseMasterTopVariant(await resp.text(), masterUrl);
    if (!topVariant) return null;

    const quality = qualityLabelFromResolution(topVariant.width, topVariant.height);
    const language = entry.language || "Original";
    const sizeLabel = (runtimeSeconds && topVariant.bandwidth)
      ? formatBytes((topVariant.bandwidth * runtimeSeconds) / 8)
      : "Unknown";

    return {
      url: masterUrl,
      quality,
      title: formatStreamTitle({
        title: mediaInfo && mediaInfo.title,
        year: mediaInfo && mediaInfo.year,
        season: mediaInfo && mediaInfo.season,
        episode: mediaInfo && mediaInfo.episode,
        rawText: `${serverName} ${language}`,
        sizeLabel,
        url: masterUrl,
        quality
      }),
      name: "Vidrock",
      size: sizeLabel,
      headers: HEADERS,
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
      const findData = await (await fetch(findUrl, { skipSizeCheck: true })).json();
      const results = mediaType === "tv" ? findData.tv_results : findData.movie_results;
      numericTmdbId = results && results.length ? results[0].id : null;
      if (!numericTmdbId) return [];
    }
    numericTmdbId = parseInt(numericTmdbId, 10);
    if (!numericTmdbId) return [];

    const baseUrl = await getBaseUrl();
    const isTv = mediaType === "tv";
    const path = isTv
      ? `tv/${numericTmdbId}/${season || 1}/${episode || 1}`
      : `movie/${numericTmdbId}`;

    const resp = await fetch(`${baseUrl}/api/${path}`, { headers: HEADERS, skipSizeCheck: true });
    if (!resp.ok) return [];
    const data = await resp.json().catch(() => null);
    if (!data || typeof data !== "object" || data.error) return [];

    const entries = Object.keys(data)
      .map(name => ({ name, entry: data[name] }))
      .filter(e => e.entry && typeof e.entry === "object" && e.entry.url);
    if (!entries.length) return [];

    const [runtimeSeconds, titleInfo] = await Promise.all([
      getTmdbRuntimeSeconds(numericTmdbId, mediaType, season, episode),
      getTmdbTitleInfo(numericTmdbId, mediaType)
    ]);
    const mediaInfo = {
      title: titleInfo && titleInfo.title,
      year: titleInfo && titleInfo.year,
      season: isTv ? (season || 1) : undefined,
      episode: isTv ? (episode || 1) : undefined
    };

    const resolved = await Promise.all(entries.map(e => buildStream(e.name, e.entry, runtimeSeconds, mediaInfo)));

    const seenUrls = {};
    const streams = [];
    for (const stream of resolved) {
      if (!stream || seenUrls[stream.url]) continue;
      seenUrls[stream.url] = true;
      streams.push(stream);
    }

    streams.sort((a, b) => qualityRank(b.quality) - qualityRank(a.quality));
    return streams;
  } catch (e) {
    console.error("[Vidrock]", e);
    return [];
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
