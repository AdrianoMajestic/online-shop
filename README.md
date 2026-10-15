# Интернет-магазин «Кабачок» (MVP)

Учебный проект разработки полнофункционального интернет-магазина по техническому заданию ООО «ТехноТорг». Реализован на базе Next.js 14 (App Router), MongoDB 7 / Mongoose 8, Tailwind CSS, shadcn/ui и Vitest.

---

## 🛠 Технологический стек

- **Фреймворк:** Next.js 14+ (App Router), React 18, **TypeScript strict**
- **База данных:** MongoDB 7 + Mongoose 8 (поддержка транзакций replica set)
- **Стилизация и UI:** Tailwind CSS, shadcn/ui, Lucide Icons
- **Валидация:** Zod (на всех входах API и форм)
- **Аутентификация:** Better Auth (сессии в httpOnly cookies, роли `customer`, `manager`, `admin`)
- **Тестирование:** Vitest (unit-тесты бизнес-логики)
- **Качество кода:** ESLint + Prettier

---

## 📋 Требования к окружению

- **Node.js:** версия 18.18+ или 20+ (проверено на Node 20 / 24)
- **npm:** версия 9+
- **MongoDB:** версия 7+ (требуется режим **Replica Set** для работы транзакций при создании заказов)

---

## 🗄 Настройка и подключение к MongoDB

Транзакции (`session.withTransaction`) в MongoDB работают исключительно в режиме Replica Set. Есть два варианта подключения:

### Вариант 1 (Рекомендуемый): Бесплатный облачный кластер MongoDB Atlas (M0)
1. Зарегистрируйтесь на [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Создайте бесплатный кластер M0 (он изначально развернут как Replica Set из 3 узлов).
3. В разделе **Database Access** создайте пользователя с правами `Read and write to any database`.
4. В разделе **Network Access** добавьте ваш IP-адрес или `0.0.0.0/0` для разработки.
5. Нажмите **Connect** -> **Drivers** -> скопируйте строку подключения и укажите её в `.env`:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/kabachok?retryWrites=true&w=majority
   ```

### Вариант 2: Локальный запуск MongoDB в режиме Replica Set
Если вы используете локально установленный `mongod`:
1. Запустите демон MongoDB с флагом `--replSet`:
   ```bash
   mongod --replSet rs0 --dbpath "C:\data\db"
   ```
2. В отдельном терминале подключитесь через `mongosh` и выполните инициализацию реплики (достаточно один раз):
   ```javascript
   rs.initiate()
   ```
3. Проверьте статус командой `rs.status()`. Убедитесь, что узел перешел в состояние `PRIMARY`.
4. Укажите локальную строку подключения в `.env`:
   ```env
   MONGODB_URI=mongodb://127.0.0.1:27017/kabachok?replicaSet=rs0
   ```

---

## 🚀 Быстрый старт

### 1. Установка зависимостей
```bash
npm install
```

### 2. Настройка переменных окружения
Скопируйте пример конфигурации и заполните значения:
```bash
cp .env.example .env
```

Переменные окружения:
- `MONGODB_URI` — строка подключения к кластеру MongoDB.
- `BETTER_AUTH_SECRET` — случайная строка минимум 32 символа для подписи токенов сессий.
- `BETTER_AUTH_URL` — базовый URL приложения (например, `http://localhost:3000`).
- `PAYMENT_WEBHOOK_SECRET` — секретный ключ для HMAC-проверки вебхуков платежей.

### 3. Запуск в режиме разработки
```bash
npm run dev
```
Приложение откроется по адресу [http://localhost:3000](http://localhost:3000).

### 4. Проверка работоспособности
- Главная страница: [http://localhost:3000/](http://localhost:3000/)
- Проверка подключения к базе данных и статуса API: [http://localhost:3000/api/health](http://localhost:3000/api/health)

---

## 📜 Доступные скрипты

| Скрипт | Назначение |
|---|---|
| `npm run dev` | Запуск сервера разработки Next.js |
| `npm run build` | Сборка production-бандла |
| `npm run start` | Запуск собранного production-приложения |
| `npm run typecheck` | Проверка типов TypeScript в строгом режиме (`tsc --noEmit`) |
| `npm run lint` | Проверка кода линтером ESLint |
| `npm test` | Запуск unit-тестов Vitest |
| `npm run seed` | Заполнение базы начальными данными (категории, бренды, товары) |
| `npm run format` | Автоформатирование кода с помощью Prettier |

---

## 📂 Структура проекта

```
/
├─ docs/                     # Документация проекта
│  ├─ TZ.md                  # Исходное техническое задание заказчика
│  ├─ TZ_ISSUES.md           # Журнал замечаний и критики ТЗ
│  ├─ DECISIONS.md           # Журнал архитектурных решений (D-xxx)
│  ├─ TRACEABILITY.md        # Матрица соответствия 62 требований ТЗ задачам
│  ├─ ER.md                  # Mermaid ER-диаграмма коллекций MongoDB
│  └─ explain/               # Пояснительные записки к выполненным задачам (для защиты)
├─ scripts/
│  └─ seed.ts                # Скрипт начального наполнения БД
├─ src/
│  ├─ app/                   # Next.js App Router (страницы и API Route Handlers)
│  │  ├─ api/health/         # Проверка здоровья сервиса и подключения к БД
│  │  ├─ layout.tsx          # Корневой лэйаут с Header и Footer
│  │  └─ page.tsx            # Главная витринная страница
│  ├─ components/            # UI-компоненты (Header, Footer, shadcn/ui)
│  ├─ lib/                   # Базовые утилиты: db.ts, errors.ts, utils.ts
│  └─ tests/                 # Unit-тесты чистой логики (Vitest)
```
