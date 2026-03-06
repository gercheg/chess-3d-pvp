import requests, os, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

API_KEY = os.environ.get("LOREMAX_API_KEY")
if not API_KEY:
    API_KEY = os.popen('powershell -c "[System.Environment]::GetEnvironmentVariable(\'LOREMAX_API_KEY\', \'User\')"').read().strip()

print(f"API_KEY length: {len(API_KEY)}")
print(f"API_KEY prefix: {API_KEY[:8]}...")

BASE = "https://loremax.ai/api/v1"
HEADERS = {"Content-Type": "application/json", "X-API-Key": API_KEY}

payload = {
    "workflowId": 52,
    "urlType": "main",
    "inputs": {
        "gen_count": 1,
        "prompt": "Dark cosmic chessboard floating in space, neon purple glow, game art",
        "mode_name": "Casual 3d Art",
        "denoising": 0.7,
        "size_width": 1024,
        "size_height": 1024
    },
    "filesCount": 0
}

print(f"\nPayload: {payload}")
r = requests.post(f"{BASE}/workflow/execute", headers=HEADERS, json=payload)
print(f"Status: {r.status_code}")
print(f"Response: {r.text[:2000]}")
