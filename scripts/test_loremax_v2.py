"""
Test Loremax API with multiple payload formats.
Compares: user's numeric workflow IDs vs reference string IDs.
"""
import requests
import os
import sys
import json

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

API_KEY = os.environ.get("LOREMAX_API_KEY")
if not API_KEY:
    API_KEY = os.popen(
        'powershell -c "[System.Environment]::GetEnvironmentVariable(\'LOREMAX_API_KEY\', \'User\')"'
    ).read().strip()

BASE = "https://loremax.ai/api/v1/workflow/execute"
HEADERS = {"Content-Type": "application/json", "X-API-Key": API_KEY}

SHORT_PROMPT = "Dark cosmic chessboard in space, neon purple glow, casual 3d game art"

TESTS = [
    {
        "name": "Format A: user's wf52 with urlType+filesCount",
        "payload": {
            "workflowId": 52,
            "urlType": "main",
            "inputs": {
                "gen_count": 1,
                "prompt": SHORT_PROMPT,
                "mode_name": "Casual 3d Art",
                "denoising": 0.7,
                "size_width": 1024,
                "size_height": 1024,
            },
            "filesCount": 0,
        },
    },
    {
        "name": "Format B: user's wf52 WITHOUT urlType/filesCount",
        "payload": {
            "workflowId": 52,
            "inputs": {
                "gen_count": 1,
                "prompt": SHORT_PROMPT,
                "mode_name": "Casual 3d Art",
                "denoising": 0.7,
                "size_width": 1024,
                "size_height": 1024,
            },
        },
    },
    {
        "name": "Format C: reference string ID (grok imagine)",
        "payload": {
            "workflowId": "t2i_grok_imagine_image",
            "inputs": {
                "prompt": SHORT_PROMPT,
                "aspect_ratio": "1:1",
            },
        },
    },
    {
        "name": "Format D: user's wf143 img2img (no image, test error)",
        "payload": {
            "workflowId": 143,
            "urlType": "main",
            "inputs": {
                "gen_count": 1,
                "resolution": "2K",
                "aspect_ratio": "auto",
                "prompt": SHORT_PROMPT,
            },
            "filesCount": 0,
        },
    },
]


def test_payload(name, payload):
    print(f"\n{'='*60}")
    print(f"TEST: {name}")
    print(f"Payload: {json.dumps(payload, indent=2, ensure_ascii=False)[:500]}")
    print("-" * 60)

    try:
        r = requests.post(BASE, headers=HEADERS, json=payload, timeout=15)
        print(f"Status: {r.status_code}")
        ct = r.headers.get("Content-Type", "")
        print(f"Content-Type: {ct}")

        if "text/html" in ct:
            if "Worker threw exception" in r.text:
                print("Response: Cloudflare Worker Exception (1101)")
            elif "Rate limited" in r.text:
                print("Response: Rate Limited")
            else:
                print(f"Response (HTML): {r.text[:200]}")
        else:
            try:
                data = r.json()
                print(f"Response JSON: {json.dumps(data, indent=2, ensure_ascii=False)[:500]}")
            except Exception:
                print(f"Response raw: {r.text[:300]}")

        return r.status_code

    except requests.exceptions.Timeout:
        print("TIMEOUT (15s)")
        return 0
    except Exception as e:
        print(f"ERROR: {e}")
        return 0


def main():
    print(f"API KEY: {API_KEY[:12]}... (len={len(API_KEY)})")

    results = []
    for test in TESTS:
        code = test_payload(test["name"], test["payload"])
        results.append((test["name"], code))

    print(f"\n{'='*60}")
    print("SUMMARY:")
    for name, code in results:
        status = "OK" if 200 <= code < 300 else "FAIL"
        print(f"  [{status}] {code} - {name}")


if __name__ == "__main__":
    main()
