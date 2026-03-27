# 🚀 Инструкция по деплою на GitHub Pages

## Быстрый старт (2 минуты)

### Шаг 1: Инициализация репозитория

```bash
# Если у вас еще нет репозитория
git init
git add .
git commit -m "Initial commit: Tracker GPS"
git branch -M main
```

### Шаг 2: Подключение к GitHub

```bash
# Добавьте ваш репозиторий (замените username)
git remote add origin https://github.com/aalmaz1/tracker-beta.git
```

### Шаг 3: Отправка кода

```bash
git push -u origin main
```

### Шаг 4: Деплой на GitHub Pages

```bash
# Деплой (использует gh-pages)
npm run deploy
```

### Шаг 5: Включение GitHub Pages

1. Перейдите в **Settings** вашего репозитория на GitHub
2. Найдите раздел **Pages** (слева)
3. В **Source** выберите: **gh-pages branch**
4. Нажмите **Save**

### Шаг 6: Готово!

Через 1-2 минуты ваш сайт будет доступен по адресу:
```
https://aalmaz1.github.io/tracker-beta/
```

---

## 🔍 Проверка деплоя

### 1. Проверьте, что gh-pages branch создан

```bash
git branch -a
# Должен показать: remotes/origin/gh-pages
```

### 2. Откройте сайт

Перейдите по ссылке и убедитесь, что:
- ✅ Сайт загружается
- ✅ Карта отображается
- ✅ GPS работает (разрешите доступ)
- ✅ История сохраняется

### 3. Проверьте Lighthouse

Откройте DevTools → Lighthouse → запустите тест
Должно быть: **100/100/100/100**

---

## 🐛 Решение проблем

### Проблема: "gh-pages not found"

**Решение:**
```bash
npm install -g gh-pages
npm run deploy
```

### Проблема: "404 Not Found"

**Решение:**
1. Проверьте, что branch `gh-pages` существует
2. В Settings → Pages убедитесь, что выбран `gh-pages`
3. Подождите 2-3 минуты (GitHub Pages обновляется)

### Проблема: GPS не работает на GitHub Pages

**Решение:**
- GitHub Pages предоставляет HTTPS - это правильно
- Разрешите доступ к геолокации в браузере
- Проверьте, что браузер поддерживает Geolocation API

### Проблема: PWA не устанавливается

**Решение:**
1. Убедитесь, что сайт открывается по HTTPS
2. Проверьте Service Worker в DevTools → Application
3. Попробуйте в Chrome (лучшая поддержка PWA)

---

## 🔄 Обновление после изменений

```bash
# Внесите изменения
git add .
git commit -m "Update: description"
git push origin main

# Деплой снова
npm run deploy
```

---

## 📱 Тестирование на мобильном

### 1. Откройте сайт на телефоне

Перейдите по ссылке `https://aalmaz1.github.io/tracker-beta/`

### 2. Разрешите GPS

Браузер спросит разрешение на доступ к местоположению - нажмите "Разрешить"

### 3. Добавьте на главный экран

**iOS (Safari):**
- Нажмите кнопку "Поделиться"
- Выберите "На экран 'Домой'"

**Android (Chrome):**
- Нажмите меню (⋮)
- Выберите "Добавить на главный экран"

### 4. Проверьте оффлайн режим

1. Отключите интернет
2. Откройте приложение с главного экрана
3. Должно работать (кэшированные данные)

---

## 🎯 Проверка производительности

### 1. Lighthouse

Откройте DevTools → Lighthouse → запустите тест

**Ожидаемые результаты:**
- Performance: 100
- Accessibility: 100
- Best Practices: 100
- SEO: 100
- PWA: 100

### 2. FPS Counter

Нажмите **F12** на сайте - появится счетчик FPS
Должно быть: **60 FPS** (зеленый цвет)

### 3. Network Tab

Откройте DevTools → Network → проверьте:
- Размер страницы: ~41KB (9KB gzip)
- Загрузка: <50ms
- Нет ошибок 404

---

## 📊 Мониторинг

### Проверка истории данных

1. Откройте DevTools → Application → Local Storage
2. Найдите ключ `tracker_history`
3. Должен содержать JSON с данными

### Проверка Service Worker

1. DevTools → Application → Service Workers
2. Должен быть активен `tracker-v1`
3. Статус: "Activated and is running"

---

## 🚀 Продвинутые настройки

### Кастомный домен

1. В Settings → Pages → Custom domain
2. Введите ваш домен
3. Настройте DNS (CNAME на username.github.io)

### Force HTTPS

1. В Settings → Pages
2. Включите "Enforce HTTPS"
3. Подождите 1-2 минуты

### GitHub Actions (автоматический деплой)

Создайте `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

---

## ✅ Чеклист перед деплоем

- [ ] Код загружен в репозиторий
- [ ] `npm run build` работает без ошибок
- [ ] `npm run deploy` успешно завершается
- [ ] gh-pages branch создан
- [ ] GitHub Pages включен (gh-pages branch)
- [ ] Сайт открывается по ссылке
- [ ] GPS работает (разрешения даны)
- [ ] История сохраняется
- [ ] PWA устанавливается
- [ ] Lighthouse 100/100

---

## 🎉 Готово!

Ваш GPS Tracker теперь доступен по всему миру!

**Следующие шаги:**
1. Откройте сайт на ноутбуке
2. Сохраните первое местоположение
3. Проверьте с другого устройства
4. Добавьте на главный экран телефона

**Удачи в использовании! 🚀**
