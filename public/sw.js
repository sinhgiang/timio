const CACHE_NAME = "timio-v1";

// Face-api models cần pre-cache để kiosk load nhanh
const MODEL_FILES = [
  "/models/ssd_mobilenetv1_model-weights_manifest.json",
  "/models/ssd_mobilenetv1_model.bin",
  "/models/face_landmark_68_model-weights_manifest.json",
  "/models/face_landmark_68_model.bin",
  "/models/face_recognition_model-weights_manifest.json",
  "/models/face_recognition_model.bin",
  "/models/face_recognition_net-shard1",
  "/models/face_recognition_net-shard2",
  "/models/tiny_face_detector_model-weights_manifest.json",
  "/models/tiny_face_detector_model.bin",
  "/models/tiny_face_detector_model-shard1",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(MODEL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Cache-first cho model files
  if (url.pathname.startsWith("/models/")) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return res;
        });
      })
    );
  }
});
