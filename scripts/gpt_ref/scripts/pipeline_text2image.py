"""
Pipeline: Text 2 Image (полный цикл)

Шаг 1: Grok 4.1 Fast — улучшение промпта
Шаг 2: Loremax API — генерация изображения

Поддерживает два бэкенда генерации:
  - GPT Image 1.5 (t2i_gpt_image_15) — по умолчанию
  - Grok Imagine (t2i_grok_imagine_image)

Требования:
    pip install openai requests

Переменные окружения:
    XAI_API_KEY      — ключ для xAI (Grok)
    LOREMAX_API_KEY  — ключ для Loremax
"""

import sys
from grok_enhance import enhance_prompt
from loremax_generate import (
    text2image_gpt15,
    text2image_grok,
    wait_for_completion,
    get_result_urls,
)


def run_text2image(
    user_prompt: str,
    backend: str = "gpt15",
    image_size: str = "1024x1024",
    aspect_ratio: str = "1:1",
    quality: str = "high",
    seed: int | None = None,
    verbose: bool = True,
) -> dict:
    """
    Полный пайплайн: улучшение промпта → генерация изображения.

    Args:
        user_prompt: Промпт пользователя (любой язык, любая длина)
        backend: "gpt15" или "grok"
        image_size: Размер для GPT 1.5 (1024x1024, 1536x1024, 1024x1536)
        aspect_ratio: Соотношение сторон для Grok (16:9, 1:1, 9:16, ...)
        quality: Качество для GPT 1.5 (high, medium, low)
        seed: Сид для воспроизводимости

    Returns:
        dict с ключами: enhanced_prompt, generation_id, urls, status
    """

    # ── Шаг 1: Улучшение промпта через Grok ──
    if verbose:
        print("=" * 60)
        print("STEP 1: Enhancing prompt via Grok 4.1 Fast")
        print(f"  Input: {user_prompt[:80]}{'...' if len(user_prompt) > 80 else ''}")
        print("-" * 60)

    enhanced = enhance_prompt(user_prompt, mode="text2image")

    if verbose:
        print(f"  Enhanced: {enhanced[:120]}{'...' if len(enhanced) > 120 else ''}")
        print()

    # ── Шаг 2: Генерация через Loremax ──
    if verbose:
        print("=" * 60)
        print(f"STEP 2: Generating image via Loremax ({backend})")
        print("-" * 60)

    if backend == "gpt15":
        result = text2image_gpt15(
            prompt=enhanced,
            image_size=image_size,
            quality=quality,
            seed=seed,
        )
    elif backend == "grok":
        result = text2image_grok(
            prompt=enhanced,
            aspect_ratio=aspect_ratio,
            seed=seed,
        )
    else:
        raise ValueError(f"Unknown backend: {backend}. Use 'gpt15' or 'grok'")

    gen_id = result.get("generationId")
    job_id = result.get("jobId")

    if verbose:
        print(f"  Generation ID: {gen_id}")
        print(f"  Job ID: {job_id}")
        print(f"  Tokens: {result.get('tokensCost')}")
        print()
        print("  Polling for completion...")

    final = wait_for_completion(gen_id, job_id, max_wait=300, verbose=verbose)

    urls = get_result_urls(final) if final.get("status") == "completed" else []

    if verbose:
        print()
        if urls:
            print("RESULT — SUCCESS")
            for i, url in enumerate(urls, 1):
                print(f"  [{i}] {url}")
        else:
            print(f"RESULT — FAILED: {final.get('error', 'Unknown')}")
        print("=" * 60)

    return {
        "enhanced_prompt": enhanced,
        "generation_id": gen_id,
        "urls": urls,
        "status": final.get("status"),
    }


# ─── CLI ────────────────────────────────────────────────────────


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python pipeline_text2image.py <prompt> [--backend gpt15|grok] [--size 1024x1024]")
        print()
        print("Examples:")
        print('  python pipeline_text2image.py "кот на крыше на закате"')
        print('  python pipeline_text2image.py "futuristic city" --backend grok --aspect 16:9')
        print('  python pipeline_text2image.py "logo for TechWave" --size 1024x1024 --quality high')
        sys.exit(1)

    prompt = sys.argv[1]
    backend = "gpt15"
    size = "1024x1024"
    aspect = "1:1"
    quality = "high"
    seed = None

    args = sys.argv[2:]
    for i, arg in enumerate(args):
        if arg == "--backend" and i + 1 < len(args):
            backend = args[i + 1]
        elif arg == "--size" and i + 1 < len(args):
            size = args[i + 1]
        elif arg == "--aspect" and i + 1 < len(args):
            aspect = args[i + 1]
        elif arg == "--quality" and i + 1 < len(args):
            quality = args[i + 1]
        elif arg == "--seed" and i + 1 < len(args):
            seed = int(args[i + 1])

    run_text2image(
        user_prompt=prompt,
        backend=backend,
        image_size=size,
        aspect_ratio=aspect,
        quality=quality,
        seed=seed,
    )
