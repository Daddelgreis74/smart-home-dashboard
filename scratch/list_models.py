import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

api_key = input("Please paste your Gemini API Key here: ").strip()
url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"

req = urllib.request.Request(url, method='GET')

print("Calling ListModels...")
try:
    with urllib.request.urlopen(req, context=ctx) as resp:
        data = json.loads(resp.read().decode())
        print("\nAvailable models:")
        for m in data.get('models', []):
            print(f"- {m['name']} (supported methods: {m.get('supportedGenerationMethods')})")
except urllib.error.HTTPError as e:
    print(f"\nHTTP Error {e.code}: {e.reason}")
    try:
        print("Response:", e.read().decode())
    except:
        pass
except Exception as e:
    print("Error:", e)
