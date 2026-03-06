# Prompt System — Автоматическое расширение промптов

## Концепция

Двухступенчатый пайплайн: пользовательский запрос на любом языке проходит через LLM (Grok 4.1 Fast) для расширения, затем улучшенный промпт отправляется в Loremax API для генерации.

```
Пользователь          Grok 4.1 Fast             Loremax API
   "кот на крыше"  →  enhance_prompt()  →  "A ginger tabby cat..."  →  generate  →  image URL
```

**Ключевая логика:**
- Короткий промпт (1-3 слова) → полное расширение с деталями
- Средний (1-2 предложения) → умеренное расширение, перевод на английский
- Длинный/детальный (100+ слов) → минимальные правки, перевод на английский

---

## Структура файлов

```
prompts/
  text2image_system.txt    ← Системный промпт для text2image
  image_edit_system.txt    ← Системный промпт для image edit

scripts/
  grok_enhance.py          ← Модуль: улучшение промпта через Grok 4.1 Fast
  loremax_generate.py      ← Модуль: генерация через Loremax API
  pipeline_text2image.py   ← Полный пайплайн: enhance → text2image
  pipeline_image_edit.py   ← Полный пайплайн: enhance → image edit
```

---

## Переменные окружения

```powershell
# xAI (Grok) — для улучшения промптов
$env:XAI_API_KEY = "xai-..."

# Loremax — для генерации изображений
$env:LOREMAX_API_KEY = "lmx_prod_sKPSyH8JUcogPO7MW9UhOodd5S4WXS9R"
```

## Зависимости

```bash
pip install openai requests
```

---

## Архитектура

### Шаг 1 — Grok 4.1 Fast (улучшение промпта)

| Параметр | Значение |
|----------|----------|
| API | `https://api.x.ai/v1/chat/completions` |
| Модель | `grok-4-1-fast` (non-reasoning) |
| Temperature | 0.7 |
| Max tokens | 1024 |

Два системных промпта в `prompts/`:
- `text2image_system.txt` — для генерации с нуля
- `image_edit_system.txt` — для редактирования изображений

### Шаг 2 — Loremax API (генерация)

| Пайплайн | Workflow ID | Тип |
|----------|-------------|-----|
| GPT Image 1.5 Text2Image | `t2i_gpt_image_15` | text → image |
| GPT Image 1.5 Edit | `i2i_gpt_image_15_edit` | image + text → image |
| Grok Imagine Text2Image | `t2i_grok_imagine_image` | text → image |
| Grok Imagine Edit | `i2i_grok_imagine_image-edit` | image + text → image |

---

## Быстрый старт — Python

### Text 2 Image (полный пайплайн)

```python
from scripts.grok_enhance import enhance_prompt
from scripts.loremax_generate import text2image_gpt15, wait_for_completion, get_result_urls

# Шаг 1: улучшить промпт
enhanced = enhance_prompt("кот на крыше на закате", mode="text2image")
print(enhanced)
# → "A ginger tabby cat sitting on the ridge of a weathered clay-tile rooftop..."

# Шаг 2: сгенерировать изображение
result = text2image_gpt15(enhanced, image_size="1024x1024", quality="high")
final = wait_for_completion(result["generationId"], result.get("jobId"))
urls = get_result_urls(final)
print(urls)
```

### Image Edit (полный пайплайн)

```python
from scripts.grok_enhance import enhance_prompt
from scripts.loremax_generate import image_edit_gpt15, wait_for_completion, get_result_urls

# Шаг 1: улучшить промпт
enhanced = enhance_prompt("сделай фон зимним", mode="image_edit")
print(enhanced)
# → "Recreate this scene in a winter setting with snow-covered ground..."

# Шаг 2: применить к изображению
result = image_edit_gpt15(
    prompt=enhanced,
    image_url="https://content.loremax.ai/data/2026/02/05/6FckRlPTM8bN.jpg",
    fidelity="high"
)
final = wait_for_completion(result["generationId"], result.get("jobId"))
urls = get_result_urls(final)
print(urls)
```

### Через Grok Imagine (альтернативный бэкенд)

```python
from scripts.grok_enhance import enhance_prompt
from scripts.loremax_generate import text2image_grok, image_edit_grok, wait_for_completion, get_result_urls

# Text 2 Image через Grok Imagine
enhanced = enhance_prompt("futuristic city at night")
result = text2image_grok(enhanced, aspect_ratio="16:9")
final = wait_for_completion(result["generationId"], result.get("jobId"))

# Image Edit через Grok Imagine (image_urls = строка, не массив!)
enhanced = enhance_prompt("add sunglasses", mode="image_edit")
result = image_edit_grok(enhanced, image_url="https://...")
final = wait_for_completion(result["generationId"], result.get("jobId"))
```

---

## CLI-примеры

### pipeline_text2image.py

```bash
# GPT Image 1.5 (по умолчанию)
python scripts/pipeline_text2image.py "кот на крыше на закате"

# GPT Image 1.5 с параметрами
python scripts/pipeline_text2image.py "logo for TechWave" --size 1024x1024 --quality high

# Grok Imagine
python scripts/pipeline_text2image.py "futuristic city" --backend grok --aspect 16:9
```

### pipeline_image_edit.py

```bash
# GPT Image 1.5 Edit
python scripts/pipeline_image_edit.py "сделай фон зимним" "https://content.loremax.ai/data/2026/02/05/6FckRlPTM8bN.jpg"

# С параметрами
python scripts/pipeline_image_edit.py "remove logo" "https://..." --fidelity high --quality high

# Grok Imagine Edit
python scripts/pipeline_image_edit.py "add sunglasses" "https://..." --backend grok
```

### Только улучшение промпта (без генерации)

```bash
python scripts/grok_enhance.py "кот на крыше"
python scripts/grok_enhance.py "убери фон" --mode image_edit
```

### Только генерация (без улучшения)

```bash
python scripts/loremax_generate.py text2image "A cat on a rooftop at sunset..."
python scripts/loremax_generate.py image_edit "Remove background" --image "https://..."
python scripts/loremax_generate.py text2image_grok "A futuristic city"
python scripts/loremax_generate.py image_edit_grok "Add sunglasses" --image "https://..."
```

---

## Матрица пайплайнов

| Сценарий | Enhance mode | Generate function | image_urls тип |
|----------|-------------|-------------------|---------------|
| Text → Image (GPT 1.5) | `text2image` | `text2image_gpt15()` | — |
| Text → Image (Grok) | `text2image` | `text2image_grok()` | — |
| Image + Text → Image (GPT 1.5) | `image_edit` | `image_edit_gpt15()` | массив `[]` |
| Image + Text → Image (Grok) | `image_edit` | `image_edit_grok()` | строка |

---

## Поведение по длине промпта

| Длина | Поведение системы |
|-------|------------------|
| **1-3 слова** | Полное расширение: сцена, субъект, камера, свет, стиль, ограничения |
| **1-2 предложения** | Добавить недостающие детали, перевести на английский |
| **3+ предложений / 100+ слов** | Перевод на английский, минимальная грамматическая правка |

---

## Системные промпты — краткое описание

### text2image_system.txt

Структура расширения: Scene → Subject → Composition → Lighting → Style → Text → Constraints.
Использует фотографическую терминологию (lens, aperture, film grain), конкретные цвета и материалы.
Для текста в изображениях — кавычки + `(verbatim)` + letter-by-letter для сложных слов.

### image_edit_system.txt

Ключевой паттерн: "Change X" + "Do not change anything else" + explicit preserve list.
Покрывает: style transfer, object removal, color change, background swap, lighting change, virtual try-on, compositing, product extraction, text translation.
Для замены фона — всегда пересоздание полной сцены, не простая замена.
