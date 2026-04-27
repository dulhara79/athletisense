
import json

def check_key(name):
    try:
        with open(name, 'r') as f:
            data = json.load(f)
            pk = data.get('private_key', '')
            print(f"File: {name}")
            print(f"Project ID: {data.get('project_id')}")
            print(f"Private Key Start: {pk[:50]}...")
            print(f"Private Key End: ...{pk[-50:]}")
            print(f"Length: {len(pk)}")
    except Exception as e:
        print(f"Error reading {name}: {e}")

check_key('nexora-firebase-adminsdk.json')
print("-" * 20)
check_key('performance-monitering-glove-firebase-adminsdk.json')
