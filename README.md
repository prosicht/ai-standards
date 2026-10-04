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
│   ├── presentation/   # Etkileşimli, animasyonlu sunum altyapısı (klasör şablonu)
│   │   ├── manifest.json   # CLI'nin indireceği dosya listesi (core / starter)
│   │   ├── AGENTS.md       # AI talimatı: konudan sunuma iş akışı, sözleşmeler, kontrol listesi
│   │   ├── index.html, css/core/, js/core/       # çekirdek (giriş noktası, kabuk, motor)
│   │   └── js/scenes.js, js/sims/, css/theme.css, css/sims/, assets/, sources.md  # örnek deste (başlangıç)
│   └── blog/           # Etkileşimli, animasyonlu blog yazısı altyapısı (klasör şablonu)
│       ├── manifest.json   # CLI'nin indireceği dosya listesi (core / starter)
│       ├── AGENTS.md       # AI talimatı: konu + görsellerden yazıya iş akışı, bloklar, kontrol listesi
│       ├── index.html, css/core/, js/core/       # çekirdek (giriş noktası, kabuk, motor)
│       └── js/post.js, js/sims/, css/theme.css, css/sims/, assets/, sources.md  # örnek yazı (başlangıç)
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
- **Blog:** Blog altyapısının tamamı (çekirdek dosyalar, `AGENTS.md` ve çalışan bir örnek yazı) bulunduğunuz klasöre iner.

### 2. Doğrudan Şablon Belirterek Kurulum
```bash
# Web projeleri için
npx prosicht init -t web

# Landing projeleri için
npx prosicht init -t landing

# Sunum için
npx prosicht init -t presentation

# Blog için
npx prosicht init -t blog
```
### 3. Mevcut Projedeki Kuralları Güncelleme
Depodaki kurallar güncellendiğinde, projenizdeki AGENTS.md dosyasını en son sürüme çekmek için:

```
npx prosicht update -t web
```
`-t` verilmezse şablon, `AGENTS.md` başındaki `<!-- template: ... -->` etiketinden otomatik tespit edilir. Sunum klasörlerinde `update` yalnızca çekirdek dosyaları (`index.html`, `css/core/`, `js/core/`, `AGENTS.md`) yeniler; `js/scenes.js`, `js/sims/`, `css/theme.css`, `css/sims/`, `assets/` ve `sources.md` dokunulmadan kalır. Blog klasörlerinde de yalnızca çekirdek yenilenir; `js/post.js`, `js/sims/`, `css/theme.css`, `css/sims/`, `assets/` ve `sources.md` dokunulmadan kalır. Eski (1.x) klasör yapısındaki sunumlar `update` sırasında onayla yeni yapıya taşınır. Sunum ve blog aynı çekirdek yollarını kullandığı için CLI, bir kitin klasörüne diğerini yazmadan önce onay ister.

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

## Blog Altyapısı
Konu ve görseller verildiğinde AI'ın kaydırdıkça canlanan, etkileşimli bir blog yazısı hazırlaması için kullanılır. Sunumla aynı yaklaşım: framework, derleme ve npm bağımlılığı yok; çıktı statik dosyalardır ve klasör yapısı aynıdır (`index.html`, `css/`, `js/`, `assets/`, `sources.md`).

```bash
mkdir yeni-yazi && cd yeni-yazi
npx prosicht init -t blog
python3 -m http.server 8000    # http://localhost:8000 adresinde örnek yazı açılır
```
Görselleri `assets/images/` içine koyun (ya da AI'a klasörün yolunu verin) ve tek cümle yazın: *"Ev kahvesi demleme yöntemleri hakkında, gorseller/ klasöründeki fotoğrafları kullanarak etkileşimli bir blog yazısı hazırla."* AI, `AGENTS.md` içindeki akışı izler: brief → görselleri inceleme ve küçültme (`assets/images/`) → araştırma (`sources.md`) → bölüm planı → tema (`css/theme.css`, renkler görsellerden çıkarılabilir) → yazı (`js/post.js`) → figürler (`js/sims/<id>.js`) → tarayıcıda masaüstü ve telefon genişliğinde kontrol.

Yazı `js/post.js` içinde sırayla dizilmiş bloklardan oluşur:

| Blok | Ne yapar |
|------|----------|
| `text`, `heading` | Markdown alt kümesiyle metin (`==vurgu==` fosforlu kalem gibi çizilir, `[^id]` dipnot); başlıklar içindekiler tablosunu oluşturur |
| `image`, `gallery` | Perde, yakınlaşma veya parallax efektiyle görsel; tıklayınca büyüyen galeri (←/→, Esc) |
| `compare`, `hotspots` | Sürüklenen önce/sonra karşılaştırması; görselin üzerinde numaralı, açılır notlar |
| `scrolly` | Ekranda sabit kalan figür (simülasyon veya görsel dizisi), yanındaki metin adımları kaydırdıkça değiştirir |
| `sim` | Etkileşimli figür; adımlıysa altında ‹ › ve ↺ çıkar |
| `stats`, `quote`, `callout`, `code`, `video`, `divider` | Sayılar (sayarak gelir, kaynaklı), alıntı, not kutusu, kopyalanabilir kod, sessiz döngü video, ayraç |

Kabuk; okuma ilerleme çubuğunu, kalan okuma süresini, içindekiler tablosunu (geniş ekranda kenarda şerit, dar ekranda açılır menü), kaynak listesini ve görsel lightbox'ını kendisi yönetir. Simülasyonlar ekrana yaklaşınca yüklenir, görünmediğinde durur. Sim sözleşmesi ve motor sunumla aynıdır; bir simülasyon desteden yazıya taşınabilir.

**Katmanlar:**
| Katman | Dosyalar | Sahibi |
|--------|----------|--------|
| Giriş noktası ve kabuk | `index.html`, `js/core/app.js`, `css/core/shell.css` | Çekirdek: `update` ile yenilenir, yazı içinde elle değiştirilmez |
| Simülasyon motoru | `js/core/engine.js`, `js/core/kit.js` | Çekirdek |
| İçerik | `js/post.js`, `css/theme.css`, `sources.md` | Yazıya ait |
| Figürler | `js/sims/<id>.js`, `css/sims/<id>.css` | Yazıya ait |
| Dosyalar | `assets/` (görseller, fontlar, veri, medya) | Yazıya ait |

Yazılar da varsayılan olarak **açık tonlarda** hazırlanır (koyu tema: `post.theme = 'dark'`). Yayınlama sunumla aynıdır: `npx prosicht publish` → **Blog**.
## Şablon Ekleme ve Güncelleme Kuralları (Maintainer'lar İçin)
Token Verimliliği: Şablon dosyaları (templates/*.md) yazılırken AI modellerinin token sınırları düşünülerek net, emir kipiyle yazılmış ve hiyerarşik Markdown formatı kullanılmalıdır.

Uyum: Yeni bir framework veya araç kuralı ekleneceğinde, tüm ekibin ortak kararı ile eklenmeli ve ilgili .md dosyasına PR (Pull Request) açılarak birleştirilmelidir.

Sunum ve Blog Altyapısı: `templates/presentation/` veya `templates/blog/` altına dosya eklenir veya silinirse ilgili `manifest.json` güncellenmelidir. `core` listesi `update` ile her projede ezilir; `starter` listesi yalnızca `init` sırasında ve dosya yoksa yazılır. Çekirdekte davranış değiştiğinde `manifest.json` içindeki `version` ile `js/core/app.js` içindeki `KIT_VERSION` birlikte artırılır; klasör yapısı değişirse `layout` da artırılır ve CLI'ye taşıma eklenir. `js/core/kit.js` iki kitte aynı bileşenleri içerir, blog `js/core/engine.js` ise sunumdakinin üstüne `api.goto()` ve `sim.resize()` ekler: motor veya kitte yapılan bir düzeltme diğer kite de taşınmalıdır.

Yerel Test: Şablonları push etmeden denemek için `templates/` klasörünü yerelde sunup CLI'yi o adrese yönlendirin:
```bash
cd templates && python3 -m http.server 8765
PROSICHT_TEMPLATES_URL=http://127.0.0.1:8765 npx prosicht init -t presentation
PROSICHT_TEMPLATES_URL=http://127.0.0.1:8765 npx prosicht init -t blog
```
