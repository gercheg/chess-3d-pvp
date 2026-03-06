# Text 2 Image GPT Image 1.5 — Генерация изображений

## Workflow

| Параметр | Значение |
|----------|----------|
| **Workflow ID** | `t2i_gpt_image_15` |
| **Числовой ID (фронтенд)** | `93` |
| **Тип** | Text → Image |
| **Endpoint** | `POST https://loremax.ai/api/v1/workflow/execute` |
| **Описание** | Генерация изображения по текстовому промпту с помощью GPT Image 1.5 |

---

## Параметры запроса (inputs)

| Параметр | Тип | Обязательный | По умолчанию | Описание |
|----------|-----|:---:|:---:|----------|
| `prompt` | string | да | — | Текстовое описание изображения. Максимум **5000 символов** |
| `image_size` | enum | нет | `1024x1024` | Размер изображения |
| `background` | enum | нет | `auto` | Тип фона |
| `quality` | enum | нет | `high` | Уровень качества |
| `fidelity` | enum | нет | `high` | Точность следования промпту |
| `seed` | integer | нет | — | Сид для воспроизводимости. Диапазон: **0–2147483647** |

### Допустимые значения `image_size`

| Значение | Размер | Ориентация |
|----------|--------|-----------|
| `1024x1024` | 1024 x 1024 px | Квадрат |
| `1536x1024` | 1536 x 1024 px | Горизонтальная |
| `1024x1536` | 1024 x 1536 px | Вертикальная |

### Допустимые значения `background`

| Значение | Описание |
|----------|----------|
| `auto` | Автоматический выбор |
| `transparent` | Прозрачный фон (PNG) |
| `opaque` | Непрозрачный фон |

### Допустимые значения `quality`

| Значение | Описание |
|----------|----------|
| `high` | Высокое качество (медленнее) |
| `medium` | Среднее качество |
| `low` | Низкое качество (быстрее) |

### Допустимые значения `fidelity`

| Значение | Описание |
|----------|----------|
| `high` | Высокая точность следования промпту |
| `low` | Низкая точность (больше свободы модели) |

---

## Пример JSON-запроса

```json
{
  "workflowId": "t2i_gpt_image_15",
  "inputs": {
    "prompt": "A beautiful sunset over mountains, photorealistic, golden hour",
    "image_size": "1024x1024",
    "background": "auto",
    "quality": "high",
    "fidelity": "high",
    "seed": 12345
  }
}
```

### Альтернативный формат (фронтенд Loremax)

```json
{
  "workflowId": 93,
  "urlType": "main",
  "inputs": {
    "gen_count": 1,
    "prompt": "A beautiful sunset over mountains, photorealistic, golden hour",
    "image_size": "1024x1024",
    "background": "auto",
    "quality": "high",
    "fidelity": "high"
  },
  "filesCount": 0
}
```

---

## Пример ответа

### Успешный запуск (200)

```json
{
  "generationId": 12345,
  "status": "pending",
  "tokensCost": 10,
  "checkStatusUrl": "/api/v1/generations/12345/check",
  "executionTime": 922,
  "async": true,
  "jobId": "dc1a31d4-8a57-4443-ad31-0c1d3ea34302"
}
```

### Завершённая генерация (200)

```json
{
  "generationId": 12345,
  "status": "completed",
  "completed": true,
  "message": "Job completed successfully",
  "result": {
    "previewUrls": ["https://content.loremax.ai/preview/abc123.png"],
    "originalUrls": ["https://content.loremax.ai/original/abc123.png"],
    "externalUrls": [],
    "contentTypes": ["image/png"]
  }
}
```

---

## Коды ошибок

| HTTP | Описание | Пример ответа |
|------|----------|--------------|
| 400 | Ошибка валидации | `{"error": "Validation error", "message": "Missing required fields: inputs.prompt"}` |
| 401 | Невалидный API-ключ | `{"error": "Invalid API key"}` |
| 402 | Недостаточно токенов | `{"error": "Insufficient tokens", "required": 10}` |
| 429 | Превышен rate limit | `{"error": "Rate limit exceeded", "retryAfter": 30}` |
| 500 | Ошибка сервера | `{"error": "Internal server error"}` |
| 503 | Сервис недоступен | `{"error": "Service temporarily unavailable"}` |

---

## Пример на PHP

```php
<?php
require_once __DIR__ . '/LoremaxClient.php';

$apiKey = 'lmx_prod_sKPSyH8JUcogPO7MW9UhOodd5S4WXS9R';

function testText2ImageGPT15(): array
{
    global $apiKey;

    echo str_repeat('=', 60) . "\n";
    echo "TEST: Text 2 Image GPT Image 1.5\n";
    echo "Workflow: t2i_gpt_image_15\n";
    echo str_repeat('=', 60) . "\n";

    $client = new LoremaxClient($apiKey);

    $inputs = [
        'prompt' => 'A beautiful sunset over mountains, photorealistic, golden hour lighting, dramatic clouds',
        'image_size' => '1024x1024',
        'background' => 'auto',
        'quality' => 'high',
        'fidelity' => 'high',
        'seed' => 12345
    ];

    echo "\n[INPUT] Request parameters:\n";
    echo "  Prompt: " . substr($inputs['prompt'], 0, 80) . "...\n";
    echo "  Image Size: {$inputs['image_size']}\n";
    echo "  Background: {$inputs['background']}\n";
    echo "  Quality: {$inputs['quality']}\n";
    echo "  Fidelity: {$inputs['fidelity']}\n";
    echo "  Seed: {$inputs['seed']}\n";

    try {
        echo "\n[START] Starting generation...\n";
        $result = $client->executeWorkflow('t2i_gpt_image_15', $inputs);

        echo "\n[OK] Generation started!\n";
        echo "  Generation ID: " . ($result['generationId'] ?? 'N/A') . "\n";
        echo "  Status: " . ($result['status'] ?? 'N/A') . "\n";
        echo "  Tokens Cost: " . ($result['tokensCost'] ?? 'N/A') . "\n";
        echo "  Job ID: " . ($result['jobId'] ?? 'N/A') . "\n";

        $generationId = $result['generationId'] ?? null;

        if ($generationId) {
            echo "\n[WAIT] Waiting for completion...\n";
            $finalStatus = $client->waitForCompletion($generationId, 180);

            echo "\n" . str_repeat('=', 60) . "\n";

            if (($finalStatus['status'] ?? '') === 'completed') {
                echo "[SUCCESS] GENERATION COMPLETED!\n";
                $resultData = $finalStatus['result'] ?? [];

                echo "\n[RESULT] Results:\n";
                foreach ($resultData['originalUrls'] ?? [] as $i => $url) {
                    echo "  Original [" . ($i + 1) . "]: $url\n";
                }
                foreach ($resultData['previewUrls'] ?? [] as $i => $url) {
                    echo "  Preview [" . ($i + 1) . "]: $url\n";
                }
                echo "\n  Content Types: " . implode(', ', $resultData['contentTypes'] ?? []) . "\n";
            } else {
                echo "[FAILED] GENERATION FAILED\n";
                echo "  Error: " . ($finalStatus['error'] ?? 'Unknown') . "\n";
                echo "  Error Type: " . ($finalStatus['errorType'] ?? 'Unknown') . "\n";
            }
        }

        return $result;

    } catch (Exception $e) {
        echo "\n[ERROR] Error: " . $e->getMessage() . "\n";
        throw $e;
    }
}

testText2ImageGPT15();
```

---

## Минимальный пример

```php
<?php
require_once 'LoremaxClient.php';

$client = new LoremaxClient('lmx_prod_sKPSyH8JUcogPO7MW9UhOodd5S4WXS9R');

$result = $client->executeWorkflow('t2i_gpt_image_15', [
    'prompt' => 'Cute cartoon cat playing guitar, digital art',
    'image_size' => '1024x1024',
    'quality' => 'high'
]);

echo "Generation ID: {$result['generationId']}\n";

$final = $client->waitForCompletion($result['generationId']);
print_r($final['result']['originalUrls']);
```

---

## Пример с прозрачным фоном

```php
<?php
require_once 'LoremaxClient.php';

$client = new LoremaxClient('lmx_prod_sKPSyH8JUcogPO7MW9UhOodd5S4WXS9R');

$result = $client->executeWorkflow('t2i_gpt_image_15', [
    'prompt' => 'A red sports car, studio lighting, no background',
    'image_size' => '1536x1024',
    'background' => 'transparent',
    'quality' => 'high',
    'fidelity' => 'high'
]);

$final = $client->waitForCompletion($result['generationId']);
// Результат будет PNG с прозрачным фоном
print_r($final['result']['originalUrls']);
```

---

## cURL-пример

```bash
curl -X POST "https://loremax.ai/api/v1/workflow/execute" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: lmx_prod_sKPSyH8JUcogPO7MW9UhOodd5S4WXS9R" \
  -d '{
    "workflowId": "t2i_gpt_image_15",
    "inputs": {
      "prompt": "A beautiful sunset over mountains, photorealistic",
      "image_size": "1024x1024",
      "background": "auto",
      "quality": "high",
      "fidelity": "high",
      "seed": 12345
    }
  }'
```

### Проверка статуса

```bash
curl -X POST "https://loremax.ai/api/v1/generations/12345/check" \
  -H "X-API-Key: lmx_prod_sKPSyH8JUcogPO7MW9UhOodd5S4WXS9R"
```

---

## Отличия от Grok Text 2 Image

| Параметр | GPT Image 1.5 (`t2i_gpt_image_15`) | Grok Imagine (`t2i_grok_imagine_image`) |
|----------|-------------------------------------|----------------------------------------|
| Промпт макс. | 5000 символов | 1800 символов |
| Размер | `image_size` (пиксели) | `aspect_ratio` (соотношение) |
| Качество | `quality` (high/medium/low) | — |
| Фон | `background` (auto/transparent/opaque) | — |
| Точность | `fidelity` (high/low) | — |

---

## Примечания

- Промпт поддерживает до **5000 символов** (в 2.7x больше, чем Grok Imagine)
- `background: transparent` возвращает PNG с альфа-каналом — удобно для наложений
- `fidelity: high` — модель точнее следует промпту; `low` — больше «творческой свободы»
- `quality: high` даёт лучшее качество, но генерация медленнее
- Генерация асинхронная — поллите статус через `checkStatus()`
- При ошибке 429 используйте заголовок `Retry-After` для определения времени ожидания
