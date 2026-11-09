# iPhone Hatırlatıcılar eşitlemesi (Kestirmeler)

Aynı adımlar uygulamada **Ayarlar → iPhone Hatırlatıcılar ile eşitleme → Kurulum adımlarını göster** bölümünde de var; oradaki adresler hazır gelir.

Ön hazırlık: Hatırlatıcılar uygulamasında **Günlük** adında bir liste oluştur. `TOKEN` yerine Ayarlar'daki anahtarı koy.
Sunucu adresi: kendi adresin (örn. `https://gunluk.ornek.com`)

## API
| Uç | Ne yapar |
|---|---|
| `GET /api/sync/today?token=TOKEN` | Bugünün henüz gönderilmemiş açık maddeleri: `{items:[{title, notes, alert, tag}]}`. Bir kez gönderilen tekrar gelmez (`&resend=1` hepsini yeniden verir, `&peek=1` işaretlemez). |
| `POST /api/sync/done?token=TOKEN` | Gövdede (JSON `{text:"..."}` ya da düz metin) geçen tüm `#g…#` etiketlerini "yapıldı" yapar, kaynak = Hatırlatıcı. |
| `GET /api/sync/state?token=TOKEN` | Son 3 günde uygulamada/eklentide tiklenmiş, Hatırlatıcılar'a gönderilmiş maddelerin etiketleri: `{tags:[...]}`. |

Etiket biçimi: `#gr12#` (rutin maddesi 12), `#gt5#` (görev 5). Hatırlatıcı notunda durur; silinmemeli.

## Kestirme 1 — "Günlük → Hatırlatıcı" (her sabah 07:00)
1. URL: `…/api/sync/today?token=TOKEN`
2. URL'nin İçeriğini Al (GET)
3. Sözlük Değerini Al → `items`
4. Her Biri ile Yinele:
   - Sözlük Değerini Al → `title`; Sözlük Değerini Al → `notes`
   - Yeni Hatırlatıcı Ekle: Başlık = title, Liste = Günlük, Notlar = notes
5. Otomasyon → Günün Saati 07:00 → Her Gün → Hemen Çalıştır

## Kestirme 2 — "Hatırlatıcı ↔ Günlük" (10/13/16/19/22)
1. Hatırlatıcıları Bul: Liste = Günlük, Tamamlandı, Tamamlanma Tarihi son 2 gün, Notlar içerir `#g`
2. Hatırlatıcıların Ayrıntılarını Al → Notlar → Metni Birleştir (Yeni Satır)
3. URL'nin İçeriğini Al: POST `…/api/sync/done?token=TOKEN`, JSON alanı `text` = Birleştirilmiş Metin
4. URL'nin İçeriğini Al: GET `…/api/sync/state?token=TOKEN` → Sözlük Değerini Al `tags`
5. Her Biri ile Yinele: Hatırlatıcıları Bul (Liste = Günlük, tamamlanmamış, Notlar içerir Yineleme Öğesi) → Hatırlatıcıyı Düzenle: Tamamlandı = açık (yoksa Hatırlatıcıları Sil)
6. Otomasyon: her saat için ayrı "Günün Saati" → Hemen Çalıştır
