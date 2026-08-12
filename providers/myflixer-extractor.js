// myflixer-extractor.js
// MyFlixer (watch32.sx / videostr.net) extractor, ported from the standalone
// CLI-style MyFlixerExtractor class shared across several Nuvio provider repos.
// The original class searches by free-text title and is not TMDB-id aware, so
// this file adds a thin getStreams(tmdbId, mediaType, season, episode) adapter
// that resolves the TMDB id to a title/year via TMDB, then drives the class.

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

const axios = typeof require === "function" ? require("axios") : null;
const cheerio = typeof require === "function" ? require("cheerio-without-node-native") : null;

class MyFlixerExtractor {
  constructor() {
    this.mainUrl = "https://1flixto.icu";
    this.videostrUrl = "https://videostr.net";
  }

  async search(query) {
    try {
      const searchUrl = `${this.mainUrl}/search/${query.replace(/\s+/g, "-")}`;
      const response = await axios.get(searchUrl);
      const $ = cheerio.load(response.data);

      const results = [];
      $(".flw-item").each((i, element) => {
        const title = $(element).find("h2.film-name > a").attr("title");
        const link = $(element).find("h2.film-name > a").attr("href");
        const poster = $(element).find("img.film-poster-img").attr("data-src");

        if (title && link) {
          results.push({
            title,
            url: link.startsWith("http") ? link : `${this.mainUrl}${link}`,
            poster
          });
        }
      });

      return results;
    } catch (error) {
      console.error("[Myflixer-extractor] Search error:", error.message);
      return [];
    }
  }

  async getContentDetails(url) {
    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);

      const contentId = $(".detail_page-watch").attr("data-id");
      const name = $(".detail_page-infor h2.heading-name > a").text();
      const isMovie = url.includes("movie");

      if (isMovie) {
        return { type: "movie", name, data: `list/${contentId}` };
      }

      const episodes = [];
      const seasonsResponse = await axios.get(`${this.mainUrl}/ajax/season/list/${contentId}`);
      const $seasons = cheerio.load(seasonsResponse.data);

      for (const season of $seasons("a.ss-item").toArray()) {
        const seasonId = $(season).attr("data-id");
        const seasonNum = $(season).text().replace("Season ", "");

        const episodesResponse = await axios.get(`${this.mainUrl}/ajax/season/episodes/${seasonId}`);
        const $episodes = cheerio.load(episodesResponse.data);

        $episodes("a.eps-item").each((i, episode) => {
          const epId = $(episode).attr("data-id");
          const title = $(episode).attr("title");
          const match = title && title.match(/Eps (\d+): (.+)/);

          if (match) {
            episodes.push({
              id: epId,
              episode: parseInt(match[1], 10),
              name: match[2],
              season: parseInt(seasonNum.replace("Series", "").trim(), 10),
              data: `servers/${epId}`
            });
          }
        });
      }

      return { type: "series", name, episodes };
    } catch (error) {
      console.error("[Myflixer-extractor] Content details error:", error.message);
      return null;
    }
  }

  async getServerLinks(data) {
    try {
      const response = await axios.get(`${this.mainUrl}/ajax/episode/${data}`);
      const $ = cheerio.load(response.data);

      const servers = [];
      $("a.link-item").each((i, element) => {
        const linkId = $(element).attr("data-linkid") || $(element).attr("data-id");
        if (linkId) servers.push(linkId);
      });

      return servers;
    } catch (error) {
      console.error("[Myflixer-extractor] Server links error:", error.message);
      return [];
    }
  }

  async getSourceUrl(linkId) {
    try {
      const response = await axios.get(`${this.mainUrl}/ajax/episode/sources/${linkId}`);
      return response.data.link;
    } catch (error) {
      console.error("[Myflixer-extractor] Source URL error:", error.message);
      return null;
    }
  }

  async extractVideostrM3u8(url) {
    try {
      const headers = {
        "Accept": "*/*",
        "X-Requested-With": "XMLHttpRequest",
        "Referer": this.videostrUrl,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      };

      const id = url.split("/").pop().split("?")[0];
      const embedResponse = await axios.get(url, { headers });
      const embedHtml = embedResponse.data;

      let nonce = embedHtml.match(/\b[a-zA-Z0-9]{48}\b/);
      if (nonce) {
        nonce = nonce[0];
      } else {
        const matches = embedHtml.match(/\b([a-zA-Z0-9]{16})\b.*?\b([a-zA-Z0-9]{16})\b.*?\b([a-zA-Z0-9]{16})\b/);
        if (matches) nonce = matches[1] + matches[2] + matches[3];
      }
      if (!nonce) throw new Error("Could not extract nonce");

      const apiUrl = `${this.videostrUrl}/embed-1/v3/e-1/getSources?id=${id}&_k=${nonce}`;
      const sourcesResponse = await axios.get(apiUrl, { headers });
      const sourcesData = sourcesResponse.data;
      if (!sourcesData.sources) throw new Error("No sources found in response");

      let m3u8Url = sourcesData.sources;

      if (!m3u8Url.includes(".m3u8")) {
        const keyResponse = await axios.get("https://raw.githubusercontent.com/yogesh-hacker/MegacloudKeys/refs/heads/main/keys.json");
        const key = keyResponse.data.vidstr;
        if (!key) throw new Error("Could not get decryption key");

        const decodeUrl = "https://script.google.com/macros/s/AKfycbx-yHTwupis_JD0lNzoOnxYcEYeXmJZrg7JeMxYnEZnLBy5V0--UxEvP-y9txHyy1TX9Q/exec";
        const fullUrl = `${decodeUrl}?encrypted_data=${encodeURIComponent(m3u8Url)}&nonce=${encodeURIComponent(nonce)}&secret=${encodeURIComponent(key)}`;

        const decryptResponse = await axios.get(fullUrl);
        const decryptedData = decryptResponse.data;
        const fileMatch = decryptedData.match(/"file":"(.*?)"/);
        if (fileMatch) m3u8Url = fileMatch[1];
        else throw new Error("Could not extract video URL from decrypted response");
      }

      if (!m3u8Url.includes("megacdn.co")) return null;

      const qualities = await this.parseM3U8Qualities(m3u8Url);

      return {
        m3u8Url,
        qualities,
        headers: {
          "Referer": "https://videostr.net/",
          "Origin": "https://videostr.net/"
        }
      };
    } catch (error) {
      console.error("[Myflixer-extractor] Videostr extraction error:", error.message);
      return null;
    }
  }

  async parseM3U8Qualities(masterUrl) {
    try {
      const response = await axios.get(masterUrl, {
        headers: {
          "Referer": "https://videostr.net/",
          "Origin": "https://videostr.net/"
        }
      });

      const playlist = response.data;
      const qualities = [];
      const lines = playlist.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith("#EXT-X-STREAM-INF:")) {
          const nextLine = lines[i + 1] ? lines[i + 1].trim() : undefined;
          if (nextLine && !nextLine.startsWith("#")) {
            const resolutionMatch = line.match(/RESOLUTION=(\d+x\d+)/);
            const bandwidthMatch = line.match(/BANDWIDTH=(\d+)/);

            const resolution = resolutionMatch ? resolutionMatch[1] : "Unknown";
            const bandwidth = bandwidthMatch ? parseInt(bandwidthMatch[1], 10) : 0;

            let quality = "Unknown";
            if (resolution.includes("1920x1080")) quality = "1080p";
            else if (resolution.includes("1280x720")) quality = "720p";
            else if (resolution.includes("640x360")) quality = "360p";
            else if (resolution.includes("854x480")) quality = "480p";

            qualities.push({
              quality,
              resolution,
              bandwidth,
              url: nextLine.startsWith("http") ? nextLine : new URL(nextLine, masterUrl).href
            });
          }
        }
      }

      qualities.sort((a, b) => b.bandwidth - a.bandwidth);
      return qualities;
    } catch (error) {
      console.error("[Myflixer-extractor] Error parsing M3U8 qualities:", error.message);
      return [];
    }
  }

  async extractM3u8Links(query, episodeNumber = null, seasonNumber = null) {
    try {
      const searchResults = await this.search(query);
      if (searchResults.length === 0) return [];

      let selectedResult = searchResults.find(
        (result) => result.title.toLowerCase() === query.toLowerCase()
      );

      if (!selectedResult) {
        const queryWords = query.toLowerCase().split(" ");
        selectedResult = searchResults.find((result) => {
          const titleLower = result.title.toLowerCase();
          return queryWords.every((word) => titleLower.includes(word));
        });
      }

      if (!selectedResult) selectedResult = searchResults[0];

      const contentDetails = await this.getContentDetails(selectedResult.url);
      if (!contentDetails) return [];

      let dataToProcess = [];

      if (contentDetails.type === "movie") {
        dataToProcess.push(contentDetails.data);
      } else {
        let episodes = contentDetails.episodes;
        if (seasonNumber) episodes = episodes.filter((ep) => ep.season === seasonNumber);
        if (episodeNumber) episodes = episodes.filter((ep) => ep.episode === episodeNumber);
        if (episodes.length === 0) return [];
        dataToProcess.push(episodes[0].data);
      }

      const allM3u8Links = [];
      const allPromises = [];

      for (const data of dataToProcess) {
        const serverLinksPromise = this.getServerLinks(data).then(async (serverLinks) => {
          const linkPromises = serverLinks.map(async (linkId) => {
            try {
              const sourceUrl = await this.getSourceUrl(linkId);
              if (!sourceUrl) return null;

              if (sourceUrl.includes("videostr.net")) {
                const result = await this.extractVideostrM3u8(sourceUrl);
                if (result) {
                  return {
                    source: "videostr",
                    m3u8Url: result.m3u8Url,
                    qualities: result.qualities,
                    headers: result.headers
                  };
                }
              }
              return null;
            } catch (error) {
              return null;
            }
          });
          return Promise.all(linkPromises);
        });
        allPromises.push(serverLinksPromise);
      }

      const results = await Promise.all(allPromises);
      for (const serverResults of results) {
        for (const result of serverResults) {
          if (result) allM3u8Links.push(result);
        }
      }

      return allM3u8Links;
    } catch (error) {
      console.error("[Myflixer-extractor] Extraction error:", error.message);
      return [];
    }
  }
}

async function getTmdbTitle(tmdbId, mediaType) {
  const type = mediaType === "tv" ? "tv" : "movie";
  const url = `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_API_KEY}`;
  const resp = await axios.get(url);
  const data = resp.data;
  return {
    title: type === "tv" ? data.name : data.title,
    year: ((type === "tv" ? data.first_air_date : data.release_date) || "").substring(0, 4)
  };
}

async function getStreams(tmdbId, mediaType = "movie", season = null, episode = null) {
  try {
    if (!axios || !cheerio) return [];

    const { title, year } = await getTmdbTitle(tmdbId, mediaType);
    if (!title) return [];

    const query = mediaType === "tv" ? title : `${title} ${year}`.trim();
    const extractor = new MyFlixerExtractor();
    const links = await extractor.extractM3u8Links(query, episode, season);

    const streams = [];
    for (const link of links) {
      if (!link || !link.m3u8Url) continue;

      if (link.qualities && link.qualities.length > 0) {
        for (const q of link.qualities) {
          streams.push({
            name: "Myflixer-extractor",
            title: formatStreamTitle({
              title,
              year,
              season: mediaType === "tv" ? season : undefined,
              episode: mediaType === "tv" ? episode : undefined,
              url: q.url,
              quality: q.quality
            }),
            url: q.url,
            quality: q.quality.toLowerCase(),
            headers: link.headers,
            provider: "myflixer-extractor"
          });
        }
      } else {
        streams.push({
          name: "Myflixer-extractor",
          title: formatStreamTitle({
            title,
            year,
            season: mediaType === "tv" ? season : undefined,
            episode: mediaType === "tv" ? episode : undefined,
            url: link.m3u8Url,
            quality: "auto"
          }),
          url: link.m3u8Url,
          quality: "auto",
          headers: link.headers,
          provider: "myflixer-extractor"
        });
      }
    }

    return streams;
  } catch (error) {
    console.error("[Myflixer-extractor] Error:", error.message);
    return [];
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
