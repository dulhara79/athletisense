
import json
import os
from cryptography.hazmat.primitives import serialization
from dotenv import load_dotenv

load_dotenv()

cred_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH', '').strip('"')
print(f"Checking key at: {cred_path}")

try:
    with open(cred_path, 'r') as f:
        data = json.load(f)
    
    pk_str = data.get('private_key', '')
    # Apply the fix I implemented in the worker
    pk_str_fixed = pk_str.replace('\\n', '\n')
    
    print(f"Original PK length: {len(pk_str)}")
    print(f"Fixed PK length: {len(pk_str_fixed)}")
    
    # Try to load the key
    key = serialization.load_pem_private_key(
        pk_str_fixed.encode('utf-8'),
        password=None
    )
    print("SUCCESS: Private key loaded successfully by cryptography library!")
    
except Exception as e:
    print(f"FAILURE: Could not load private key: {e}")
