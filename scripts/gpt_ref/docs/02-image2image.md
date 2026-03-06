# Image 2 Image — Редактирование изображений

## Workflow

| Параметр | Значение |
|----------|----------|
| **Workflow ID** | `i2i_grok_imagine_image-edit` |
| **Тип** | Image + Text → Image |
| **Endpoint** | `POST https://loremax.ai/api/v1/workflow/execute` |
| **Описание** | Трансформация/редактирование изображения по текстовому промпту с помощью Grok Imagine |

---

## Параметры запроса (inputs)

| Параметр | Тип | Обязательный | Описание |
|----------|-----|:---:|----------|
| `prompt` | string | да | Описание желаемых изменений. Максимум **1800 символов** |
| `image_urls` | string | да | URL исходного изображения. **СТРОКА, не массив!** |
| `seed` | integer | нет | Сид для воспроизводимости. Диапазон: **0–2147483647** |

> **ВАЖНО:** Параметр `image_urls` передаётся как **строка** (одиночный URL), а **НЕ** как массив!

---

## Пример JSON-запроса

```json
{
  "workflowId": "i2i_grok_imagine_image-edit",
  "inputs": {
    "prompt": "Transform the animal into a majestic lion with a golden mane",
    "image_urls": "https://content.loremax.ai/data/2026/02/05/6FckRlPTM8bN.jpg",
    "seed": 123
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
$testImageUrl = 'https://content.loremax.ai/data/2026/02/05/6FckRlPTM8bN.jpg';

function testImage2Image(?string $imageUrl = null): array
{
    global $apiKey, $testImageUrl;
    
    echo str_repeat('=', 60) . "\n";
    echo "TEST: Image 2 Image Edit API\n";
    echo "Workflow: " . LoremaxClient::WORKFLOW_IMAGE2IMAGE . "\n";
    echo str_repeat('=', 60) . "\n";

    $client = new LoremaxClient($apiKey);

    // ВАЖНО: image_urls должен быть строкой!
    $inputs = [
        'prompt' => 'Transform the animal into a majestic lion with a golden mane, keep the same pose and background',
        'image_urls' => $imageUrl ?? $testImageUrl,
        'seed' => 123
    ];

    echo "\n[INPUT] Request parameters:\n";
    echo "  Prompt: " . substr($inputs['prompt'], 0, 80) . "...\n";
    echo "  Image URL: " . substr($inputs['image_urls'], 0, 60) . "...\n";
    echo "  Seed: {$inputs['seed']}\n";

    try {
        echo "\n[START] Starting generation...\n";
        $result = $client->executeWorkflow(LoremaxClient::WORKFLOW_IMAGE2IMAGE, $inputs);

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

testImage2Image();
```

---

## Минимальный пример

```php
<?php
require_once 'LoremaxClient.php';

$client = new LoremaxClient('lmx_prod_sKPSyH8JUcogPO7MW9UhOodd5S4WXS9R');

$result = $client->executeWorkflow('i2i_grok_imagine_image-edit', [
    'prompt' => 'Make the person wear sunglasses and a leather jacket',
    'image_urls' => 'https://content.loremax.ai/data/2026/02/05/6FckRlPTM8bN.jpg'
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
    "workflowId": "i2i_grok_imagine_image-edit",
    "inputs": {
      "prompt": "Transform the animal into a majestic lion with a golden mane",
      "image_urls": "https://content.loremax.ai/data/2026/02/05/6FckRlPTM8bN.jpg",
      "seed": 123
    }
  }'
```

---

## Примечания

- **`image_urls` — это строка, не массив!** Передавайте один URL напрямую, без `[]`
- Промпт описывает **желаемые изменения**, а не финальный результат с нуля
- Исходное изображение должно быть доступно по публичному URL
- Рекомендуется указывать в промпте: что изменить, что сохранить (`keep the same pose and background`)
- Генерация асинхронная — поллите статус через `checkStatus()`
