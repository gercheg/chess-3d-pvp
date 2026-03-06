# Text 2 Image — Генерация изображений из текста

## Workflow

| Параметр | Значение |
|----------|----------|
| **Workflow ID** | `t2i_grok_imagine_image` |
| **Тип** | Text → Image |
| **Endpoint** | `POST https://loremax.ai/api/v1/workflow/execute` |
| **Описание** | Генерация изображения по текстовому промпту с помощью Grok Imagine |

---

## Параметры запроса (inputs)

| Параметр | Тип | Обязательный | Описание |
|----------|-----|:---:|----------|
| `prompt` | string | да | Текстовое описание изображения. Максимум **1800 символов** |
| `aspect_ratio` | enum | нет | Соотношение сторон изображения |
| `seed` | integer | нет | Сид для воспроизводимости результата. Диапазон: **0–2147483647** |

### Допустимые значения `aspect_ratio`

| Значение | Ориентация |
|----------|-----------|
| `2:1` | Широкая горизонтальная |
| `20:9` | Широкая горизонтальная |
| `19.5:9` | Широкая горизонтальная |
| `16:9` | Горизонтальная (стандарт) |
| `4:3` | Горизонтальная |
| `3:2` | Горизонтальная |
| `1:1` | Квадрат |
| `2:3` | Вертикальная |
| `3:4` | Вертикальная |
| `9:16` | Вертикальная (стандарт) |
| `9:19.5` | Узкая вертикальная |
| `9:20` | Узкая вертикальная |
| `1:2` | Узкая вертикальная |

---

## Пример JSON-запроса

```json
{
  "workflowId": "t2i_grok_imagine_image",
  "inputs": {
    "prompt": "A majestic snow leopard sitting on a mountain peak at sunset, photorealistic, detailed fur, golden hour lighting",
    "aspect_ratio": "16:9",
    "seed": 42
  }
}
```

---

## Пример ответа

```json
{
  "generationId": 12345,
  "status": "pending",
  "tokensCost": 10,
  "checkStatusUrl": "/api/v1/generations/12345",
  "async": true,
  "jobId": "job_abc123"
}
```

---

## Пример на PHP

```php
<?php
require_once __DIR__ . '/LoremaxClient.php';

$apiKey = 'lmx_prod_sKPSyH8JUcogPO7MW9UhOodd5S4WXS9R';

function testText2Image(): array
{
    global $apiKey;
    
    echo str_repeat('=', 60) . "\n";
    echo "TEST: Text 2 Image API\n";
    echo "Workflow: " . LoremaxClient::WORKFLOW_TEXT2IMAGE . "\n";
    echo str_repeat('=', 60) . "\n";

    $client = new LoremaxClient($apiKey);

    $inputs = [
        'prompt' => 'A majestic snow leopard sitting on a mountain peak at sunset, photorealistic, detailed fur, golden hour lighting',
        'aspect_ratio' => '16:9',
        'seed' => 42
    ];

    echo "\n[INPUT] Request parameters:\n";
    echo "  Prompt: " . substr($inputs['prompt'], 0, 80) . "...\n";
    echo "  Aspect Ratio: {$inputs['aspect_ratio']}\n";
    echo "  Seed: {$inputs['seed']}\n";

    try {
        echo "\n[START] Starting generation...\n";
        $result = $client->executeWorkflow(LoremaxClient::WORKFLOW_TEXT2IMAGE, $inputs);

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

testText2Image();
```

---

## Минимальный пример

```php
<?php
require_once 'LoremaxClient.php';

$client = new LoremaxClient('lmx_prod_sKPSyH8JUcogPO7MW9UhOodd5S4WXS9R');

$result = $client->executeWorkflow('t2i_grok_imagine_image', [
    'prompt' => 'Cute cartoon cat playing guitar, digital art'
]);

echo "Generation ID: {$result['generationId']}\n";

$final = $client->waitForCompletion($result['generationId']);
print_r($final['result']['originalUrls']);
```

---

## cURL-пример

```bash
curl -X POST https://loremax.ai/api/v1/workflow/execute \
  -H "Content-Type: application/json" \
  -H "X-API-Key: lmx_prod_sKPSyH8JUcogPO7MW9UhOodd5S4WXS9R" \
  -d '{
    "workflowId": "t2i_grok_imagine_image",
    "inputs": {
      "prompt": "A majestic snow leopard sitting on a mountain peak at sunset",
      "aspect_ratio": "16:9",
      "seed": 42
    }
  }'
```

---

## Примечания

- Промпт поддерживает детализированные описания до 1800 символов
- Рекомендуется включать в промпт стилевые указания: `photorealistic`, `digital art`, `oil painting` и т.д.
- `seed` позволяет воспроизвести один и тот же результат при идентичных параметрах
- Генерация асинхронная — после запуска нужно поллить статус через `checkStatus()`
