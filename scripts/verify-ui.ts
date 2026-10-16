async function testUI() {
  console.log("=== Проверка страниц витрины (T04) ===\n");

  const endpoints = [
    { name: "Главная страница (/) ", url: "http://localhost:3000/" },
    { name: "Каталог (/catalog)", url: "http://localhost:3000/catalog" },
    { name: "Каталог с фильтром категории", url: "http://localhost:3000/catalog?category=smartfony-i-gadzhety" },
    { name: "Каталог с комбо фильтрами", url: "http://localhost:3000/catalog?brand=apple&sort=price_asc&priceMin=5000000" },
    { name: "Карточка товара (/product/[slug])", url: "http://localhost:3000/product/apple-iphone-15-pro-128gb-blue" },
    { name: "О компании (/about)", url: "http://localhost:3000/about" },
    { name: "Доставка (/delivery)", url: "http://localhost:3000/delivery" },
    { name: "Оплата (/payment)", url: "http://localhost:3000/payment" },
    { name: "Контакты (/contacts)", url: "http://localhost:3000/contacts" },
    { name: "Кастомная 404 (/not-found-page)", url: "http://localhost:3000/not-found-page" },
  ];

  for (const ep of endpoints) {
    const res = await fetch(ep.url);
    console.log(`[HTTP ${res.status}] ${ep.name} -> ${ep.url}`);
    if (ep.url.includes("not-found") && res.status !== 404) {
      throw new Error(`Expected 404 for ${ep.url}, got ${res.status}`);
    }
    if (!ep.url.includes("not-found") && res.status !== 200) {
      throw new Error(`Expected 200 for ${ep.url}, got ${res.status}`);
    }
  }

  // Verify Product page SSR content & Schema.org microdata
  console.log("\n=== Проверка содержимого карточки товара ===");
  const productRes = await fetch("http://localhost:3000/product/apple-iphone-15-pro-128gb-blue");
  const productHtml = await productRes.text();

  const checks = [
    { label: "Микроразметка Schema.org Product", test: productHtml.includes('"@type":"Product"') },
    { label: "Артикул SKU (KB-APL-IP15P-128)", test: productHtml.includes("KB-APL-IP15P-128") },
    { label: "Название товара", test: productHtml.includes("Apple iPhone 15 Pro") },
    { label: "Цена", test: productHtml.includes("109") || productHtml.includes("119") },
    { label: "Блок характеристик", test: productHtml.includes("Характеристики") },
    { label: "Кнопка «В корзину»", test: productHtml.includes("В корзину") },
    { label: "Наличие на складе", test: productHtml.includes("В наличии на складе") },
    { label: "OpenGraph og:title", test: productHtml.includes('property="og:title"') || productHtml.includes('content="Смартфон Apple iPhone 15 Pro') },
  ];

  for (const c of checks) {
    console.log(`${c.test ? "✓" : "✗"} ${c.label}`);
    if (!c.test) {
      throw new Error(`Check failed: ${c.label}`);
    }
  }

  // Verify Home page sections
  console.log("\n=== Проверка содержимого главной страницы ===");
  const homeRes = await fetch("http://localhost:3000/");
  const homeHtml = await homeRes.text();

  const homeChecks = [
    { label: "Баннер-заглушка с промокодом", test: homeHtml.includes("KABACHOK10") },
    { label: "Популярные категории", test: homeHtml.includes("Популярные категории") },
    { label: "Секция «Хиты продаж»", test: homeHtml.includes("Хиты продаж") },
    { label: "Секция «Новинки каталога»", test: homeHtml.includes("Новинки каталога") },
    { label: "Преимущества магазина", test: homeHtml.includes("Быстрая доставка") && homeHtml.includes("Гарантия качества") },
  ];

  for (const c of homeChecks) {
    console.log(`${c.test ? "✓" : "✗"} ${c.label}`);
    if (!c.test) {
      throw new Error(`Home check failed: ${c.label}`);
    }
  }

  // Verify Catalog page
  console.log("\n=== Проверка содержимого страницы каталога ===");
  const catRes = await fetch("http://localhost:3000/catalog");
  const catHtml = await catRes.text();

  const catChecks = [
    { label: "Хлебные крошки", test: catHtml.includes("Хлебные крошки") },
    { label: "Панель фильтров", test: catHtml.includes("Фильтры") },
    { label: "Сортировка", test: catHtml.includes("Сортировка") },
    { label: "Карточки товаров", test: catHtml.includes("KB-") },
    { label: "Пагинация", test: catHtml.includes("Пагинация каталога") || catHtml.includes("Показано") },
  ];

  for (const c of catChecks) {
    console.log(`${c.test ? "✓" : "✗"} ${c.label}`);
    if (!c.test) {
      throw new Error(`Catalog check failed: ${c.label}`);
    }
  }

  console.log("\n Все проверки T04 успешно пройдены!");
}

testUI().catch((err) => {
  console.error(err);
  process.exit(1);
});
