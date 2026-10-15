import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { connectToDatabase } from "../src/lib/db";
import {
  Category,
  Brand,
  Product,
  DeliveryMethod,
  PromoCode,
  Review,
} from "../src/models";

// Categories definition (6 categories across 2 levels of hierarchy)
const categoriesData = [
  // Level 1: Root categories
  {
    title: "Электроника",
    slug: "elektronika",
    description: "Смартфоны, ноутбуки, гаджеты и персональная электроника",
    sortOrder: 1,
    parentSlug: null,
  },
  {
    title: "Бытовая техника",
    slug: "bytovaya-tekhnika",
    description: "Крупная и мелкая бытовая техника для дома и кухни",
    sortOrder: 2,
    parentSlug: null,
  },
  // Level 2: Subcategories
  {
    title: "Смартфоны и гаджеты",
    slug: "smartfony-i-gadzhety",
    description: "Флагманские смартфоны, умные часы и аксессуары",
    sortOrder: 1,
    parentSlug: "elektronika",
  },
  {
    title: "Ноутбуки и компьютеры",
    slug: "noutbuki-i-kompyutery",
    description: "Ноутбуки для работы, учебы и гейминга, периферия",
    sortOrder: 2,
    parentSlug: "elektronika",
  },
  {
    title: "Техника для кухни",
    slug: "tekhnika-dlya-kukhni",
    description: "Кофемашины, блендеры, чайники, мультиварки",
    sortOrder: 1,
    parentSlug: "bytovaya-tekhnika",
  },
  {
    title: "Техника для дома",
    slug: "tekhnika-dlya-doma",
    description: "Роботы-пылесосы, очистители воздуха, утюги и отпариватели",
    sortOrder: 2,
    parentSlug: "bytovaya-tekhnika",
  },
];

// Brands definition (5 brands)
const brandsData = [
  {
    title: "Apple",
    slug: "apple",
    logoUrl: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=200",
    description: "Премиальная экосистема электроники из Купертино",
  },
  {
    title: "Samsung",
    slug: "samsung",
    logoUrl: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=200",
    description: "Мировой лидер в производстве дисплеев, смартфонов и бытовой техники",
  },
  {
    title: "Xiaomi",
    slug: "xiaomi",
    logoUrl: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=200",
    description: "Инновационные гаджеты и умная техника по доступной цене",
  },
  {
    title: "Bosch",
    slug: "bosch",
    logoUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=200",
    description: "Немецкая надежность, долговечность и передовые технологии для дома",
  },
  {
    title: "Philips",
    slug: "philips",
    logoUrl: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=200",
    description: "Европейское качество решений для комфортной жизни и здоровья",
  },
];

// Delivery methods definition (3 methods)
const deliveryMethodsData = [
  {
    code: "courier",
    title: "Курьерская доставка до двери",
    price: 35000, // 350.00 ₽
    description: "Доставка курьером в течение 1–2 дней, предварительный звонок за 1 час",
    isActive: true,
  },
  {
    code: "pickup",
    title: "Самовывоз из магазина",
    price: 0, // 0.00 ₽
    description: "Бесплатный самовывоз из центрального пункта выдачи «Кабачок»",
    isActive: true,
  },
  {
    code: "pvz",
    title: "Пункт выдачи заказов (ПВЗ)",
    price: 19000, // 190.00 ₽
    description: "Более 5000 партнерских пунктов выдачи и постаматов",
    isActive: true,
  },
];

// Promo codes definition (2 codes)
const promoCodesData = [
  {
    code: "KABACHOK10",
    discountType: "percentage" as const,
    discountValue: 10, // 10%
    minOrderAmount: 100000, // 1 000.00 ₽
    validFrom: new Date("2026-01-01T00:00:00.000Z"),
    validTo: new Date("2027-12-31T23:59:59.000Z"),
    usageLimit: 500,
    usedCount: 0,
    isActive: true,
  },
  {
    code: "WELCOME500",
    discountType: "fixed" as const,
    discountValue: 50000, // 500.00 ₽
    minOrderAmount: 300000, // 3 000.00 ₽
    validFrom: new Date("2026-01-01T00:00:00.000Z"),
    validTo: new Date("2027-12-31T23:59:59.000Z"),
    usageLimit: 1000,
    usedCount: 0,
    isActive: true,
  },
];

// 30 Products definition (comprehensive catalog across subcategories)
interface SeedProductItem {
  categorySlug: string;
  brandSlug: string;
  sku: string;
  title: string;
  slug: string;
  description: string;
  price: number; // in kopecks
  discountPrice: number | null; // in kopecks
  stockQuantity: number;
  images: { url: string; alt: string }[];
  attributes: { key: string; value: string }[];
  ratingAvg: number;
  reviewsCount: number;
  salesCount: number;
}

const productsData: SeedProductItem[] = [
  // 1. Смартфоны и гаджеты (8 товаров)
  {
    categorySlug: "smartfony-i-gadzhety",
    brandSlug: "apple",
    sku: "KB-APL-IP15P-128",
    title: "Смартфон Apple iPhone 15 Pro 128GB Титановый синий",
    slug: "apple-iphone-15-pro-128gb-blue",
    description: "Корпус из аэрокосмического титана, процессор A17 Pro, система камер 48 Мп и кнопка Action button.",
    price: 11999000,
    discountPrice: 10999000,
    stockQuantity: 14,
    images: [{ url: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800", alt: "Apple iPhone 15 Pro" }],
    attributes: [
      { key: "Диагональ экрана", value: "6.1\"" },
      { key: "Встроенная память", value: "128 ГБ" },
      { key: "Оперативная память", value: "8 ГБ" },
      { key: "Цвет", value: "Титановый синий" },
    ],
    ratingAvg: 4.9,
    reviewsCount: 18,
    salesCount: 42,
  },
  {
    categorySlug: "smartfony-i-gadzhety",
    brandSlug: "apple",
    sku: "KB-APL-IP15-128",
    title: "Смартфон Apple iPhone 15 128GB Черный",
    slug: "apple-iphone-15-128gb-black",
    description: "Dynamic Island, основная камера 48 Мп с двукратным телеобъективом и прочный корпус из цветного стекла.",
    price: 8499000,
    discountPrice: null,
    stockQuantity: 25,
    images: [{ url: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800", alt: "Apple iPhone 15" }],
    attributes: [
      { key: "Диагональ экрана", value: "6.1\"" },
      { key: "Встроенная память", value: "128 ГБ" },
      { key: "Цвет", value: "Черный" },
    ],
    ratingAvg: 4.8,
    reviewsCount: 12,
    salesCount: 35,
  },
  {
    categorySlug: "smartfony-i-gadzhety",
    brandSlug: "samsung",
    sku: "KB-SAM-S24U-256",
    title: "Смартфон Samsung Galaxy S24 Ultra 256GB Серый титан",
    slug: "samsung-galaxy-s24-ultra-256gb-grey",
    description: "Флагман со встроенным пером S Pen, функциями Galaxy AI и титановым корпусом. Камера 200 Мп.",
    price: 12499000,
    discountPrice: 11499000,
    stockQuantity: 10,
    images: [{ url: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800", alt: "Samsung Galaxy S24 Ultra" }],
    attributes: [
      { key: "Диагональ экрана", value: "6.8\"" },
      { key: "Встроенная память", value: "256 ГБ" },
      { key: "Оперативная память", value: "12 ГБ" },
      { key: "Цвет", value: "Серый титан" },
    ],
    ratingAvg: 4.9,
    reviewsCount: 22,
    salesCount: 38,
  },
  {
    categorySlug: "smartfony-i-gadzhety",
    brandSlug: "samsung",
    sku: "KB-SAM-A55-128",
    title: "Смартфон Samsung Galaxy A55 5G 128GB Лавандовый",
    slug: "samsung-galaxy-a55-5g-128gb-lavender",
    description: "Металлическая рамка, яркий Super AMOLED экран 120 Гц и тройная камера с оптической стабилизацией.",
    price: 3699000,
    discountPrice: 3299000,
    stockQuantity: 30,
    images: [{ url: "https://images.unsplash.com/photo-1580910051074-3eb694886505?w=800", alt: "Samsung Galaxy A55" }],
    attributes: [
      { key: "Диагональ экрана", value: "6.6\"" },
      { key: "Встроенная память", value: "128 ГБ" },
      { key: "Цвет", value: "Лавандовый" },
    ],
    ratingAvg: 4.6,
    reviewsCount: 8,
    salesCount: 50,
  },
  {
    categorySlug: "smartfony-i-gadzhety",
    brandSlug: "xiaomi",
    sku: "KB-XIA-14-512",
    title: "Смартфон Xiaomi 14 512GB Белый",
    slug: "xiaomi-14-512gb-white",
    description: "Компактный флагман с оптикой Leica Summilux, процессором Snapdragon 8 Gen 3 и зарядкой HyperCharge 90W.",
    price: 7999000,
    discountPrice: 6999000,
    stockQuantity: 16,
    images: [{ url: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800", alt: "Xiaomi 14" }],
    attributes: [
      { key: "Диагональ экрана", value: "6.36\"" },
      { key: "Встроенная память", value: "512 ГБ" },
      { key: "Оперативная память", value: "12 ГБ" },
      { key: "Цвет", value: "Белый" },
    ],
    ratingAvg: 4.7,
    reviewsCount: 14,
    salesCount: 29,
  },
  {
    categorySlug: "smartfony-i-gadzhety",
    brandSlug: "xiaomi",
    sku: "KB-XIA-RN13P-256",
    title: "Смартфон Xiaomi Redmi Note 13 Pro 256GB Полуночный черный",
    slug: "xiaomi-redmi-note-13-pro-256gb-black",
    description: "Камера 200 Мп с OIS, AMOLED дисплей 1.5K с частотой 120 Гц и турбозарядка 67 Вт.",
    price: 2899000,
    discountPrice: null,
    stockQuantity: 45,
    images: [{ url: "https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=800", alt: "Xiaomi Redmi Note 13 Pro" }],
    attributes: [
      { key: "Диагональ экрана", value: "6.67\"" },
      { key: "Встроенная память", value: "256 ГБ" },
      { key: "Цвет", value: "Черный" },
    ],
    ratingAvg: 4.5,
    reviewsCount: 31,
    salesCount: 88,
  },
  {
    categorySlug: "smartfony-i-gadzhety",
    brandSlug: "apple",
    sku: "KB-APL-AW9-45",
    title: "Смарт-часы Apple Watch Series 9 45mm Темная полночь",
    slug: "apple-watch-series-9-45mm-midnight",
    description: "Процессор S9 SiP, новый жест Double Tap, дисплей вдвое ярче и расширенный трекинг здоровья.",
    price: 4399000,
    discountPrice: 3999000,
    stockQuantity: 20,
    images: [{ url: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800", alt: "Apple Watch Series 9" }],
    attributes: [
      { key: "Размер корпуса", value: "45 мм" },
      { key: "Материал корпуса", value: "Алюминий" },
      { key: "Беспроводная связь", value: "Wi-Fi, Bluetooth 5.3" },
    ],
    ratingAvg: 4.8,
    reviewsCount: 15,
    salesCount: 27,
  },
  {
    categorySlug: "smartfony-i-gadzhety",
    brandSlug: "samsung",
    sku: "KB-SAM-GW6C-47",
    title: "Смарт-часы Samsung Galaxy Watch6 Classic 47mm Черный",
    slug: "samsung-galaxy-watch6-classic-47mm-black",
    description: "Вращающийся механический безель, сапфировое стекло, мониторинг сна и состава тела.",
    price: 3299000,
    discountPrice: null,
    stockQuantity: 18,
    images: [{ url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800", alt: "Samsung Galaxy Watch6 Classic" }],
    attributes: [
      { key: "Размер корпуса", value: "47 мм" },
      { key: "Безель", value: "Вращающийся" },
      { key: "Водозащита", value: "5 ATM + IP68" },
    ],
    ratingAvg: 4.7,
    reviewsCount: 9,
    salesCount: 19,
  },

  // 2. Ноутбуки и компьютеры (7 товаров)
  {
    categorySlug: "noutbuki-i-kompyutery",
    brandSlug: "apple",
    sku: "KB-APL-MBP14-M3P",
    title: "Ноутбук Apple MacBook Pro 14 M3 Pro 18GB 512GB Черный космос",
    slug: "apple-macbook-pro-14-m3-pro-black",
    description: "Невероятная мощь для профессионалов с чипом M3 Pro, дисплеем Liquid Retina XDR и до 18 часов работы.",
    price: 21999000,
    discountPrice: 20499000,
    stockQuantity: 8,
    images: [{ url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800", alt: "Apple MacBook Pro 14" }],
    attributes: [
      { key: "Процессор", value: "Apple M3 Pro" },
      { key: "Оперативная память", value: "18 ГБ" },
      { key: "Накопитель", value: "512 ГБ SSD" },
      { key: "Экран", value: "14.2\" Liquid Retina XDR" },
    ],
    ratingAvg: 5.0,
    reviewsCount: 11,
    salesCount: 15,
  },
  {
    categorySlug: "noutbuki-i-kompyutery",
    brandSlug: "apple",
    sku: "KB-APL-MBA13-M3",
    title: "Ноутбук Apple MacBook Air 13 M3 8GB 256GB Сияющая звезда",
    slug: "apple-macbook-air-13-m3-starlight",
    description: "Невероятно тонкий и легкий ноутбук с производительным чипом M3, тихой безвентиляторной конструкцией.",
    price: 11499000,
    discountPrice: null,
    stockQuantity: 15,
    images: [{ url: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800", alt: "Apple MacBook Air 13" }],
    attributes: [
      { key: "Процессор", value: "Apple M3" },
      { key: "Оперативная память", value: "8 ГБ" },
      { key: "Накопитель", value: "256 ГБ SSD" },
      { key: "Вес", value: "1.24 кг" },
    ],
    ratingAvg: 4.9,
    reviewsCount: 14,
    salesCount: 32,
  },
  {
    categorySlug: "noutbuki-i-kompyutery",
    brandSlug: "samsung",
    sku: "KB-SAM-GB4P-16",
    title: "Ноутбук Samsung Galaxy Book4 Pro 16\" Intel Core Ultra 7",
    slug: "samsung-galaxy-book4-pro-16-grey",
    description: "Dynamic AMOLED 2X экран 120 Гц с сенсорным управлением, мощный ИИ-процессор Intel Core Ultra.",
    price: 17999000,
    discountPrice: 16499000,
    stockQuantity: 6,
    images: [{ url: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800", alt: "Samsung Galaxy Book4 Pro" }],
    attributes: [
      { key: "Процессор", value: "Intel Core Ultra 7 155H" },
      { key: "Оперативная память", value: "16 ГБ LPDDR5X" },
      { key: "Накопитель", value: "512 ГБ NVMe SSD" },
      { key: "Экран", value: "16\" 3K AMOLED" },
    ],
    ratingAvg: 4.7,
    reviewsCount: 5,
    salesCount: 9,
  },
  {
    categorySlug: "noutbuki-i-kompyutery",
    brandSlug: "xiaomi",
    sku: "KB-XIA-RB16-R7",
    title: "Ноутбук Xiaomi RedmiBook 16 2024 Intel Core i5-13500H",
    slug: "xiaomi-redmibook-16-2024-grey",
    description: "Высокая производительность 47W, аккумулятор емкостью 72 Вт·ч и качественный 2.5K экран 120 Гц.",
    price: 7499000,
    discountPrice: 6899000,
    stockQuantity: 12,
    images: [{ url: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800", alt: "Xiaomi RedmiBook 16" }],
    attributes: [
      { key: "Процессор", value: "Intel Core i5-13500H" },
      { key: "Оперативная память", value: "16 ГБ LPDDR5" },
      { key: "Накопитель", value: "512 ГБ SSD" },
      { key: "Экран", value: "16\" 2560x1600" },
    ],
    ratingAvg: 4.6,
    reviewsCount: 16,
    salesCount: 24,
  },
  {
    categorySlug: "noutbuki-i-kompyutery",
    brandSlug: "xiaomi",
    sku: "KB-XIA-CURV34",
    title: "Игровой монитор Xiaomi Curved Gaming Monitor 34\" 144Hz",
    slug: "xiaomi-curved-gaming-monitor-34-black",
    description: "Изогнутый ультраширокий экран 21:9 с радиусом кривизны 1500R, разрешением WQHD 3440x1440 и поддержкой FreeSync.",
    price: 3499000,
    discountPrice: 3199000,
    stockQuantity: 18,
    images: [{ url: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800", alt: "Xiaomi Curved Gaming Monitor" }],
    attributes: [
      { key: "Диагональ", value: "34\"" },
      { key: "Разрешение", value: "3440x1440 (UWQHD)" },
      { key: "Частота обновления", value: "144 Гц" },
      { key: "Кривизна", value: "1500R" },
    ],
    ratingAvg: 4.8,
    reviewsCount: 24,
    salesCount: 46,
  },
  {
    categorySlug: "noutbuki-i-kompyutery",
    brandSlug: "samsung",
    sku: "KB-SAM-SSD-990P-2TB",
    title: "Твердотельный накопитель Samsung 990 PRO 2TB M.2 PCIe 4.0",
    slug: "samsung-990-pro-2tb-m2-ssd",
    description: "Скорость чтения до 7450 МБ/с и записи до 6900 МБ/с. Идеально для тяжелых задач и консоли PlayStation 5.",
    price: 1999000,
    discountPrice: null,
    stockQuantity: 40,
    images: [{ url: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=800", alt: "Samsung 990 PRO 2TB" }],
    attributes: [
      { key: "Объем", value: "2 ТБ" },
      { key: "Интерфейс", value: "PCIe 4.0 x4, NVMe 2.0" },
      { key: "Скорость чтения", value: "до 7450 МБ/с" },
    ],
    ratingAvg: 4.9,
    reviewsCount: 35,
    salesCount: 82,
  },
  {
    categorySlug: "noutbuki-i-kompyutery",
    brandSlug: "apple",
    sku: "KB-APL-MK-NUM",
    title: "Беспроводная клавиатура Apple Magic Keyboard с Touch ID и цифровой панелью",
    slug: "apple-magic-keyboard-touch-id-numeric-black",
    description: "Быстрая и безопасная аутентификация по Touch ID, удобный цифровой блок и аккумулятор на месяц работы.",
    price: 1999000,
    discountPrice: 1799000,
    stockQuantity: 22,
    images: [{ url: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800", alt: "Apple Magic Keyboard" }],
    attributes: [
      { key: "Подключение", value: "Bluetooth, Lightning" },
      { key: "Особенности", value: "Touch ID, цифровая панель" },
      { key: "Цвет", value: "Черный" },
    ],
    ratingAvg: 4.7,
    reviewsCount: 8,
    salesCount: 17,
  },

  // 3. Техника для кухни (8 товаров)
  {
    categorySlug: "tekhnika-dlya-kukhni",
    brandSlug: "philips",
    sku: "KB-PHI-EP5447",
    title: "Автоматическая кофемашина Philips Series 5400 LatteGo",
    slug: "philips-series-5400-lattego-black",
    description: "12 вкусных кофейных напитков из свежих зерен, молочная система LatteGo без трубок для быстрой очистки за 15 секунд.",
    price: 6499000,
    discountPrice: 5799000,
    stockQuantity: 12,
    images: [{ url: "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=800", alt: "Philips Series 5400 LatteGo" }],
    attributes: [
      { key: "Тип кофе", value: "Зерновой, молотый" },
      { key: "Давление", value: "15 бар" },
      { key: "Количество напитков", value: "12" },
      { key: "Капучинатор", value: "Автоматический LatteGo" },
    ],
    ratingAvg: 4.9,
    reviewsCount: 28,
    salesCount: 39,
  },
  {
    categorySlug: "tekhnika-dlya-kukhni",
    brandSlug: "philips",
    sku: "KB-PHI-AF-HD9280",
    title: "Аэрогриль Philips XXL Connected HD9280/90",
    slug: "philips-airfryer-xxl-hd9280-black",
    description: "Приготовление блюд с хрустящей корочкой с минимальным добавлением масла благодаря технологии Rapid Air.",
    price: 1899000,
    discountPrice: 1699000,
    stockQuantity: 20,
    images: [{ url: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800", alt: "Philips Airfryer XXL" }],
    attributes: [
      { key: "Объем чаши", value: "6.2 л" },
      { key: "Мощность", value: "2000 Вт" },
      { key: "Управление", value: "Сенсорное + приложение" },
    ],
    ratingAvg: 4.8,
    reviewsCount: 14,
    salesCount: 26,
  },
  {
    categorySlug: "tekhnika-dlya-kukhni",
    brandSlug: "bosch",
    sku: "KB-BOS-MUM58252",
    title: "Кухонный комбайн Bosch CreationLine MUM58252",
    slug: "bosch-creationline-mum58252-white",
    description: "Многофункциональный планетарный миксер мощностью 1000 Вт с большой чашей из нержавеющей стали 3.9 л.",
    price: 2999000,
    discountPrice: 2699000,
    stockQuantity: 11,
    images: [{ url: "https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=800", alt: "Bosch CreationLine MUM5" }],
    attributes: [
      { key: "Мощность", value: "1000 Вт" },
      { key: "Объем чаши", value: "3.9 л" },
      { key: "Количество скоростей", value: "7" },
      { key: "В комплекте", value: "Мясорубка, блендер, насадки" },
    ],
    ratingAvg: 4.9,
    reviewsCount: 19,
    salesCount: 22,
  },
  {
    categorySlug: "tekhnika-dlya-kukhni",
    brandSlug: "bosch",
    sku: "KB-BOS-KGN39",
    title: "Холодильник Bosch Serie 4 NoFrost KGN39XI28R Серебристый",
    slug: "bosch-serie-4-nofrost-kgn39-silver",
    description: "Технология NoFrost, раздельные контуры охлаждения VitaFresh для долгой свежести мяса, рыбы и овощей.",
    price: 7999000,
    discountPrice: null,
    stockQuantity: 7,
    images: [{ url: "https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=800", alt: "Холодильник Bosch Serie 4" }],
    attributes: [
      { key: "Общий объем", value: "388 л" },
      { key: "Размораживание", value: "Total No Frost" },
      { key: "Класс энергопотребления", value: "A+" },
      { key: "Уровень шума", value: "39 дБ" },
    ],
    ratingAvg: 4.8,
    reviewsCount: 10,
    salesCount: 12,
  },
  {
    categorySlug: "tekhnika-dlya-kukhni",
    brandSlug: "bosch",
    sku: "KB-BOS-SMV4",
    title: "Встраиваемая посудомоечная машина Bosch Serie 4 60 см",
    slug: "bosch-serie-4-dishwasher-60cm",
    description: "Вместимость 13 комплектов, тихий инверторный мотор EcoSilence Drive и защита от протечек AquaStop.",
    price: 6799000,
    discountPrice: 6299000,
    stockQuantity: 9,
    images: [{ url: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800", alt: "Посудомоечная машина Bosch" }],
    attributes: [
      { key: "Ширина", value: "60 см" },
      { key: "Вместимость", value: "13 комплектов" },
      { key: "Расход воды", value: "9.5 л" },
    ],
    ratingAvg: 4.9,
    reviewsCount: 15,
    salesCount: 18,
  },
  {
    categorySlug: "tekhnika-dlya-kukhni",
    brandSlug: "xiaomi",
    sku: "KB-XIA-KETTLE-PRO",
    title: "Электрический чайник Xiaomi Mi Smart Kettle Pro",
    slug: "xiaomi-mi-smart-kettle-pro-white",
    description: "Умный терморегулятор с OLED-дисплеем, поддержание температуры до 12 часов и управление со смартфона.",
    price: 399000,
    discountPrice: 349000,
    stockQuantity: 50,
    images: [{ url: "https://images.unsplash.com/photo-1594213114663-ddf4f24cf710?w=800", alt: "Xiaomi Smart Kettle Pro" }],
    attributes: [
      { key: "Объем", value: "1.5 л" },
      { key: "Мощность", value: "1800 Вт" },
      { key: "Особенности", value: "OLED дисплей, Bluetooth" },
    ],
    ratingAvg: 4.7,
    reviewsCount: 42,
    salesCount: 110,
  },
  {
    categorySlug: "tekhnika-dlya-kukhni",
    brandSlug: "xiaomi",
    sku: "KB-XIA-BLENDER-SMART",
    title: "Умный блендер Xiaomi Smart Blender",
    slug: "xiaomi-smart-blender-white",
    description: "Горячее и холодное смешивание, встроенный нагревательный элемент, 8 лезвий из нержавеющей стали.",
    price: 699000,
    discountPrice: null,
    stockQuantity: 18,
    images: [{ url: "https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=800", alt: "Xiaomi Smart Blender" }],
    attributes: [
      { key: "Объем кувшина", value: "1.6 л" },
      { key: "Мощность измельчения", value: "1000 Вт" },
      { key: "Мощность нагрева", value: "800 Вт" },
    ],
    ratingAvg: 4.6,
    reviewsCount: 11,
    salesCount: 20,
  },
  {
    categorySlug: "tekhnika-dlya-kukhni",
    brandSlug: "samsung",
    sku: "KB-SAM-MW5000",
    title: "Микроволновая печь Samsung MS23K3513AS/BW Серебристая",
    slug: "samsung-microwave-ms23k3513as-silver",
    description: "Биокерамическая эмаль со стойкостью к царапинам и бактериям, режим устранения запахов и быстрое размораживание.",
    price: 1199000,
    discountPrice: 1049000,
    stockQuantity: 22,
    images: [{ url: "https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=800", alt: "Samsung Microwave" }],
    attributes: [
      { key: "Объем", value: "23 л" },
      { key: "Мощность микроволн", value: "800 Вт" },
      { key: "Внутреннее покрытие", value: "Биокерамика" },
    ],
    ratingAvg: 4.8,
    reviewsCount: 17,
    salesCount: 33,
  },

  // 4. Техника для дома (7 товаров)
  {
    categorySlug: "tekhnika-dlya-doma",
    brandSlug: "xiaomi",
    sku: "KB-XIA-VAC-S10P",
    title: "Робот-пылесос Xiaomi Robot Vacuum S10+ Белый",
    slug: "xiaomi-robot-vacuum-s10-plus-white",
    description: "Двойные ротационные мопы для влажной уборки, мощность всасывания 4000 Па и лазерная навигация LDS.",
    price: 2699000,
    discountPrice: 2399000,
    stockQuantity: 19,
    images: [{ url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800", alt: "Xiaomi Robot Vacuum S10+" }],
    attributes: [
      { key: "Тип уборки", value: "Сухая и влажная" },
      { key: "Сила всасывания", value: "4000 Па" },
      { key: "Навигация", value: "LDS лазерная" },
    ],
    ratingAvg: 4.8,
    reviewsCount: 29,
    salesCount: 54,
  },
  {
    categorySlug: "tekhnika-dlya-doma",
    brandSlug: "xiaomi",
    sku: "KB-XIA-PURIF-4P",
    title: "Очиститель воздуха Xiaomi Smart Air Purifier 4 Pro",
    slug: "xiaomi-smart-air-purifier-4-pro-white",
    description: "Очищает помещение до 60 м² за 15 минут, устраняет 99.97% аллергенов, пыли и неприятных запахов.",
    price: 1999000,
    discountPrice: 1799000,
    stockQuantity: 15,
    images: [{ url: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800", alt: "Xiaomi Smart Air Purifier 4 Pro" }],
    attributes: [
      { key: "Площадь обслуживания", value: "до 60 м²" },
      { key: "Производительность CADR", value: "500 м³/ч" },
      { key: "Фильтр", value: "HEPA H13" },
    ],
    ratingAvg: 4.9,
    reviewsCount: 19,
    salesCount: 31,
  },
  {
    categorySlug: "tekhnika-dlya-doma",
    brandSlug: "philips",
    sku: "KB-PHI-PSG8140",
    title: "Парогенератор Philips PerfectCare 8000 Series",
    slug: "philips-perfectcare-8000-psg8140",
    description: "Технология OptimalTEMP — глажение любых тканей без риска прожечь и без настройки температуры. Давление пара 8.5 бар.",
    price: 3899000,
    discountPrice: 3499000,
    stockQuantity: 8,
    images: [{ url: "https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=800", alt: "Парогенератор Philips PerfectCare" }],
    attributes: [
      { key: "Давление пара", value: "8.5 бар" },
      { key: "Паровой удар", value: "700 г/мин" },
      { key: "Объем резервуара", value: "1.8 л" },
    ],
    ratingAvg: 5.0,
    reviewsCount: 13,
    salesCount: 16,
  },
  {
    categorySlug: "tekhnika-dlya-doma",
    brandSlug: "philips",
    sku: "KB-PHI-STEAM-STH7060",
    title: "Ручной отпариватель Philips 7000 Series STH7060/80",
    slug: "philips-handheld-steamer-sth7060-black",
    description: "Регулируемая насадка для вертикального и горизонтального отпаривания, готовность к работе за 30 секунд.",
    price: 799000,
    discountPrice: 699000,
    stockQuantity: 25,
    images: [{ url: "https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=800", alt: "Отпариватель Philips 7000" }],
    attributes: [
      { key: "Мощность", value: "1500 Вт" },
      { key: "Подача пара", value: "до 28 г/мин" },
      { key: "Объем резервуара", value: "200 мл" },
    ],
    ratingAvg: 4.7,
    reviewsCount: 21,
    salesCount: 45,
  },
  {
    categorySlug: "tekhnika-dlya-doma",
    brandSlug: "bosch",
    sku: "KB-BOS-WGA2440",
    title: "Стиральная машина Bosch Serie 4 WGA24400OE 9 кг",
    slug: "bosch-serie-4-washer-wga24400oe-white",
    description: "Загрузка до 9 кг, тихий мотор EcoSilence Drive с гарантией 10 лет и программа AntiStain для удаления пятен.",
    price: 6499000,
    discountPrice: 5899000,
    stockQuantity: 10,
    images: [{ url: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=800", alt: "Стиральная машина Bosch" }],
    attributes: [
      { key: "Максимальная загрузка", value: "9 кг" },
      { key: "Скорость отжима", value: "1400 об/мин" },
      { key: "Класс стирки", value: "A" },
    ],
    ratingAvg: 4.9,
    reviewsCount: 16,
    salesCount: 22,
  },
  {
    categorySlug: "tekhnika-dlya-doma",
    brandSlug: "bosch",
    sku: "KB-BOS-BGS05A",
    title: "Пылесос без мешка Bosch Cleann'n Serie 2 BGS05A222",
    slug: "bosch-cleann-serie-2-bgs05a222-blue",
    description: "Компактный циклонный пылесос без мешка для сбора пыли, гигиенический фильтр PureAir HEPA.",
    price: 1149000,
    discountPrice: null,
    stockQuantity: 28,
    images: [{ url: "https://images.unsplash.com/photo-1558317374-067fb5f30001?w=800", alt: "Пылесос Bosch Serie 2" }],
    attributes: [
      { key: "Тип пылесборника", value: "Контейнер (циклон)" },
      { key: "Объем пылесборника", value: "1.5 л" },
      { key: "Потребляемая мощность", value: "700 Вт" },
    ],
    ratingAvg: 4.6,
    reviewsCount: 14,
    salesCount: 30,
  },
  {
    categorySlug: "tekhnika-dlya-doma",
    brandSlug: "samsung",
    sku: "KB-SAM-JET85",
    title: "Вертикальный аккумуляторный пылесос Samsung Bespoke Jet",
    slug: "samsung-bespoke-jet-85-complete",
    description: "Мощность всасывания до 210 Вт, станция самоочистки All-in-one Clean Station и до 60 минут автономной работы.",
    price: 5499000,
    discountPrice: 4899000,
    stockQuantity: 11,
    images: [{ url: "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=800", alt: "Samsung Bespoke Jet" }],
    attributes: [
      { key: "Мощность всасывания", value: "210 Вт" },
      { key: "Время работы", value: "до 60 мин" },
      { key: "Вес", value: "2.5 кг" },
    ],
    ratingAvg: 4.8,
    reviewsCount: 18,
    salesCount: 25,
  },
];

async function seed() {
  console.log("🌱 [Seed] Подключение к MongoDB...");
  await connectToDatabase();
  console.log("✅ [Seed] Подключение к MongoDB успешно установлено.");

  // 1. Seed Categories (Idempotent upsert by slug)
  console.log("📁 [Seed] Наполнение категорий (2 уровня вложенности)...");
  const categoryMap = new Map<string, mongoose.Types.ObjectId>();

  // Pass 1: Root categories (no parentSlug)
  for (const cat of categoriesData.filter((c) => c.parentSlug === null)) {
    const saved = await Category.findOneAndUpdate(
      { slug: cat.slug },
      {
        $set: {
          title: cat.title,
          description: cat.description,
          sortOrder: cat.sortOrder,
          parentId: null,
          isVisible: true,
        },
      },
      { upsert: true, new: true }
    );
    categoryMap.set(cat.slug, saved._id as mongoose.Types.ObjectId);
  }

  // Pass 2: Subcategories (linking to parentId)
  for (const cat of categoriesData.filter((c) => c.parentSlug !== null)) {
    const parentId = categoryMap.get(cat.parentSlug!);
    const saved = await Category.findOneAndUpdate(
      { slug: cat.slug },
      {
        $set: {
          title: cat.title,
          description: cat.description,
          sortOrder: cat.sortOrder,
          parentId: parentId ?? null,
          isVisible: true,
        },
      },
      { upsert: true, new: true }
    );
    categoryMap.set(cat.slug, saved._id as mongoose.Types.ObjectId);
  }
  console.log(`✅ [Seed] Категорий обработано: ${categoryMap.size}`);

  // 2. Seed Brands (Idempotent upsert by slug)
  console.log("🏷️  [Seed] Наполнение брендов...");
  const brandMap = new Map<string, mongoose.Types.ObjectId>();
  for (const brand of brandsData) {
    const saved = await Brand.findOneAndUpdate(
      { slug: brand.slug },
      {
        $set: {
          title: brand.title,
          logoUrl: brand.logoUrl,
          description: brand.description,
        },
      },
      { upsert: true, new: true }
    );
    brandMap.set(brand.slug, saved._id as mongoose.Types.ObjectId);
  }
  console.log(`✅ [Seed] Брендов обработано: ${brandMap.size}`);

  // 3. Seed Delivery Methods (Idempotent upsert by code)
  console.log("🚚 [Seed] Наполнение способов доставки...");
  for (const method of deliveryMethodsData) {
    await DeliveryMethod.findOneAndUpdate(
      { code: method.code },
      {
        $set: {
          title: method.title,
          price: method.price,
          description: method.description,
          isActive: method.isActive,
        },
      },
      { upsert: true, new: true }
    );
  }
  console.log(`✅ [Seed] Способов доставки обработано: ${deliveryMethodsData.length}`);

  // 4. Seed Promo Codes (Idempotent upsert by code)
  console.log("🎟️  [Seed] Наполнение промокодов...");
  for (const promo of promoCodesData) {
    await PromoCode.findOneAndUpdate(
      { code: promo.code },
      {
        $set: {
          discountType: promo.discountType,
          discountValue: promo.discountValue,
          minOrderAmount: promo.minOrderAmount,
          validFrom: promo.validFrom,
          validTo: promo.validTo,
          usageLimit: promo.usageLimit,
          usedCount: promo.usedCount,
          isActive: promo.isActive,
        },
      },
      { upsert: true, new: true }
    );
  }
  console.log(`✅ [Seed] Промокодов обработано: ${promoCodesData.length}`);

  // 5. Seed Products (Idempotent upsert by sku)
  console.log("📦 [Seed] Наполнение товаров (~30 позиций)...");
  const seededProducts: { _id: mongoose.Types.ObjectId; sku: string }[] = [];

  for (const p of productsData) {
    const categoryId = categoryMap.get(p.categorySlug);
    const brandId = brandMap.get(p.brandSlug);

    if (!categoryId || !brandId) {
      console.warn(`⚠️ [Seed] Пропуск товара ${p.sku}: не найдена категория или бренд`);
      continue;
    }

    const saved = await Product.findOneAndUpdate(
      { sku: p.sku },
      {
        $set: {
          categoryId,
          brandId,
          title: p.title,
          slug: p.slug,
          description: p.description,
          price: p.price,
          discountPrice: p.discountPrice,
          stockQuantity: p.stockQuantity,
          isPublished: true,
          images: p.images,
          attributes: p.attributes,
          ratingAvg: p.ratingAvg,
          reviewsCount: p.reviewsCount,
          salesCount: p.salesCount,
          deletedAt: null,
        },
      },
      { upsert: true, new: true }
    );

    seededProducts.push({ _id: saved._id as mongoose.Types.ObjectId, sku: saved.sku });
  }
  console.log(`✅ [Seed] Товаров обработано: ${seededProducts.length}`);

  // 6. Seed Initial Customer Reviews (Idempotent upsert by userId + productId)
  console.log("💬 [Seed] Наполнение базовых отзывов...");
  const sampleUserId = new mongoose.Types.ObjectId("65a000000000000000000001");
  const sampleUser2Id = new mongoose.Types.ObjectId("65a000000000000000000002");

  if (seededProducts.length >= 2) {
    const p1 = seededProducts[0];
    const p2 = seededProducts[1];

    await Review.findOneAndUpdate(
      { userId: sampleUserId, productId: p1._id },
      {
        $set: {
          rating: 5,
          comment: "Отличный смартфон! Камера великолепная, автономность на высоте. Рекомендую к покупке в Кабачке!",
          isApproved: true,
          managerReply: null,
        },
      },
      { upsert: true }
    );

    await Review.findOneAndUpdate(
      { userId: sampleUser2Id, productId: p1._id },
      {
        $set: {
          rating: 5,
          comment: "Очень доволен покупкой. Доставили быстро в пункт выдачи, упаковка целая.",
          isApproved: true,
          managerReply: {
            authorId: new mongoose.Types.ObjectId("65a000000000000000000099"),
            text: "Спасибо за ваш отзыв! Приятного использования!",
            at: new Date(),
          },
        },
      },
      { upsert: true }
    );

    await Review.findOneAndUpdate(
      { userId: sampleUserId, productId: p2._id },
      {
        $set: {
          rating: 4,
          comment: "Хороший товар, полностью соответствует заявленным характеристикам.",
          isApproved: true,
          managerReply: null,
        },
      },
      { upsert: true }
    );
  }
  console.log("✅ [Seed] Базовые отзывы успешно обработаны.");

  console.log("🎉 [Seed] База данных успешно наполнена начальными данными!");
}

async function main() {
  try {
    await seed();
    process.exit(0);
  } catch (error) {
    console.error("❌ [Seed] Ошибка при заполнении базы данных:", error instanceof Error ? error.message : error);
    console.error("💡 [Seed] Убедитесь, что MongoDB запущена (Atlas M0 или локальный replica set: mongod --replSet rs0) и переменная MONGODB_URI корректно указана в .env");
    process.exit(1);
  }
}

main();
