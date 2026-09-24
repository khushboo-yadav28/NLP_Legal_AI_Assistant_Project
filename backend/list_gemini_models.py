import os
from google import genai
from app.core.config import GEMINI_API_KEY

client = genai.Client(api_key=GEMINI_API_KEY)

print("=" * 60)
print("AVAILABLE GEMINI MODELS FOR YOUR API KEY:")
print("=" * 60)

for m in client.models.list():
    # Filter only models that support content generation (text/chat)
    if "generateContent" in m.supported_actions:
        # Strip the 'models/' prefix to get the exact string needed for SDK calls
        clean_name = m.name.replace("models/", "")
        print(f"• {clean_name:<30} (Display Name: {m.display_name})")

print("=" * 60)