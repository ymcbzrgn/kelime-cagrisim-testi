// Admin Panel Test Helper Script - Çoklu test verisi oluşturmak için
require('dotenv').config();
const database = require('./src/database/db');

async function createMultipleTestData() {
    console.log('Admin panel için çoklu test verisi oluşturuluyor...\n');

    try {
        // Veritabanını başlat
        await database.init();
        console.log('✓ Veritabanı bağlantısı kuruldu\n');

        // Test 1 - Tamamlanmış test
        console.log('📝 Test 1 oluşturuluyor (Tamamlanmış)...');
        const test1Id = await database.createTest('Kitap');
        await database.startTest(test1Id);

        const test1Users = [
            { name: 'Ahmet', sessionId: 't1_session_1' },
            { name: 'Zeynep', sessionId: 't1_session_2' },
            { name: 'Burak', sessionId: 't1_session_3' },
            { name: 'Elif', sessionId: 't1_session_4' }
        ];

        const test1UserIds = [];
        for (const user of test1Users) {
            const userId = await database.createUser(user.name, user.sessionId, `t1_socket_${user.sessionId}`, test1Id);
            test1UserIds.push({ id: userId, name: user.name });
        }

        const test1WordSets = [
            ['okumak', 'sayfa', 'bilgi', 'roman', 'hikaye', 'yazar', 'kütüphane', 'kapak', 'bölüm', 'paragraf'],
            ['sayfa', 'okumak', 'öğrenmek', 'keşif', 'hayal', 'macera', 'karakter', 'kurgu', 'gerçek', 'edebiyat'],
            ['bilgi', 'sayfa', 'ders', 'ödev', 'sınav', 'okul', 'öğretmen', 'öğrenci', 'kütüphane', 'araştırma'],
            ['okumak', 'yazmak', 'düşünmek', 'hayal', 'bilgi', 'kültür', 'sayfa', 'cilt', 'raf', 'kitaplık']
        ];

        for (let i = 0; i < test1UserIds.length; i++) {
            await database.saveResponses(test1UserIds[i].id, test1Id, test1WordSets[i]);
            await database.markUserSubmitted(test1UserIds[i].id);
        }
        await database.finishTest(test1Id);
        console.log(`✓ Test 1 tamamlandı (ID: ${test1Id}, Kelime: "Kitap")\n`);

        // Test 2 - Tamamlanmış test
        console.log('📝 Test 2 oluşturuluyor (Tamamlanmış)...');
        const test2Id = await database.createTest('Yaz');
        await database.startTest(test2Id);

        const test2Users = [
            { name: 'Murat', sessionId: 't2_session_1' },
            { name: 'Selin', sessionId: 't2_session_2' },
            { name: 'Cem', sessionId: 't2_session_3' },
            { name: 'Deniz', sessionId: 't2_session_4' },
            { name: 'Gül', sessionId: 't2_session_5' },
            { name: 'Kaan', sessionId: 't2_session_6' }
        ];

        const test2UserIds = [];
        for (const user of test2Users) {
            const userId = await database.createUser(user.name, user.sessionId, `t2_socket_${user.sessionId}`, test2Id);
            test2UserIds.push({ id: userId, name: user.name });
        }

        const test2WordSets = [
            ['sıcak', 'güneş', 'deniz', 'tatil', 'plaj', 'kum', 'dondurma', 'havuz', 'bronz', 'serinlik'],
            ['deniz', 'güneş', 'tatil', 'dinlenme', 'eğlence', 'yüzme', 'sörf', 'kumsal', 'palmiye', 'kokteyl'],
            ['sıcak', 'ter', 'güneş', 'yakıcı', 'kavurucu', 'bunaltıcı', 'nem', 'klima', 'soğuk', 'gölge'],
            ['tatil', 'deniz', 'özgürlük', 'rahatlama', 'keyif', 'mutluluk', 'aile', 'arkadaş', 'plaj', 'güneş'],
            ['deniz', 'mavi', 'dalga', 'tuz', 'güneş', 'kum', 'midye', 'yengeç', 'martı', 'gemi'],
            ['sıcak', 'dondurma', 'limonata', 'karpuz', 'kavun', 'çekirdek', 'piknik', 'mangal', 'bahçe', 'akşam']
        ];

        for (let i = 0; i < test2UserIds.length; i++) {
            await database.saveResponses(test2UserIds[i].id, test2Id, test2WordSets[i]);
            await database.markUserSubmitted(test2UserIds[i].id);
        }
        await database.finishTest(test2Id);
        console.log(`✓ Test 2 tamamlandı (ID: ${test2Id}, Kelime: "Yaz")\n`);

        // Test 3 - İptal edilmiş test
        console.log('📝 Test 3 oluşturuluyor (İptal edilecek)...');
        const test3Id = await database.createTest('Müzik');
        await database.startTest(test3Id);

        const test3Users = [
            { name: 'Osman', sessionId: 't3_session_1' },
            { name: 'Naz', sessionId: 't3_session_2' }
        ];

        for (const user of test3Users) {
            const userId = await database.createUser(user.name, user.sessionId, `t3_socket_${user.sessionId}`, test3Id);
            const words = ['ses', 'melodi', 'ritim', 'nota', 'enstrüman'];
            await database.saveResponses(userId, test3Id, words);
            await database.markUserSubmitted(userId);
        }

        await database.cancelTest(test3Id);
        console.log(`✓ Test 3 iptal edildi (ID: ${test3Id}, Kelime: "Müzik")\n`);

        // Test 4 - Hazır durumda (henüz başlamamış)
        console.log('📝 Test 4 oluşturuluyor (Hazır durumda)...');
        const test4Id = await database.createTest('Kahve');
        console.log(`✓ Test 4 hazır durumda (ID: ${test4Id}, Kelime: "Kahve")\n`);

        // Test 5 - En son tamamlanmış test (charts sayfası için)
        console.log('📝 Test 5 oluşturuluyor (En son tamamlanan)...');
        const test5Id = await database.createTest('Mavi');
        await database.startTest(test5Id);

        const test5Users = [
            { name: 'Ali', sessionId: 't5_session_1' },
            { name: 'Ayşe', sessionId: 't5_session_2' },
            { name: 'Mehmet', sessionId: 't5_session_3' },
            { name: 'Fatma', sessionId: 't5_session_4' },
            { name: 'Can', sessionId: 't5_session_5' }
        ];

        const test5UserIds = [];
        for (const user of test5Users) {
            const userId = await database.createUser(user.name, user.sessionId, `t5_socket_${user.sessionId}`, test5Id);
            test5UserIds.push({ id: userId, name: user.name });
        }

        const test5WordSets = [
            ['deniz', 'gökyüzü', 'su', 'okyanus', 'dalga', 'huzur', 'sonsuzluk', 'berrak', 'derin', 'mavilik'],
            ['gökyüzü', 'hüzün', 'deniz', 'umut', 'özlem', 'hayal', 'barış', 'sükûnet', 'derin', 'sonsuz'],
            ['deniz', 'gökyüzü', 'lacivert', 'turkuaz', 'su', 'buz', 'soğuk', 'berrak', 'cam', 'akvaryum'],
            ['gökyüzü', 'deniz', 'kot', 'gömlek', 'araba', 'kalem', 'defter', 'perde', 'halı', 'bardak'],
            ['deniz', 'özgürlük', 'sonsuzluk', 'hayal', 'umut', 'gökyüzü', 'uzay', 'evren', 'derinlik', 'sakinlik']
        ];

        for (let i = 0; i < test5UserIds.length; i++) {
            await database.saveResponses(test5UserIds[i].id, test5Id, test5WordSets[i]);
            await database.markUserSubmitted(test5UserIds[i].id);
        }
        await database.finishTest(test5Id);
        console.log(`✓ Test 5 tamamlandı (ID: ${test5Id}, Kelime: "Mavi")\n`);

        // Özet bilgileri göster
        console.log('════════════════════════════════════════════════════');
        console.log('📊 OLUŞTURULAN TEST ÖZETİ:');
        console.log('════════════════════════════════════════════════════\n');

        const allTests = await database.getAllTests(1, 10);
        allTests.forEach((test, index) => {
            console.log(`${index + 1}. Test ID: ${test.id}`);
            console.log(`   Kelime: ${test.word}`);
            console.log(`   Durum: ${test.status}`);
            console.log(`   Katılımcı: ${test.user_count || 0}`);
            console.log(`   Tarih: ${new Date(test.created_at).toLocaleString('tr-TR')}`);
            console.log('   ─────────────────────────────');
        });

        console.log('\n✅ Tüm test verileri başarıyla oluşturuldu!');
        console.log('\n🎯 Şimdi yapabilecekleriniz:');
        console.log('   1. http://localhost:3000/admin - Admin panelini açın');
        console.log('   2. Kullanıcı: admin, Şifre: admin123');
        console.log('   3. Test geçmişini görüntüleyin');
        console.log('   4. Her testin detaylarına tıklayarak inceleyin');
        console.log('   5. http://localhost:3000/charts - Son test grafiklerini görün\n');

    } catch (error) {
        console.error('❌ Hata:', error);
    } finally {
        await database.close();
        process.exit();
    }
}

// Scripti çalıştır
createMultipleTestData();