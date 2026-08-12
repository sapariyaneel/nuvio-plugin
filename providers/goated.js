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
function __nvToStr(v){return v===undefined||v===null?'':String(v);}
function __nvDetectQuality(rawText,fallbackQuality){const text=__nvToStr(rawText).toLowerCase();if(/2160p|4k\b|\buhd\b/i.test(text))return'2160p';if(/1080p/i.test(text))return'1080p';if(/720p/i.test(text))return'720p';if(/480p/i.test(text))return'480p';if(/360p/i.test(text))return'360p';const fb=__nvToStr(fallbackQuality).trim();if(fb)return fb;return null;}
function __nvQualityIcon(quality){const q=__nvToStr(quality).toLowerCase();if(/2160p|4k|uhd/.test(q))return'⚡';if(/720p/.test(q))return'💎';return'🔥';}
function __nvFormatBytes(bytes){const gb=bytes/(1024*1024*1024);if(gb>=1)return`${gb.toFixed(1)} GB`;const mb=bytes/(1024*1024);return`${Math.round(mb)} MB`;}
function __nvDetectSize({sizeBytes,sizeLabel,rawText}={}){if(typeof sizeBytes==='number'&&isFinite(sizeBytes)&&sizeBytes>0){return __nvFormatBytes(sizeBytes);}if(sizeLabel&&typeof sizeLabel==='string'&&sizeLabel.trim()&&sizeLabel.trim().toUpperCase()!=='N/A'){return sizeLabel.trim();}const text=__nvToStr(rawText);const m=text.match(/(\d+(?:\.\d+)?)\s*(GB|MB)/i);if(m){return`${m[1]} ${m[2].toUpperCase()}`;}return null;}
function __nvDetectContainer(rawText,url){const text=`${__nvToStr(rawText)} ${__nvToStr(url)}`.toLowerCase();if(/\.mp4(?:[?#]|$)|\.mp4[^a-z0-9]/i.test(text))return'MP4';if(/\.mkv(?:[?#]|$)|\.mkv[^a-z0-9]/i.test(text))return'MKV';return null;}
function __nvDetectCodec(rawText){const text=__nvToStr(rawText).toLowerCase();if(/h\.?265|x265|hevc/i.test(text))return'H.265';if(/h\.?264|x264|avc/i.test(text))return'H.264';return null;}
function __nvDetectHDR(rawText){const text=__nvToStr(rawText).toLowerCase();if(/hdr10\+/i.test(text))return'HDR10+';if(/hdr10/i.test(text))return'HDR10';if(/\bhdr\b/i.test(text))return'HDR';return null;}
function __nvDetectDolbyVision(rawText){const text=__nvToStr(rawText).toLowerCase();return/dolby\s*vision|dovi|[.\-_]dv[.\-_]/i.test(text);}
function __nvDetectSource(rawText){const text=__nvToStr(rawText);if(!text.trim())return null;if(/blu-?ray/i.test(text))return'BluRay';return'WEB-DL';}
function __nvDetectAudioType(rawText,dubKeywords){const text=__nvToStr(rawText).toLowerCase();if(!text.trim())return null;if(/multi[\s-]?audio|\bmulti\b/i.test(text))return'Multi-Audio';const dubPattern=Array.isArray(dubKeywords)&&dubKeywords.length?new RegExp(dubKeywords.join('|'),'i'):/dual|dubbed|hindi/i;if(dubPattern.test(text))return'Dual-Audio';if(/audio|dub|dd5\.1|ddp5\.1|eac3|atmos|truehd|aac|dts/i.test(text)){return'Single-Audio';}return null;}
function __nvDetectAudioChannels(rawText){const text=__nvToStr(rawText).toLowerCase();let channels=null;if(/truehd\s*7\.1/i.test(text))channels='TrueHD 7.1';else if(/ddp5\.1|eac3|e-ac-3/i.test(text))channels='DDP5.1';else if(/dd5\.1|ac-?3|5\.1/i.test(text))channels='DD5.1';else if(/truehd/i.test(text))channels='TrueHD';else if(/aac/i.test(text))channels='AAC';if(!channels)return null;if(/atmos/i.test(text))channels+='+Atmos';return channels;}
function formatStreamTitle(opts){const{title,year,season,episode,rawText='',sizeBytes,sizeLabel,url,quality:qualityFallback,dubKeywords,}=opts||{};const combinedText=[rawText,qualityFallback,url].filter(Boolean).join(' ');const quality=__nvDetectQuality(rawText,qualityFallback)||'Unknown';const size=__nvDetectSize({sizeBytes,sizeLabel,rawText})||'Unknown Size';const container=__nvDetectContainer(combinedText,url)||'MKV';const lines=[];const displayTitle=__nvToStr(title).trim()||'Unknown Title';let titleSuffix='';if(season!==undefined&&season!==null&&episode!==undefined&&episode!==null){const s=String(season).padStart(2,'0');const e=String(episode).padStart(2,'0');titleSuffix=` - (S${s}E${e})`;}else if(year){titleSuffix=` - (${year})`;}lines.push(`🎬 ${displayTitle}${titleSuffix}`);lines.push(`${__nvQualityIcon(quality)} ${quality} | ${size} | 📼 ${container}`);const hdr=__nvDetectHDR(combinedText);const codec=__nvDetectCodec(combinedText);const dv=__nvDetectDolbyVision(combinedText);if(hdr||codec){const parts=[];if(hdr)parts.push(hdr);parts.push(codec||'H.264');let line3=`🌈 ${parts.join(' | ')}`;if(dv)line3+=' | 👁️ DV';lines.push(line3);}else if(dv){lines.push('🌈 👁️ DV');}const audioType=__nvDetectAudioType(combinedText,dubKeywords);const audioChannels=__nvDetectAudioChannels(combinedText);if(audioType||audioChannels){const parts=[];if(audioType)parts.push(`🔊 ${audioType}`);if(audioChannels)parts.push(`🎧 ${audioChannels}`);lines.push(parts.join(' | '));}const source=__nvDetectSource(combinedText);if(source){lines.push(`📀 ${source}`);}return lines.join('\n');}
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const DOMAINS_URL = "https://raw.githubusercontent.com/sapariyaneel/nuvio-plugin/refs/heads/main/domains.json";
const FALLBACK_API_HOST = "https://api.reallyfast.xyz";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Referer": "https://goated.cx/",
  "Origin": "https://goated.cx"
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
    return (d["reallyfast"] || d["api.reallyfast.xyz"] || FALLBACK_API_HOST).replace(/\/+$/, "");
  });
}
const SHA256_K = [
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
  3248222580,
  3835390401,
  4022224774,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  2554220882,
  2821834349,
  2952996808,
  3210313671,
  3336571891,
  3584528711,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  2177026350,
  2456956037,
  2730485921,
  2820302411,
  3259730800,
  3345764771,
  3516065817,
  3600352804,
  4094571909,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  2227730452,
  2361852424,
  2428436474,
  2756734187,
  3204031479,
  3329325298
];
function utf8Bytes(str) {
  const out = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 128) {
      out.push(code);
    } else if (code < 2048) {
      out.push(192 | code >> 6, 128 | code & 63);
    } else if (code >= 55296 && code <= 56319 && i + 1 < str.length) {
      const next = str.charCodeAt(i + 1);
      if (next >= 56320 && next <= 57343) {
        const cp = 65536 + (code - 55296 << 10) + (next - 56320);
        out.push(240 | cp >> 18, 128 | cp >> 12 & 63, 128 | cp >> 6 & 63, 128 | cp & 63);
        i++;
      } else {
        out.push(224 | code >> 12, 128 | code >> 6 & 63, 128 | code & 63);
      }
    } else {
      out.push(224 | code >> 12, 128 | code >> 6 & 63, 128 | code & 63);
    }
  }
  return out;
}
function sha256Hex(input) {
  const bytes = utf8Bytes(input);
  const bitLen = bytes.length * 8;
  bytes.push(128);
  while (bytes.length % 64 !== 56)
    bytes.push(0);
  const hi = Math.floor(bitLen / 4294967296);
  bytes.push(hi >>> 24 & 255, hi >>> 16 & 255, hi >>> 8 & 255, hi & 255);
  bytes.push(bitLen >>> 24 & 255, bitLen >>> 16 & 255, bitLen >>> 8 & 255, bitLen & 255);
  let h0 = 1779033703, h1 = 3144134277, h2 = 1013904242, h3 = 2773480762;
  let h4 = 1359893119, h5 = 2600822924, h6 = 528734635, h7 = 1541459225;
  const w = new Array(64);
  for (let pos = 0; pos < bytes.length; pos += 64) {
    for (let i = 0; i < 16; i++) {
      const j = pos + i * 4;
      w[i] = (bytes[j] << 24 | bytes[j + 1] << 16 | bytes[j + 2] << 8 | bytes[j + 3]) >>> 0;
    }
    for (let i = 16; i < 64; i++) {
      const x = w[i - 15], y = w[i - 2];
      const s0 = ((x >>> 7 | x << 25) ^ (x >>> 18 | x << 14) ^ x >>> 3) >>> 0;
      const s1 = ((y >>> 17 | y << 15) ^ (y >>> 19 | y << 13) ^ y >>> 10) >>> 0;
      w[i] = (w[i - 16] + s0 >>> 0) + (w[i - 7] + s1 >>> 0) >>> 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let i = 0; i < 64; i++) {
      const S1 = ((e >>> 6 | e << 26) ^ (e >>> 11 | e << 21) ^ (e >>> 25 | e << 7)) >>> 0;
      const ch = (e & f ^ ~e & g) >>> 0;
      const temp1 = ((h + S1 >>> 0) + ch >>> 0) + (SHA256_K[i] + w[i] >>> 0) >>> 0;
      const S0 = ((a >>> 2 | a << 30) ^ (a >>> 13 | a << 19) ^ (a >>> 22 | a << 10)) >>> 0;
      const maj = (a & b ^ a & c ^ b & c) >>> 0;
      const temp2 = S0 + maj >>> 0;
      h = g;
      g = f;
      f = e;
      e = d + temp1 >>> 0;
      d = c;
      c = b;
      b = a;
      a = temp1 + temp2 >>> 0;
    }
    h0 = h0 + a >>> 0;
    h1 = h1 + b >>> 0;
    h2 = h2 + c >>> 0;
    h3 = h3 + d >>> 0;
    h4 = h4 + e >>> 0;
    h5 = h5 + f >>> 0;
    h6 = h6 + g >>> 0;
    h7 = h7 + h >>> 0;
  }
  const parts = [h0, h1, h2, h3, h4, h5, h6, h7];
  let hex = "";
  for (const p of parts)
    hex += ("00000000" + p.toString(16)).slice(-8);
  return hex;
}
function solveProofOfWork(apiHost) {
  return __async(this, null, function* () {
    const resp = yield fetch(`${apiHost}/api/challenge`, { skipSizeCheck: true });
    if (!resp.ok)
      throw new Error("failed to fetch PoW challenge");
    const { challenge, difficulty } = yield resp.json();
    const target = "0".repeat(difficulty);
    for (let nonce = 0; nonce < 5e6; nonce++) {
      const hash = sha256Hex(challenge + nonce);
      if (hash.startsWith(target))
        return { challenge, nonce: String(nonce) };
    }
    throw new Error("PoW solve timed out");
  });
}
function getTmdbRuntimeSeconds(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      const url = mediaType === "tv" ? `https://api.themoviedb.org/3/tv/${tmdbId}/season/${season || 1}/episode/${episode || 1}?api_key=${TMDB_API_KEY}` : `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}`;
      const resp = yield fetch(url, { skipSizeCheck: true });
      if (!resp.ok)
        return null;
      const data = yield resp.json();
      const minutes = data.runtime;
      return minutes ? minutes * 60 : null;
    } catch (e) {
      return null;
    }
  });
}
function formatBytes(bytes) {
  if (!bytes)
    return "Unknown";
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
  const lines = text.split("\n").map((l) => l.trim());
  const variants = [];
  let defaultAudioUrl = null;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("#EXT-X-MEDIA") && lines[i].includes("TYPE=AUDIO") && !defaultAudioUrl) {
      const uriMatch = lines[i].match(/URI="([^"]+)"/);
      const isDefault = /DEFAULT=YES/.test(lines[i]);
      if (uriMatch && (isDefault || !defaultAudioUrl))
        defaultAudioUrl = resolveUrl(uriMatch[1], baseUrl);
      continue;
    }
    if (!lines[i].startsWith("#EXT-X-STREAM-INF"))
      continue;
    const attrLine = lines[i];
    const urlLine = lines[i + 1];
    if (!urlLine || urlLine.startsWith("#"))
      continue;
    const bandwidthMatch = attrLine.match(/BANDWIDTH=(\d+)/);
    const resolutionMatch = attrLine.match(/RESOLUTION=(\d+)x(\d+)/);
    const bandwidth = bandwidthMatch ? parseInt(bandwidthMatch[1], 10) : 0;
    const height = resolutionMatch ? parseInt(resolutionMatch[2], 10) : 0;
    variants.push({ url: resolveUrl(urlLine, baseUrl), bandwidth, height });
  }
  return { variants, defaultAudioUrl };
}
function getAudioBitrateBps(audioPlaylistUrl) {
  return __async(this, null, function* () {
    if (!audioPlaylistUrl)
      return 0;
    try {
      const text = yield (yield fetch(audioPlaylistUrl, { skipSizeCheck: true })).text();
      const match = text.match(/#EXT-X-BITRATE:(\d+)/);
      return match ? parseInt(match[1], 10) * 1e3 : 0;
    } catch (e) {
      return 0;
    }
  });
}
function getTmdbTitleYear(tmdbId, mediaType) {
  return __async(this, null, function* () {
    try {
      const url = mediaType === "tv" ? `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}` : `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}`;
      const resp = yield fetch(url, { skipSizeCheck: true });
      if (!resp.ok)
        return { title: null, year: null };
      const data = yield resp.json();
      const title = data.title || data.name || null;
      const releaseDate = data.release_date || data.first_air_date || "";
      const year = releaseDate ? releaseDate.split("-")[0] : null;
      return { title, year };
    } catch (e) {
      return { title: null, year: null };
    }
  });
}
function qualityLabelFromHeight(height) {
  if (height >= 2e3)
    return "4K";
  if (height <= 0)
    return "Unknown";
  return `${height}p`;
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
      const apiHost = yield getApiHost();
      const isTv = mediaType === "tv";
      const resolvePow = yield solveProofOfWork(apiHost);
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
      const resolveResp = yield fetch(`${apiHost}/api/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resolveBody),
        skipSizeCheck: true
      });
      if (!resolveResp.ok)
        return [];
      const resolveData = yield resolveResp.json().catch(() => null);
      if (!resolveData || !resolveData.url)
        return [];
      const playlistResp = yield fetch(resolveData.url, { skipSizeCheck: true });
      if (!playlistResp.ok)
        return [];
      const playlistText = yield playlistResp.text();
      const { variants, defaultAudioUrl } = parseMasterPlaylist(playlistText, resolveData.url);
      if (!variants.length)
        return [];
      const topVariant = variants.slice().sort((a, b) => b.height - a.height)[0];
      const [runtimeSeconds, audioBitrateBps, titleYear] = yield Promise.all([
        getTmdbRuntimeSeconds(numericTmdbId, mediaType, season, episode),
        getAudioBitrateBps(defaultAudioUrl),
        getTmdbTitleYear(numericTmdbId, mediaType)
      ]);
      let subtitles = [];
      try {
        const subPow = yield solveProofOfWork(apiHost);
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
        const subResp = yield fetch(`${apiHost}/api/subtitles`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subBody),
          skipSizeCheck: true
        });
        if (subResp.ok) {
          const subData = yield subResp.json().catch(() => null);
          subtitles = (subData && subData.subtitles || []).filter((s) => s && s.url).map((s) => ({ url: s.url, lang: s.label || s.language || "Unknown" }));
        }
      } catch (e) {
      }
      const totalBitrateBps = topVariant.bandwidth + audioBitrateBps;
      const quality = qualityLabelFromHeight(topVariant.height);
      const sizeBytes = runtimeSeconds ? totalBitrateBps * runtimeSeconds / 8 : void 0;
      return [{
        url: resolveData.url,
        quality,
        title: formatStreamTitle({
          title: titleYear.title,
          year: titleYear.year,
          season: isTv ? season || 1 : void 0,
          episode: isTv ? episode || 1 : void 0,
          rawText: "Adaptive",
          sizeBytes,
          url: resolveData.url,
          quality
        }),
        name: "Goated",
        size: runtimeSeconds ? formatBytes(totalBitrateBps * runtimeSeconds / 8) : "Unknown",
        headers: HEADERS,
        subtitles
      }];
    } catch (e) {
      console.error("[Goated]", e);
      return [];
    }
  });
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
