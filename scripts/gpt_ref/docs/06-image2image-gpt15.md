# Image 2 Image GPT Image 1.5 Edit — Редактирование изображений

## Workflow

| Параметр | Значение |
|----------|----------|
| **Workflow ID** | `i2i_gpt_image_15_edit` |
| **Числовой ID (фронтенд)** | `94` |
| **Тип** | Image + Text → Image |
| **Endpoint** | `POST https://loremax.ai/api/v1/workflow/execute` |
| **Описание** | Редактирование/трансформация изображения по текстовому промпту с помощью GPT Image 1.5 |

---

## Параметры запроса (inputs)

| Параметр | Тип | Обязательный | По умолчанию | Описание |
|----------|-----|:---:|:---:|----------|
| `prompt` | string | да | — | Описание желаемых изменений. Максимум **5000 символов** |
| `image_urls` | string | да | — | URL исходного изображения. **СТРОКА, не массив!** (несмотря на OpenAPI спеку) |
| `image_size` | enum | нет | `1024x1024` | Размер выходного изображения |
| `background` | enum | нет | `auto` | Тип фона |
| `quality` | enum | нет | `high` | Уровень качества |
| `fidelity` | enum | нет | `high` | Точность следования исходному изображению |
| `seed` | integer | нет | — | Сид для воспроизводимости. Диапазон: **0–2147483647** |

> **ВАЖНО:** В отличие от Grok Image2Image, здесь `image_urls` — это **массив** `string[]`, а не строка. Максимум 1 изображение в массиве.

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
| `high` | Высокая точность — результат ближе к исходному изображению |
| `low` | Низкая точность — больше свободы для изменений |

---

## Пример JSON-запроса

```json
{
  "workflowId": "i2i_gpt_image_15_edit",
  "inputs": {
    "prompt": "Transform the scene to a winter wonderland with snow-covered trees",
    "image_urls": [
      "https://example.com/image1.jpg"
    ],
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
  "workflowId": 94,
  "urlType": "main",
  "inputs": {
    "gen_count": 1,
    "prompt": "Transform the scene to a winter wonderland with snow-covered trees",
    "image_size": "1024x1024",
    "background": "auto",
    "quality": "high",
    "fidelity": "high"
  },
  "filesCount": 1
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
$testImageUrl = 'https://content.loremax.ai/data/2026/02/05/6FckRlPTM8bN.jpg';

function testImage2ImageGPT15(?string $imageUrl = null): array
{
    global $apiKey, $testImageUrl;

    echo str_repeat('=', 60) . "\n";
    echo "TEST: Image 2 Image GPT Image 1.5 Edit\n";
    echo "Workflow: i2i_gpt_image_15_edit\n";
    echo str_repeat('=', 60) . "\n";

    $client = new LoremaxClient($apiKey);

    $inputs = [
        'prompt' => 'Transform the scene to a winter wonderland with snow-covered trees and soft falling snowflakes',
        'image_urls' => [$imageUrl ?? $testImageUrl],
        'image_size' => '1024x1024',
        'background' => 'auto',
        'quality' => 'high',
        'fidelity' => 'high',
        'seed' => 42
    ];

    echo "\n[INPUT] Request parameters:\n";
    echo "  Prompt: " . substr($inputs['prompt'], 0, 80) . "...\n";
    echo "  Image URL: " . substr($inputs['image_urls'][0], 0, 60) . "...\n";
    echo "  Image Size: {$inputs['image_size']}\n";
    echo "  Background: {$inputs['background']}\n";
    echo "  Quality: {$inputs['quality']}\n";
    echo "  Fidelity: {$inputs['fidelity']}\n";
    echo "  Seed: {$inputs['seed']}\n";

    try {
        echo "\n[START] Starting generation...\n";
        $result = $client->executeWorkflow('i2i_gpt_image_15_edit', $inputs);

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

testImage2ImageGPT15();
```

---

## Минимальный пример

```php
<?php
require_once 'LoremaxClient.php';

$client = new LoremaxClient('lmx_prod_sKPSyH8JUcogPO7MW9UhOodd5S4WXS9R');

$result = $client->executeWorkflow('i2i_gpt_image_15_edit', [
    'prompt' => 'Add sunglasses and a cowboy hat to the person',
    'image_urls' => ['https://content.loremax.ai/data/2026/02/05/6FckRlPTM8bN.jpg'],
    'quality' => 'high'
]);

echo "Generation ID: {$result['generationId']}\n";

$final = $client->waitForCompletion($result['generationId']);
print_r($final['result']['originalUrls']);
```

---

## Пример: удаление фона

```php
<?php
require_once 'LoremaxClient.php';

$client = new LoremaxClient('lmx_prod_sKPSyH8JUcogPO7MW9UhOodd5S4WXS9R');

$result = $client->executeWorkflow('i2i_gpt_image_15_edit', [
    'prompt' => 'Remove the background, keep only the main subject, clean edges',
    'image_urls' => ['https://example.com/photo.jpg'],
    'image_size' => '1024x1024',
    'background' => 'transparent',
    'quality' => 'high',
    'fidelity' => 'high'
]);

$final = $client->waitForCompletion($result['generationId']);
// Результат — PNG с прозрачным фоном
print_r($final['result']['originalUrls']);
```

---

## cURL-пример

```bash
curl -X POST "https://loremax.ai/api/v1/workflow/execute" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: lmx_prod_sKPSyH8JUcogPO7MW9UhOodd5S4WXS9R" \
  -d '{
    "workflowId": "i2i_gpt_image_15_edit",
    "inputs": {
      "prompt": "Transform the scene to a winter wonderland with snow",
      "image_urls": ["https://example.com/image1.jpg"],
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

## Отличия от Grok Image 2 Image

| Параметр | GPT Image 1.5 Edit (`i2i_gpt_image_15_edit`) | Grok Imagine Edit (`i2i_grok_imagine_image-edit`) |
|----------|-----------------------------------------------|--------------------------------------------------|
| Промпт макс. | 5000 символов | 1800 символов |
| `image_urls` тип | **Массив** `string[]` (макс. 1) | **Строка** `string` |
| Размер выхода | `image_size` (пиксели) | — (определяется моделью) |
| Качество | `quality` (high/medium/low) | — |
| Фон | `background` (auto/transparent/opaque) | — |
| Точность | `fidelity` (high/low) | — |

> Ключевое отличие: `image_urls` в GPT Image 1.5 — это **массив**, а в Grok Imagine — **строка**.

---

## Примечания

- `image_urls` — **массив строк**, но максимум **1 изображение**
- Промпт поддерживает до **5000 символов** — можно давать очень детальные инструкции
- `fidelity: high` сохраняет больше деталей исходного изображения
- `fidelity: low` позволяет более радикальные трансформации
- `background: transparent` — полезно для вырезания объекта с фона
- Генерация асинхронная — поллите статус через `checkStatus()`
- При ошибке 429 используйте заголовок `Retry-After` для определения времени ожидания
- Числовой workflow ID для фронтенда Loremax: **94**
