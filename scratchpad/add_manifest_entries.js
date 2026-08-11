const fs = require('fs');
const path = require('path');

const manifestPath = path.join('D:', 'nuvio-plugin', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

const AUTHOR = 'CENSORED';
const PLACEHOLDER_LOGO = 'https://i.imgur.com/9bGkGMi.png';

const entries = [
  { id: 'OneShows', name: '1Shows', description: '1Shows movie & series streaming site', filename: 'providers/1shows.js', supportedTypes: ['movie','tv'], formats: ['mkv','mp4','m3u8'], logo: 'https://i.postimg.cc/9fDVBvn5/1shows.png', contentLanguage: ['en','hi'] },
  { id: 'Adimoviebox', name: 'Adimoviebox', description: 'Adimoviebox MovieBox mirror movie & series streaming site', filename: 'providers/adimoviebox.js', supportedTypes: ['movie','tv'], formats: ['mp4','m3u8'], logo: PLACEHOLDER_LOGO, contentLanguage: ['en'] },
  { id: 'AllMovieLand', name: 'AllMovieLand', description: 'AllMovieLand multi-language movie & series streaming site', filename: 'providers/allmovieland.js', supportedTypes: ['movie','tv'], formats: ['m3u8'], logo: 'https://i.postimg.cc/hhWqkVQs/allmovieland.png', contentLanguage: ['en','hi','ta','te'] },
  { id: 'BollyFlix', name: 'BollyFlix', description: 'BollyFlix Hindi/Bollywood/South Indian movie & series site', filename: 'providers/bollyflix.js', supportedTypes: ['movie','tv','anime'], formats: ['mkv','mp4'], logo: 'https://ruayamo.s-ul.eu/a5T2socz', contentLanguage: ['en','hi','ta','te','pa','ml'] },
  { id: 'CTGMovies', name: 'CTGMovies', description: 'CTGMovies multi-language movie & series streaming site', filename: 'providers/ctgmovies.js', supportedTypes: ['movie','tv'], formats: ['m3u8','mp4','mkv'], logo: 'https://i.postimg.cc/jSQmk9B3/ctgmovies.png', contentLanguage: ['en','hi'] },
  { id: 'Castle', name: 'Castle', description: 'Castle TMDB-id-based movie & TV streaming site', filename: 'providers/castle.js', supportedTypes: ['movie','tv'], formats: ['mp4','m3u8'], logo: 'https://i.postimg.cc/0NvGzFyK/castle.png', contentLanguage: ['en'] },
  { id: 'CineFreak', name: 'CineFreak', description: 'CineFreak Hindi/English movie & series streaming site', filename: 'providers/cinefreak.js', supportedTypes: ['movie','tv'], formats: ['mkv','mp4'], logo: 'https://i.postimg.cc/rpDB2284/cinefreak.png', contentLanguage: ['en','hi'] },
  { id: 'CineMM', name: 'CineMM', description: 'CineMM movie & series streaming site', filename: 'providers/cinemm.js', supportedTypes: ['movie','tv'], formats: ['mp4','mkv'], logo: 'https://www.google.com/s2/favicons?domain=cinemm.com&sz=256', contentLanguage: ['en'] },
  { id: 'CinemaCity', name: 'CinemaCity', description: 'CinemaCity multi-language movie & series streaming site', filename: 'providers/cinemacity.js', supportedTypes: ['movie','tv'], formats: ['mp4','m3u8'], logo: 'https://i.postimg.cc/XYjKhS3b/cinemacity.png', contentLanguage: ['en','hi','ar'] },
  { id: 'Cinevibe', name: 'Cinevibe', description: 'Cinevibe TMDB-id-based movie & TV streaming site', filename: 'providers/cinevibe.js', supportedTypes: ['movie','tv'], formats: ['mp4','m3u8'], logo: PLACEHOLDER_LOGO, contentLanguage: ['en'] },
  { id: 'DahmerMovies', name: 'Dahmermovies', description: 'DahmerMovies movie & series streaming site', filename: 'providers/dahmermovies.js', supportedTypes: ['movie','tv'], formats: ['mp4','mkv','m3u8'], logo: 'https://i.postimg.cc/hGt3dV6Z/dhamermovies.png', contentLanguage: ['en'] },
  { id: 'DahmermoviesTV', name: 'Dahmermovies-TV', description: 'DahmerMovies alternate 4K/Android-TV endpoint', filename: 'providers/dahmermovies-tv.js', supportedTypes: ['movie','tv'], formats: ['mp4','mkv','m3u8'], logo: 'https://i.postimg.cc/hGt3dV6Z/dhamermovies.png', contentLanguage: ['en'] },
  { id: 'DesiFlix', name: 'DesiFlix', description: 'DesiFlix Hindi/English movie & series streaming site', filename: 'providers/desiflix.js', supportedTypes: ['movie','tv'], formats: ['mp4','mkv','m3u8'], logo: 'https://i.postimg.cc/Vvs4fmwM/desiflix.png', contentLanguage: ['en','hi'] },
  { id: 'DooFlix', name: 'DooFlix', description: 'DooFlix multi-language movie & series streaming site', filename: 'providers/dooflix.js', supportedTypes: ['movie','tv'], formats: ['mp4','m3u8'], logo: 'https://i.postimg.cc/59H1DmRk/dooflix.png', contentLanguage: ['en','es'] },
  { id: 'Einthustan', name: 'Einthustan', description: 'Einthustan Hindi/Tamil/Telugu regional movie streaming site', filename: 'providers/einthustan.js', supportedTypes: ['movie','tv'], formats: ['mp4','m3u8'], logo: 'https://i.postimg.cc/QCFYLyRR/einthusan.png', contentLanguage: ['hi','ta','te'] },
  { id: 'Embed69', name: 'Embed69', description: 'Embed69 Spanish/English movie & series streaming site', filename: 'providers/embed69.js', supportedTypes: ['movie','tv'], formats: ['mp4','m3u8'], logo: 'https://i.postimg.cc/SK9YMsHG/embed69.png', contentLanguage: ['en','es'] },
  { id: 'FaselHD', name: 'FaselHD', description: 'FaselHD Arabic/English movie & series streaming site', filename: 'providers/faselhd.js', supportedTypes: ['movie','tv'], formats: ['m3u8'], logo: 'https://raw.githubusercontent.com/nvmindl/nuvio-providers/main/Assets/faselhdx.png', contentLanguage: ['ar','en'] },
  { id: 'GramCinema', name: 'GramCinema', description: 'GramCinema multi-language movie & series streaming site', filename: 'providers/gramcinema.js', supportedTypes: ['movie','tv'], formats: ['mp4','m3u8'], logo: 'https://i.postimg.cc/WbNPW7Jv/gramcinema.png', contentLanguage: ['en','hi','ta','ru'] },
  { id: 'HDFilme', name: 'HDFilme', description: 'HDFilme German movie & series streaming site', filename: 'providers/hdfilme.js', supportedTypes: ['movie','tv'], formats: ['m3u8'], logo: 'https://hdfilme.win/templates/hdfilme/images/logo-hdfilme.svg', contentLanguage: ['de'] },
  { id: 'HDGharTV', name: 'HDGharTV', description: 'HDGharTV Hindi/English movie & series streaming site', filename: 'providers/hdghartv.js', supportedTypes: ['movie','tv'], formats: ['m3u8'], logo: 'https://i.postimg.cc/761WVpJS/hdghartv.png', contentLanguage: ['en','hi'] },
  { id: 'HindMovie', name: 'HindMovie', description: 'HindMovie Hindi movie & series site via HubCloud mirror chain', filename: 'providers/hindmovie.js', supportedTypes: ['movie','tv'], formats: ['mp4','mkv','m3u8'], logo: 'https://hindmovie.icu/wp-content/themes/generate-pro/images/favicon.ico', contentLanguage: ['hi','en'] },
  { id: 'Mapple', name: 'Mapple', description: 'Mapple movie & series streaming site', filename: 'providers/mapple.js', supportedTypes: ['movie','tv'], formats: ['mp4','m3u8'], logo: PLACEHOLDER_LOGO, contentLanguage: ['en'] },
  { id: 'MoonFlix', name: 'MoonFlix', description: 'MoonFlix Hindi/English movie & series streaming site', filename: 'providers/moonflix.js', supportedTypes: ['movie','tv'], formats: ['mp4','mkv'], logo: 'https://i.postimg.cc/90dVRJJq/moonflix.png', contentLanguage: ['en','hi'] },
  { id: 'MovieBlast', name: 'MovieBlast', description: 'MovieBlast multi-language movie & series streaming site', filename: 'providers/movieblast.js', supportedTypes: ['movie','tv'], formats: ['mp4','mkv','m3u8'], logo: 'https://i.postimg.cc/qqkLSyhN/movieblast.png', contentLanguage: ['en','hi','ta','te'] },
  { id: 'MovieBox', name: 'MovieBox', description: 'MovieBox multi-language movie & series streaming site', filename: 'providers/moviebox.js', supportedTypes: ['movie','tv'], formats: ['mp4','m3u8'], logo: 'https://i.postimg.cc/TPwkfqHh/moviebox.png', contentLanguage: ['en','hi','ta','te'] },
  { id: 'Movies4u', name: 'Movies4u', description: 'Movies4u Hindi/English/Tamil movie streaming site', filename: 'providers/movies4u.js', supportedTypes: ['movie'], formats: ['mp4','m3u8'], logo: 'https://i.postimg.cc/J0QG1QhQ/movies4u.jpg', contentLanguage: ['en','hi','ta'] },
  { id: 'MoviesHunt', name: 'MoviesHunt', description: 'MoviesHunt Hindi/English/Tamil/Telugu movie & series site', filename: 'providers/movieshunt.js', supportedTypes: ['movie','tv'], formats: ['mkv','mp4'], logo: 'https://www.google.com/s2/favicons?domain=movieshunt.team&sz=256', contentLanguage: ['en','hi','ta','te'] },
  { id: 'Movix', name: 'Movix', description: 'Movix French/English movie & series streaming site', filename: 'providers/movix.js', supportedTypes: ['movie','tv'], formats: ['mp4','m3u8'], logo: 'https://i.postimg.cc/XYrPQm87/movix.png', contentLanguage: ['en','fr'] },
  { id: 'MyflixerExtractor', name: 'Myflixer-extractor', description: 'Myflixer (watch32.sx / videostr.net) TMDB-based extractor', filename: 'providers/myflixer-extractor.js', supportedTypes: ['movie','tv'], formats: ['m3u8'], logo: PLACEHOLDER_LOGO, contentLanguage: ['en'] },
  { id: 'NetMirror', name: 'NetMirror', description: 'NetMirror multi-language movie & series streaming site', filename: 'providers/netmirror.js', supportedTypes: ['movie','tv'], formats: ['mp4','m3u8','mkv'], logo: 'https://i.postimg.cc/L64M3bYV/netmirror.png', contentLanguage: ['en','hi','ta','te'] },
  { id: 'PlayIMDb', name: 'PlayIMDb', description: 'PlayIMDb TMDB-id-based movie & TV streaming site', filename: 'providers/playimdb.js', supportedTypes: ['movie','tv'], formats: ['mp4','mkv','m3u8'], logo: 'https://i.postimg.cc/KzjPtYWY/imdb.png', contentLanguage: ['en','hi'] },
  { id: 'ShowBox', name: 'ShowBox', description: 'ShowBox/FebBox movie & series streaming site with cookie-token settings', filename: 'providers/showbox.js', supportedTypes: ['movie','tv'], formats: ['mp4','mkv','m3u8'], logo: 'https://i.postimg.cc/8c5XGzsx/showbox.png', contentLanguage: ['en'] },
  { id: 'StreamFlix', name: 'StreamFlix', description: 'StreamFlix movie & series streaming site', filename: 'providers/streamflix.js', supportedTypes: ['movie','tv'], formats: ['mp4','m3u8'], logo: PLACEHOLDER_LOGO, contentLanguage: ['en'] },
  { id: 'VidEasy', name: 'VidEasy', description: 'VidEasy TMDB-id-based movie & TV streaming site, multi-language', filename: 'providers/videasy.js', supportedTypes: ['movie','tv'], formats: ['mp4','m3u8'], logo: 'https://i.postimg.cc/7LHYMtVV/videasy.png', contentLanguage: ['en','de','it','fr','es','pt'] },
  { id: 'VidFast', name: 'VidFast', description: 'VidFast TMDB-id-based movie & TV streaming site', filename: 'providers/vidfast.js', supportedTypes: ['movie','tv'], formats: ['mp4','m3u8'], logo: 'https://i.postimg.cc/0Qp8PSx5/vidfast.png', contentLanguage: ['en'] },
  { id: 'VidLove', name: 'VidLove', description: 'VidLove TMDB-id-based movie & TV streaming site', filename: 'providers/vidlove.js', supportedTypes: ['movie','tv'], formats: ['mp4','m3u8','mkv'], logo: 'https://i.postimg.cc/ZRjQytBY/vidlove.png', contentLanguage: ['en'] },
  { id: 'VidSrc', name: 'VidSrc', description: 'VidSrc TMDB-id-based movie & TV streaming site', filename: 'providers/vidsrc.js', supportedTypes: ['movie','tv'], formats: ['mp4','m3u8'], logo: 'https://i.postimg.cc/ncMLBsLJ/vidsrc.png', contentLanguage: ['en'] },
  { id: 'Vidlink', name: 'VidLink', description: 'VidLink TMDB-id-based movie & TV streaming site', filename: 'providers/vidlink.js', supportedTypes: ['movie','tv'], formats: ['mp4','m3u8'], logo: 'https://i.postimg.cc/RZRHQd75/vidlink.png', contentLanguage: ['en'] },
  { id: 'Vidnest', name: 'Vidnest', description: 'Vidnest movie & series streaming site', filename: 'providers/vidnest.js', supportedTypes: ['movie','tv'], formats: ['mp4','m3u8'], logo: PLACEHOLDER_LOGO, contentLanguage: ['en'] },
  { id: 'Watch32', name: 'Watch32', description: 'Watch32 movie & series streaming site', filename: 'providers/watch32.js', supportedTypes: ['movie','tv'], formats: ['mp4','m3u8'], logo: PLACEHOLDER_LOGO, contentLanguage: ['en'] },
  { id: 'Xprime', name: 'Xprime', description: 'Xprime movie & series streaming site', filename: 'providers/xprime.js', supportedTypes: ['movie','tv'], formats: ['mp4','m3u8'], logo: PLACEHOLDER_LOGO, contentLanguage: ['en'] },
  { id: 'Yflix', name: 'Yflix', description: 'Yflix movie & series streaming site', filename: 'providers/yflix.js', supportedTypes: ['movie','tv'], formats: ['mp4','m3u8'], logo: PLACEHOLDER_LOGO, contentLanguage: ['en'] },
];

const finalEntries = entries.map(e => ({
  id: e.id,
  name: e.name,
  description: e.description,
  version: '1.0.0',
  author: AUTHOR,
  supportedTypes: e.supportedTypes,
  filename: e.filename,
  enabled: true,
  formats: e.formats,
  logo: e.logo,
  contentLanguage: e.contentLanguage
}));

console.log('Entries to add:', finalEntries.length);

manifest.scrapers = manifest.scrapers.concat(finalEntries);

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
console.log('Total scrapers now:', manifest.scrapers.length);
