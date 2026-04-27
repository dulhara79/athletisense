import json
import os
import firebase_admin
from firebase_admin import credentials, db
from dotenv import load_dotenv

# Load env
env_path = os.path.join(os.getcwd(), '.env')
load_dotenv(env_path)

db_url = os.getenv('FIREBASE_DATABASE_URL', '').strip('"')
cred_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH', '').strip('"')

print(f"Testing Firebase Connection...")
print(f"DB URL: {db_url}")
print(f"Cred Path: {cred_path}")

try:
    with open(cred_path, 'r') as f:
        service_account_info = json.load(f)
    
    # Fix potential newline escaping issues in private key
    if 'private_key' in service_account_info:
        service_account_info['private_key'] = service_account_info['private_key'].replace('\\n', '\n')
    
    if not firebase_admin._apps:
        cred = credentials.Certificate(service_account_info)
        firebase_admin.initialize_app(cred, {'databaseURL': db_url})
    
    # Try a simple read
    ref = db.reference('/')
    data = ref.get()
    print("Successfully connected and read data!")
    print(f"Keys in root: {list(data.keys()) if data else 'Empty'}")
except Exception as e:
    print(f"Error: {e}")
