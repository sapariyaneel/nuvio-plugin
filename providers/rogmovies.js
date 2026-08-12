const cheerio = typeof require === "function" ? require("cheerio-without-node-native") : global.cheerio;
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
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
const DOMAINS_URL = "https://raw.githubusercontent.com/sapariyaneel/nuvio-plugin/refs/heads/main/domains.json";
const FALLBACK_BASE_URL = "https://new1.rogmovies.click";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
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
function getBaseUrl() {
  return __async(this, null, function* () {
    const d = yield getDomains();
    return d.rogmovies || FALLBACK_BASE_URL;
  });
}
function originOf(url) {
  const m = (url || "").match(/^(https?:\/\/[^/]+)/);
  return m ? m[1] : "";
}
function indexQuality(str) {
  const m = (str || "").match(/(\d{3,4})[pP]/);
  return m ? parseInt(m[1], 10) : 0;
}
function qualityLabel(n) {
  if (n >= 2160)
    return "2160p";
  if (n >= 1440)
    return "1440p";
  if (n >= 1080)
    return "1080p";
  if (n >= 720)
    return "720p";
  if (n >= 480)
    return "480p";
  if (n >= 360)
    return "360p";
  return "Unknown";
}
function toBytes(size) {
  const m = (size || "").match(/([\d.]+)\s*(GB|MB|KB)/i);
  if (!m)
    return 0;
  const v = parseFloat(m[1]);
  const unit = m[2].toUpperCase();
  if (unit === "GB")
    return v * 1024 ** 3;
  if (unit === "MB")
    return v * 1024 ** 2;
  return v * 1024;
}
function formatBytes(bytes) {
  if (!bytes)
    return "";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
function cleanTitle(raw) {
  return (raw || "").split("(")[0].trim().replace(/\s+/g, " ");
}
function getImdbId(tmdbId, mediaType) {
  return __async(this, null, function* () {
    const url = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`;
    const data = yield (yield fetch(url, { skipSizeCheck: true })).json();
    return data && data.imdb_id ? data.imdb_id : null;
  });
}
function getTmdbTitle(tmdbId, mediaType) {
  return __async(this, null, function* () {
    const url = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const data = yield (yield fetch(url, { skipSizeCheck: true })).json();
    return data.title || data.name || null;
  });
}
function getTmdbYear(tmdbId, mediaType) {
  return __async(this, null, function* () {
    try {
      const url = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
      const data = yield (yield fetch(url, { skipSizeCheck: true })).json();
      const dateStr = data.release_date || data.first_air_date || "";
      return dateStr ? dateStr.slice(0, 4) : null;
    } catch (e) {
      return null;
    }
  });
}
function searchSite(query) {
  return __async(this, null, function* () {
    const baseUrl = yield getBaseUrl();
    const url = `${baseUrl}/search.php?q=${encodeURIComponent(query)}&page=1`;
    const res = yield fetch(url, { headers: HEADERS, skipSizeCheck: true });
    if (!res.ok)
      return [];
    const data = yield res.json().catch(() => null);
    if (!data || !Array.isArray(data.hits))
      return [];
    return data.hits.map((h) => h.document).filter(Boolean);
  });
}
function pickCandidate(hits, imdbId, isTv, season) {
  let pool = imdbId ? hits.filter((h) => h.imdb_id === imdbId) : hits;
  if (!pool.length)
    pool = hits;
  if (!pool.length)
    return null;
  if (isTv) {
    const targetSeason = season || 1;
    const seasonMatch = pool.find((h) => {
      const m = (h.permalink || "").match(/season-(\d+)/i);
      return m && parseInt(m[1], 10) === targetSeason;
    });
    if (seasonMatch)
      return seasonMatch;
  }
  return pool[0];
}
function getPostContent(id) {
  return __async(this, null, function* () {
    const baseUrl = yield getBaseUrl();
    const url = `${baseUrl}/wp-json/wp/v2/posts/${id}`;
    const res = yield fetch(url, { headers: HEADERS, skipSizeCheck: true });
    if (!res.ok)
      return null;
    const data = yield res.json().catch(() => null);
    return data && data.content ? data.content.rendered : null;
  });
}
function extractQualityBlocks(html) {
  const $ = cheerio.load(html);
  const blocks = [];
  $("h3, h5").each((i, el) => {
    const heading = $(el).text().trim();
    if (!heading)
      return;
    const links = [];
    let next = $(el).next();
    let hops = 0;
    while (next.length && hops < 3) {
      if (next.is("h3") || next.is("h5"))
        break;
      next.find("a[href]").each((j, a) => {
        const href = $(a).attr("href");
        const label = $(a).text().trim();
        if (href)
          links.push({ href, label });
      });
      if (links.length)
        break;
      next = next.next();
      hops++;
    }
    if (links.length)
      blocks.push({ heading, links });
  });
  return blocks;
}
function resolveNexdrive(nexdriveUrl) {
  return __async(this, null, function* () {
    try {
      const html = yield (yield fetch(nexdriveUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $ = cheerio.load(html);
      const links = [];
      $("a[href]").each((i, el) => {
        const href = $(el).attr("href") || "";
        const label = $(el).text().trim();
        if (/vcloud\.zip|fastdl\.zip|hubcloud|hubdrive/i.test(href)) {
          links.push({ href, label });
        }
      });
      return links;
    } catch (e) {
      return [];
    }
  });
}
function fastdlExtractor(url) {
  return __async(this, null, function* () {
    try {
      const u = new URL(url);
      const downloadParam = u.searchParams.get("download");
      if (!downloadParam)
        return [];
      const res = yield fetch(url, { headers: HEADERS, redirect: "manual", skipSizeCheck: true });
      const loc = res.headers.get("location");
      if (loc)
        return [{ url: loc, quality: 0, title: "G-Direct" }];
      return [];
    } catch (e) {
      return [];
    }
  });
}
function base64Decode(value) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  const input = (value || "").replace(/[^A-Za-z0-9+/=]/g, "");
  let output = "";
  let i = 0;
  while (i < input.length) {
    const e1 = chars.indexOf(input.charAt(i++));
    const e2 = chars.indexOf(input.charAt(i++));
    const e3 = chars.indexOf(input.charAt(i++));
    const e4 = chars.indexOf(input.charAt(i++));
    const c1 = e1 << 2 | e2 >> 4;
    const c2 = (e2 & 15) << 4 | e3 >> 2;
    const c3 = (e3 & 3) << 6 | e4;
    output += String.fromCharCode(c1);
    if (e3 !== 64)
      output += String.fromCharCode(c2);
    if (e4 !== 64)
      output += String.fromCharCode(c3);
  }
  return output;
}
function resolveVcloudToken(vcloudUrl) {
  return __async(this, null, function* () {
    try {
      const html = yield (yield fetch(vcloudUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const m = html.match(/atob\(atob\('([A-Za-z0-9+/=]+)'\)\)/);
      if (!m)
        return vcloudUrl;
      const once = base64Decode(m[1]);
      const twice = base64Decode(once);
      return twice.startsWith("http") ? twice : vcloudUrl;
    } catch (e) {
      return vcloudUrl;
    }
  });
}
function hubCloudExtractor(url, referer) {
  return __async(this, null, function* () {
    try {
      const ref = referer || "V-Cloud";
      let currentUrl = url;
      if (currentUrl.includes("hubcloud.ink"))
        currentUrl = currentUrl.replace("hubcloud.ink", "hubcloud.dad");
      if (/vcloud\.zip/i.test(currentUrl)) {
        currentUrl = yield resolveVcloudToken(currentUrl);
      }
      const baseUrl = originOf(currentUrl);
      if (!baseUrl)
        return [];
      let href;
      if (currentUrl.includes("hubcloud.php") || /vcloud\.zip/i.test(currentUrl)) {
        href = currentUrl;
      } else {
        const html = yield (yield fetch(currentUrl, { headers: HEADERS, skipSizeCheck: true })).text();
        const $first = cheerio.load(html);
        const raw = $first("#download").attr("href") || "";
        if (!raw)
          return [];
        href = raw.toLowerCase().startsWith("http") ? raw : `${baseUrl.replace(/\/+$/, "")}/${raw.replace(/^\/+/, "")}`;
      }
      if (!href.trim())
        return [];
      const pageHtml = yield (yield fetch(href, { headers: HEADERS, skipSizeCheck: true })).text();
      const $ = cheerio.load(pageHtml);
      const size = $("i#size").first().text() || "";
      const header = $("div.card-header").first().text() || "";
      const headerDetails = cleanTitle(header);
      const quality = indexQuality(header);
      const sizeInBytes = toBytes(size);
      let labelExtras = "";
      if (headerDetails.length > 0)
        labelExtras += `[${headerDetails}]`;
      if (size.length > 0)
        labelExtras += `[${size}]`;
      const buttons = $("a.btn").toArray().map((el) => ({
        link: $(el).attr("href") || "",
        label: ($(el).text() || "").toLowerCase()
      }));
      const streams = [];
      for (const { link, label } of buttons) {
        if (!link)
          continue;
        try {
          if (label.includes("fsl server") || label.includes("download file") || label.includes("s3 server") || label.includes("fslv2") || label.includes("mega server")) {
            streams.push({ url: link, quality, title: `${ref} ${labelExtras}`.trim(), size: formatBytes(sizeInBytes) });
          } else if (label.includes("buzzserver")) {
            const resp = yield fetch(`${link}/download`, {
              headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: link }),
              redirect: "manual",
              skipSizeCheck: true
            });
            const dlink = resp.headers.get("hx-redirect") || resp.headers.get("HX-Redirect") || "";
            if (dlink.trim())
              streams.push({ url: dlink, quality, title: `${ref} [BuzzServer] ${labelExtras}`.trim(), size: formatBytes(sizeInBytes) });
          } else if (label.includes("pixeldra") || label.includes("pixelserver") || label.includes("pixel server")) {
            const base = originOf(link);
            const finalUrl = link.includes("download") ? link : `${base}/api/file/${link.split("/").pop()}?download`;
            streams.push({ url: finalUrl, quality, title: `${ref} Pixeldrain ${labelExtras}`.trim(), size: formatBytes(sizeInBytes) });
          } else if (label.includes("10gbps")) {
            let redirectUrl = link;
            let finalLink = null;
            for (let i = 0; i < 5; i++) {
              const r = yield fetch(redirectUrl, { redirect: "manual", skipSizeCheck: true });
              if (r.status >= 300 && r.status < 400) {
                const loc = r.headers.get("location");
                if (loc && loc.includes("link=")) {
                  finalLink = loc.split("link=")[1];
                  break;
                }
                if (loc)
                  redirectUrl = new URL(loc, redirectUrl).toString();
              } else
                break;
            }
            if (finalLink)
              streams.push({ url: finalLink, quality, title: `${ref} [10Gbps] ${labelExtras}`.trim(), size: formatBytes(sizeInBytes) });
          }
        } catch (e) {
        }
      }
      return streams;
    } catch (e) {
      return [];
    }
  });
}
function resolveMirrorLink(href, label) {
  return __async(this, null, function* () {
    try {
      if (/fastdl\.zip/i.test(href))
        return fastdlExtractor(href);
      if (/vcloud\.zip|hubcloud|hubdrive/i.test(href))
        return hubCloudExtractor(href, "V-Cloud");
      return [];
    } catch (e) {
      return [];
    }
  });
}
function resolveImdbToTmdb(imdbId, mediaType) {
  return __async(this, null, function* () {
    try {
      const url = `https://api.themoviedb.org/3/find/${imdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;
      const data = yield (yield fetch(url, { skipSizeCheck: true })).json();
      const results = mediaType === "tv" ? data.tv_results : data.movie_results;
      return results && results.length ? results[0].id : null;
    } catch (e) {
      return null;
    }
  });
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      if (typeof tmdbId === "string" && tmdbId.trim().toLowerCase().startsWith("tt")) {
        tmdbId = yield resolveImdbToTmdb(tmdbId, mediaType);
        if (!tmdbId)
          return [];
      }
      const isTv = mediaType === "tv";
      const [imdbId, title, year] = yield Promise.all([
        getImdbId(tmdbId, mediaType),
        getTmdbTitle(tmdbId, mediaType),
        getTmdbYear(tmdbId, mediaType)
      ]);
      if (!title) {
        return [];
      }
      const hits = yield searchSite(title);
      if (!hits.length) {
        return [];
      }
      const candidate = pickCandidate(hits, imdbId, isTv, season);
      if (!candidate || !candidate.id) {
        return [];
      }
      const content = yield getPostContent(candidate.id);
      if (!content) {
        return [];
      }
      const blocks = extractQualityBlocks(content);
      if (!blocks.length) {
        return [];
      }
      const streams = [];
      for (const block of blocks) {
        const quality = indexQuality(block.heading);
        for (const link of block.links) {
          const nexdriveLinks = yield resolveNexdrive(link.href);
          for (const mirror of nexdriveLinks) {
            const resolved = yield resolveMirrorLink(mirror.href, mirror.label);
            for (const s of resolved) {
              const resolvedQuality = qualityLabel(s.quality || quality);
              streams.push({
                url: s.url,
                quality: resolvedQuality,
                title: formatStreamTitle({
                  title,
                  year,
                  season: isTv ? season : void 0,
                  episode: isTv ? episode : void 0,
                  rawText: `${block.heading} ${s.title || ""}`,
                  sizeLabel: s.size || void 0,
                  quality: resolvedQuality,
                  url: s.url
                }),
                name: s.title || "RogMovies",
                subtitles: [],
                // s.size is already a formatted string from the extractor above - re-running it
                // through formatBytes() treats it as a raw byte count and produces NaN.
                size: s.size || ""
              });
            }
          }
        }
      }
      return streams;
    } catch (e) {
      console.error("[RogMovies]", e);
      return [];
    }
  });
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
