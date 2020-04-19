var cacheName = 'photopea';
var appShellFiles = [
  '/photopea/',
  '/photopea/index.html',
  '/photopea/apis.google.com/js/client.js',
  '/photopea/apis.google.com/_/scs/apps-static/_/js/k=oz.gapi.zh_CN.1Wfq53RQ8rM.O/m=client/rt=j/sv=1/d=1/ed=1/am=wQE/rs=AGLTcCMhBLxw66y4YbPcznNrhk25fTKiFQ/cb=gapi.loaded_0',
  '/photopea/code/DBS.js',
  '/photopea/code/pp.js',
  '/photopea/code/external/ext.js',
  '/photopea/code/external/fribidi.wasm',
  '/photopea/code/external/hb.wasm',
  '/photopea/fonts.googleapis.com/css',
  '/photopea/fonts.gstatic.com/s/opensans/v17/mem5YaGs126MiZpBA-UN7rgOUuhp.woff2',
  '/photopea/fonts.gstatic.com/s/opensans/v17/mem8YaGs126MiZpBA-UFVZ0b.woff2',
  '/photopea/img/cta.png',
  '/photopea/promo/icon512.png',
  '/photopea/promo/maskable512.png',
  '/photopea/promo/thumb256.png',
  '/photopea/promo/screens/scr5.png',
  '/photopea/rsrc/basic/basic.zip',
  '/photopea/rsrc/fonts/fonts.png',
  '/photopea/rsrc/fonts/ex/DroidSansFallback.ttf',
  '/photopea/rsrc/fonts/ex/tib/NotoSansTibetan-Regular.ttf',
  '/photopea/rsrc/fonts/fs/!PaulMaul.otf',
  '/photopea/rsrc/fonts/fs/1942report.otf',
  '/photopea/rsrc/fonts/fs/20db.otf',
  '/photopea/rsrc/fonts/fs/2Dumb.otf',
  '/photopea/rsrc/fonts/fs/3dumb.otf',
  '/photopea/rsrc/fonts/fs/AaarghNormal.otf',
  '/photopea/rsrc/fonts/fs/Aan55.otf',
  '/photopea/rsrc/fonts/fs/ABeeZee-Regular.otf',
  '/photopea/rsrc/fonts/fs/Abel-Regular.otf',
  '/photopea/rsrc/fonts/fs/AbhayaLibre-Regular.otf',
  '/photopea/rsrc/fonts/fs/AbrilFatface-Regular.otf',
  '/photopea/rsrc/fonts/fs/Acknowledgement.otf',
  '/photopea/rsrc/fonts/fs/Acme-Regular.otf',
  '/photopea/rsrc/fonts/fs/Amita-Bold.otf',
  '/photopea/rsrc/fonts/fs/ArbutusSlab-Regular.otf',
  '/photopea/rsrc/fonts/fs/Comme-Heavy.otf',
  '/photopea/rsrc/fonts/fs/Cousine-Bold.otf',
  '/photopea/rsrc/fonts/fs/CreteRound-Regular.otf',
  '/photopea/rsrc/fonts/fs/DejaVuSans.otf',
  '/photopea/rsrc/fonts/fs/FiraSansCondensed-ExtraboldItalic.otf',
  '/photopea/rsrc/fonts/fs/GentiumBookBasic-Bold.otf',
  '/photopea/rsrc/fonts/fs/Grenze-ExtraBoldItalic.otf',
  '/photopea/rsrc/fonts/fs/Grenze-ThinItalic.otf',
  '/photopea/rsrc/fonts/fs/HVDPeace.otf',
  '/photopea/rsrc/fonts/fs/IBMPlexMono-ExtraLight.otf',
  '/photopea/rsrc/fonts/fs/Inter-SemiBoldItalic.otf',
  '/photopea/rsrc/fonts/fs/Junicode-RegularCondensed.otf',
  '/photopea/rsrc/fonts/fs/LiterataBook-Medium.otf',
  '/photopea/rsrc/fonts/fs/LucienSchoenschriftvCAT.otf',
  '/photopea/rsrc/fonts/fs/Manuale-SemiBold.otf',
  '/photopea/rsrc/fonts/fs/Montserrat-ExtraLight.otf',
  '/photopea/rsrc/fonts/fs/mplus-1c-regular.otf',
  '/photopea/rsrc/fonts/fs/mplus-1m-regular.otf',
  '/photopea/rsrc/fonts/fs/Mukta-Bold.otf',
  '/photopea/rsrc/fonts/fs/NotoMono.otf',
  '/photopea/rsrc/fonts/fs/NotoSans-CondensedBlackItalic.otf',
  '/photopea/rsrc/fonts/fs/NotoSans-SemiBoldItalic.otf',
  '/photopea/rsrc/fonts/fs/NotoSans-SemiCondensedThinItalic.otf',
  '/photopea/rsrc/fonts/fs/NotoSerif-MediumItalic.otf',
  '/photopea/rsrc/fonts/fs/okolaksBold.otf',
  '/photopea/rsrc/fonts/fs/OstrichSans-Heavy.otf',
  '/photopea/rsrc/fonts/fs/Panefresco500wt-Italic.otf',
  '/photopea/rsrc/fonts/fs/Poppins-Bold.otf',
  '/photopea/rsrc/fonts/fs/Reswysokr.otf',
  '/photopea/rsrc/fonts/fs/Rokkitt-Thin.otf',
  '/photopea/rsrc/fonts/fs/SairaSemiCondensed-Light.otf',
  '/photopea/rsrc/fonts/fs/SawarabiGothic-Medium.otf',
  '/photopea/rsrc/fonts/fs/Selawik-Semibold.otf',
  '/photopea/rsrc/fonts/fs/SinkinSans-600SemiBoldItalic.otf',
  '/photopea/rsrc/fonts/fs/SourceCodePro-Regular.otf',
  '/photopea/rsrc/fonts/fs/SourceSansPro-BoldIt.otf',
  '/photopea/rsrc/fonts/fs/SourceSansPro-Regular.otf',
  '/photopea/rsrc/fonts/fs/SpaceMono-Regular.otf',
  '/photopea/rsrc/fonts/fs/Ubuntu-Bold.otf',
  '/photopea/rsrc/fonts/fs/Wellfleet-Regular.otf',
  '/photopea/rsrc/fonts/gf/Aclonica-Regular.otf',
  '/photopea/rsrc/fonts/gf/Actor-Regular.otf',
  '/photopea/rsrc/fonts/gf/Aleo-Regular.otf',
  '/photopea/rsrc/fonts/gf/BungeeShade-Regular.otf',
  '/photopea/style/all.css',
];

// Installing Service Worker
self.addEventListener('install', function(e) {
  console.log('[Service Worker] Install');
  e.waitUntil(
    caches.open(cacheName).then(function(cache) {
      console.log('[Service Worker] Caching all: app shell and content');
      return cache.addAll(appShellFiles);
    })
  );
});

// Fetching content using Service Worker
self.addEventListener('fetch', function(e) {
  e.respondWith(
    caches.match(e.request).then(function(r) {
      console.log('[Service Worker] Fetching resource: '+e.request.url);
      return r || fetch(e.request).then(function(response) {
        return caches.open(cacheName).then(function(cache) {
          console.log('[Service Worker] Caching new resource: '+e.request.url);
          cache.put(e.request, response.clone());
          return response;
        });
      });
    })
  );
});