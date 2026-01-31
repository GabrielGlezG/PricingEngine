
# Read the previously generated text file
with open("assets_b64.txt", "r") as f:
    content = f.read()

# Write to a proper python module in the api directory
with open("api/ppt_assets.py", "w") as f:
    f.write("# Auto-generated assets file\n")
    f.write(content)

print("api/ppt_assets.py created.")
