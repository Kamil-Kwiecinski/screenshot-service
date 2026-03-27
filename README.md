# Screenshot Service

Zamiennik HCTI (htmlcsstoimage.com) — Puppeteer + Cloudinary na Railway.

## Endpoint

**POST /screenshot**
```json
{
  "html": "<html>...</html>",
  "width": 1080,
  "height": 1080,
  "filename": "grafika_mecz_93_post"
}
```
Zwraca:
```json
{
  "url": "https://res.cloudinary.com/dm1s41c9e/image/upload/liga/grafika_mecz_93_post.png"
}
```

## Deploy na Railway

1. Utwórz nowe repo na GitHub, wrzuć 3 pliki: `index.js`, `package.json`, `Dockerfile`
2. Railway → New Project → Deploy from GitHub repo → wybierz repo
3. Railway automatycznie wykryje Dockerfile i zbuduje
4. Po deployu dostaniesz URL np. `https://screenshot-service-xxx.railway.app`

## Zmiana w n8n

W nodach `Screenshot 1080x1080` i `Screenshot 1080x1920` zmień:
- URL z `https://hcti.io/v1/image` na `https://TWOJ-URL.railway.app/screenshot`
- Usuń Basic Auth (nie potrzebna)
- Parametry `html`, `viewport_width`→`width`, `viewport_height`→`height` zostają

### Przykład nowego body w n8n:
```json
{
  "html": "={{ $json.html_1080x1080 }}",
  "width": 1080,
  "height": 1080,
  "filename": "={{ 'mecz_' + $json.match_number + '_post' }}"
}
```
