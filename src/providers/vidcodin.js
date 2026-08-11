// vidcodin.js
// Vidcodin (https://vidcodin.net) - TMDB-id-only movie & TV streaming, single JSON API call per title
// API: GET https://stream.fontaine.lol/astral?tmdbId={id}&type=movie|tv&seasonId={s}&episodeId={e}&key={KEY}
//      -> {"qualities":{"360":"as_<hex>","480":"as_<hex>",...}}
// Each as_<hex> value is AES-256-GCM ciphertext (first 12 bytes of the decoded hex are the IV,
// remainder is ciphertext+tag) encrypted with a fixed key baked into the site's JS bundle. Decrypting
// yields the real stream URL, e.g. https://v1.streamrk.site/https%3A%2F%2F<cdn>%2Fconvert-h264%2F...mp4
// Reverse-engineered from the site's obfuscated Vite/React bundle (javascript-obfuscator string-array
// scheme) by extracting and running its own decoder function standalone - not guessed.

// No registry key currently exists for this site (checked against our shared domains.json registry) -
// still wired to the shared registry so it picks up a live API host automatically if one is added
// later, falling back to the hardcoded host in the meantime. The frontend (vidcodin.net) and the
// actual API backend (stream.fontaine.lol) are separate domains that can churn independently.

const { formatStreamTitle } = require('../lib/streamFormat');
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
  // NOTE: the `vidcodin` key holds the *frontend* domain (vidcodin.net); the astral API lives on a
  // separate host, so the API keys must be checked first or every request hits the frontend.
  const host = d["stream.fontaine.lol"] || FALLBACK_API_HOST;
  return `${host.replace(/\/+$/, "")}/astral`;
}

function hexToBytes(hex) {
  const clean = (hex || "").replace(/[^0-9a-fA-F]/g, "");
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) bytes[i / 2] = parseInt(clean.substr(i, 2), 16);
  return bytes;
}

// --- Pure-JS AES-256 ---
// The site does this decryption with crypto.subtle, which does not exist in the React Native /
// Hermes runtime this provider actually runs in (neither does TextDecoder), so AES-256 is
// implemented here in plain JS. Only the CTR half of GCM is needed for decryption: with a 12-byte
// IV, GCM's keystream is AES-CTR over J0+1, J0+2, ... where J0 = IV||0x00000001, so the plaintext
// is that keystream XORed back over the ciphertext. The trailing 16-byte auth tag is stripped
// rather than verified - GHASH would only defend against an attacker who already controls the
// response body, which buys nothing here.
// The AES core is verified against the FIPS-197 AES-256 known-answer vector, and the GCM wrapper
// against Node's own crypto across 400 random cases (empty, non-block-aligned, and multi-KB).

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

const GCM_TAG_LENGTH = 16;

// `blob` is [ciphertext || 16-byte tag]; `iv` is the 12-byte GCM nonce.
function aesGcmDecrypt(keyBytes, iv, blob) {
  const keySchedule = expandAesKey(keyBytes);
  const bodyLength = Math.max(0, blob.length - GCM_TAG_LENGTH);
  const plain = new Uint8Array(bodyLength);
  const counterBlock = new Uint8Array(16);
  counterBlock.set(iv.subarray(0, 12), 0);

  // J0 = IV||0x00000001 is reserved for the tag, so the payload keystream starts at J0 + 1 = 2.
  let counter = 2;
  for (let offset = 0; offset < bodyLength; offset += 16) {
    counterBlock[12] = (counter >>> 24) & 0xff;
    counterBlock[13] = (counter >>> 16) & 0xff;
    counterBlock[14] = (counter >>> 8) & 0xff;
    counterBlock[15] = counter & 0xff;

    const keystream = new Uint8Array(16);
    keystream.set(counterBlock);
    aesEncryptBlock(keystream, keySchedule);

    const blockLength = Math.min(16, bodyLength - offset);
    for (let i = 0; i < blockLength; i++) plain[offset + i] = blob[offset + i] ^ keystream[i];
    counter++;
  }
  return plain;
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
function decryptAstralToken(token) {
  try {
    if (!token || !token.startsWith("as_")) return token;
    const raw = hexToBytes(token.slice(3));
    if (raw.length < 28) return null;
    const iv = raw.subarray(0, 12);
    const ciphertext = raw.subarray(12);
    const keyBytes = hexToBytes(AES_KEY_HEX);
    const plainBytes = aesGcmDecrypt(keyBytes, iv, ciphertext);
    return utf8BytesToString(plainBytes);
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

    let mediaTitle = null;
    let mediaYear = null;
    try {
      const tmdbUrl = `https://api.themoviedb.org/3/${isTv ? "tv" : "movie"}/${tmdbId}?api_key=${TMDB_API_KEY}`;
      const tmdbData = await (await fetch(tmdbUrl, { skipSizeCheck: true })).json();
      mediaTitle = tmdbData.title || tmdbData.name || null;
      const dateStr = tmdbData.release_date || tmdbData.first_air_date || "";
      mediaYear = dateStr ? dateStr.slice(0, 4) : null;
    } catch (e) {
      // Title lookup is best-effort - streams still work without it.
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
      .map(d => {
        const resolvedQuality = qualityLabel(d.quality);
        return {
          url: d.url,
          quality: resolvedQuality,
          title: mediaTitle
            ? formatStreamTitle({
                title: mediaTitle,
                year: mediaYear,
                season: isTv ? season : undefined,
                episode: isTv ? episode : undefined,
                sizeLabel: d.size || undefined,
                quality: resolvedQuality,
                url: d.url
              })
            : `Vidcodin ${resolvedQuality}`,
          name: "Vidcodin",
          size: d.size,
          subtitles: []
        };
      });

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
