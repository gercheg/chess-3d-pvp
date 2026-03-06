"""
Pipeline: Image Edit (полный цикл)

Шаг 1: Grok 4.1 Fast — улучшение промпта редактирования
Шаг 2: Loremax API — применение редактирования к изображению

Поддерживает два бэкенда:
  - GPT Image 1.5 Edit (i2i_gpt_image_15_edit) — по умолчанию
  - Grok Imagine Edit (i2i_grok_imagine_image-edit)

Требования:
    pip install openai requests

Переменные окружения:
    XAI_API_KEY      — ключ для xAI (Grok)
    LOREMAX_API_KEY  — ключ для Loremax
"""

import sys
from grok_enhance import enhance_prompt
from loremax_generate import (
    image_edit_gpt15,
    image_edit_grok,
    wait_for_completion,
    get_result_urls,
)


def run_image_edit(
    user_prompt: str,
    image_url: str,
    backend: str = "gpt15",
    image_size: str = "1024x1024",
    quality: str = "high",
    fidelity: str = "high",
    seed: int | None = None,
    verbose: bool = True,
) -> dict:
    """
    Полный пайплайн: улучшение промпта → редактирование изображения.

    Args:
        user_prompt: Запрос на редактирование (любой язык)
        image_url: URL исходного изображения
        backend: "gpt15" или "grok"
        image_size: Размер для GPT 1.5 (1024x1024, 1536x1024, 1024x1536)
        quality: Качество для GPT 1.5 (high, medium, low)
        fidelity: Точность для GPT 1.5 (high, low)
        seed: Сид для воспроизводимости

    Returns:
        dict с ключами: enhanced_prompt, generation_id, urls, status
    """

    # ── Шаг 1: Улучшение промпта через Grok ──
    if verbose:
        print("=" * 60)
        print("STEP 1: Enhancing edit prompt via Grok 4.1 Fast")
        print(f"  Input: {user_prompt[:80]}{'...' if len(user_prompt) > 80 else ''}")
        print(f"  Image: {image_url[:60]}...")
        print("-" * 60)

    enhanced = enhance_prompt(user_prompt, mode="image_edit")

    if verbose:
        print(f"  Enhanced: {enhanced[:120]}{'...' if len(enhanced) > 120 else ''}")
        print()

    # ── Шаг 2: Редактирование через Loremax ──
    if verbose:
        print("=" * 60)
        print(f"STEP 2: Editing image via Loremax ({backend})")
        print("-" * 60)

    if backend == "gpt15":
        result = image_edit_gpt15(
            prompt=enhanced,
            image_url=image_url,
            image_size=image_size,
            quality=quality,
            fidelity=fidelity,
            seed=seed,
        )
    elif backend == "grok":
        result = image_edit_grok(
            prompt=enhanced,
            image_url=image_url,
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
    if len(sys.argv) < 3:
        print("Usage: python pipeline_image_edit.py <prompt> <image_url> [options]")
        print()
        print("Options:")
        print("  --backend gpt15|grok    Backend (default: gpt15)")
        print("  --size 1024x1024        Image size for GPT 1.5")
        print("  --quality high|medium|low")
        print("  --fidelity high|low")
        print("  --seed 12345")
        print()
        print("Examples:")
        print('  python pipeline_image_edit.py "сделай фон зимним" "https://content.loremax.ai/data/2026/02/05/6FckRlPTM8bN.jpg"')
        print('  python pipeline_image_edit.py "add sunglasses" "https://..." --backend grok')
        print('  python pipeline_image_edit.py "remove logo" "https://..." --fidelity high --quality high')
        sys.exit(1)

    prompt = sys.argv[1]
    image_url = sys.argv[2]
    backend = "gpt15"
    size = "1024x1024"
    quality = "high"
    fidelity = "high"
    seed = None

    args = sys.argv[3:]
    for i, arg in enumerate(args):
        if arg == "--backend" and i + 1 < len(args):
            backend = args[i + 1]
        elif arg == "--size" and i + 1 < len(args):
            size = args[i + 1]
        elif arg == "--quality" and i + 1 < len(args):
            quality = args[i + 1]
        elif arg == "--fidelity" and i + 1 < len(args):
            fidelity = args[i + 1]
        elif arg == "--seed" and i + 1 < len(args):
            seed = int(args[i + 1])

    run_image_edit(
        user_prompt=prompt,
        image_url=image_url,
        backend=backend,
        image_size=size,
        quality=quality,
        fidelity=fidelity,
        seed=seed,
    )
