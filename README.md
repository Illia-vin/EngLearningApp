# EngLearningApp

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
- `npm run lint` — перевірити стиль коду

## Додатково

Для встановлення APK на будь-який Android-пристрій використовуйте файл `app-release.apk` з папки `android\app\build\outputs\apk\release`.
