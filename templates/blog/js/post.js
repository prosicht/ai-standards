/* Post content (js/post.js). POST-OWNED: replace this demo with the real post.
   Schema and block reference: AGENTS.md, sections 4 and 5.

   This demo post explains the kit itself and uses every block type except
   video:
     hero      full layout over the kapak sim (canvas field, pointer reactive)
     text      lead paragraph with drop cap, ==highlight== and [^footnote]
     sim       akis: staged figure stepped with ‹ › (sim.stages)
     scrolly   kurulum: sticky sim driven by text steps (api.goto)
     scrolly   images crossfading per step
     compare, hotspots, gallery, image (parallax), stats, quote, code, callout, divider
     sim       okuma: sliders driving a counter, bars and a strip */

export const post = {
  title: 'Konu ver,<br>*yazı* gelsin.',
  dek: 'Konuyu ve görselleri verdiğinde AI; araştıran, kaynak gösteren ve kaydırdıkça canlanan etkileşimli bir blog yazısı hazırlar.',
  kicker: 'Pro Sicht · Blog altyapısı',
  author: 'Pro Sicht',
  date: '2026-10-02',
  lang: 'tr',
  tags: ['Etkileşimli yazı', 'Statik site', 'AI ile üretim'],
  hero: { layout: 'full', sim: 'kapak' },
  sources: [
    {
      id: 'brysbaert',
      title: 'How many words do we read per minute? A review and meta-analysis of reading rate',
      publisher: 'Journal of Memory and Language, 109',
      year: 2019,
      url: 'https://doi.org/10.1016/j.jml.2019.104047',
      accessed: '2026-10-02',
    },
  ],
};

const IMG = 'assets/images/demo';

export const blocks = [
  {
    type: 'text',
    lead: true,
    md: `Bu yazı, blog altyapısının kendisini anlatan bir örnek. Kaydırdıkça karşına çıkan her bölüm ==farklı bir blok türünü== ya da simülasyon kalıbını gösteriyor: adım adım ilerleyen figürler, kaydırdıkça değişen sahneler, karşılaştırma kaydırıcıları, üzerine dokunulan görseller ve okurun kendisinin oynayabildiği hesaplayıcılar.

Altyapı tek bir klasörden ibaret: \`index.html\`, \`css/\`, \`js/\` ve \`assets/\`. Framework, derleme ya da npm bağımlılığı yok; tarayıcı dosyaları doğrudan açar. Yazının metni \`js/post.js\` içinde bloklar halinde durur, canlı figürler \`js/sims/\` altındaki küçük modüllerdir.`,
  },

  { type: 'heading', id: 'akis', kicker: '01', title: 'Konudan *yayına*' },
  {
    type: 'text',
    md: `AI aracına konuyu söyleyip görselleri verdiğinde iş yedi adımda ilerler. Her adım bir dosyaya yazar; böylece yarım kalan bir yazı bile nerede kaldığını bilir. Aşağıdaki figürde adımları **‹ ›** düğmeleriyle gezebilirsin.`,
  },
  {
    type: 'sim',
    sim: 'akis',
    size: 'wide',
    height: 500,
    mobileHeight: 560,
    badge: 'Adım adım',
    caption: 'Her adımın çıktısı bir dosyadır. Terminal çıktıları temsilidir.',
  },

  { type: 'heading', id: 'bloklar', kicker: '02', title: 'Bloklar *sayfayı* kurar' },
  {
    type: 'text',
    md: `Bir yazı, sırayla dizilmiş bloklardan oluşur. Metin blokları sade bir Markdown alt kümesiyle yazılır: **kalın**, *italik*, \`kod\`, [bağlantı](#gorseller), liste, alıntı ve ==vurgu==. Görsel, galeri, karşılaştırma, istatistik, alıntı, not, kod, video ve simülasyon blokları ise metnin arasına figür olarak girer.

Aşağıdaki bölüm bir *scrolly* bloğu: figür ekranda sabit kalır, sen kaydırdıkça yanındaki metin adımları figürü bir sonraki duruma taşır.`,
  },
  {
    type: 'scrolly',
    sim: 'kurulum',
    height: 600,
    steps: [
      '### Boş sayfa\nHer şey bir konu cümlesi ve birkaç görselle başlar. AI önce okuru, tonu ve yazının tek mesajını belirler.',
      '### Başlık ve giriş\nBaşlık birkaç kelime, alt başlık bir iki cümle. Okuma süresi metinden otomatik hesaplanır.',
      '### Metin akışı\nParagraflar okunaklı bir sütunda akar. Her paragraf ekrana girerken yumuşakça belirir.',
      '### Görseller yerini alır\nVerdiğin görseller `assets/images/` altına kopyalanır, tek tek incelenir ve hikâyede en çok işe yarayacakları yere yerleşir.',
      '### Etkileşim eklenir\nBir fikir en iyi dokunarak anlaşılıyorsa yazıya bir simülasyon girer. Figür ekrana yaklaşınca yüklenir, görünmediğinde durur.',
      '### Kaynaklar ve yayın\nEkrandaki her rakamın kaynağı yazının sonunda listelenir. Hazır klasör tek komutla yayınlanır.',
    ],
  },

  { type: 'heading', id: 'gorseller', kicker: '03', title: 'Görseller hikâyenin *parçası*' },
  {
    type: 'text',
    md: `Görseller süs için değil, anlatı için kullanılır. Aynı görsel bir yazıda kapak, bir başkasında karşılaştırma, bir diğerinde üzerine notlar düşülmüş bir şema olabilir. AI her görseli açıp bakar, açıklayıcı bir alternatif metin yazar ve en uygun blok türünü seçer.`,
  },
  {
    type: 'scrolly',
    side: 'left',
    height: 560,
    images: [
      { src: `${IMG}/manzara-eskiz.svg`, alt: 'Dağ sırtlarının ve güneşin kılavuz çizgili karakalem eskizi' },
      { src: `${IMG}/palet.svg`, alt: 'Kırmızı, mavi ve yeşil dairelerden oluşan renk paleti, altında renk kodları' },
      { src: `${IMG}/manzara.svg`, alt: 'Gün batımında katman katman dağlar ve önde çam ağaçları' },
    ],
    steps: [
      '### Eskiz\nBir görsel önce bir fikirdir: kompozisyon, ufuk çizgisi, odak noktası.',
      '### Palet\nTema renkleri görsellerden çıkarılabilir. Böylece sayfa ile görseller aynı dili konuşur.',
      '### Sonuç\nGörsel ile metin birlikte ilerler: okur kaydırdıkça sahne değişir, metin sahneyi açıklar.',
    ],
  },
  {
    type: 'compare',
    before: { src: `${IMG}/manzara-eskiz.svg`, alt: 'Manzaranın karakalem eskizi', label: 'Eskiz' },
    after: { src: `${IMG}/manzara.svg`, alt: 'Manzaranın renkli son hali', label: 'Son hali' },
    caption: 'Karşılaştırma bloğu: çizgiyi sürükle ya da klavyede ← → kullan.',
  },
  {
    type: 'text',
    md: `Bir görselin parçalarını anlatmak gerektiğinde *hotspots* bloğu kullanılır: görselin üzerine numaralı noktalar yerleşir, her nokta kısa bir açıklama açar.`,
  },
  {
    type: 'hotspots',
    src: `${IMG}/anatomi.svg`,
    alt: 'Bir blog sayfasının şeması: kapak, içindekiler, giriş paragrafı, etkileşimli figür ve kaynaklar',
    caption: 'Bir yazının anatomisi.',
    points: [
      { x: 0.3, y: 0.29, title: 'Kapak', text: 'Başlık, alt başlık ve okuma süresi. Arkasında bir görsel ya da canlı bir simülasyon olabilir.' },
      { x: 0.112, y: 0.51, title: 'İçindekiler', text: 'Bölüm başlıklarından otomatik oluşur; geniş ekranda kenarda ince bir şerit olarak durur.' },
      { x: 0.33, y: 0.48, title: 'Giriş paragrafı', text: 'İlk harf büyük yazılır; vurgular paragraf ekrana girince fosforlu kalem gibi çizilir.' },
      { x: 0.57, y: 0.69, title: 'Etkileşimli figür', text: 'Simülasyonlar metnin arasına figür olarak girer. Adımlı olanlar ‹ › ile gezilir.' },
      { x: 0.32, y: 0.92, title: 'Kaynaklar', text: 'Metindeki dipnot numaraları yazının sonundaki kaynak listesine bağlanır.' },
    ],
  },
  {
    type: 'gallery',
    columns: 3,
    ratio: '4/3',
    caption: 'Galeri: bir görsele dokun, büyüsün; ok tuşlarıyla diğerlerine geç.',
    images: [
      { src: `${IMG}/manzara.svg`, alt: 'Gün batımında katman katman dağlar', caption: 'Manzara' },
      { src: `${IMG}/palet.svg`, alt: 'Renk paleti kompozisyonu', caption: 'Palet' },
      { src: `${IMG}/anatomi.svg`, alt: 'Blog sayfası şeması', caption: 'Anatomi' },
    ],
  },
  {
    type: 'image',
    src: `${IMG}/doku.svg`,
    alt: 'Kırmızı, mavi ve yeşil topografik çizgilerden oluşan soyut doku',
    size: 'full',
    effect: 'parallax',
    ratio: '21/8',
    caption: 'Tam genişlikte görsel, parallax efektiyle: görsel sayfadan biraz daha yavaş kayar.',
  },

  { type: 'heading', id: 'etkilesim', kicker: '04', title: 'Okur *dokunarak* anlar' },
  {
    type: 'text',
    md: `Bazı fikirler okunarak değil, denenerek anlaşılır. Aşağıdaki hesaplayıcı, bu yazının üstündeki okuma süresini hesaplayan formülün aynısını kullanıyor. Sessiz okumada ortalama hız, İngilizce kurgu dışı metinlerde dakikada yaklaşık 238 kelime[^brysbaert]; altyapı Türkçe için daha temkinli bir varsayımla dakikada 200 kelime kullanır.`,
  },
  {
    type: 'sim',
    sim: 'okuma',
    size: 'wide',
    height: 440,
    mobileHeight: 640,
    badge: 'Dene',
    caption: 'Sürgüleri oynat: süre ve dağılım anında değişir. Görsel ve figür süreleri altyapının varsayımlarıdır.',
  },
  {
    type: 'stats',
    items: [
      { value: 0, label: 'npm bağımlılığı ve derleme adımı' },
      { value: 14, label: 'blok türü: metinden scrolly’ye' },
      { value: 4, label: 'örnek simülasyon kalıbı' },
      { value: 238, label: 'kelime/dk: ortalama sessiz okuma (İngilizce, kurgu dışı)', source: 'brysbaert' },
    ],
  },
  {
    type: 'quote',
    text: 'Bir figür süs değildir: okur ona bakarak ya da dokunarak bir şey anlamalıdır.',
    cite: 'AGENTS.md, figür kuralı',
  },

  { type: 'heading', id: 'baslat', kicker: '05', title: 'İki komut, bir *cümle*' },
  {
    type: 'text',
    md: `Altyapıyı boş bir klasöre indir, örnek yazıyı yerelde aç, sonra AI aracına konuyu ve görselleri ver.`,
  },
  {
    type: 'code',
    lang: 'bash',
    code: `# 1. Altyapıyı indir (soruda Blog seçilirse -t gerekmez)
npx prosicht init -t blog

# 2. Yerelde aç: http://localhost:8000
python3 -m http.server 8000

# 3. Hazır olunca yayınla
npx prosicht publish`,
  },
  {
    type: 'callout',
    tone: 'tip',
    title: 'AI aracına tek cümle yeter',
    md: `“*Ev kahvesi demleme yöntemleri* hakkında, \`gorseller/\` klasöründeki fotoğrafları kullanarak etkileşimli bir blog yazısı hazırla.”

Görselleri \`assets/images/\` içine kendin de koyabilirsin; AI her birini inceleyip yazıda bir yer bulur.`,
  },
  { type: 'divider' },
  {
    type: 'text',
    md: `Sıradaki yazının konusu senin. Bu örnek yazıyı silip yerine kendi içeriğini koymak AI'ın ilk işi: \`js/post.js\`, \`css/theme.css\`, \`js/sims/\` ve \`assets/\` baştan yazılır; çekirdek dosyalar olduğu gibi kalır.`,
  },
];
