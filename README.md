# CapyEnglish

Простий інструктаж для запуску проєкту та збірки Android APK.

## Потрібно

- Node.js та npm
- Android Studio / Android SDK
- Java JDK (у комплекті з Android Studio)
- Підключений Android-пристрій або емулятор

## Встановлення

```bash
npm install
```

## Запуск проекту

Запустити Metro та Expo:

```bash
npm start
```

Запустити на Android-пристрої або емуляторі:

```bash
npm run android
```

Запустити сайт у браузері:

```bash
npm run web
```

## Побудова APK

Перед збіркою, якщо змінювали файли в `src/db/seeds/dictionaries/`, оновіть вбудовану базу слів:

```bash
npm run build:words-db
```

Формат слова в seed:

```json
"hello": { "uk": ["привіт"], "es": ["hola"] }
```

Назва словника також локалізована:

```json
"name": { "uk": "Базова англійська", "en": "Basic English", "es": "Inglés básico" }
```

Кілька перекладів:

```json
"open": { "uk": ["відкривати", "відчиняти"], "es": ["abrir"] }
```

Англійське слово зберігається в БД один раз. Якщо воно є в кількох
словниках, створюються окремі зв’язки зі словниками, а нові унікальні варіанти
перекладу додаються до спільного набору слова.

### 1. Локальна збірка через Gradle

У Windows PowerShell:

```powershell
cd android
.\gradlew assembleRelease
```

Після успішної збірки APK знайдете тут:

```text
android\app\build\outputs\apk\release\app-release.apk
```

Для продакшена:
```powershell
cd android
$env:NODE_ENV = "production"
.\gradlew bundleRelease
```

### 2. Швидкий запуск на пристрої

Ця команда встановлює і запускає додаток на підключеному пристрої/емуляторі, але не створює готовий APK для розповсюдження:

```bash
npx expo run:android
```

## Популярні команди

- `npm install` — встановити залежності
- `npm start` — запустити Metro/Expo
- `npm run android` — запустити на Android
- `npm run web` — запустити у браузері
- `npm run ios` — запустити на iOS (треба macOS)
- `npm run build:words-db` — перегенерувати вбудовану базу слів
- `npm run lint` — перевірити стиль коду

## Додатково

Для встановлення APK на будь-який Android-пристрій використовуйте файл `app-release.apk` з папки `android\app\build\outputs\apk\release`.
