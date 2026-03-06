"""
Loremax API — Image Generation Module

Генерация и редактирование изображений через Loremax API.
Поддержка GPT Image 1.5 (text2image + image edit) и Grok Imagine.

Требования:
    pip install requests

Переменные окружения:
    LOREMAX_API_KEY — ключ для Loremax API
"""

import os
import sys
import time
import json
import requests

LOREMAX_BASE_URL = "https://loremax.ai"
LOREMAX_EXECUTE = f"{LOREMAX_BASE_URL}/api/v1/workflow/execute"
LOREMAX_CHECK = f"{LOREMAX_BASE_URL}/api/v1/generations"


def get_api_key() -> str:
    key = os.environ.get("LOREMAX_API_KEY")
    if not key:
        raise EnvironmentError("LOREMAX_API_KEY not set")
    return key


def _headers() -> dict:
    return {
        "Content-Type": "application/json",
        "X-API-Key": get_api_key(),
    }


def execute_workflow(workflow_id, inputs: dict) -> dict:
    """Запуск workflow, возвращает generationId и jobId."""
    payload = {"workflowId": workflow_id, "inputs": inputs}
    r = requests.post(LOREMAX_EXECUTE, headers=_headers(), json=payload, timeout=30)
    if r.status_code >= 400:
        print(f"  API Error {r.status_code}: {r.text[:300]}")
    r.raise_for_status()
    return r.json()


def check_status(generation_id: int, job_id: str | None = None) -> dict:
    """Проверка статуса генерации."""
    url = f"{LOREMAX_CHECK}/{generation_id}/check"
    body = {"jobId": job_id} if job_id else {}
    r = requests.post(url, headers=_headers(), json=body, timeout=30)
    r.raise_for_status()
    return r.json()


def wait_for_completion(
    generation_id: int,
    job_id: str | None = None,
    max_wait: int = 300,
    poll_interval: int = 5,
    verbose: bool = True,
) -> dict:
    """Поллинг до завершения генерации."""
    start = time.time()
    while time.time() - start < max_wait:
        status = check_status(generation_id, job_id)
        state = status.get("status", "unknown")
        job_state = status.get("jobState", "N/A")

        if verbose:
            elapsed = int(time.time() - start)
            print(f"  [{elapsed}s] status={state} jobState={job_state}")

        if status.get("completed"):
            return status

        time.sleep(poll_interval)

    raise TimeoutError(f"Generation {generation_id} not completed in {max_wait}s")


# ─── High-level API ────────────────────────────────────────────


def text2image_gpt15(
    prompt: str,
    image_size: str = "1024x1024",
    quality: str = "high",
    background: str = "auto",
    fidelity: str = "high",
    seed: int | None = None,
) -> dict:
    """GPT Image 1.5 — Text 2 Image (workflow t2i_gpt_image_15 / ID 93)."""
    inputs = {
        "prompt": prompt,
        "image_size": image_size,
        "quality": quality,
        "background": background,
        "fidelity": fidelity,
    }
    if seed is not None:
        inputs["seed"] = seed

    return execute_workflow("t2i_gpt_image_15", inputs)


def image_edit_gpt15(
    prompt: str,
    image_url: str,
    image_size: str = "1024x1024",
    quality: str = "high",
    background: str = "auto",
    fidelity: str = "high",
    seed: int | None = None,
) -> dict:
    """GPT Image 1.5 — Image Edit (workflow i2i_gpt_image_15_edit / ID 94).

    ВАЖНО: image_urls — строка, не массив (несмотря на документацию API).
    """
    inputs = {
        "prompt": prompt,
        "image_urls": image_url,
        "image_size": image_size,
        "quality": quality,
        "background": background,
        "fidelity": fidelity,
    }
    if seed is not None:
        inputs["seed"] = seed

    return execute_workflow("i2i_gpt_image_15_edit", inputs)


def text2image_grok(
    prompt: str,
    aspect_ratio: str = "1:1",
    seed: int | None = None,
) -> dict:
    """Grok Imagine — Text 2 Image (workflow: t2i_grok_imagine_image)."""
    inputs = {"prompt": prompt, "aspect_ratio": aspect_ratio}
    if seed is not None:
        inputs["seed"] = seed

    return execute_workflow("t2i_grok_imagine_image", inputs)


def image_edit_grok(
    prompt: str,
    image_url: str,
    seed: int | None = None,
) -> dict:
    """Grok Imagine — Image Edit (workflow: i2i_grok_imagine_image-edit).

    ВАЖНО: image_urls здесь строка, не массив.
    """
    inputs = {"prompt": prompt, "image_urls": image_url}
    if seed is not None:
        inputs["seed"] = seed

    return execute_workflow("i2i_grok_imagine_image-edit", inputs)


def get_result_urls(status: dict) -> list[str]:
    """Извлечь URL из завершённой генерации."""
    result = status.get("result", {})
    return result.get("originalUrls", []) or result.get("previewUrls", [])


# ─── CLI ────────────────────────────────────────────────────────


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage:")
        print('  python loremax_generate.py text2image "prompt"')
        print('  python loremax_generate.py image_edit "prompt" --image "https://..."')
        print()
        print("Pipelines: text2image, image_edit, text2image_grok, image_edit_grok")
        sys.exit(1)

    pipeline = sys.argv[1]
    prompt = sys.argv[2]
    image_url = None

    if "--image" in sys.argv:
        idx = sys.argv.index("--image")
        if idx + 1 < len(sys.argv):
            image_url = sys.argv[idx + 1]

    print(f"Pipeline: {pipeline}")
    print(f"Prompt: {prompt[:80]}...")
    print("-" * 60)

    if pipeline == "text2image":
        result = text2image_gpt15(prompt)
    elif pipeline == "image_edit":
        if not image_url:
            print("ERROR: --image required for image_edit")
            sys.exit(1)
        result = image_edit_gpt15(prompt, image_url)
    elif pipeline == "text2image_grok":
        result = text2image_grok(prompt)
    elif pipeline == "image_edit_grok":
        if not image_url:
            print("ERROR: --image required for image_edit_grok")
            sys.exit(1)
        result = image_edit_grok(prompt, image_url)
    else:
        print(f"Unknown pipeline: {pipeline}")
        sys.exit(1)

    gen_id = result.get("generationId")
    job_id = result.get("jobId")
    print(f"Generation ID: {gen_id}")
    print(f"Job ID: {job_id}")
    print(f"Tokens Cost: {result.get('tokensCost')}")
    print("-" * 60)

    print("Polling for completion...")
    final = wait_for_completion(gen_id, job_id, max_wait=600, poll_interval=5)

    if final.get("status") == "completed":
        urls = get_result_urls(final)
        print(f"\nCompleted! URLs:")
        for i, url in enumerate(urls, 1):
            print(f"  [{i}] {url}")
    else:
        print(f"\nFailed: {final.get('error', 'Unknown error')}")
