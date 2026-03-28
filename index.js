const express    = require('express');
const puppeteer  = require('puppeteer');
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');

// ── Cloudinary config ────────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dm1s41c9e',
  api_key:    process.env.CLOUDINARY_API_KEY    || '535452623853367',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'CiwSSKjWgh8kO2BOlIX2Cc6RfPY',
});

const app = express();
app.use(express.json({ limit: '50mb' }));

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'screenshot-service v1' });
});

// ── Upload buffer do Cloudinary ───────────────────────────────────────────────
function uploadToCloudinary(buffer, folder, filename) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder:    folder || 'liga',
        public_id: filename,
        format:    'png',
        overwrite: true,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
}

// ── Screenshot endpoint ───────────────────────────────────────────────────────
// POST /screenshot
// Body: { html, width, height, filename? }
// Returns: { url: "https://res.cloudinary.com/..." }
app.post('/screenshot', async (req, res) => {
  const { html, width = 1080, height = 1080, filename } = req.body;

  if (!html) {
    return res.status(400).json({ error: 'Missing html' });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
      ],
    });

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(60000);
    page.setDefaultTimeout(60000);
    await page.setViewport({
      width:             Number(width),
      height:            Number(height),
      deviceScaleFactor: 1,
    });

    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 60000 });

    // Poczekaj na załadowanie wszystkich obrazków
    await page.evaluate(() => {
      return Promise.all(
        Array.from(document.images)
          .filter(img => !img.complete)
          .map(img => new Promise((resolve) => {
            img.onload = img.onerror = resolve;
          }))
      );
    });

    const screenshot = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width: Number(width), height: Number(height) },
    });

    await browser.close();
    browser = null;

    // Upload do Cloudinary
    const ts       = Date.now();
    const fname    = filename || `grafika_${ts}`;
    const imageUrl = await uploadToCloudinary(screenshot, 'liga', fname);

    res.json({ url: imageUrl });

  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    console.error('Screenshot error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Screenshot service running on port ${PORT}`);
});
