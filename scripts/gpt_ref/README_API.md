# Loremax GPT Image 1.5 — Интеграция

## Содержимое архива

```
├── docs/                          — Документация по API
│   ├── 00-overview-and-client.md  — Обзор, аутентификация, PHP-клиент
│   ├── 05-text2image-gpt15.md    — Text2Image (workflow 93)
│   ├── 06-image2image-gpt15.md   — Image Edit (workflow 94)
│   └── 07-prompt-system.md       — Промпт-энхансинг система
├── prompts/                       — Системные промпты для Grok 4.1 Fast
│   ├── text2image_system.txt     — Промпт для text2image
│   └── image_edit_system.txt     — Промпт для image edit
├── scripts/                       — Python-скрипты интеграции
│   ├── grok_enhance.py           — Улучшение промптов через Grok
│   ├── loremax_generate.py       — Генерация через Loremax API
│   ├── pipeline_text2image.py    — Полный пайплайн text2image
│   └── pipeline_image_edit.py    — Полный пайплайн image edit
├── test_report.pdf                — PDF-отчёт с результатами 10 тестов
└── README_API.md                  — Этот файл
```

## Быстрый старт

### 1. Переменные окружения

```bash
export LOREMAX_API_KEY="ваш-ключ"
export XAI_API_KEY="xai-..."   # для Grok prompt enhancement
```

### 2. Пайплайн генерации

```
Пользователь (любой язык) → Grok 4.1 Fast (enhance) → Loremax API (generate) → Изображение
```

### 3. Рекомендуемые настройки

| Режим | quality | Когда |
|-------|---------|-------|
| Обычный | `low` | Повседневная генерация |
| HD | `medium` | Высокое качество для пользователей |

> `high` не рекомендуется для продакшена — дорого и медленно.

### 4. Промпт-энхансинг

**Всегда** использовать предустановленный промпт-энхансинг через Grok 4.1 Fast перед отправкой в Loremax API. Системные промпты в папке `prompts/`.

Включает Safety-фильтр для автоматической цензуры NSFW-контента.

## API Endpoints

- **Text2Image:** `POST https://loremax.ai/api/v1/workflow/execute` с `workflowId: "t2i_gpt_image_15"`
- **Image Edit:** `POST https://loremax.ai/api/v1/workflow/execute` с `workflowId: "i2i_gpt_image_15_edit"`
- **Статус:** `POST https://loremax.ai/api/v1/generations/{id}/check`

Подробнее — см. `docs/05-text2image-gpt15.md` и `docs/06-image2image-gpt15.md`.
