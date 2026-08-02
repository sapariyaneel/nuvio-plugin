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
    const host = d["stream.fontaine.lol"] || FALLBACK_API_HOST;
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
const AES_SBOX = new Uint8Array(256);
const AES_RCON = [1, 2, 4, 8, 16, 32, 64, 128, 27, 54, 108, 216, 171, 77];
(function buildSbox() {
  const pow = new Uint8Array(256);
  const log = new Uint8Array(256);
  let x = 1;
  for (let i = 0; i < 256; i++) {
    pow[i] = x;
    log[x] = i;
    x = (x ^ x << 1 & 255 ^ (x & 128 ? 27 : 0)) & 255;
  }
  AES_SBOX[0] = 99;
  for (let i = 1; i < 256; i++) {
    const inverse = pow[(255 - log[i]) % 255];
    let s = inverse;
    let rotated = inverse;
    for (let k = 0; k < 4; k++) {
      rotated = (rotated << 1 | rotated >>> 7) & 255;
      s ^= rotated;
    }
    AES_SBOX[i] = (s ^ 99) & 255;
  }
})();
function gfMultiply(a, b) {
  let result = 0;
  while (b) {
    if (b & 1)
      result ^= a;
    a = (a << 1 ^ (a & 128 ? 27 : 0)) & 255;
    b >>= 1;
  }
  return result & 255;
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
function aesEncryptBlock(state, keySchedule) {
  const schedule = keySchedule.schedule;
  const rounds = keySchedule.rounds;
  for (let i = 0; i < 16; i++)
    state[i] ^= schedule[i];
  for (let round = 1; round <= rounds; round++) {
    for (let i = 0; i < 16; i++)
      state[i] = AES_SBOX[state[i]];
    let tmp = state[1];
    state[1] = state[5];
    state[5] = state[9];
    state[9] = state[13];
    state[13] = tmp;
    tmp = state[2];
    state[2] = state[10];
    state[10] = tmp;
    tmp = state[6];
    state[6] = state[14];
    state[14] = tmp;
    tmp = state[15];
    state[15] = state[11];
    state[11] = state[7];
    state[7] = state[3];
    state[3] = tmp;
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
    for (let i = 0; i < 16; i++)
      state[i] ^= schedule[round * 16 + i];
  }
  return state;
}
const GCM_TAG_LENGTH = 16;
function aesGcmDecrypt(keyBytes, iv, blob) {
  const keySchedule = expandAesKey(keyBytes);
  const bodyLength = Math.max(0, blob.length - GCM_TAG_LENGTH);
  const plain = new Uint8Array(bodyLength);
  const counterBlock = new Uint8Array(16);
  counterBlock.set(iv.subarray(0, 12), 0);
  let counter = 2;
  for (let offset = 0; offset < bodyLength; offset += 16) {
    counterBlock[12] = counter >>> 24 & 255;
    counterBlock[13] = counter >>> 16 & 255;
    counterBlock[14] = counter >>> 8 & 255;
    counterBlock[15] = counter & 255;
    const keystream = new Uint8Array(16);
    keystream.set(counterBlock);
    aesEncryptBlock(keystream, keySchedule);
    const blockLength = Math.min(16, bodyLength - offset);
    for (let i = 0; i < blockLength; i++)
      plain[offset + i] = blob[offset + i] ^ keystream[i];
    counter++;
  }
  return plain;
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
  try {
    if (!token || !token.startsWith("as_"))
      return token;
    const raw = hexToBytes(token.slice(3));
    if (raw.length < 28)
      return null;
    const iv = raw.subarray(0, 12);
    const ciphertext = raw.subarray(12);
    const keyBytes = hexToBytes(AES_KEY_HEX);
    const plainBytes = aesGcmDecrypt(keyBytes, iv, ciphertext);
    return utf8BytesToString(plainBytes);
  } catch (e) {
    return null;
  }
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
