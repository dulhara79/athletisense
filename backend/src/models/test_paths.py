
import os
from dotenv import load_dotenv

# Path calculation from ml_worker.py
file_path = os.path.abspath(__file__)
dir1 = os.path.dirname(file_path)
dir2 = os.path.dirname(dir1)
dir3 = os.path.dirname(dir2)
env_path = os.path.join(dir3, '.env')

print(f"File: {file_path}")
print(f"Dir 1: {dir1}")
print(f"Dir 2: {dir2}")
print(f"Dir 3: {dir3}")
print(f"Env Path: {env_path}")
print(f"Exists: {os.path.exists(env_path)}")

load_dotenv(env_path)
print(f"FIREBASE_SERVICE_ACCOUNT_PATH: {os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH')}")
print(f"FIREBASE_DATABASE_URL: {os.getenv('FIREBASE_DATABASE_URL')}")
