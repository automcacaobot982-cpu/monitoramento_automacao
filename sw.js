/* Service Worker do Monitor do Bot.
   Guarda a "casca" do app (shell) para abrir offline e torná-lo instalável.
   Os DADOS (planilha CSV) nunca são cacheados aqui: vão sempre pela rede,
   para o status não ficar velho. */

const CACHE = 'monitor-bot-v2';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((chaves) =>
      Promise.all(chaves.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;

  // Só tratamos GET do mesmo domínio (a casca do app).
  // Qualquer outra coisa (ex.: o CSV do Google) passa direto pela rede.
  const mesmaOrigem = req.url.startsWith(self.location.origin);
  if (req.method !== 'GET' || !mesmaOrigem) return;

  // Estratégia: rede primeiro (pega versão nova), com fallback pro cache (offline).
  e.respondWith(
    fetch(req)
      .then((resp) => {
        const copia = resp.clone();
        caches.open(CACHE).then((c) => c.put(req, copia)).catch(() => {});
        return resp;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
  );
});
