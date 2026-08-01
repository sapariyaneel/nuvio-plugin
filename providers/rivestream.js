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
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const DOMAINS_URL = "https://raw.githubusercontent.com/sapariyaneel/nuvio-plugin/refs/heads/main/domains.json";
const FALLBACK_BASE_URL = "https://www.rivestream.app";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Referer": "https://www.rivestream.app/"
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
    return (d.rivestream || FALLBACK_BASE_URL).replace(/\/+$/, "");
  });
}
const RIVESTREAM_C_TOKENS = "4Z7lUo|gwIVSMD|PLmz2elE2v|Z4OFV0|SZ6RZq6Zc|zhJEFYxrz8|FOm7b0|axHS3q4KDq|o9zuXQ|4Aebt|wgjjWwKKx|rY4VIxqSN|kfjbnSo|2DyrFA1M|YUixDM9B|JQvgEj0|mcuFx6JIek|eoTKe26gL|qaI9EVO1rB|0xl33btZL|1fszuAU|a7jnHzst6P|wQuJkX|cBNhTJlEOf|KNcFWhDvgT|XipDGjST|PCZJlbHoyt|2AYnMZkqd|HIpJh|KH0C3iztrG|W81hjts92|rJhAT|NON7LKoMQ|NMdY3nsKzI|t4En5v|Qq5cOQ9H|Y9nwrp|VX5FYVfsf|cE5SJG|x1vj1|HegbLe|zJ3nmt4OA|gt7rxW57dq|clIE9b|jyJ9g|B5jXjMCSx|cOzZBZTV|FTXGy|Dfh1q1|ny9jqZ2POI|X2NnMn|MBtoyD|qz4Ilys7wB|68lbOMye|3YUJnmxp|1fv5Imona|PlfvvXD7mA|ZarKfHCaPR|owORnX|dQP1YU|dVdkx|qgiK0E|cx9wQ|5F9bGa|7UjkKrp|Yvhrj|wYXez5Dg3|pG4GMU|MwMAu|rFRD5wlM".split("|");
const RIVESTREAM_SECRET_KEY_FN_SRC = 'function(e){if(void 0===e)return"rive";try{let t,n;let r=String(e);if(isNaN(Number(e))){let e=r.split("").reduce((e,t)=>e+t.charCodeAt(0),0);t=c[e%c.length]||btoa(r),n=Math.floor(e%r.length/2)}else{let i=Number(e);t=c[i%c.length]||btoa(r),n=Math.floor(i%r.length/2)}let i=r.slice(0,n)+t+r.slice(n),o=function(e){let t=String(e),n=3735928559^t.length;for(let e=0;e<t.length;e++){let r=t.charCodeAt(e);r^=(131*e+89^r<<e%5)&255,n=(n<<7|n>>>25)>>>0^r;let i=(65535&n)*60205,o=(n>>>16)*60205<<16;n=i+o>>>0,n^=n>>>11}return n^=n>>>15,n=(65535&n)*49842+((n>>>16)*49842<<16)>>>0,n^=n>>>13,n=(65535&n)*40503+((n>>>16)*40503<<16)>>>0,n^=n>>>16,n=(65535&n)*10196+((n>>>16)*10196<<16)>>>0,(n^n>>>15).toString(16).padStart(8,"0")}(function(e){e=String(e);let t=0;for(let n=0;n<e.length;n++){let r=e.charCodeAt(n),i=((t=r+(t<<6)+(t<<16)-t>>>0)<<n%5|t>>>32-n%5)>>>0;t^=(i^(r<<n%7|r>>>8-n%7))>>>0,t=t+(t>>>11^t<<3)>>>0}return t^=t>>>15,t=(65535&t)*49842+(((t>>>16)*49842&65535)<<16)>>>0,t^=t>>>13,t=(65535&t)*40503+(((t>>>16)*40503&65535)<<16)>>>0,(t^t>>>16).toString(16).padStart(8,"0")}(i));return btoa(o)}catch(e){return"topSecret"}}';
function makeBtoa() {
  if (typeof btoa === "function")
    return btoa;
  return (str) => {
    const bytes = [];
    for (let i = 0; i < str.length; i++)
      bytes.push(str.charCodeAt(i) & 255);
    return Buffer.from(bytes).toString("base64");
  };
}
const computeSecretKey = new Function(
  "c",
  "btoa",
  `return (${RIVESTREAM_SECRET_KEY_FN_SRC});`
)(RIVESTREAM_C_TOKENS, makeBtoa());
function formatBytes(bytes) {
  if (!bytes)
    return "Unknown";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
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
function qualityLabelFromHeight(height) {
  if (height >= 2e3)
    return "4K";
  if (height <= 0)
    return "Unknown";
  return `${height}p`;
}
function parseMasterPlaylistTopVariant(text, baseUrl) {
  const lines = text.split("\n").map((l) => l.trim());
  let best = null;
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
    let url = urlLine;
    try {
      url = new URL(urlLine, baseUrl).toString();
    } catch (e) {
    }
    if (!best || bandwidth > best.bandwidth)
      best = { url, bandwidth, height };
  }
  return best;
}
function fetchService(baseUrl, requestID, params, secretKey, service) {
  return __async(this, null, function* () {
    const search = new URLSearchParams(__spreadProps(__spreadValues({ requestID }, params), { service, secretKey, proxyMode: "noProxy" }));
    const resp = yield fetch(`${baseUrl}/api/backendfetch?${search.toString()}`, { headers: HEADERS, skipSizeCheck: true });
    if (!resp.ok)
      return null;
    const data = yield resp.json().catch(() => null);
    return data && data.data ? data.data : null;
  });
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
      const baseUrl = yield getBaseUrl();
      const isTv = mediaType === "tv";
      const secretKey = computeSecretKey(numericTmdbId);
      const requestID = isTv ? "tvVideoProvider" : "movieVideoProvider";
      const params = { id: String(numericTmdbId) };
      if (isTv) {
        params.season = String(season || 1);
        params.episode = String(episode || 1);
      }
      const streams = [];
      if (!isTv) {
        const flowcastData = yield fetchService(baseUrl, requestID, params, secretKey, "flowcast");
        const flowcastSources = flowcastData && flowcastData.sources || [];
        for (const s of flowcastSources) {
          if (!s || !s.url)
            continue;
          const height = parseInt(s.quality, 10) || 0;
          streams.push({
            url: s.url,
            quality: qualityLabelFromHeight(height),
            title: `Rivestream ${qualityLabelFromHeight(height)}`,
            name: "Rivestream",
            size: s.size ? formatBytes(parseInt(s.size, 10)) : "Unknown",
            headers: HEADERS,
            subtitles: []
          });
        }
      }
      if (!streams.length) {
        const primeData = yield fetchService(baseUrl, requestID, params, secretKey, "primevids");
        const primeSources = primeData && primeData.sources || [];
        const hlsSource = primeSources.find((s) => s && s.url && s.format === "hls");
        if (hlsSource) {
          const playlistResp = yield fetch(hlsSource.url, { headers: HEADERS, skipSizeCheck: true });
          if (playlistResp.ok) {
            const playlistText = yield playlistResp.text();
            const topVariant = parseMasterPlaylistTopVariant(playlistText, hlsSource.url);
            if (topVariant) {
              const runtimeSeconds = yield getTmdbRuntimeSeconds(numericTmdbId, mediaType, season, episode);
              const quality = qualityLabelFromHeight(topVariant.height);
              streams.push({
                url: topVariant.url,
                quality,
                title: `Rivestream ${quality}`,
                name: "Rivestream",
                size: runtimeSeconds ? formatBytes(topVariant.bandwidth * runtimeSeconds / 8) : "Unknown",
                headers: HEADERS,
                subtitles: []
              });
            }
          }
        }
      }
      streams.sort((a, b) => {
        const rankA = a.quality === "4K" ? 2160 : parseInt(a.quality, 10) || 0;
        const rankB = b.quality === "4K" ? 2160 : parseInt(b.quality, 10) || 0;
        return rankB - rankA;
      });
      return streams;
    } catch (e) {
      console.error("[Rivestream]", e);
      return [];
    }
  });
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
