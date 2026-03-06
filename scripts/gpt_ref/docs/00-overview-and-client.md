# Loremax Grok API — Общий обзор и PHP-клиент

## Обзор

Loremax Grok API предоставляет 4 пайплайна для генерации изображений и видео:

| # | Пайплайн | Workflow ID | Описание |
|---|----------|-------------|----------|
| 1 | Text 2 Image (Grok) | `t2i_grok_imagine_image` | Генерация изображения из текстового промпта |
| 2 | Image 2 Image (Grok) | `i2i_grok_imagine_image-edit` | Редактирование/трансформация изображения по промпту |
| 3 | Text 2 Video (Grok) | `t2v_grok_imagine_video` | Генерация видео из текстового промпта |
| 4 | Image 2 Video (Grok) | `i2v_grok_imagine_video` | Генерация видео из изображения + промпта |
| 5 | Text 2 Image (GPT 1.5) | `t2i_gpt_image_15` | Генерация изображения через GPT Image 1.5 |
| 6 | Image 2 Image (GPT 1.5) | `i2i_gpt_image_15_edit` | Редактирование изображения через GPT Image 1.5 |

---

## Аутентификация

Все запросы требуют API-ключ в заголовке `X-API-Key`.

```
X-API-Key: lmx_prod_sKPSyH8JUcogPO7MW9UhOodd5S4WXS9R
```

---

## Общая структура запроса

**Endpoint:** `POST https://loremax.ai/api/v1/workflow/execute`

**Headers:**
```
Content-Type: application/json
X-API-Key: <your_api_key>
```

**Body:**
```json
{
  "workflowId": "<workflow_id>",
  "inputs": { ... }
}
```

---

## Проверка статуса генерации

**Endpoint:** `POST https://loremax.ai/api/v1/generations/{id}/check`

Генерация — асинхронный процесс. После запуска workflow нужно поллить статус:

| Статус | Описание |
|--------|----------|
| `checking` | Генерация в процессе |
| `completed` | Генерация завершена |
| `failed` | Ошибка генерации |

**Job State:**
- `IN_QUEUE` — в очереди
- `IN_PROGRESS` — выполняется
- `COMPLETED` — завершено
- `FAILED` — ошибка

### Пример ответа (завершено)

```json
{
  "generationId": 12345,
  "status": "completed",
  "completed": true,
  "result": {
    "previewUrls": ["https://cdn.loremax.ai/preview/abc123.jpg"],
    "originalUrls": ["https://cdn.loremax.ai/original/abc123.jpg"],
    "externalUrls": [],
    "contentTypes": ["image"]
  }
}
```

---

## Rate Limits

Лимиты применяются по API-ключу. Проверяйте заголовки ответа:
- `X-RateLimit-Limit-Minute`
- `X-RateLimit-Limit-Hour`
- `X-RateLimit-Remaining-Minute`
- `X-RateLimit-Remaining-Hour`

---

## Коды ошибок

| HTTP Code | Описание |
|-----------|----------|
| 400 | Невалидный запрос |
| 401 | Отсутствует или невалидный API-ключ |
| 402 | Недостаточно токенов |
| 403 | Workflow недоступен для организации |
| 404 | Workflow не найден |
| 500 | Ошибка выполнения |

---

## PHP-клиент: LoremaxClient

Универсальный клиент для всех 4 пайплайнов.

```php
<?php
/**
 * Loremax Grok API Client
 * Базовый клиент для работы с Loremax API
 */

class LoremaxClient
{
    private const BASE_URL = 'https://loremax.ai';
    private string $apiKey;

    // Workflow IDs
    public const WORKFLOW_TEXT2IMAGE = 't2i_grok_imagine_image';
    public const WORKFLOW_IMAGE2IMAGE = 'i2i_grok_imagine_image-edit';
    public const WORKFLOW_TEXT2VIDEO = 't2v_grok_imagine_video';
    public const WORKFLOW_IMAGE2VIDEO = 'i2v_grok_imagine_video';

    public function __construct(string $apiKey)
    {
        $this->apiKey = $apiKey;
    }

    /**
     * Выполнение HTTP-запроса
     */
    private function request(string $method, string $endpoint, ?array $data = null): array
    {
        $url = self::BASE_URL . $endpoint;
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'X-API-Key: ' . $this->apiKey
        ]);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            if ($data !== null) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
            }
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            throw new Exception("CURL Error: $error");
        }

        $result = json_decode($response, true);
        
        if ($httpCode >= 400) {
            $errorMsg = $result['error'] ?? $result['message'] ?? 'Unknown error';
            throw new Exception("HTTP $httpCode: $errorMsg\nResponse: $response");
        }

        return $result;
    }

    /**
     * Запуск workflow
     */
    public function executeWorkflow(string $workflowId, array $inputs): array
    {
        return $this->request('POST', '/api/v1/workflow/execute', [
            'workflowId' => $workflowId,
            'inputs' => $inputs
        ]);
    }

    /**
     * Проверка статуса генерации
     */
    public function checkStatus(int $generationId): array
    {
        return $this->request('POST', "/api/v1/generations/$generationId/check");
    }

    /**
     * Ожидание завершения генерации
     *
     * @param int $generationId  ID генерации
     * @param int $maxWait       Максимальное время ожидания (сек), по умолчанию 300
     * @param int $pollInterval  Интервал поллинга (сек), по умолчанию 5
     */
    public function waitForCompletion(int $generationId, int $maxWait = 300, int $pollInterval = 5): array
    {
        $startTime = time();

        while (time() - $startTime < $maxWait) {
            $status = $this->checkStatus($generationId);
            
            $statusText = $status['status'] ?? 'unknown';
            $jobState = $status['jobState'] ?? 'N/A';
            echo "  Status: $statusText | JobState: $jobState\n";

            if (!empty($status['completed'])) {
                return $status;
            }

            sleep($pollInterval);
        }

        throw new Exception("Generation $generationId did not complete in $maxWait seconds");
    }
}
```

### Быстрый старт

```php
<?php
require_once 'LoremaxClient.php';

$client = new LoremaxClient('lmx_prod_sKPSyH8JUcogPO7MW9UhOodd5S4WXS9R');

// Запуск генерации
$result = $client->executeWorkflow(LoremaxClient::WORKFLOW_TEXT2IMAGE, [
    'prompt' => 'A beautiful sunset over mountains'
]);

// Ожидание результата
$final = $client->waitForCompletion($result['generationId']);

// Получение URL-ов
$urls = $final['result']['originalUrls'];
```

---

## Структура файлов документации

| Файл | Содержимое |
|------|-----------|
| `00-overview-and-client.md` | Этот файл — общий обзор и PHP-клиент |
| `01-text2image.md` | Grok Text 2 Image — генерация изображений из текста |
| `02-image2image.md` | Grok Image 2 Image — редактирование изображений |
| `03-text2video.md` | Grok Text 2 Video — генерация видео из текста |
| `04-image2video.md` | Grok Image 2 Video — генерация видео из изображения |
| `05-text2image-gpt15.md` | GPT Image 1.5 Text 2 Image — генерация изображений |
| `06-image2image-gpt15.md` | GPT Image 1.5 Image 2 Image Edit — редактирование изображений |
