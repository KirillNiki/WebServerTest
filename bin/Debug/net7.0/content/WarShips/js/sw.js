
const CACHE_NAME = 'resorses-to-cache';
const resorsesToCache = [
    '/',
    '/index.html',
    '/style.css',

    '/js/botLigic.js',
    '/js/botMatrixInit.js',
    '/js/onStart.js',
    '/js/play.js',
    '/js/swRegister.js',
    '/js/installPWA.js',

    '/sprites/fourBlockShip.png',
    '/sprites/got.png',
    '/sprites/missed.png',
    '/sprites/oneBlockShip.png',
    '/sprites/threeBlockShip.png',
    '/sprites/twoBlockShip.png',
    '/sprites/rotate.png',

    '/icons/logo-192.png',
    '/icons/logo-512.png',
    '/icons/logo.svg',
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
