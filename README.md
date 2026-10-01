# Pro Sicht - AI Coding Standards & Templates

Bu depo, **Pro Sicht** bünyesinde geliştirilen tüm yazılım projelerinin AI (Cursor, Claude Code, GitHub Copilot, ChatGPT vb.) ile geliştirilme standartlarını ve hazır altyapı şablonlarını yöneten **merkezi karar deposudur (Single Source of Truth)**.

Tüm projelerimizde kod kalitesini, mimari tutarlılığı ve geliştirme hızını korumak için buradaki Markdown şablonları kullanılır.

---

## Depo Yapısı

```text
ai-standards/
├── templates/
│   ├── web.md          # Next.js, Shadcn UI, Docker, Turnstile (Tam Donanımlı Web App)
│   ├── landing.md      # Statik/Yarı-dinamik, SEO ve Hız Odaklı Landing Sayfaları
│   ├── mobile.md       # React Native / Expo Mobil Uygulama Standartları
│   ├── backend.md      # Microservice / Node.js / Express / NestJS API Standartları
│   └── presentation/   # Etkileşimli, animasyonlu sunum altyapısı (klasör şablonu)
│       ├── manifest.json   # CLI'nin indireceği dosya listesi (core / starter)
│       ├── AGENTS.md       # AI talimatı: konudan sunuma iş akışı, sözleşmeler, kontrol listesi
│       ├── index.html, css/core/, js/core/       # çekirdek (giriş noktası, kabuk, motor)
│       └── js/scenes.js, js/sims/, css/theme.css, css/sims/, assets/, sources.md  # örnek deste (başlangıç)
├── README.md           # Depo kullanım rehberi (Bu dosya)
└── LICENSE
```

## Nasıl Çalışır?
Buradaki sistem 3 temel aşamada işler:

### Merkezi Yönetim (GitHub):
Tüm AI kuralları ve standartları templates/ altındaki Markdown dosyalarında tutulur. Standartlarda bir değişiklik yapıldığında sadece bu depodaki .md dosyaları güncellenir.

### Dağıtım (CLI / Raw URL):
Geliştiriciler yeni bir projeye başlarken veya mevcut bir projeyi güncellerken bu depodaki canlı Markdown dosyalarını prosicht CLI aracı ile kendi yerel projelerinin kök dizinine AGENTS.md olarak indirirler.

### AI Tarafından Tüketim (Agents):
Projedeki AI aracı (Cursor, Claude Code vb.), AGENTS.md dosyasını okuyarak Pro Sicht standartlarına %100 uyumlu kod üretir.

## Kullanım (Geliştiriciler İçin)
Herhangi bir projede Pro Sicht standartlarını ilklendirmek veya güncellemek için terminalde aşağıdaki komutları çalıştırmanız yeterlidir:

### 1. Etkileşimli Kurulum (Şablon Seçerek)
```bash
npx prosicht init
```
Bu komut önce **ne yapmak istediğinizi** sorar:
- **Uygulama:** Ardından proje şablonunu (web, landing, mobile, backend) seçersiniz; ilgili kurallar `AGENTS.md` olarak iner.
- **Sunum:** Sunum altyapısının tamamı (çekirdek dosyalar, `AGENTS.md` ve çalışan bir örnek deste) bulunduğunuz klasöre iner.

### 2. Doğrudan Şablon Belirterek Kurulum
```bash
# Web projeleri için
npx prosicht init -t web

# Landing projeleri için
npx prosicht init -t landing

# Sunum için
npx prosicht init -t presentation
```
### 3. Mevcut Projedeki Kuralları Güncelleme
Depodaki kurallar güncellendiğinde, projenizdeki AGENTS.md dosyasını en son sürüme çekmek için:

```
npx prosicht update -t web
```
`-t` verilmezse şablon, `AGENTS.md` başındaki `<!-- template: ... -->` etiketinden otomatik tespit edilir. Sunum klasörlerinde `update` yalnızca çekirdek dosyaları (`index.html`, `css/core/`, `js/core/`, `AGENTS.md`) yeniler; `js/scenes.js`, `js/sims/`, `css/theme.css`, `css/sims/`, `assets/` ve `sources.md` dokunulmadan kalır. Eski (1.x) klasör yapısındaki sunumlar `update` sırasında onayla yeni yapıya taşınır.

## Sunum Altyapısı
Konu verildiğinde AI'ın animasyonlu, etkileşimli bir tarayıcı sunumu hazırlaması için kullanılır. Framework, derleme ve npm bağımlılığı yoktur; çıktı statik dosyalardır.

```bash
mkdir yeni-sunum && cd yeni-sunum
npx prosicht init -t presentation
python3 -m http.server 8000    # http://localhost:8000 adresinde örnek deste açılır
```
Ardından AI aracına (Claude Code, Cursor vb.) tek cümle yeterlidir: *"KOBİ'ler için yapay zekâ konusunda 10 dakikalık sunum hazırla."* AI, `AGENTS.md` içindeki akışı izler: brief → araştırma (`sources.md`) → bölüm planı (`js/scenes.js`) → tema (`css/theme.css`) → her bölüm için bir simülasyon (`js/sims/<id>.js`) → tarayıcıda kontrol.

Sunumlar varsayılan olarak **açık tonlarda** hazırlanır. Koyu tema yalnızca açıkça istendiğinde kullanılır (`js/scenes.js` içinde `deck.theme = 'dark'`).

**Katmanlar:**
| Katman | Dosyalar | Sahibi |
|--------|----------|--------|
| Giriş noktası ve kabuk | `index.html`, `js/core/app.js`, `js/core/sound.js`, `css/core/shell.css` | Çekirdek: `update` ile yenilenir, sunum içinde elle değiştirilmez |
| Simülasyon motoru | `js/core/engine.js`, `js/core/kit.js` | Çekirdek |
| İçerik | `js/scenes.js`, `css/theme.css`, `sources.md` | Sunuma ait |
| Bölüm simülasyonları | `js/sims/<id>.js`, `css/sims/<id>.css` | Sunuma ait (her bölüm ayrı dosya, AI ajanları paralel çalışabilir) |
| Dosyalar | `assets/` (görseller, fontlar, veri, medya) | Sunuma ait |

Yapı statik bir site çıktısı gibidir: `index.html` tek giriş noktasıdır, yüklediği her şey `css/`, `js/` ve `assets/` altındadır. Tüm yollar görelidir (`/` ile başlamaz).

**Yayınlama:** deck.prosicht.com'da hesap açıp "Yeni sunum ekle" ile 32 karakterlik bir key alın, sunum klasöründe `npx prosicht publish` çalıştırın. Yalnızca `index.html`, `css/`, `js/` ve `assets/` yüklenir; link terminalde verilir. Gizlilik (yalnızca ben / bağlantıya sahip herkes) panelden ayarlanır.

**Sunum sırasında:** `→`/`Space` ileri (önce bölüm içi adımlar), `←` geri, `O` bölümler, `N` notlar, `S` kaynak, `V` sunucu görünümü (ayrı pencere, senkron), `R` baştan, `P` duraklat, `B` karart, `F` tam ekran, `M` ses, `H` tüm kısayollar.
## Şablon Ekleme ve Güncelleme Kuralları (Maintainer'lar İçin)
Token Verimliliği: Şablon dosyaları (templates/*.md) yazılırken AI modellerinin token sınırları düşünülerek net, emir kipiyle yazılmış ve hiyerarşik Markdown formatı kullanılmalıdır.

Uyum: Yeni bir framework veya araç kuralı ekleneceğinde, tüm ekibin ortak kararı ile eklenmeli ve ilgili .md dosyasına PR (Pull Request) açılarak birleştirilmelidir.

Sunum Altyapısı: `templates/presentation/` altına dosya eklenir veya silinirse `manifest.json` güncellenmelidir. `core` listesi `update` ile her projede ezilir; `starter` listesi yalnızca `init` sırasında ve dosya yoksa yazılır. Çekirdekte davranış değiştiğinde `manifest.json` içindeki `version` ile `js/core/app.js` içindeki `KIT_VERSION` birlikte artırılır; klasör yapısı değişirse `layout` da artırılır ve CLI'ye taşıma eklenir.

Yerel Test: Şablonları push etmeden denemek için `templates/` klasörünü yerelde sunup CLI'yi o adrese yönlendirin:
```bash
cd templates && python3 -m http.server 8765
PROSICHT_TEMPLATES_URL=http://127.0.0.1:8765 npx prosicht init -t presentation
```
