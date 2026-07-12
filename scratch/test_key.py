import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

api_key = input("Plaese paste your Gemini API Key here: ").strip()
model = "gemini-1.5-flash"
url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

payload = {
    "contents": [{"parts": [{"text": "Say hello!"}]}]
}

req = urllib.request.Request(
    url, 
    data=json.dumps(payload).encode('utf-8'),
    headers={'Content-Type': 'application/json'},
    method='POST'
)

print(f"Sending request to Gemini API ({model})...")
try:
    with urllib.request.urlopen(req, context=ctx) as resp:
        print("Success! Gemini response:")
        print(resp.read().decode())
except urllib.error.HTTPError as e:
    print(f"\nHTTP Error {e.code}: {e.reason}")
    try:
        err_body = e.read().decode()
        print("Response body:")
        print(err_body)
    except:
        pass
except Exception as e:
    print("Other error:", e)
