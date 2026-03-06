# Image 2 Video — Генерация видео из изображения

## Workflow

| Параметр | Значение |
|----------|----------|
| **Workflow ID** | `i2v_grok_imagine_video` |
| **Тип** | Image + Text → Video |
| **Endpoint** | `POST https://loremax.ai/api/v1/workflow/execute` |
| **Описание** | Генерация видео из изображения с текстовым промптом с помощью Grok Imagine |

---

## Параметры запроса (inputs)

| Параметр | Тип | Обязательный | По умолчанию | Описание |
|----------|-----|:---:|:---:|----------|
| `prompt` | string | да | — | Описание движения/анимации. Максимум **1800 символов** |
| `image_urls` | string | да | — | URL исходного изображения. **СТРОКА, не массив!** |
| `duration` | integer | нет | `6` | Длительность видео в секундах: **1–15** |
| `aspect_ratio` | enum | нет | — | Соотношение сторон |
| `resolution` | enum | нет | — | Разрешение видео |
| `seed` | integer | нет | — | Сид для воспроизводимости. Диапазон: **0–2147483647** |

> **ВАЖНО:** Параметр `image_urls` передаётся как **строка** (одиночный URL), а **НЕ** как массив!

### Допустимые значения `aspect_ratio`

| Значение | Ориентация |
|----------|-----------|
| `auto` | Автоматически (по исходному изображению) |
| `16:9` | Горизонтальная (стандарт) |
| `4:3` | Горизонтальная |
| `3:2` | Горизонтальная |
| `1:1` | Квадрат |
| `2:3` | Вертикальная |
| `3:4` | Вертикальная |
| `9:16` | Вертикальная (стандарт) |

### Допустимые значения `resolution`

| Значение | Описание |
|----------|----------|
| `480p` | Низкое разрешение (быстрее) |
| `720p` | HD-разрешение (рекомендуется) |

---

## Пример JSON-запроса

```json
{
  "workflowId": "i2v_grok_imagine_video",
  "inputs": {
    "prompt": "Gentle camera zoom in, clouds slowly moving across the sky, birds flying in the distance",
    "image_urls": "https://content.loremax.ai/data/2026/02/05/6FckRlPTM8bN.jpg",
    "duration": 6,
    "resolution": "720p",
    "aspect_ratio": "auto",
    "seed": 789
  }
}
```

### Альтернативный формат (с числовым workflowId)

При работе через фронтенд Loremax используется числовой ID и массив `image_urls`:

```json
{
  "workflowId": 138,
  "urlType": "main",
  "inputs": {
    "gen_count": 1,
    "prompt": "...",
    "duration": 6,
    "resolution": "720p",
    "aspect_ratio": "auto",
    "image_urls": [
      "https://content.loremax.ai/data/2026/02/03/qriroy0XDql0.png"
    ]
  },
  "filesCount": 1
}
```

> **Обратите внимание:** через API (external) `image_urls` — строка. Через фронтенд — массив. При интеграции используйте строку.

---

## Пример ответа

```json
{
  "generationId": 12345,
  "status": "pending",
  "tokensCost": 50,
  "checkStatusUrl": "/api/v1/generations/12345",
  "async": true,
  "jobId": "job_xyz789"
}
```

---

## Пример на PHP

```php
<?php
require_once __DIR__ . '/LoremaxClient.php';

$apiKey = 'lmx_prod_sKPSyH8JUcogPO7MW9UhOodd5S4WXS9R';
$testImageUrl = 'https://content.loremax.ai/data/2026/02/05/6FckRlPTM8bN.jpg';

function testImage2Video(?string $imageUrl = null): array
{
    global $apiKey, $testImageUrl;
    
    echo str_repeat('=', 60) . "\n";
    echo "TEST: Image 2 Video API\n";
    echo "Workflow: " . LoremaxClient::WORKFLOW_IMAGE2VIDEO . "\n";
    echo str_repeat('=', 60) . "\n";

    $client = new LoremaxClient($apiKey);

    // ВАЖНО: image_urls должен быть строкой!
    $inputs = [
        'prompt' => 'Gentle camera zoom in, clouds slowly moving across the sky, birds flying in the distance, subtle wind movement',
        'image_urls' => $imageUrl ?? $testImageUrl,
        'duration' => 6,
        'resolution' => '720p',
        'aspect_ratio' => 'auto',
        'seed' => 789
    ];

    echo "\n[INPUT] Request parameters:\n";
    echo "  Prompt: " . substr($inputs['prompt'], 0, 80) . "...\n";
    echo "  Image URL: " . substr($inputs['image_urls'], 0, 60) . "...\n";
    echo "  Duration: {$inputs['duration']} sec\n";
    echo "  Resolution: {$inputs['resolution']}\n";
    echo "  Aspect Ratio: {$inputs['aspect_ratio']}\n";
    echo "  Seed: {$inputs['seed']}\n";

    try {
        echo "\n[START] Starting video from image generation...\n";
        $result = $client->executeWorkflow(LoremaxClient::WORKFLOW_IMAGE2VIDEO, $inputs);

        echo "\n[OK] Generation started!\n";
        echo "  Generation ID: " . ($result['generationId'] ?? 'N/A') . "\n";
        echo "  Status: " . ($result['status'] ?? 'N/A') . "\n";
        echo "  Tokens Cost: " . ($result['tokensCost'] ?? 'N/A') . "\n";
        echo "  Job ID: " . ($result['jobId'] ?? 'N/A') . "\n";

        $generationId = $result['generationId'] ?? null;

        if ($generationId) {
            echo "\n[WAIT] Waiting for completion (video takes longer)...\n";
            // Увеличенное время ожидания для видео
            $finalStatus = $client->waitForCompletion($generationId, 600, 10);

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

testImage2Video();
```

---

## Минимальный пример

```php
<?php
require_once 'LoremaxClient.php';

$client = new LoremaxClient('lmx_prod_sKPSyH8JUcogPO7MW9UhOodd5S4WXS9R');

$result = $client->executeWorkflow('i2v_grok_imagine_video', [
    'prompt' => 'Smooth camera pan, gentle wind moving through the scene',
    'image_urls' => 'https://content.loremax.ai/data/2026/02/05/6FckRlPTM8bN.jpg',
    'duration' => 6,
    'resolution' => '720p',
    'aspect_ratio' => 'auto'
]);

echo "Generation ID: {$result['generationId']}\n";

// Видео генерируется дольше — увеличиваем таймаут и интервал
$final = $client->waitForCompletion($result['generationId'], 600, 10);
print_r($final['result']['originalUrls']);
```

---

## cURL-пример

```bash
curl -X POST https://loremax.ai/api/v1/workflow/execute \
  -H "Content-Type: application/json" \
  -H "X-API-Key: lmx_prod_sKPSyH8JUcogPO7MW9UhOodd5S4WXS9R" \
  -d '{
    "workflowId": "i2v_grok_imagine_video",
    "inputs": {
      "prompt": "Gentle camera zoom in, clouds slowly moving across the sky",
      "image_urls": "https://content.loremax.ai/data/2026/02/05/6FckRlPTM8bN.jpg",
      "duration": 6,
      "resolution": "720p",
      "aspect_ratio": "auto",
      "seed": 789
    }
  }'
```

---

## Примечания

- **`image_urls` — строка, не массив!** Передавайте один URL напрямую
- `aspect_ratio: "auto"` — рекомендуемое значение, подстраивается под исходное изображение
- Промпт описывает **движение и анимацию**, а не статичную картинку
- Полезные ключевые слова для промпта:
  - `camera zoom in/out` — приближение/отдаление камеры
  - `camera pan left/right` — панорамирование
  - `slow motion` — замедленная съёмка
  - `subtle wind movement` — лёгкое движение ветра
  - `clouds moving` — движение облаков
- Генерация видео занимает **значительно больше времени**, чем изображений
- Рекомендуемые настройки поллинга: `maxWait = 600`, `pollInterval = 10`
- Числовой workflow ID для фронтенда Loremax: **138**
