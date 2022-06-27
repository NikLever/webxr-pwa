self.addEventListener("install", e => {
    console.log("Install!");
    e.waitUntil(
        caches.open('static').then( cache => {
            return cache.addAll([
                './',
                './css/styles.css',
                './images/logo192.png',
                './js/index.js',
                './js/fas.js',
                './js/Game.js',
                './js/LoadingBar.js',
                './js/VRButton.js',
                './threejs/build/three.module.js',
                './threejs/examples/jsm/libs/motion-controllers.module.js',
                './threejs/examples/jsm/loaders/GLTFLoader.js',
                './threejs/examples/jsm/loaders/RGBELoader.js',
                './threejs/examples/jsm/webxr/XRControllerModelFactory.js',
                './images/factory.hdr',
                './assets/factory.glb'
            ])
        })
    );
});

self.addEventListener("fetch", e => {
    //console.log(`Intercepting fetch ${e.request.url}`);
    e.respondWith( 
        caches.match(e.request).then( response => {
            return response || fetch(e.request);
        })
    );
});