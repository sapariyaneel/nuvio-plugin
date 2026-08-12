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
const FALLBACK_URL = "https://multimovies.motorcycles";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
};
let cachedBaseUrl = null;
function getBaseUrl() {
  return __async(this, null, function* () {
    if (cachedBaseUrl)
      return cachedBaseUrl;
    try {
      const resp = yield fetch(DOMAINS_URL, { skipSizeCheck: true });
      const data = yield resp.json();
      cachedBaseUrl = data.MultiMovies || FALLBACK_URL;
    } catch (e) {
      cachedBaseUrl = FALLBACK_URL;
    }
    return cachedBaseUrl;
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
      const BASE_URL = yield getBaseUrl();
      const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
      const mediaInfo = yield (yield fetch(tmdbUrl, { skipSizeCheck: true })).json();
      const title = mediaInfo.title || mediaInfo.name;
      if (!title)
        return [];
      const releaseDate = mediaInfo.release_date || mediaInfo.first_air_date || "";
      const year = releaseDate ? releaseDate.split("-")[0] : void 0;
      const searchResp = yield fetch(`${BASE_URL}/?s=${encodeURIComponent(title)}`, {
        headers: HEADERS,
        skipSizeCheck: true
      });
      const searchHtml = yield searchResp.text();
      const $ = cheerio.load(searchHtml);
      const results = [];
      $("div.result-item").each((i, el) => {
        const a = $(el).find("article > div.details > div.title > a");
        const href = a.attr("href");
        const name = a.text().trim();
        if (href && name)
          results.push({ href, name });
      });
      if (results.length === 0)
        return [];
      const isMovie = mediaType === "movie";
      const match = results.find(
        (r) => r.name.toLowerCase().includes(title.toLowerCase())
      ) || results[0];
      const pageResp = yield fetch(match.href, { headers: HEADERS, skipSizeCheck: true });
      const pageHtml = yield pageResp.text();
      const $p = cheerio.load(pageHtml);
      const streams = [];
      if (!isMovie && mediaType === "tv") {
        const episodes = [];
        $p("#seasons ul.episodios li").each((seasonIdx, sEl) => {
          $p(sEl).find("li").each((epIdx, epEl) => {
            const href = $p(epEl).find("div.episodiotitle > a").attr("href");
            if (href) {
              episodes.push({
                href,
                season: seasonIdx + 1,
                episode: epIdx + 1
              });
            }
          });
        });
        if (episodes.length === 0) {
          let seasonNum = 1;
          $p("#seasons ul.episodios").each((sIdx, sList) => {
            seasonNum = sIdx + 1;
            $p(sList).find("li").each((eIdx, epEl) => {
              const href = $p(epEl).find("div.episodiotitle > a").attr("href");
              if (href) {
                episodes.push({ href, season: seasonNum, episode: eIdx + 1 });
              }
            });
          });
        }
        const targetEp = episodes.find(
          (ep) => ep.season === parseInt(season || 1) && ep.episode === parseInt(episode || 1)
        ) || episodes[0];
        if (!targetEp)
          return [];
        const epResp = yield fetch(targetEp.href, { headers: HEADERS, skipSizeCheck: true });
        const epHtml = yield epResp.text();
        const $ep = cheerio.load(epHtml);
        const epItems = [];
        $ep("ul#playeroptionsul li").each((i, el) => {
          epItems.push({
            post: $ep(el).attr("data-post"),
            nume: $ep(el).attr("data-nume"),
            type: $ep(el).attr("data-type")
          });
        });
        for (const item of epItems.slice(0, 5)) {
          if (!item.post || !item.nume || (item.nume || "").includes("trailer"))
            continue;
          const embedUrl = yield fetchEmbedUrl(BASE_URL, item.post, item.nume, item.type, match.href);
          if (embedUrl && !embedUrl.includes("youtube")) {
            const resolvedUrl = yield resolveEmbed(embedUrl, BASE_URL);
            if (resolvedUrl) {
              const quality = extractQuality(resolvedUrl);
              streams.push({
                url: resolvedUrl,
                quality,
                title: formatStreamTitle({
                  title,
                  year,
                  season: targetEp.season,
                  episode: targetEp.episode,
                  rawText: "MultiMovies",
                  url: resolvedUrl,
                  quality
                }),
                headers: resolvedUrl.includes(".m3u8") || resolvedUrl.includes(".mp4") ? { Referer: new URL(embedUrl).origin + "/", "User-Agent": HEADERS["User-Agent"] } : void 0,
                subtitles: []
              });
            }
          }
        }
        return streams;
      }
      const playerItems = [];
      $p("ul#playeroptionsul li").each((i, el) => {
        playerItems.push({
          post: $p(el).attr("data-post"),
          nume: $p(el).attr("data-nume"),
          type: $p(el).attr("data-type")
        });
      });
      for (const item of playerItems.slice(0, 5)) {
        if (!item.post || !item.nume || (item.nume || "").includes("trailer"))
          continue;
        const embedUrl = yield fetchEmbedUrl(BASE_URL, item.post, item.nume, item.type, match.href);
        if (embedUrl && !embedUrl.includes("youtube")) {
          const resolvedUrl = yield resolveEmbed(embedUrl, BASE_URL);
          if (resolvedUrl) {
            const quality = extractQuality(resolvedUrl);
            streams.push({
              url: resolvedUrl,
              quality,
              title: formatStreamTitle({
                title,
                year,
                rawText: "MultiMovies",
                url: resolvedUrl,
                quality
              }),
              headers: resolvedUrl.includes(".m3u8") || resolvedUrl.includes(".mp4") ? { Referer: new URL(embedUrl).origin + "/", "User-Agent": HEADERS["User-Agent"] } : void 0,
              subtitles: []
            });
          }
        }
      }
      return streams;
    } catch (e) {
      console.error("[MultiMovies]", e);
      return [];
    }
  });
}
function fetchEmbedUrl(baseUrl, post, nume, type, referer) {
  return __async(this, null, function* () {
    try {
      const resp = yield fetch(`${baseUrl}/wp-admin/admin-ajax.php`, {
        method: "POST",
        headers: __spreadProps(__spreadValues({}, HEADERS), {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-Requested-With": "XMLHttpRequest",
          "Referer": baseUrl
        }),
        body: `action=doo_player_ajax&post=${post}&nume=${nume}&type=${type}`,
        skipSizeCheck: true
      });
      const data = yield resp.json();
      const embedUrl = data.embed_url || "";
      const srcMatch = embedUrl.match(/SRC="(https?:[^"]+)"/i);
      if (srcMatch)
        return srcMatch[1].trim();
      const urlMatch = embedUrl.match(/"(https?[^"]+)"/);
      if (urlMatch)
        return urlMatch[1].trim();
      return embedUrl.replace(/^"|"$/g, "").trim();
    } catch (e) {
      return null;
    }
  });
}
function unpackJsPacker(html) {
  const marker = "eval(function(p,a,c,k,e,d)";
  const start = html.indexOf(marker);
  if (start === -1)
    return null;
  const openIdx = html.indexOf("(", start);
  let depth = 0, inStr = null, i = openIdx;
  for (; i < html.length; i++) {
    const c2 = html[i];
    if (inStr) {
      if (c2 === "\\") {
        i++;
        continue;
      }
      if (c2 === inStr)
        inStr = null;
      continue;
    }
    if (c2 === "'" || c2 === '"') {
      inStr = c2;
      continue;
    }
    if (c2 === "(")
      depth++;
    else if (c2 === ")") {
      depth--;
      if (depth === 0)
        break;
    }
  }
  const callExpr = html.slice(openIdx + 1, i);
  const fnEnd = callExpr.indexOf("}(");
  if (fnEnd === -1)
    return null;
  const argsStr = callExpr.slice(fnEnd + 2, -1);
  const args = [];
  let cur = "", d2 = 0, inStr2 = null;
  for (let j = 0; j < argsStr.length; j++) {
    const c2 = argsStr[j];
    if (inStr2) {
      cur += c2;
      if (c2 === "\\") {
        cur += argsStr[++j];
        continue;
      }
      if (c2 === inStr2)
        inStr2 = null;
      continue;
    }
    if (c2 === "'" || c2 === '"') {
      inStr2 = c2;
      cur += c2;
      continue;
    }
    if (c2 === "[" || c2 === "{" || c2 === "(")
      d2++;
    if (c2 === "]" || c2 === "}" || c2 === ")")
      d2--;
    if (c2 === "," && d2 === 0) {
      args.push(cur);
      cur = "";
      continue;
    }
    cur += c2;
  }
  args.push(cur);
  if (args.length < 4)
    return null;
  const stripQuotes = (s) => {
    s = s.trim();
    if (s.startsWith("'") && s.endsWith("'") || s.startsWith('"') && s.endsWith('"')) {
      return s.slice(1, -1).replace(/\\(.)/g, "$1");
    }
    return s;
  };
  const payload = stripQuotes(args[0]);
  const radix = parseInt(args[1].trim(), 10);
  const count = parseInt(args[2].trim(), 10);
  const keywords = stripQuotes(args[3].split(".split(")[0]).split("|");
  const dict = {};
  let c = count;
  while (c--)
    dict[c.toString(radix)] = keywords[c] || c.toString(radix);
  return payload.replace(/\b\w+\b/g, (word) => dict[word] !== void 0 ? dict[word] : word);
}
function resolveEmbed(url, referer) {
  return __async(this, null, function* () {
    if (!url || !url.startsWith("http"))
      return null;
    if (url.includes(".m3u8") || url.includes(".mp4"))
      return url;
    try {
      const resp = yield fetch(url, {
        headers: __spreadProps(__spreadValues({}, HEADERS), { "Referer": referer }),
        skipSizeCheck: true
      });
      const text = yield resp.text();
      if (url.includes("deaddrive.xyz")) {
        const $ = cheerio.load(text);
        const firstServer = $("ul.list-server-items > li").first().attr("data-video");
        return firstServer || null;
      }
      const m3u8 = text.match(/(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/i);
      if (m3u8)
        return m3u8[1];
      const mp4 = text.match(/(https?:\/\/[^\s"']+\.mp4[^\s"']*)/i);
      if (mp4)
        return mp4[1];
      const unpacked = unpackJsPacker(text);
      if (unpacked) {
        const packedM3u8 = unpacked.match(/(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/i);
        if (packedM3u8)
          return packedM3u8[1];
        const packedMp4 = unpacked.match(/(https?:\/\/[^\s"']+\.mp4[^\s"']*)/i);
        if (packedMp4)
          return packedMp4[1];
      }
      return null;
    } catch (e) {
      return null;
    }
  });
}
function extractQuality(url) {
  const u = (url || "").toLowerCase();
  if (u.includes("2160p") || u.includes("4k"))
    return "4K";
  if (u.includes("1080p"))
    return "1080p";
  if (u.includes("720p"))
    return "720p";
  if (u.includes("480p"))
    return "480p";
  if (u.includes("360p"))
    return "360p";
  return "Unknown";
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
