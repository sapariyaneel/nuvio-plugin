const cheerio = typeof require === "function" ? require("cheerio-without-node-native") : global.cheerio;
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
const FALLBACK_BASE_URL = "https://hindmovie.icu";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  "Referer": `${FALLBACK_BASE_URL}/`
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
    return d.hindmoviez || FALLBACK_BASE_URL;
  });
}
function extractQuality(str) {
  const u = (str || "").toLowerCase();
  if (u.includes("2160p") || u.includes("4k"))
    return "4K";
  if (u.includes("1080p"))
    return "1080p";
  if (u.includes("720p"))
    return "720p";
  if (u.includes("480p"))
    return "480p";
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
      const releaseDate = mediaInfo.release_date || mediaInfo.first_air_date || "";
      const year = releaseDate ? releaseDate.split("-")[0] : void 0;
      const searchUrl = `${baseUrl}/page/1/?s=${encodeURIComponent(title)}`;
      const searchHtml = yield (yield fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $ = cheerio.load(searchHtml);
      const results = [];
      $("article").each((i, el) => {
        const a = $("h2.entry-title a", el);
        const href = a.attr("href");
        const t = a.text().trim();
        if (href)
          results.push({ title: t, url: href });
      });
      if (!results.length)
        return [];
      const isTV = mediaType === "tv";
      const lcTitle = title.toLowerCase();
      let match = results.find((r) => r.title.toLowerCase().includes(lcTitle));
      if (!match) {
        match = results.find((r) => r.title.toLowerCase().includes("season") && r.title.toLowerCase().includes(lcTitle.split(" ")[0]));
      }
      if (!match)
        match = results[0];
      const pageUrl = match.url.startsWith("http") ? match.url : `${baseUrl}${match.url}`;
      const pageHtml = yield (yield fetch(pageUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $page = cheerio.load(pageHtml);
      const streams = [];
      if (isTV) {
        let foundEp = false;
        const h3s = $page("h3").toArray();
        for (const h3 of h3s) {
          if (foundEp)
            break;
          const h3Text = $page(h3).text();
          const seasonMatch = h3Text.match(/Season\s*(\d+)/i);
          if (!seasonMatch || parseInt(seasonMatch[1]) !== season)
            continue;
          const p = $page(h3).next();
          if (!p.length || p.prop("tagName") !== "P")
            continue;
          const episodeListUrl = p.find("a[href]").first().attr("href");
          if (!episodeListUrl)
            continue;
          try {
            const epListHtml = yield (yield fetch(episodeListUrl, { headers: HEADERS, skipSizeCheck: true })).text();
            const $epList = cheerio.load(epListHtml);
            const epAnchors = $epList("h3 > a").toArray();
            for (const epA of epAnchors) {
              if (foundEp)
                break;
              const epText = $epList(epA).text();
              const epMatch = epText.match(/Episode\s*(\d+)/i);
              if (!epMatch || parseInt(epMatch[1]) !== episode)
                continue;
              const epHref = $epList(epA).attr("href");
              if (!epHref)
                continue;
              try {
                const epPageHtml = yield (yield fetch(epHref, { headers: HEADERS, skipSizeCheck: true })).text();
                const $epPage = cheerio.load(epPageHtml);
                const epSizeText = ($epPage("div.container p").filter((i, p2) => $epPage(p2).text().includes("Size:")).first().text() || "").replace("Size:", "").trim();
                const epSizeBytes = toBytes(epSizeText);
                $epPage("a.btn").each((i, btn) => {
                  const btnHref = $epPage(btn).attr("href") || "";
                  if (btnHref && btnHref.startsWith("http")) {
                    const h2text = $epPage("div.container h2").text() || "";
                    const detectedQuality = extractQuality(h2text || btnHref);
                    streams.push({
                      url: btnHref,
                      quality: detectedQuality,
                      title: formatStreamTitle({
                        title,
                        year,
                        season,
                        episode,
                        rawText: h2text,
                        sizeBytes: epSizeBytes,
                        url: btnHref,
                        quality: detectedQuality
                      }),
                      subtitles: [],
                      size: formatBytes(epSizeBytes)
                    });
                  }
                });
                foundEp = true;
              } catch (e) {
              }
            }
          } catch (e) {
          }
        }
      } else {
        const maxButtons = $page("a.maxbutton").toArray();
        for (const btn of maxButtons.slice(0, 3)) {
          try {
            const btnUrl = $page(btn).attr("href");
            if (!btnUrl)
              continue;
            const btnPageHtml = yield (yield fetch(btnUrl, { headers: HEADERS, skipSizeCheck: true })).text();
            const $btnPage = cheerio.load(btnPageHtml);
            const getLinksAnchors = $btnPage("div.entry-content a:contains('Get Links')").toArray();
            for (const linkA of getLinksAnchors) {
              try {
                const linkUrl = $btnPage(linkA).attr("href");
                if (!linkUrl)
                  continue;
                const linkPageHtml = yield (yield fetch(linkUrl, { headers: HEADERS, skipSizeCheck: true })).text();
                const $linkPage = cheerio.load(linkPageHtml);
                const name = ($linkPage("div.container p").filter((i, p) => $linkPage(p).text().includes("Name:")).first().text() || "").replace("Name:", "").trim();
                const sizeText = ($linkPage("div.container p").filter((i, p) => $linkPage(p).text().includes("Size:")).first().text() || "").replace("Size:", "").trim();
                const h2text = $linkPage("div.container h2").text() || "";
                const sizeBytes = toBytes(sizeText);
                $linkPage("a.btn").each((i, dlBtn) => {
                  const dlHref = $linkPage(dlBtn).attr("href") || "";
                  if (dlHref && dlHref.startsWith("http")) {
                    const detectedQuality = extractQuality(h2text || dlHref);
                    streams.push({
                      url: dlHref,
                      quality: detectedQuality,
                      title: formatStreamTitle({
                        title,
                        year,
                        rawText: `${h2text} ${name}`,
                        sizeBytes,
                        url: dlHref,
                        quality: detectedQuality
                      }),
                      subtitles: [],
                      size: formatBytes(sizeBytes)
                    });
                  }
                });
              } catch (e) {
              }
            }
          } catch (e) {
          }
        }
      }
      return streams;
    } catch (e) {
      console.error("[Hindmoviez]", e);
      return [];
    }
  });
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
