# 🚂 Railway.app Deployment Rehberi

## Yöntem 1: CLI ile (Önerilen)

### Terminal'de şu komutları çalıştırın:

```bash
cd /Users/yamacbezirgan/Desktop/kelime

# 1. Login ol (browser açılacak)
railway login

# 2. Yeni proje oluştur
railway init
# Proje adı: kelime-cagrisim-testi

# 3. Deploy et
railway up

# 4. Domain al
railway domain
# Bu size bir URL verecek: https://kelime-xxx.up.railway.app

# 5. URL'i görmek için
railway open
```

## Yöntem 2: Web Interface ile

1. https://railway.app/ 'e gidin
2. "Start a New Project" tıklayın
3. "Deploy from GitHub repo" seçin
4. GitHub'a yetki verin
5. "kelime" repo'sunu seçin
6. Otomatik deploy başlayacak

## Environment Variables (Railway Dashboard'da)

Railway dashboard'da Settings > Variables kısmına ekleyin:

```
NODE_ENV=production
SESSION_SECRET=<rastgele-secret-key>
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Deploy sonrası:

- URL: https://your-app.up.railway.app
- Bilgisayarınızı kapatabilirsiniz
- 3 saat boyunca çalışır (ücretsiz $5 credit)

## QR Kod için:

Deploy sonrası URL'i alın ve:
https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=YOUR_URL

Bu linki browser'da açın, QR kodu görürsünüz.
