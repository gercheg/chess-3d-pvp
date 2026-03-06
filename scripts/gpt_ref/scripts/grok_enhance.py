"""
Grok 4.1 Fast — Prompt Enhancement Module

Улучшение пользовательских промптов через Grok 4.1 Fast (non-reasoning)
для последующей генерации через Loremax API.

Требования:
    pip install openai

Переменные окружения:
    XAI_API_KEY — ключ для xAI API
"""

import os
import sys
from pathlib import Path
from openai import OpenAI

PROMPTS_DIR = Path(__file__).parent.parent / "prompts"

XAI_BASE_URL = "https://api.x.ai/v1"
XAI_MODEL = "grok-4-1-fast"


def get_client() -> OpenAI:
    api_key = os.environ.get("XAI_API_KEY")
    if not api_key:
        raise EnvironmentError("XAI_API_KEY not set. Run: $env:XAI_API_KEY = 'xai-...'")
    return OpenAI(api_key=api_key, base_url=XAI_BASE_URL)


def load_system_prompt(mode: str) -> str:
    files = {
        "text2image": "text2image_system.txt",
        "image_edit": "image_edit_system.txt",
    }
    filename = files.get(mode)
    if not filename:
        raise ValueError(f"Unknown mode '{mode}'. Use: {list(files.keys())}")

    path = PROMPTS_DIR / filename
    if not path.exists():
        raise FileNotFoundError(f"System prompt not found: {path}")
    return path.read_text(encoding="utf-8")


def enhance_prompt(user_prompt: str, mode: str = "text2image") -> str:
    """
    Отправляет пользовательский промпт в Grok 4.1 Fast
    и возвращает улучшенный английский промпт.

    Args:
        user_prompt: Промпт пользователя (любой язык)
        mode: "text2image" или "image_edit"

    Returns:
        Улучшенный промпт на английском
    """
    client = get_client()
    system = load_system_prompt(mode)

    response = client.chat.completions.create(
        model=XAI_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.7,
        max_tokens=1024,
    )

    return response.choices[0].message.content.strip()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python grok_enhance.py <prompt> [--mode text2image|image_edit]")
        print()
        print("Examples:")
        print('  python grok_enhance.py "cat on a roof"')
        print('  python grok_enhance.py "убери фон" --mode image_edit')
        sys.exit(1)

    prompt = sys.argv[1]
    mode = "text2image"

    if "--mode" in sys.argv:
        idx = sys.argv.index("--mode")
        if idx + 1 < len(sys.argv):
            mode = sys.argv[idx + 1]

    print(f"Mode: {mode}")
    print(f"Input: {prompt}")
    print("-" * 60)

    result = enhance_prompt(prompt, mode)
    print(f"Enhanced:\n{result}")
