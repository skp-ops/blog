/**
 * Landing page mock data — everything the page renders lives here.
 *
 * 想接 Markdown / Content Collections 时，只替换本文件的导出即可：
 *   BIO_SENTENCES  ->  src/content/about/*
 *   PHOTOS         ->  src/content/photos/photos.json
 *   ARTICLES       ->  src/content/posts/**（getCollection('posts')）
 */

export interface Photo {
  src: string
  alt: string
  title: string
  location: string
  coord: string
  /** 模拟 EXIF，纯展示 */
  focal: string
  aperture: string
  shutter: string
  iso: string
}

export interface Article {
  date: string
  tag: string
  title: string
  excerpt: string
  readingTime: string
  href: string
}

export interface Profile {
  title: string
  subtitle: string
  author: string
  eyebrow: string
  heroLines: string[]
  heroSub: string
  cardNote: string
  now: string
}

export const PROFILE: Profile = {
  title: 'Kun\'s Blog',
  subtitle: 'code | coffee | capture',
  author: 'kunps',
  eyebrow: 'CODE · COFFEE · CAPTURE',
  heroLines: ['代码、咖啡，', '与快门。'],
  heroSub: '记录日常的思考，也收藏镜头里的瞬间。',
  cardNote: '把抽象的东西，落到能跑起来的代码上。',
  now: '写一篇文章',
}

/**
 * 简介按「短句 -> 词块」拆分，词块是 text-scrubbing 的最小单位。
 * 中文按语义切 2-5 字，拉丁词块自行带尾随空格。
 */
export const BIO_SENTENCES: string[][] = [
  ['我最近', '在', '做', '高性能', '算子开发，', 'IR、', '硬件指令层', '适配、', '内存布局', '等。'],
  ['也', '在', '探索', '其他语言，', '喜欢', '把', '抽象的设计，', '落成', '能跑起来的', '代码。'],
  ['不写代码的', '时候，', '我', '背着', '相机', '在', '城市间', '穿行，', '等', '一束光', '落在', '墙上。'],
  ['这个博客', '是', '我的', '草稿本——', '一半', '技术，', '一半', '照片。'],
]

// Unsplash 原图已本地化到 public/landing/photos/（WebP 1600px），
// 换成自己的照片只需替换同名文件。
export const PHOTOS: Photo[] = [
  {
    src: '/landing/photos/shibuya.webp',
    alt: '夜晚的涩谷十字路口，霓虹招牌映亮街道与行人',
    title: '涩谷的夜',
    location: 'Shibuya, Tokyo',
    coord: '35.6595° N',
    focal: '35mm',
    aperture: 'f/1.8',
    shutter: '1/125s',
    iso: 'ISO 1600',
  },
  {
    src: '/landing/photos/skye.webp',
    alt: '苏格兰高地，低云压在山脊上，夕阳穿过云层',
    title: '云落在山脊上',
    location: 'Quiraing, Isle of Skye',
    coord: '57.6419° N',
    focal: '24mm',
    aperture: 'f/8',
    shutter: '1/320s',
    iso: 'ISO 100',
  },
  {
    src: '/landing/photos/banff.webp',
    alt: '梦莲湖日出，雪山倒映在蓝绿色湖面',
    title: '冰川湖的日出',
    location: 'Moraine Lake, Banff',
    coord: '51.3217° N',
    focal: '50mm',
    aperture: 'f/11',
    shutter: '1/60s',
    iso: 'ISO 100',
  },
  {
    src: '/landing/photos/annapurna.webp',
    alt: '安纳普尔纳上空，云海翻涌，远处雪山被朝阳染红',
    title: '云海之上',
    location: 'Annapurna, Nepal',
    coord: '28.5961° N',
    focal: '70mm',
    aperture: 'f/9',
    shutter: '1/250s',
    iso: 'ISO 200',
  },
  {
    src: '/landing/photos/zermatt.webp',
    alt: '银河横跨雪山之巅，一颗流星划过夜空',
    title: '星夜与雪线',
    location: 'Zermatt, Switzerland',
    coord: '45.9763° N',
    focal: '20mm',
    aperture: 'f/1.8',
    shutter: '20s',
    iso: 'ISO 3200',
  },
]

export const ARTICLES: Article[] = [
  {
    date: '2026-10-21',
    tag: 'Rust',
    title: '用 Rust 重写一条零拷贝的日志管道',
    excerpt: '从 Arc<Mutex<Vec<u8>>> 到无锁 ring buffer：一次把吞吐从 40MB/s 推到 1.2GB/s 的完整记录，包括三次失败的尝试。',
    readingTime: '12 min',
    href: '/',
  },
  {
    date: '2026-10-12',
    tag: 'TypeScript',
    title: '类型系统里的边界感：从 satisfies 说起',
    excerpt: '类型体操不是炫技，而是把运行时的不确定性往前挪。聊几个真实项目里让代码变简单的类型写法。',
    readingTime: '9 min',
    href: '/',
  },
  {
    date: '2026-09-30',
    tag: '编译器',
    title: 'DDR 与 SRAM 之间：一次数据搬移的取舍',
    excerpt: '带宽、延迟与一致性三者的拉扯。记录一个把拷贝语义从底层格式里剥出来的下午，以及它带来的连锁反应。',
    readingTime: '16 min',
    href: '/',
  },
  {
    date: '2026-09-18',
    tag: '随笔',
    title: '把相机带进通勤路线的第 100 天',
    excerpt: '每天同一条路，第 100 天仍能拍到没见过的东西。关于观察力、重复，以及为什么我坚持用定焦。',
    readingTime: '6 min',
    href: '/',
  },
]
