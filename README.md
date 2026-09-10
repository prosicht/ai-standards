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
│   └── backend.md      # Microservice / Node.js / Express / NestJS API Standartları
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
Bu komut terminalde bir menü açar ve hangi proje şablonunu (web, mobile, backend vb.) indirmek istediğinizi sorar.

### 2. Doğrudan Şablon Belirterek Kurulum
```bash
# Web projeleri için
npx prosicht init -t web

# Landing projeleri için
npx prosicht init -t landing
```
### 3. Mevcut Projedeki Kuralları Güncelleme
Depodaki kurallar güncellendiğinde, projenizdeki AGENTS.md dosyasını en son sürüme çekmek için:

```
npx prosicht update -t web
```
## Şablon Ekleme ve Güncelleme Kuralları (Maintainer'lar İçin)
Token Verimliliği: Şablon dosyaları (templates/*.md) yazılırken AI modellerinin token sınırları düşünülerek net, emir kipiyle yazılmış ve hiyerarşik Markdown formatı kullanılmalıdır.

Uyum: Yeni bir framework veya araç kuralı ekleneceğinde, tüm ekibin ortak kararı ile eklenmeli ve ilgili .md dosyasına PR (Pull Request) açılarak birleştirilmelidir.
