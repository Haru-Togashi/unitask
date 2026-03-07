// UniTask Service Worker - オフラインキャッシュ + Web Push通知
const CACHE_NAME = "unitask-v1";
const STATIC_ASSETS = ["/", "/courses", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

// ── インストール: 静的アセットをキャッシュ ────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── アクティベート: 古いキャッシュを削除 ─────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

// ── フェッチ: キャッシュ戦略 ─────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API・外部リクエストはネットワーク優先（失敗したらそのまま）
  if (url.pathname.startsWith("/api/") || url.origin !== self.location.origin) {
    event.respondWith(fetch(request).catch(() => new Response("", { status: 503 })));
    return;
  }

  // 静的アセット・ページ: キャッシュ優先 → なければネットワーク取得してキャッシュ
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => caches.match("/") ?? new Response("Offline", { status: 503 }));
    })
  );
});

// ── Push通知受信 ──────────────────────────────────────────────
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title ?? "UniTask";
  const options = {
    body: data.body ?? "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    vibrate: [200, 100, 200],
    data: { url: data.url ?? "/" },
    actions: [
      { action: "open",  title: "開く" },
      { action: "close", title: "閉じる" },
    ],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// ── 通知クリック ──────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "close") return;
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === url && "focus" in client) return client.focus();
        }
        if (clients.openWindow) return clients.openWindow(url);
      })
  );
});
