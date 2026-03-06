"""
Generate chess game visual assets via Loremax API.
Uses working string workflow IDs (t2i_grok_imagine_image, t2i_gpt_image_15).
"""
import requests
import time
import os
import sys
import urllib.request

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

API_KEY = os.environ.get("LOREMAX_API_KEY")
if not API_KEY:
    API_KEY = os.popen(
        'powershell -c "[System.Environment]::GetEnvironmentVariable(\'LOREMAX_API_KEY\', \'User\')"'
    ).read().strip()

BASE = "https://loremax.ai/api/v1"
HEADERS = {"Content-Type": "application/json", "X-API-Key": API_KEY}
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "packages", "client", "public", "assets")
os.makedirs(OUT_DIR, exist_ok=True)


def submit(workflow_id, inputs):
    """Submit generation. workflow_id is a string like 't2i_grok_imagine_image'."""
    payload = {"workflowId": workflow_id, "inputs": inputs}
    print(f"  Payload: workflowId={workflow_id}, prompt={inputs.get('prompt','')[:60]}...")
    r = requests.post(f"{BASE}/workflow/execute", headers=HEADERS, json=payload, timeout=30)
    if r.status_code >= 400:
        ct = r.headers.get("Content-Type", "")
        if "text/html" in ct:
            print(f"  ERROR {r.status_code}: Cloudflare Worker Exception")
        else:
            print(f"  ERROR {r.status_code}: {r.text[:300]}")
        return None
    data = r.json()
    print(f"  OK: generationId={data.get('generationId')}, jobId={data.get('jobId')}, cost={data.get('tokensCost')}")
    return data


def check(gen_id, job_id):
    body = {"jobId": job_id} if job_id else {}
    r = requests.post(f"{BASE}/generations/{gen_id}/check", headers=HEADERS, json=body, timeout=30)
    r.raise_for_status()
    return r.json()


def wait_for_result(gen_id, job_id, timeout=300):
    start = time.time()
    while time.time() - start < timeout:
        result = check(gen_id, job_id)
        status = result.get("status", "")
        completed = result.get("completed", False)

        if completed or status == "completed":
            urls = result.get("result", {}).get("originalUrls", [])
            if not urls:
                urls = result.get("result", {}).get("previewUrls", [])
            return urls

        if status == "failed":
            print(f"  FAILED: {result.get('error', 'Unknown')}")
            return []

        elapsed = int(time.time() - start)
        job_state = result.get("jobState", "N/A")
        print(f"  [{elapsed}s] status={status} jobState={job_state}")
        time.sleep(5)

    print("  TIMEOUT")
    return []


def download(url, filename):
    path = os.path.join(OUT_DIR, filename)
    try:
        urllib.request.urlretrieve(url, path)
        size = os.path.getsize(path)
        print(f"  Downloaded: {filename} ({size:,} bytes)")
    except Exception as e:
        print(f"  Download failed ({e}), trying requests...")
        try:
            r = requests.get(url, timeout=30, headers={"User-Agent": "Mozilla/5.0"})
            r.raise_for_status()
            with open(path, "wb") as f:
                f.write(r.content)
            size = os.path.getsize(path)
            print(f"  Downloaded via requests: {filename} ({size:,} bytes)")
        except Exception as e2:
            print(f"  Both download methods failed: {e2}")
            print(f"  URL (save manually): {url}")
            return None
    return path


ASSETS = [
    {
        "name": "hero-bg",
        "filename": "hero-bg.png",
        "workflow": "t2i_grok_imagine_image",
        "inputs": {
            "prompt": "Dark cosmic chessboard floating in deep space, cyberpunk neon purple and blue glow, chess pieces as glowing holographic silhouettes, starfield background, dramatic volumetric lighting, dark atmosphere, no text, game art style",
            "aspect_ratio": "16:9",
        },
    },
    {
        "name": "board-texture-light",
        "filename": "board-light.png",
        "workflow": "t2i_grok_imagine_image",
        "inputs": {
            "prompt": "Seamless tileable texture of polished white marble with subtle grey veins, top-down view, flat lighting, no shadows, clean surface, material texture for 3D game, square format",
            "aspect_ratio": "1:1",
        },
    },
    {
        "name": "board-texture-dark",
        "filename": "board-dark.png",
        "workflow": "t2i_grok_imagine_image",
        "inputs": {
            "prompt": "Seamless tileable texture of dark obsidian stone with subtle purple crystal veins glowing, top-down view, flat lighting, no shadows, clean surface, material texture for 3D game, square format",
            "aspect_ratio": "1:1",
        },
    },
    {
        "name": "game-bg",
        "filename": "game-bg.png",
        "workflow": "t2i_grok_imagine_image",
        "inputs": {
            "prompt": "Dark abstract geometric pattern background, deep navy and purple tones, subtle hexagonal grid, cyberpunk atmosphere, no text, seamless background texture for gaming UI, minimal and elegant",
            "aspect_ratio": "16:9",
        },
    },
]


def main():
    print("=" * 60)
    print("Chess 3D PvP -- Visual Asset Generation (Loremax)")
    print(f"API Key: {API_KEY[:12]}... | Output: {OUT_DIR}")
    print("=" * 60)

    jobs = []
    for asset in ASSETS:
        print(f"\n[{asset['name']}] Submitting...")
        data = submit(asset["workflow"], asset["inputs"])
        if data:
            jobs.append({
                **asset,
                "gen_id": data["generationId"],
                "job_id": data.get("jobId"),
            })

    print(f"\n--- Waiting for {len(jobs)} jobs ---")

    for job in jobs:
        print(f"\n[{job['name']}] Waiting for result...")
        urls = wait_for_result(job["gen_id"], job["job_id"])
        if urls:
            download(urls[0], job["filename"])
        else:
            print(f"  No URLs for {job['name']}")

    print("\n--- DONE ---")
    for f in sorted(os.listdir(OUT_DIR)):
        if f.endswith(('.png', '.jpg', '.webp')):
            size = os.path.getsize(os.path.join(OUT_DIR, f))
            print(f"  - {f} ({size:,} bytes)")


if __name__ == "__main__":
    main()
