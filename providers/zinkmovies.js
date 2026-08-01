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
const DOMAINS_URL = "https://raw.githubusercontent.com/phisher98/TVVVV/refs/heads/main/domains.json";
const FALLBACK_BASE_URL = "https://zinkmovies.vip";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
  "Cookie": "xla=s4t"
};
const RANDOM_ID_REGEX = /generateDownloadLink\(['"]([^'"]+)/;
const AJAX_REGEX = /https:\/\/[^"'\s]+ajax_generate_token\.php/;
const DL_REGEX = /https:\/\/[^"'\s]+\/dl\//;
const SERVER_HANDLER_REGEX = /SERVER_HANDLER_URL\s*=\s*["']([^"']+)/;
const WORKER_REGEX = /handleServerRequest\(['"]worker['"]\s*,\s*['"]([^'"]+)/;
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
    return d.zinkmovies || FALLBACK_BASE_URL;
  });
}
function originOf(url) {
  const m = (url || "").match(/^(https?:\/\/[^/]+)/);
  return m ? m[1] : "";
}
function indexQuality(str) {
  const m = (str || "").match(/(\d{3,4})[pP]/);
  if (!m)
    return "Unknown";
  return `${m[1]}p`;
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
function cleanHubTitle(title) {
  const name = (title || "").replace(/\.[a-zA-Z0-9]{2,4}$/, "");
  const normalized = name.replace(/WEB[-_. ]?DL/gi, "WEB-DL").replace(/WEB[-_. ]?RIP/gi, "WEBRIP").replace(/H[ .]?265/gi, "H265").replace(/H[ .]?264/gi, "H264").replace(/DDP[ .]?([0-9]\.[0-9])/gi, "DDP$1");
  const sourceTags = ["WEB-DL", "WEBRIP", "BLURAY", "HDRIP", "DVDRIP", "HDTV", "CAM", "TS", "BRRIP", "BDRIP"];
  const codecTags = ["H264", "H265", "X264", "X265", "HEVC", "AVC"];
  const audioTags = ["AAC", "AC3", "DTS", "MP3", "FLAC", "DD", "DDP", "EAC3"];
  const hdrTags = ["SDR", "HDR", "HDR10", "HDR10+", "DV", "DOLBYVISION"];
  const out = [];
  for (const part of normalized.split(/[ _.]/)) {
    const p = part.toUpperCase();
    let keep = null;
    if (sourceTags.includes(p) || codecTags.includes(p))
      keep = p;
    else if (audioTags.some((t) => p.startsWith(t)) || p === "ATMOS")
      keep = p;
    else if (hdrTags.includes(p))
      keep = p === "DV" || p === "DOLBYVISION" ? "DOLBYVISION" : p;
    else if (p === "NF" || p === "CR")
      keep = p;
    if (keep && !out.includes(keep))
      out.push(keep);
  }
  return out.join(" ");
}
function retry(times, delayMs, block) {
  return __async(this, null, function* () {
    for (let i = 0; i < times; i++) {
      try {
        const result = yield block();
        if (result)
          return result;
      } catch (e) {
      }
      if (i < times - 1)
        yield new Promise((r) => setTimeout(r, delayMs));
    }
    return null;
  });
}
function bypassShortlink(url) {
  return __async(this, null, function* () {
    if (!url.includes("tpi.li") && !url.includes("oii.la"))
      return url;
    try {
      const docText = yield (yield fetch(url, { headers: HEADERS, skipSizeCheck: true })).text();
      const match = docText.match(/aHR0c[a-zA-Z0-9+/=]+/);
      if (!match)
        return url;
      const decodedUrl = base64Decode(match[0]);
      if (decodedUrl.startsWith("http"))
        return decodedUrl;
      const $ = cheerio.load(docText);
      const link = $("a.get-link").attr("href");
      return link && link.trim() ? link : url;
    } catch (e) {
      return url;
    }
  });
}
function generateZinkLinks(url) {
  return __async(this, null, function* () {
    try {
      const firstHtml = yield (yield fetch(url, { headers: HEADERS, skipSizeCheck: true })).text();
      const randomIdMatch = firstHtml.match(RANDOM_ID_REGEX);
      if (!randomIdMatch)
        return [];
      const randomId = randomIdMatch[1];
      const ajaxMatch = firstHtml.match(AJAX_REGEX);
      if (!ajaxMatch)
        return [];
      const ajaxEndpoint = ajaxMatch[0];
      const dlMatch = firstHtml.match(DL_REGEX);
      if (!dlMatch)
        return [];
      const downloadBase = dlMatch[0];
      const token = yield retry(3, 1e3, () => __async(this, null, function* () {
        const resp = yield fetch(`${ajaxEndpoint}?random_id=${randomId}`, {
          method: "POST",
          headers: __spreadProps(__spreadValues({}, HEADERS), {
            "X-Requested-With": "XMLHttpRequest",
            "Content-Type": "application/x-www-form-urlencoded"
          }),
          body: `random_id=${encodeURIComponent(randomId)}`,
          skipSizeCheck: true
        });
        const text = yield resp.text();
        const data = JSON.parse(text);
        return data && data.token ? data.token : null;
      }));
      if (!token)
        return [];
      const generatedUrl = `${downloadBase}${token}`;
      const generatedHtml = yield (yield fetch(generatedUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $ = cheerio.load(generatedHtml);
      const results = [];
      $("#mirror-buttons a[href]").each((i, el) => {
        const href = ($(el).attr("href") || "").trim();
        if (!href)
          return;
        const name = $(el).text().replace("Generate", "").trim();
        results.push({ name, url: href });
      });
      const workerOnclick = $("#worker-btn").attr("onclick") || "";
      const workerMatch = workerOnclick.match(WORKER_REGEX);
      const workerId = workerMatch ? workerMatch[1] : "";
      const handlerMatch = generatedHtml.match(SERVER_HANDLER_REGEX);
      const serverHandler = handlerMatch ? handlerMatch[1] : "";
      if (workerId && serverHandler) {
        try {
          const workerResp = yield fetch(serverHandler, {
            method: "POST",
            headers: __spreadProps(__spreadValues({}, HEADERS), {
              "X-Requested-With": "XMLHttpRequest",
              "Content-Type": "application/json",
              "Origin": generatedUrl.split("/dl/")[0],
              "Referer": generatedUrl
            }),
            body: JSON.stringify({ server: "worker", random_id: workerId }),
            skipSizeCheck: true
          });
          const workerJson = JSON.parse(yield workerResp.text());
          const workerUrl = workerJson && (workerJson.url || workerJson.download) || "";
          if (workerUrl && workerUrl.trim())
            results.push({ name: "WORKER", url: workerUrl });
        } catch (e) {
        }
      }
      const seen = /* @__PURE__ */ new Set();
      return results.filter((l) => {
        if (seen.has(l.url))
          return false;
        seen.add(l.url);
        return true;
      });
    } catch (e) {
      return [];
    }
  });
}
function pixelDrainExtractor(link, quality, label) {
  return __async(this, null, function* () {
    try {
      const base = originOf(link) || "https://pixeldrain.dev";
      const finalUrl = link.includes("download") ? link : `${base}/api/file/${link.split("/").pop()}?download`;
      return [{ url: finalUrl, quality, title: `Zinkmovies Pixeldrain ${label}`.trim() }];
    } catch (e) {
      return [];
    }
  });
}
function hubCdnExtractor(url) {
  return __async(this, null, function* () {
    try {
      const html = yield (yield fetch(url, { headers: HEADERS, skipSizeCheck: true })).text();
      const $ = cheerio.load(html);
      const scriptText = $("script:contains(var reurl)").first().html() || html;
      const m = scriptText.match(/reurl\s*=\s*"([^"]+)"/);
      if (!m)
        return [];
      const encodedUrl = m[1].split("?r=")[1];
      if (!encodedUrl)
        return [];
      const decoded = base64Decode(encodedUrl);
      const idx = decoded.lastIndexOf("link=");
      if (idx === -1)
        return [];
      const decodedUrl = decoded.substring(idx + 5);
      if (!decodedUrl)
        return [];
      return [{ url: decodedUrl, quality: "Unknown", title: "Zinkmovies HUBCDN" }];
    } catch (e) {
      return [];
    }
  });
}
function hubDriveExtractor(url) {
  return __async(this, null, function* () {
    try {
      const html = yield (yield fetch(url, { headers: HEADERS, skipSizeCheck: true })).text();
      const $ = cheerio.load(html);
      const href = $(".btn.btn-primary.btn-user.btn-success1.m-1").attr("href");
      if (!href)
        return [];
      if (href.toLowerCase().includes("hubcloud"))
        return hubCloudExtractor(href, "HubDrive");
      return loadExtractor(href, "HubDrive");
    } catch (e) {
      return [];
    }
  });
}
function hubCloudExtractor(url, referer) {
  return __async(this, null, function* () {
    try {
      const ref = referer || "";
      const baseUrl = originOf(url);
      if (!baseUrl)
        return [];
      let href;
      if (url.includes("hubcloud.php")) {
        href = url;
      } else {
        const html = yield (yield fetch(url, { headers: HEADERS, skipSizeCheck: true })).text();
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
      const headerDetails = cleanHubTitle(header);
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
          if (label.includes("fsl server")) {
            streams.push({ url: link, quality, title: `${ref} [FSL Server] ${labelExtras}`.trim(), size: formatBytes(sizeInBytes) });
          } else if (label.includes("download file")) {
            streams.push({ url: link, quality, title: `${ref} ${labelExtras}`.trim(), size: formatBytes(sizeInBytes) });
          } else if (label.includes("buzzserver")) {
            const resp = yield fetch(`${link}/download`, {
              headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: link }),
              redirect: "manual",
              skipSizeCheck: true
            });
            const dlink = resp.headers.get("hx-redirect") || resp.headers.get("HX-Redirect") || "";
            if (dlink.trim()) {
              streams.push({ url: dlink, quality, title: `${ref} [BuzzServer] ${labelExtras}`.trim(), size: formatBytes(sizeInBytes) });
            }
          } else if (label.includes("pixeldra") || label.includes("pixelserver") || label.includes("pixel server") || label.includes("pixeldrain")) {
            const base = originOf(link);
            const finalUrl = link.includes("download") ? link : `${base}/api/file/${link.split("/").pop()}?download`;
            streams.push({ url: finalUrl, quality, title: `${ref} Pixeldrain ${labelExtras}`.trim(), size: formatBytes(sizeInBytes) });
          } else if (label.includes("s3 server")) {
            streams.push({ url: link, quality, title: `${ref} [S3 Server] ${labelExtras}`.trim(), size: formatBytes(sizeInBytes) });
          } else if (label.includes("fslv2")) {
            streams.push({ url: link, quality, title: `${ref} [FSLv2] ${labelExtras}`.trim(), size: formatBytes(sizeInBytes) });
          } else if (label.includes("mega server")) {
            streams.push({ url: link, quality, title: `${ref} [Mega Server] ${labelExtras}`.trim(), size: formatBytes(sizeInBytes) });
          } else {
            const nested = yield loadExtractor(link, "");
            streams.push(...nested.map((s) => __spreadProps(__spreadValues({}, s), { size: s.size || formatBytes(sizeInBytes) })));
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
function tpiLiExtractor(url) {
  return __async(this, null, function* () {
    try {
      const finalUrl = yield bypassShortlink(url);
      if (finalUrl === url || !finalUrl.trim())
        return [];
      return loadExtractor(finalUrl, url);
    } catch (e) {
      return [];
    }
  });
}
function loadExtractor(url, referer) {
  return __async(this, null, function* () {
    if (!url || !url.startsWith("http"))
      return [];
    const host = (originOf(url) || "").toLowerCase();
    try {
      if (host.includes("hubcdn"))
        return yield hubCdnExtractor(url);
      if (host.includes("hubdrive"))
        return yield hubDriveExtractor(url);
      if (host.includes("hubcloud"))
        return yield hubCloudExtractor(url, referer || "HubCloud");
      if (host.includes("pixeldrain"))
        return yield pixelDrainExtractor(url, "Unknown", "");
      if (host.includes("tpi.li") || host.includes("oii.la"))
        return yield tpiLiExtractor(url);
      return [{ url, quality: indexQuality(url), title: "Zinkmovies" }];
    } catch (e) {
      return [];
    }
  });
}
function resolvePageLinks(pageUrl) {
  return __async(this, null, function* () {
    try {
      const finalUrl = yield bypassShortlink(pageUrl);
      const zinkLinks = yield generateZinkLinks(finalUrl);
      const streams = [];
      for (const link of zinkLinks) {
        try {
          if (link.name.toLowerCase().includes("worker")) {
            streams.push({ url: link.url, quality: indexQuality(link.url), title: "Zink Worker" });
          } else {
            const extracted = yield loadExtractor(link.url, "Zinkmovies");
            streams.push(...extracted);
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
      const baseUrl = yield getBaseUrl();
      const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
      const mediaInfo = yield (yield fetch(tmdbUrl, { skipSizeCheck: true })).json();
      const title = mediaInfo.title || mediaInfo.name;
      if (!title)
        return [];
      const searchUrl = `${baseUrl}/page/1/?s=${encodeURIComponent(title)}`;
      const searchHtml = yield (yield fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $search = cheerio.load(searchHtml);
      const results = [];
      $search("article").each((i, el) => {
        const href = $search("a", el).attr("href");
        const name = $search("a", el).text().trim();
        if (href)
          results.push({ title: name, url: href });
      });
      if (!results.length)
        return [];
      const isTV = mediaType === "tv";
      const lcTitle = title.toLowerCase();
      let match = results.find((r) => r.title.toLowerCase().includes(lcTitle));
      if (!match)
        match = results[0];
      const pageUrl = match.url.startsWith("http") ? match.url : `${baseUrl}${match.url}`;
      const pageHtml = yield (yield fetch(pageUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $page = cheerio.load(pageHtml);
      const targetPages = [];
      if (isTV) {
        const seasonRegex = /Season\s*(\d+)/i;
        const episodeRegex = /EPISODE\s*[-:]?\s*(\d+)/i;
        const hasClass = (el, cls) => new RegExp(`\\b${cls}\\b`).test($page(el).attr("class") || "");
        const seasonUrls = [];
        $page(".lgtagmessage").each((i, el) => {
          const sm = $page(el).text().match(seasonRegex);
          if (!sm)
            return;
          const seasonNum = parseInt(sm[1], 10);
          if (seasonNum !== season)
            return;
          let next = $page(el).next();
          while (next.length && !hasClass(next, "lgtagmessage")) {
            if (hasClass(next, "movie-button-container")) {
              const href = ($page("a[href]", next).first().attr("href") || "").trim();
              if (href)
                seasonUrls.push(href);
              break;
            }
            next = next.next();
          }
        });
        for (const seasonUrl of seasonUrls) {
          try {
            const seasonHtml = yield (yield fetch(seasonUrl, { headers: HEADERS, skipSizeCheck: true })).text();
            const $season = cheerio.load(seasonHtml);
            $season(".entry-content a[href]").each((i, el) => {
              const text = $season(el).text();
              const em = text.match(episodeRegex);
              if (!em)
                return;
              if (parseInt(em[1], 10) !== episode)
                return;
              const href = ($season(el).attr("href") || "").trim();
              if (!href || text.toLowerCase().includes("zip"))
                return;
              targetPages.push(href);
            });
          } catch (e) {
          }
        }
      } else {
        $page("div.movie-button-container a").each((i, el) => {
          const href = $page(el).attr("href");
          if (href)
            targetPages.push(href);
        });
      }
      if (!targetPages.length)
        return [];
      const streams = [];
      for (const page of targetPages) {
        const resolved = yield resolvePageLinks(page);
        streams.push(...resolved);
      }
      return streams.filter((s) => s && s.url).map((s) => ({
        url: s.url,
        quality: s.quality || "Unknown",
        title: s.title || "Zinkmovies",
        name: s.title || "Zinkmovies",
        headers: { Referer: baseUrl, "User-Agent": HEADERS["User-Agent"] },
        subtitles: [],
        // s.size is already a formatted string from the extractor above - re-running it through
        // formatBytes() treats it as a raw byte count and produces NaN.
        size: s.size || ""
      }));
    } catch (e) {
      console.error("[Zinkmovies]", e);
      return [];
    }
  });
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
