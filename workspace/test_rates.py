import json
import urllib.request

try:
    with urllib.request.urlopen('http://localhost:3000/api/rates') as response:
        data = json.loads(response.read())
        print(json.dumps(data, indent=2))
except Exception as e:
    print(f"Error: {e}")
