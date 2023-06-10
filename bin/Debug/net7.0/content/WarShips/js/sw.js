
const CACHE_NAME = 'resorses-to-cache';
const resorsesToCache = [
    '/../',
    '/../index.html',
    '/../style.css',
    '/botLigic.js',
    '/botMatrixInit.js',
    '/onStart.js',
    '/play.js',
    '/swRegister.js',

    '/../sprites/fourBlockShip.png',
    '/../sprites/got.png',
    '/../sprites/missed.png',
    '/../sprites/oneBlockShip.png',
    '/../sprites/threeBlockShip.png',
    '/../sprites/twoBlockShip.png',
];


self.addEventListener('install', installEvent => {
    installEvent.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            cache.addAll(resorsesToCache)
        })
    );
});


self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(function (response) {
            if (response) return response;

            return fetch(event.request);
        })
    );
});
