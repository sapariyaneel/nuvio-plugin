/**
 * multimovies - Built from src/providers/multimovies.js
 * Generated: 2026-08-17T09:56:23.797Z
 */
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

// src/providers/multimovies.js
var DOMAINS_URL = "https://raw.githubusercontent.com/sapariyaneel/nuvio-plugin/refs/heads/main/domains.json";
var FALLBACK_URL = "https://multimovies.motorcycles";
var TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
};
var cachedBaseUrl = null;
function isReachable(url) {
  return __async(this, null, function* () {
    try {
      const resp = yield fetch(url, { headers: HEADERS, skipSizeCheck: true, redirect: "follow" });
      return resp.status < 500;
    } catch (e) {
      return false;
    }
  });
}
function getBaseUrl() {
  return __async(this, null, function* () {
    if (cachedBaseUrl)
      return cachedBaseUrl;
    let candidate = FALLBACK_URL;
    try {
      const resp = yield fetch(DOMAINS_URL, { skipSizeCheck: true, redirect: "follow" });
      const data = yield resp.json();
      if (data.MultiMovies)
        candidate = data.MultiMovies;
    } catch (e) {
    }
    cachedBaseUrl = (yield isReachable(candidate)) ? candidate : FALLBACK_URL;
    return cachedBaseUrl;
  });
}
function resolveImdbToTmdb(imdbId, mediaType) {
  return __async(this, null, function* () {
    try {
      const url = `https://api.themoviedb.org/3/find/${imdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;
      const data = yield (yield fetch(url, { skipSizeCheck: true, redirect: "follow" })).json();
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
      const mediaInfo = yield (yield fetch(tmdbUrl, { skipSizeCheck: true, redirect: "follow" })).json();
      const title = mediaInfo.title || mediaInfo.name;
      if (!title)
        return [];
      const searchResp = yield fetch(`${BASE_URL}/?s=${encodeURIComponent(title)}`, {
        headers: HEADERS,
        skipSizeCheck: true,
        redirect: "follow"
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
      const pageResp = yield fetch(match.href, { headers: HEADERS, skipSizeCheck: true, redirect: "follow" });
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
        const epResp = yield fetch(targetEp.href, { headers: HEADERS, skipSizeCheck: true, redirect: "follow" });
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
              const streamReferer = new URL(embedUrl).origin + "/";
              const streamHeaders = resolvedUrl.includes(".m3u8") || resolvedUrl.includes(".mp4") ? { Referer: streamReferer, "User-Agent": HEADERS["User-Agent"] } : void 0;
              const quality = resolvedUrl.includes(".m3u8") ? yield getMasterPlaylistQuality(resolvedUrl, streamReferer) : "Unknown";
              streams.push({
                url: resolvedUrl,
                quality,
                title: "MultiMovies",
                headers: streamHeaders,
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
            const streamReferer = new URL(embedUrl).origin + "/";
            const streamHeaders = resolvedUrl.includes(".m3u8") || resolvedUrl.includes(".mp4") ? { Referer: streamReferer, "User-Agent": HEADERS["User-Agent"] } : void 0;
            const quality = resolvedUrl.includes(".m3u8") ? yield getMasterPlaylistQuality(resolvedUrl, streamReferer) : "Unknown";
            streams.push({
              url: resolvedUrl,
              quality,
              title: "MultiMovies",
              headers: streamHeaders,
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
        skipSizeCheck: true,
        redirect: "follow"
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
function nextEmbedHop(html, baseUrl) {
  const $ = cheerio.load(html);
  const iframeSrc = $("iframe").first().attr("src");
  if (iframeSrc && iframeSrc.startsWith("http"))
    return iframeSrc;
  if (iframeSrc && iframeSrc.startsWith("/"))
    return new URL(iframeSrc, baseUrl).toString();
  const varMatch = html.match(/EMBED_URL\s*=\s*['"]([^'"]+)['"]/);
  if (varMatch)
    return varMatch[1];
  return null;
}
function resolveEmbed(url, referer, depth) {
  return __async(this, null, function* () {
    if (!url || !url.startsWith("http"))
      return null;
    if ((depth || 0) > 3)
      return null;
    if (url.includes(".m3u8") || url.includes(".mp4"))
      return url;
    try {
      let refererOrigin = referer;
      try {
        refererOrigin = referer ? new URL(referer).origin + "/" : referer;
      } catch (e) {
      }
      const resp = yield fetch(url, {
        headers: __spreadProps(__spreadValues({}, HEADERS), { "Referer": refererOrigin }),
        skipSizeCheck: true,
        redirect: "follow"
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
      const hop = nextEmbedHop(text, url);
      if (hop && hop !== url)
        return resolveEmbed(hop, url, (depth || 0) + 1);
      return null;
    } catch (e) {
      return null;
    }
  });
}
function qualityLabelFromHeight(height) {
  if (height >= 2e3)
    return "4K";
  if (height >= 1e3)
    return "1080p";
  if (height >= 700)
    return "720p";
  if (height >= 450)
    return "480p";
  if (height > 0)
    return "360p";
  return "Unknown";
}
function getMasterPlaylistQuality(m3u8Url, referer) {
  return __async(this, null, function* () {
    try {
      const text = yield (yield fetch(m3u8Url, {
        headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: referer }),
        skipSizeCheck: true,
        redirect: "follow"
      })).text();
      let best = null;
      const lines = text.split("\n").map((l) => l.trim());
      for (let i = 0; i < lines.length; i++) {
        if (!lines[i].startsWith("#EXT-X-STREAM-INF"))
          continue;
        const urlLine = lines[i + 1];
        if (!urlLine || urlLine.startsWith("#"))
          continue;
        const bandwidthMatch = lines[i].match(/BANDWIDTH=(\d+)/);
        const resolutionMatch = lines[i].match(/RESOLUTION=(\d+)x(\d+)/);
        const bandwidth = bandwidthMatch ? parseInt(bandwidthMatch[1], 10) : 0;
        const height = resolutionMatch ? parseInt(resolutionMatch[2], 10) : 0;
        if (!best || bandwidth > best.bandwidth)
          best = { bandwidth, height };
      }
      return best ? qualityLabelFromHeight(best.height) : "Unknown";
    } catch (e) {
      return "Unknown";
    }
  });
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
