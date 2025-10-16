// Test Helper Script - Hızlı test verisi oluşturmak için
require('dotenv').config();
const database = require('./src/database/db');

async function createTestData() {
    console.log('Test verisi oluşturuluyor...');

    try {
        // Veritabanını başlat
        await database.init();
        console.log('✓ Veritabanı bağlantısı kuruldu');

        // Test oluştur
        const testId = await database.createTest('Mavi');
        console.log(`✓ Test oluşturuldu: ID ${testId}, Kelime: "Mavi"`);

        // Testi başlat
        await database.startTest(testId);
        console.log('✓ Test başlatıldı');

        // Test kullanıcıları oluştur
        const users = [
            { name: 'Ali', sessionId: 'session_1' },
            { name: 'Ayşe', sessionId: 'session_2' },
            { name: 'Mehmet', sessionId: 'session_3' },
            { name: 'Fatma', sessionId: 'session_4' },
            { name: 'Can', sessionId: 'session_5' }
        ];

        const userIds = [];
        for (const user of users) {
            const userId = await database.createUser(user.name, user.sessionId, `socket_${user.sessionId}`, testId);
            userIds.push({ id: userId, name: user.name });
            console.log(`✓ Kullanıcı oluşturuldu: ${user.name} (ID: ${userId})`);
        }

        // Her kullanıcı için kelimeler ekle
        const wordSets = [
            // Ali'nin kelimeleri - deniz teması
            ['deniz', 'gökyüzü', 'su', 'okyanus', 'dalga', 'huzur', 'sonsuzluk', 'berrak', 'derin', 'mavilik',
             'bulut', 'yaz', 'serinlik', 'tuz', 'gemi'],

            // Ayşe'nin kelimeleri - duygusal tema
            ['gökyüzü', 'hüzün', 'deniz', 'umut', 'özlem', 'hayal', 'barış', 'sükûnet', 'derin', 'sonsuz',
             'rüya', 'melankoli', 'yalnızlık', 'dinginlik', 'sakinlik'],

            // Mehmet'in kelimeleri - renk ve doğa
            ['deniz', 'gökyüzü', 'lacivert', 'turkuaz', 'su', 'buz', 'soğuk', 'berrak', 'cam', 'akvaryum',
             'balık', 'yunus', 'marin', 'dalga', 'köpük'],

            // Fatma'nın kelimeleri - objeler
            ['gökyüzü', 'deniz', 'kot', 'gömlek', 'araba', 'kalem', 'defter', 'perde', 'halı', 'bardak',
             'telefon', 'bilgisayar', 'duvar', 'çanta', 'ayakkabı'],

            // Can'ın kelimeleri - soyut kavramlar
            ['deniz', 'özgürlük', 'sonsuzluk', 'hayal', 'umut', 'gökyüzü', 'uzay', 'evren', 'derinlik', 'sakinlik',
             'huzur', 'barış', 'temizlik', 'saflık', 'berraklık']
        ];

        console.log('\nKelimeler ekleniyor...');
        for (let i = 0; i < userIds.length; i++) {
            await database.saveResponses(userIds[i].id, testId, wordSets[i]);
            console.log(`✓ ${userIds[i].name} için ${wordSets[i].length} kelime eklendi`);
            await database.markUserSubmitted(userIds[i].id);
        }

        // Testi bitir
        await database.finishTest(testId);
        console.log('\n✓ Test bitirildi ve tamamlandı olarak işaretlendi');

        // İstatistikleri göster
        console.log('\n📊 Test İstatistikleri:');
        const stats = await database.getTestStatistics(testId);
        console.log(`- Katılımcı sayısı: ${stats.userCount}`);
        console.log(`- Toplam kelime: ${stats.totalWords}`);
        console.log(`- Benzersiz kelime: ${stats.uniqueWords}`);

        // En popüler kelimeleri göster
        const wordFreq = await database.getWordFrequency(testId);
        console.log('\n🏆 En Popüler 10 Kelime:');
        wordFreq.slice(0, 10).forEach((item, index) => {
            console.log(`${index + 1}. ${item.word}: ${item.count} kez`);
        });

        console.log('\n✅ Test verisi başarıyla oluşturuldu!');
        console.log('🌐 Şimdi http://localhost:3000/charts adresini ziyaret edebilirsiniz.');

    } catch (error) {
        console.error('❌ Hata:', error);
    } finally {
        await database.close();
        process.exit();
    }
}

// Scripti çalıştır
createTestData();