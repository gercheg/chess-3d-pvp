import requests
import time
import json
import os
import sys
import urllib.request

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

API_KEY = os.environ.get("LOREMAX_API_KEY")
if not API_KEY:
    API_KEY = os.popen('powershell -c "[System.Environment]::GetEnvironmentVariable(\'LOREMAX_API_KEY\', \'User\')"').read().strip()

BASE = "https://loremax.ai/api/v1"
HEADERS = {"Content-Type": "application/json", "X-API-Key": API_KEY}
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "packages", "client", "public", "assets")
os.makedirs(OUT_DIR, exist_ok=True)

def submit_text2img(prompt, width=1024, height=1024, mode="Casual 3d Art"):
    payload = {
        "workflowId": 52,
        "inputs": {
            "gen_count": 1,
            "prompt": prompt,
            "mode_name": mode,
            "denoising": 0.7,
            "size_width": width,
            "size_height": height
        },
        "filesCount": 0
    }
    r = requests.post(f"{BASE}/workflow/execute", headers=HEADERS, json=payload)
    r.raise_for_status()
    data = r.json()
    print(f"  Submitted: generationId={data.get('generationId')}, jobId={data.get('jobId')}")
    return data

def check_status(gen_id, job_id):
    r = requests.post(f"{BASE}/generations/{gen_id}/check", headers=HEADERS, json={"jobId": job_id})
    r.raise_for_status()
    return r.json()

def wait_for_result(gen_id, job_id, timeout=180):
    start = time.time()
    while time.time() - start < timeout:
        result = check_status(gen_id, job_id)
        status = result.get("status", "")
        if status == "completed":
            urls = result.get("result", {}).get("originalUrls", [])
            if not urls:
                urls = result.get("result", {}).get("previewUrls", [])
            return urls
        if status == "failed":
            print(f"  FAILED: {result}")
            return []
        print(f"  Status: {status} ({int(time.time()-start)}s)")
        time.sleep(5)
    print("  TIMEOUT")
    return []

def download(url, filename):
    path = os.path.join(OUT_DIR, filename)
    urllib.request.urlretrieve(url, path)
    size = os.path.getsize(path)
    print(f"  Downloaded: {filename} ({size} bytes)")
    return path

ASSETS = [
    {
        "name": "hero-bg",
        "filename": "hero-bg.png",
        "prompt": "Dark cosmic chessboard floating in deep space, cyberpunk neon purple and blue glow, chess pieces as glowing holographic silhouettes, starfield background, dramatic volumetric lighting, dark atmosphere, no text, game art style",
        "width": 1024,
        "height": 1024
    },
    {
        "name": "board-light",
        "filename": "board-light.png",
        "prompt": "Seamless tileable texture of polished white marble with subtle grey veins, top-down view, flat lighting, no shadows, clean surface, material texture for 3D game",
        "width": 512,
        "height": 512
    },
    {
        "name": "board-dark",
        "filename": "board-dark.png",
        "prompt": "Seamless tileable texture of dark obsidian stone with subtle purple crystal veins, top-down view, flat lighting, no shadows, clean surface, material texture for 3D game",
        "width": 512,
        "height": 512
    },
    {
        "name": "game-bg",
        "filename": "game-bg.png",
        "prompt": "Dark abstract geometric pattern, deep navy and purple tones, subtle hexagonal grid, cyberpunk atmosphere, no text, seamless background texture for gaming UI",
        "width": 1024,
        "height": 1024
    },
]

def main():
    jobs = []
    for asset in ASSETS:
        print(f"\n[{asset['name']}] Submitting...")
        try:
            data = submit_text2img(asset["prompt"], asset["width"], asset["height"])
            jobs.append({
                **asset,
                "gen_id": data["generationId"],
                "job_id": data["jobId"]
            })
        except Exception as e:
            print(f"  ERROR submitting: {e}")

    print(f"\n--- Waiting for {len(jobs)} jobs ---")
    
    for job in jobs:
        print(f"\n[{job['name']}] Waiting for result...")
        urls = wait_for_result(job["gen_id"], job["job_id"])
        if urls:
            download(urls[0], job["filename"])
        else:
            print(f"  No URLs returned for {job['name']}")

    print("\n--- DONE ---")

if __name__ == "__main__":
    main()
