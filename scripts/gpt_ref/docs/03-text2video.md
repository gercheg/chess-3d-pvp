# Text 2 Video — Генерация видео из текста

## Workflow

| Параметр | Значение |
|----------|----------|
| **Workflow ID** | `t2v_grok_imagine_video` |
| **Тип** | Text → Video |
| **Endpoint** | `POST https://loremax.ai/api/v1/workflow/execute` |
| **Описание** | Генерация видео по текстовому промпту с помощью Grok Imagine |

---

## Параметры запроса (inputs)

| Параметр | Тип | Обязательный | По умолчанию | Описание |
|----------|-----|:---:|:---:|----------|
| `prompt` | string | да | — | Текстовое описание видео. Максимум **1800 символов** |
| `duration` | integer | нет | `6` | Длительность видео в секундах: **1–15** |
| `aspect_ratio` | enum | нет | — | Соотношение сторон |
| `resolution` | enum | нет | — | Разрешение видео |
| `seed` | integer | нет | — | Сид для воспроизводимости. Диапазон: **0–2147483647** |

### Допустимые значения `aspect_ratio`

| Значение | Ориентация |
|----------|-----------|
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
  "workflowId": "t2v_grok_imagine_video",
  "inputs": {
    "prompt": "Ocean waves gently crashing on a tropical beach at sunset, palm trees swaying in the breeze, cinematic",
    "duration": 6,
    "aspect_ratio": "16:9",
    "resolution": "720p",
    "seed": 456
  }
}
```

### Альтернативный формат (с числовым workflowId)

При работе через фронтенд Loremax используется числовой ID:

```json
{
  "workflowId": 137,
  "urlType": "main",
  "inputs": {
    "gen_count": 1,
    "prompt": "...",
    "duration": 6,
    "aspect_ratio": "16:9",
    "resolution": "720p"
  },
  "filesCount": 0
}
```

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

function testText2Video(): array
{
    global $apiKey;
    
    echo str_repeat('=', 60) . "\n";
    echo "TEST: Text 2 Video API\n";
    echo "Workflow: " . LoremaxClient::WORKFLOW_TEXT2VIDEO . "\n";
    echo str_repeat('=', 60) . "\n";

    $client = new LoremaxClient($apiKey);

    $inputs = [
        'prompt' => 'Ocean waves gently crashing on a tropical beach at sunset, palm trees swaying in the breeze, cinematic, peaceful atmosphere',
        'duration' => 6,
        'aspect_ratio' => '16:9',
        'resolution' => '720p',
        'seed' => 456
    ];

    echo "\n[INPUT] Request parameters:\n";
    echo "  Prompt: " . substr($inputs['prompt'], 0, 80) . "...\n";
    echo "  Duration: {$inputs['duration']} sec\n";
    echo "  Aspect Ratio: {$inputs['aspect_ratio']}\n";
    echo "  Resolution: {$inputs['resolution']}\n";
    echo "  Seed: {$inputs['seed']}\n";

    try {
        echo "\n[START] Starting video generation...\n";
        $result = $client->executeWorkflow(LoremaxClient::WORKFLOW_TEXT2VIDEO, $inputs);

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

testText2Video();
```

---

## Минимальный пример

```php
<?php
require_once 'LoremaxClient.php';

$client = new LoremaxClient('lmx_prod_sKPSyH8JUcogPO7MW9UhOodd5S4WXS9R');

$result = $client->executeWorkflow('t2v_grok_imagine_video', [
    'prompt' => 'A cat chasing a butterfly through a sunny meadow, slow motion',
    'duration' => 6,
    'resolution' => '720p'
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
    "workflowId": "t2v_grok_imagine_video",
    "inputs": {
      "prompt": "Ocean waves gently crashing on a tropical beach at sunset, cinematic",
      "duration": 6,
      "aspect_ratio": "16:9",
      "resolution": "720p",
      "seed": 456
    }
  }'
```

---

## Примечания

- Генерация видео занимает **значительно больше времени**, чем генерация изображений
- Рекомендуемые настройки поллинга: `maxWait = 600`, `pollInterval = 10`
- `duration` задаёт длительность в секундах (1–15), по умолчанию 6
- Для кинематографического качества используйте ключевые слова: `cinematic`, `slow motion`, `smooth camera movement`
- `720p` — рекомендуемое разрешение, `480p` генерируется быстрее
