"""
Generate chess game audio: background music + action voice effects.
Uses ElevenLabs Music API + Text-to-Speech API.
"""
import os
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from elevenlabs.client import ElevenLabs

ASSETS_DIR = os.path.join(os.path.dirname(__file__), "..", "packages", "client", "public", "assets", "audio")
os.makedirs(ASSETS_DIR, exist_ok=True)

client = ElevenLabs()


def generate_music():
    """Generate background music for the chess game."""
    print("\n[MUSIC] Generating chess game background music...")

    audio = client.music.compose(
        prompt="Dark atmospheric electronic chess game soundtrack, cyberpunk ambient, deep bass synth pads, subtle tension building, strategic thinking mood, mysterious and competitive, no vocals, lo-fi elements",
        music_length_ms=60000,
    )

    path = os.path.join(ASSETS_DIR, "chess-bgm.mp3")
    with open(path, "wb") as f:
        for chunk in audio:
            f.write(chunk)

    size = os.path.getsize(path)
    print(f"  Saved: chess-bgm.mp3 ({size:,} bytes)")
    return path


def generate_voice_effects():
    """Generate voice effects for chess game actions."""
    effects = [
        ("check", "Check!", "Dramatic and sharp announcement"),
        ("checkmate", "Checkmate!", "Triumphant and powerful declaration"),
        ("your-turn", "Your turn.", "Calm, inviting prompt"),
        ("game-over", "Game over.", "Deep, final sounding"),
        ("welcome", "Welcome to Chess 3D. Ready to play?", "Friendly, futuristic gaming vibe"),
        ("victory", "Congratulations! You win!", "Excited, celebratory"),
        ("defeat", "Better luck next time.", "Encouraging, warm"),
    ]

    voice_id = "onwK4e9ZLuTAKqWW03F9"  # Daniel (male, authoritative)

    for name, text, _desc in effects:
        print(f"  [TTS] Generating: {name} - \"{text}\"")
        try:
            audio = client.text_to_speech.convert(
                text=text,
                voice_id=voice_id,
                model_id="eleven_multilingual_v2",
            )

            path = os.path.join(ASSETS_DIR, f"{name}.mp3")
            with open(path, "wb") as f:
                for chunk in audio:
                    f.write(chunk)

            size = os.path.getsize(path)
            print(f"    Saved: {name}.mp3 ({size:,} bytes)")
        except Exception as e:
            print(f"    ERROR: {e}")


def main():
    print("=" * 60)
    print("Chess 3D PvP -- Audio Asset Generation")
    print("=" * 60)

    try:
        generate_music()
    except Exception as e:
        print(f"  MUSIC ERROR: {e}")

    print("\n[VOICE] Generating voice effects...")
    try:
        generate_voice_effects()
    except Exception as e:
        print(f"  VOICE ERROR: {e}")

    print("\n" + "=" * 60)
    print("DONE! Audio assets saved to:")
    print(f"  {ASSETS_DIR}")

    for f in sorted(os.listdir(ASSETS_DIR)):
        size = os.path.getsize(os.path.join(ASSETS_DIR, f))
        print(f"  - {f} ({size:,} bytes)")


if __name__ == "__main__":
    main()
