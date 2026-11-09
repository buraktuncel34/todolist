# Günlük — kişisel yapılacaklar ve rutin uygulaması

Telefona, bilgisayara ve Chrome'a kurulabilen yapılacaklar uygulaması: **Günüm** listesi, rutinler, listeler, kişiye görev atama (e-posta ile), bildirimler, iPhone Hatırlatıcılar eşitlemesi ve bir Chrome eklentisi.

> Bu depo uygulamanın **boş (default) hâlidir**: içinde hiçbir kişisel kart, kişi, şifre veya veri yoktur. Kurduğunda tertemiz başlar.

## Gerekenler
- Python 3.11 veya üstü
- (İsteğe bağlı) internete açmak için bir alan adı ve HTTPS (Caddy, Nginx vb.)

## Bilgisayarında hızlı deneme
```bash
git clone https://github.com/buraktuncel34/todolist.git
cd todolist
python -m venv .venv
# Windows: .venv\Scripts\activate    Mac/Linux: source .venv/bin/activate
pip install -r requirements.txt
OWNER_EMAIL=sen@ornek.com python run.py      # Windows PowerShell: $env:OWNER_EMAIL="sen@ornek.com"; python run.py
```
Tarayıcıda **http://localhost:8430** adresini aç ve **Hesap oluştur** de.
`OWNER_EMAIL` ile verdiğin e-postayla açılan ilk hesap **yönetici** olur (Ayarlar'da kullanıcılar, giriş ayarları ve yedekler yalnızca ona görünür). Diğer herkes standart kullanıcıdır.

## Sunucuya kurulum (Linux)
1. Kodu sunucuya al ve yukarıdaki gibi `.venv` kur.
2. `gunluk.service` dosyasındaki `KULLANICI`, `PUBLIC_URL` (sitenin adresi) ve `OWNER_EMAIL` (senin e-postan) alanlarını düzenle.
3. Servisi aç:
   ```bash
   sudo cp gunluk.service /etc/systemd/system/
   sudo systemctl daemon-reload && sudo systemctl enable --now gunluk
   ```
4. HTTPS için bir ters vekil kullan. Caddy örneği:
   ```
   gunluk.ornek.com {
       reverse_proxy 127.0.0.1:8430
   }
   ```

## Kurduktan sonra (uygulama içinden)
- **Ayarlar → Uygulamayı kur:** telefon (iPhone / Android), Windows, MacBook ve Chrome eklentisi için adım adım kurulum.
- **Kişi ata → e-posta ayarları:** atanan kişiye e-posta gitmesi için kendi Gmail / Outlook hesabını gir (Gmail'de "uygulama şifresi" kullan).
- **Google / Microsoft ile giriş** (isteğe bağlı): Ayarlar'da kendi OAuth anahtarlarını girersin.

## Veriler nerede?
Her şey sunucudaki `data/` klasöründe durur (veritabanı, yedekler, anahtarlar). Bu klasör **depoya hiç yüklenmez** (`.gitignore`).

## Lisans
MIT — dilediğin gibi kullanabilir, değiştirebilir, dağıtabilirsin.
