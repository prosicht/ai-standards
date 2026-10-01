/* Deck content. DECK-OWNED: replace this demo with the real presentation.
   Schema and rules: AGENTS.md, "scenes.js schema".

   This demo deck explains the kit itself; each chapter shows one sim pattern:
     intro      hero        canvas ambient field, pointer reactive
     akis       full        flow diagram stepped with → (sim.stages)
     katmanlar  split       segmented switch + staggered cards
     sure       split-flip  sliders driving counters and bars
     baslat     full        terminal typed stage by stage
     kapanis    text        statement, no sim */

export const deck = {
  title: 'Prosicht Sunum Altyapısı',
  lang: 'tr',
  author: 'Pro Sicht',
  date: '1 Ekim 2026',
};

export const scenes = [
  {
    id: 'intro',
    name: 'Giriş',
    kicker: 'Pro Sicht · Sunum altyapısı',
    title: 'Konu ver,<br>*sunum* gelsin.',
    lede: 'Tarayıcıda açılan, animasyonlu ve etkileşimli sunumlar. Kurulum yok, framework yok, derleme yok.',
    layout: 'hero',
    notes: [
      'Bu deste altyapının kendisini anlatan örnek sunum.',
      'Her bölüm farklı bir simülasyon kalıbı gösteriyor.',
      'Fareyi arka plandaki alanın üzerinde gezdir: noktalar tepki verir.',
    ],
  },
  {
    id: 'akis',
    name: 'Akış',
    kicker: 'Konudan yayına',
    title: 'Altı adımda *hazır* sunum.',
    lede: 'Her → basışı bir adım ilerletir. Adımlar bitince sıradaki bölüme geçilir, ← geri sarar.',
    layout: 'full',
    notes: [
      'Brief: kitle, süre ve dil. Eksikse AI varsayımını yazar ve devam eder.',
      'Araştırma: ekrandaki her rakam kaynağıyla sources.md dosyasına girer.',
      'Simülasyonlar paralel yazılabilir: her agent tek bir dosyanın sahibi.',
    ],
    source: {
      title: 'Akışın tanımı',
      body: 'Adımların ayrıntısı AGENTS.md içindeki "Workflow" bölümünde.',
    },
  },
  {
    id: 'katmanlar',
    name: 'Katmanlar',
    kicker: 'Mimari',
    title: 'Üç katman,<br>tek *sözleşme*.',
    lede: 'Kabuk davranışı yönetir, içerik metni taşır, simülasyon fikri gösterir. Katmanlar arasında geçiş yap.',
    layout: 'split',
    notes: [
      'Çekirdek dosyalar prosicht update ile yenilenir, sunum içinde elle değiştirilmez.',
      'Sunuma özel her şey scenes.js, theme.css ve sims/ altında.',
    ],
  },
  {
    id: 'sure',
    name: 'Süre',
    kicker: 'Planlama',
    title: 'Kaç bölüm,<br>kaç *dakika*?',
    lede: 'Sürgüleri oynat: toplam konuşma süresi ve dağılımı anında hesaplanır.',
    layout: 'split-flip',
    notes: [
      'Kural: bölüm başına yaklaşık bir buçuk dakika.',
      'Soru-cevap süresini baştan ayır; sunum süresi ondan sonra kalan zaman.',
    ],
  },
  {
    id: 'baslat',
    name: 'Kullanım',
    kicker: 'Kullanım',
    title: 'İki komut, bir *cümle*.',
    lede: 'prosicht init ile altyapıyı indir, sonra AI aracına konuyu söyle. → her adımı yazdırır.',
    layout: 'full',
    notes: [
      'init sorusu: Uygulama mı, Sunum mu?',
      'Sunum seçilince bu klasör olduğu gibi iner, örnek deste hemen çalışır.',
      'update yalnızca çekirdek dosyaları yeniler; içerik dokunulmadan kalır.',
    ],
  },
  {
    id: 'kapanis',
    name: 'Kapanış',
    kicker: 'Sıradaki',
    title: 'Sıradaki sunum:<br>*senin konun.*',
    lede: 'N notlar · S kaynak · O bölümler · V sunucu görünümü · H tüm kısayollar',
    layout: 'text',
    notes: ['Sunucu görünümü (V) notları ve sıradaki bölümü ayrı pencerede gösterir.'],
  },
];
