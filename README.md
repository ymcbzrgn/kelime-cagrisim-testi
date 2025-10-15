# 🎯 Kelime Çağrışım Testi Uygulaması

Kullanıcıların verilen bir kelimeye karşı ilk akıllarına gelen 15 kelimeyi yazdıkları, sonuçların grafiklerle analiz edildiği gerçek zamanlı web uygulaması.

## 📋 Özellikler

- **Gerçek Zamanlı Bağlantı:** WebSocket ile anlık iletişim
- **Multi-kullanıcı Desteği:** Aynı anda birden fazla kullanıcı teste katılabilir
- **Admin Paneli:** Test yönetimi için güvenli admin arayüzü
- **Görsel Analiz:** 4 farklı grafik türü ile sonuç analizi
- **Veri Kalıcılığı:** SQLite veritabanı ile veriler güvenle saklanır
- **Responsive Tasarım:** Mobil cihazlarda da sorunsuz çalışır

## 🚀 Hızlı Başlangıç

### Kurulum

```bash
# Projeyi klonla veya indir
cd kelime

# Bağımlılıkları yükle
npm install

# Environment dosyasını oluştur
cp .env.example .env
```

### Çalıştırma

```bash
# Uygulamayı başlat
npm start

# Geliştirme modunda çalıştır (nodemon ile)
npm run dev
```

Uygulama başlatıldıktan sonra:
- **Kullanıcı Sayfası:** http://localhost:3000
- **Admin Paneli:** http://localhost:3000/admin
- **Grafikler:** http://localhost:3000/charts

## 📖 Kullanım

### Kullanıcı Akışı
1. Ana sayfaya gidin ve kullanıcı adınızı girin
2. "Bağlan" butonuna tıklayın
3. Admin testi başlatana kadar bekleyin
4. Kelime göründüğünde, 15 çağrışım kelime yazın
5. "Gönder" ile cevaplarınızı kaydedin
6. Test bittiğinde otomatik olarak sonuçlara yönlendirilirsiniz

### Admin Kullanımı
1. `/admin` sayfasına gidin
2. Kullanıcı adı ve şifre ile giriş yapın (bkz. .env dosyası)
3. Test kelimesini girin ve "Kaydet" butonuna tıklayın
4. Kullanıcılar bağlandıktan sonra "Başlat" ile testi başlatın
5. Tüm kullanıcılar cevapladıktan sonra "Bitir" ile testi sonlandırın

## ⚙️ Konfigürasyon

`.env` dosyasında aşağıdaki değişkenleri ayarlayın:

```env
PORT=3000                      # Sunucu portu
ADMIN_USERNAME=admin           # Admin kullanıcı adı
ADMIN_PASSWORD=SecurePass123   # Admin şifresi
DB_PATH=./data/database.sqlite # Veritabanı dosya yolu
NODE_ENV=development           # Ortam (development/production)
```

## 📊 Grafik Türleri

Test sonuçları 4 farklı grafikle görselleştirilir:

1. **Pasta Grafik:** En popüler 15-20 kelime ve yüzdeleri
2. **Yatay Çubuk Grafik:** Top 30 kelime sıklık sıralaması
3. **Çizgi Grafik:** Kelime çeşitliliğinin zaman içindeki değişimi
4. **Kelime Bulutu:** Tüm kelimelerin görsel temsili

## 🛠️ Teknolojiler

- **Backend:** Node.js, Express.js
- **Veritabanı:** SQLite3
- **WebSocket:** Socket.io
- **Frontend:** Vanilla JavaScript, HTML5, CSS3
- **Grafikler:** Apache ECharts
- **Güvenlik:** bcrypt, express-session

## 📁 Proje Yapısı

```
kelime/
├── src/               # Backend kaynak kodları
│   ├── routes/        # API route'ları
│   ├── middleware/    # Express middleware'leri
│   ├── database/      # Veritabanı yönetimi
│   └── websocket/     # Socket.io handler'ları
├── public/            # Frontend dosyaları
│   ├── css/           # Stil dosyaları
│   └── js/            # JavaScript dosyaları
├── data/              # SQLite veritabanı
└── server.js          # Ana sunucu dosyası
```

## 🔒 Güvenlik

- Admin paneli şifre korumalı
- XSS ve SQL injection koruması
- CORS konfigürasyonu
- Rate limiting
- Input sanitization

## 📝 Lisans

MIT

## 👨‍💻 Geliştirici

Claude Code ile geliştirildi - Yapay zeka destekli kod üretimi

## 🤝 Katkıda Bulunma

1. Bu projeyi fork edin
2. Feature branch oluşturun (`git checkout -b feature/AmazingFeature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add some AmazingFeature'`)
4. Branch'inizi push edin (`git push origin feature/AmazingFeature`)
5. Pull Request açın

## 🐛 Hata Bildirimi

Hata bulursanız lütfen [Issues](https://github.com/yourusername/kelime/issues) bölümünde bildirin.

## 📞 İletişim

Sorularınız için: [your-email@example.com](mailto:your-email@example.com)