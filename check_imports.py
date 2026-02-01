import importlib.util
import os

def check_module(path, name):
    try:
        print(f"Checking {name}...")
        spec = importlib.util.spec_from_file_location(name, path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        print(f"SUCCESS: {name} imported.")
    except Exception as e:
        print(f"FAILURE: {name}: {e}")

check_module("api/generate-ppt-compare.py", "generate_ppt_compare")
check_module("api/generate-ppt-evolution.py", "generate_ppt_evolution")
check_module("api/generate-ppt.py", "generate_ppt")

