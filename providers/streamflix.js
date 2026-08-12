// StreamFlix Provider for Nuvio
// Ported from StreamFlix API
const cheerio = require('cheerio-without-node-native');
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

// Constants
const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const STREAMFLIX_API_BASE = "https://api.streamflix.app";
const CONFIG_URL = `${STREAMFLIX_API_BASE}/config/config-streamflixapp.json`;
const DATA_URL = `${STREAMFLIX_API_BASE}/data.json`;
const WEBSOCKET_URL = "wss://chilflix-410be-default-rtdb.asia-southeast1.firebasedatabase.app/.ws?ns=chilflix-410be-default-rtdb&v=5";

// Global cache
let cache = {
  config: null,
  configTimestamp: 0,
  data: null,
  dataTimestamp: 0,
};
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

// Helper function for HTTP requests
function makeRequest(url, options = {}) {
  const defaultHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.5',
    'Connection': 'keep-alive'
  };

  return fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  }).then(response => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response;
  });
}

// Get config data with caching
function getConfig() {
  const now = Date.now();
  if (cache.config && now - cache.configTimestamp < CACHE_TTL) {
    return Promise.resolve(cache.config);
  }

  console.log('[StreamFlix] Fetching config data...');
  return makeRequest(CONFIG_URL)
    .then(response => response.json())
    .then(json => {
      cache.config = json;
      cache.configTimestamp = now;
      console.log('[StreamFlix] Config data cached successfully');
      return json;
    })
    .catch(error => {
      console.error('[StreamFlix] Failed to fetch config:', error.message);
      throw error;
    });
}

// Get data with caching
function getData() {
  const now = Date.now();
  if (cache.data && now - cache.dataTimestamp < CACHE_TTL) {
    return Promise.resolve(cache.data);
  }

  console.log('[StreamFlix] Fetching data...');
  return makeRequest(DATA_URL)
    .then(response => response.json())
    .then(json => {
      cache.data = json;
      cache.dataTimestamp = now;
      console.log('[StreamFlix] Data cached successfully');
      return json;
    })
    .catch(error => {
      console.error('[StreamFlix] Failed to fetch data:', error.message);
      throw error;
    });
}

// Search for content by title
function searchContent(title, year, mediaType) {
  console.log(`[StreamFlix] Searching for: "${title}" (${year})`);
  
  return getData()
    .then(data => {
      if (!data || !data.data) {
        throw new Error('Invalid data structure received');
      }

      const searchQuery = title.toLowerCase();
      const results = data.data.filter(item => {
        if (!item.moviename) return false;
        
        const itemTitle = item.moviename.toLowerCase();
        const titleWords = searchQuery.split(/\s+/);
        
        // Check if all words from search query are present in the item title
        return titleWords.every(word => itemTitle.includes(word));
      });

      console.log(`[StreamFlix] Found ${results.length} search results`);
      return results;
    });
}

// Find best match from search results
function findBestMatch(targetTitle, results) {
  if (!results || results.length === 0) {
    return null;
  }

  let bestMatch = null;
  let bestScore = 0;

  for (const result of results) {
    const score = calculateSimilarity(
      targetTitle.toLowerCase(),
      result.moviename.toLowerCase()
    );
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = result;
    }
  }

  console.log(`[StreamFlix] Best match: "${bestMatch?.moviename}" (score: ${bestScore.toFixed(2)})`);
  return bestMatch;
}

// Calculate string similarity
function calculateSimilarity(str1, str2) {
  const words1 = str1.split(/\s+/);
  const words2 = str2.split(/\s+/);
  
  let matches = 0;
  for (const word of words1) {
    if (word.length > 2 && words2.some(w => w.includes(word) || word.includes(w))) {
      matches++;
    }
  }
  
  return matches / Math.max(words1.length, words2.length);
}

// WebSocket-based episode fetching (real implementation per series.py/api.js)
function getEpisodesFromWebSocket(movieKey, totalSeasons = 1) {
  return new Promise((resolve, reject) => {
    let WSImpl = null;
    try {
      WSImpl = typeof WebSocket !== 'undefined' ? WebSocket : require('ws');
    } catch (e) {
      WSImpl = null;
    }

    if (!WSImpl) {
      return reject(new Error('WebSocket implementation not available'));
    }

    const ws = new WSImpl(
      'wss://chilflix-410be-default-rtdb.asia-southeast1.firebasedatabase.app/.ws?ns=chilflix-410be-default-rtdb&v=5'
    );

    const seasonsData = {};
    let currentSeason = 1;
    let completedSeasons = 0;
    let messageBuffer = '';
    let expectedResponses = 0;
    let responsesReceived = 0;

    const overallTimeout = setTimeout(() => {
      try { ws.close(); } catch {}
      reject(new Error('WebSocket timeout'));
    }, 30000);

    function sendSeasonRequest(season) {
      const payload = {
        t: 'd',
        d: { a: 'q', r: season, b: { p: `Data/${movieKey}/seasons/${season}/episodes`, h: '' } }
      };
      try {
        ws.send(JSON.stringify(payload));
      } catch (e) {
        // Ignore send errors; will be picked up by 'error' event
      }
    }

    ws.onopen = function () {
      sendSeasonRequest(currentSeason);
    };

    ws.onmessage = function (evt) {
      try {
        const message = (typeof evt.data === 'string') ? evt.data : evt.data.toString();

        // numeric count of expected messages sometimes sent
        if (/^\d+$/.test(message.trim())) {
          expectedResponses = parseInt(message.trim(), 10);
          responsesReceived = 0;
          return;
        }

        messageBuffer += message;

        try {
          const data = JSON.parse(messageBuffer);
          messageBuffer = '';

          if (data.t === 'c') {
            return; // handshake complete
          }

          if (data.t === 'd') {
            const d_data = data.d || {};
            const b_data = d_data.b || {};

            // completion for current season
            if (d_data.r === currentSeason && b_data.s === 'ok') {
              completedSeasons++;
              if (completedSeasons < totalSeasons) {
                currentSeason++;
                expectedResponses = 0;
                responsesReceived = 0;
                sendSeasonRequest(currentSeason);
              } else {
                clearTimeout(overallTimeout);
                try { ws.close(); } catch {}
                resolve(seasonsData);
              }
              return;
            }

            // episode data
            if (b_data.d) {
              const episodes = b_data.d;
              const seasonEpisodes = seasonsData[currentSeason] || {};
              for (const [epKey, epData] of Object.entries(episodes)) {
                if (epData && typeof epData === 'object') {
                  seasonEpisodes[parseInt(epKey, 10)] = {
                    key: epData.key,
                    link: epData.link,
                    name: epData.name,
                    overview: epData.overview,
                    runtime: epData.runtime,
                    still_path: epData.still_path,
                    vote_average: epData.vote_average
                  };
                  responsesReceived++;
                }
              }
              seasonsData[currentSeason] = seasonEpisodes;

              // If we know how many to expect and we reached/exceeded it, do nothing here.
              // The season completion is signaled by b.s === 'ok' above which we handle to advance.
            }
          }
        } catch (e) {
          // Incomplete JSON in buffer, wait for more
          if (messageBuffer.length > 100000) {
            messageBuffer = '';
          }
        }
      } catch (err) {
        // ignore parse errors; will continue buffering
      }
    };

    ws.onerror = function (err) {
      clearTimeout(overallTimeout);
      reject(new Error('WebSocket error'));
    };

    ws.onclose = function () {
      clearTimeout(overallTimeout);
    };
  });
}

// Main function that Nuvio will call
function getStreams(tmdbId, mediaType = 'movie', seasonNum = null, episodeNum = null) {
  console.log(`[StreamFlix] Fetching streams for TMDB ID: ${tmdbId}, Type: ${mediaType}`);
  
  if (seasonNum !== null) {
    console.log(`[StreamFlix] Season: ${seasonNum}, Episode: ${episodeNum}`);
  }

  // Get TMDB info first
  const tmdbUrl = `https://api.themoviedb.org/3/${mediaType === 'tv' ? 'tv' : 'movie'}/${tmdbId}?api_key=${TMDB_API_KEY}`;
  
  return makeRequest(tmdbUrl)
    .then(response => response.json())
    .then(tmdbData => {
      const title = mediaType === 'tv' ? tmdbData.name : tmdbData.title;
      const year = mediaType === 'tv' 
        ? tmdbData.first_air_date?.substring(0, 4) 
        : tmdbData.release_date?.substring(0, 4);

      if (!title) {
        throw new Error('Could not extract title from TMDB response');
      }

      console.log(`[StreamFlix] TMDB Info: "${title}" (${year})`);

      // Search for content
      return searchContent(title, year, mediaType)
        .then(searchResults => {
          if (searchResults.length === 0) {
            console.log('[StreamFlix] No search results found');
            return [];
          }

          const selectedResult = findBestMatch(title, searchResults);
          if (!selectedResult) {
            console.log('[StreamFlix] No suitable match found');
            return [];
          }

          // Get config for stream URLs
          return getConfig()
            .then(config => {
              if (mediaType === 'movie') {
                // Process movie streams
                return processMovieStreams(selectedResult, config, year);
              } else {
                // Process TV show streams
                return processTVStreams(selectedResult, config, seasonNum, episodeNum, year);
              }
            });
        });
    })
    .catch(error => {
      console.error(`[StreamFlix] Error in getStreams: ${error.message}`);
      return [];
    });
}

// Process movie streams
function processMovieStreams(movieData, config, year) {
  console.log(`[StreamFlix] Processing movie streams for: ${movieData.moviename}`);

  const streams = [];

  // Premium streams (higher quality)
  if (config.premium && movieData.movielink) {
    config.premium.forEach((baseUrl, index) => {
      const streamUrl = `${baseUrl}${movieData.movielink}`;
      streams.push({
        name: "StreamFlix",
        title: formatStreamTitle({
          title: movieData.moviename,
          year,
          rawText: `Premium Quality ${movieData.movieduration || ''}`,
          quality: '1080p',
          url: streamUrl
        }),
        url: streamUrl,
        quality: "1080p",
        size: movieData.movieduration || "Unknown",
        type: 'direct',
        headers: {
          'Referer': 'https://api.streamflix.app',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
    });
  }

  // Regular movie streams
  if (config.movies && movieData.movielink) {
    config.movies.forEach((baseUrl, index) => {
      const streamUrl = `${baseUrl}${movieData.movielink}`;
      streams.push({
        name: "StreamFlix",
        title: formatStreamTitle({
          title: movieData.moviename,
          year,
          rawText: `Standard Quality ${movieData.movieduration || ''}`,
          quality: '720p',
          url: streamUrl
        }),
        url: streamUrl,
        quality: "720p",
        size: movieData.movieduration || "Unknown",
        type: 'direct',
        headers: {
          'Referer': 'https://api.streamflix.app',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
    });
  }

  console.log(`[StreamFlix] Generated ${streams.length} movie streams`);
  return streams;
}

// Process TV show streams
function processTVStreams(tvData, config, seasonNum, episodeNum, year) {
  console.log(`[StreamFlix] Processing TV streams for: ${tvData.moviename}`);
  
  // Extract total seasons from duration field
  const seasonMatch = tvData.movieduration?.match(/(\d+)\s+Season/);
  const totalSeasons = seasonMatch ? parseInt(seasonMatch[1]) : 1;
  
  return getEpisodesFromWebSocket(tvData.moviekey, totalSeasons)
    .then(seasonsData => {
      const streams = [];
      
      // If specific episode requested
      if (seasonNum !== null && episodeNum !== null) {
        const seasonData = seasonsData[seasonNum];
        if (seasonData) {
          const episodeData = seasonData[episodeNum - 1];
          if (episodeData && config.premium) {
            config.premium.forEach(baseUrl => {
              const streamUrl = `${baseUrl}${episodeData.link}`;
              streams.push({
                name: "StreamFlix",
                title: formatStreamTitle({
                  title: episodeData.name ? `${tvData.moviename}: ${episodeData.name}` : tvData.moviename,
                  year,
                  season: seasonNum,
                  episode: episodeNum,
                  rawText: episodeData.runtime ? `${episodeData.runtime}min` : '',
                  quality: '1080p',
                  url: streamUrl
                }),
                url: streamUrl,
                quality: "1080p",
                size: episodeData.runtime ? `${episodeData.runtime}min` : "Unknown",
                type: 'direct',
                headers: {
                  'Referer': 'https://api.streamflix.app',
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
              });
            });
          }
        }
      } else {
        // Return all episodes for all seasons
        for (const [season, episodes] of Object.entries(seasonsData)) {
          for (const [epIndex, episodeData] of Object.entries(episodes)) {
            if (config.premium && episodeData.link) {
              const epNum = parseInt(epIndex) + 1;
              config.premium.forEach(baseUrl => {
                const streamUrl = `${baseUrl}${episodeData.link}`;
                streams.push({
                  name: "StreamFlix",
                  title: formatStreamTitle({
                    title: episodeData.name ? `${tvData.moviename}: ${episodeData.name}` : tvData.moviename,
                    year,
                    season: parseInt(season, 10),
                    episode: epNum,
                    rawText: episodeData.runtime ? `${episodeData.runtime}min` : '',
                    quality: '1080p',
                    url: streamUrl
                  }),
                  url: streamUrl,
                  quality: "1080p",
                  size: episodeData.runtime ? `${episodeData.runtime}min` : "Unknown",
                  type: 'direct',
                  headers: {
                    'Referer': 'https://api.streamflix.app',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                  }
                });
              });
            }
          }
        }
      }
      
      // Fallback if no episodes found
      if (streams.length === 0 && config.premium && seasonNum !== null && episodeNum !== null) {
        const fallbackUrl = `${config.premium[0]}tv/${tvData.moviekey}/s${seasonNum}/episode${episodeNum}.mkv`;
        streams.push({
          name: "StreamFlix",
          title: formatStreamTitle({
            title: tvData.moviename,
            year,
            season: seasonNum,
            episode: episodeNum,
            rawText: 'Fallback',
            quality: '720p',
            url: fallbackUrl
          }),
          url: fallbackUrl,
          quality: "720p",
          size: "Unknown",
          type: 'direct',
          headers: {
            'Referer': 'https://api.streamflix.app',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
      }

      console.log(`[StreamFlix] Generated ${streams.length} TV streams`);
      return streams;
    })
    .catch(error => {
      console.error('[StreamFlix] WebSocket failed, using fallback:', error.message);
      
      // Generate fallback stream
      if (config.premium && seasonNum !== null && episodeNum !== null) {
        const fallbackUrl = `${config.premium[0]}tv/${tvData.moviekey}/s${seasonNum}/episode${episodeNum}.mkv`;
        return [{
          name: "StreamFlix",
          title: formatStreamTitle({
            title: tvData.moviename,
            year,
            season: seasonNum,
            episode: episodeNum,
            rawText: 'Fallback',
            quality: '720p',
            url: fallbackUrl
          }),
          url: fallbackUrl,
          quality: "720p",
          size: "Unknown",
          type: 'direct',
          headers: {
            'Referer': 'https://api.streamflix.app',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }];
      }
      
      return [];
    });
}

// Export for React Native
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
