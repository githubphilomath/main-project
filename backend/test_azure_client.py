"""Quick test: can we access Azure OpenAI?"""
from openai import AzureOpenAI
import os
from dotenv import load_dotenv

load_dotenv("./.env")
client = AzureOpenAI(
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-15-preview"),
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
)

# You need the deployment name - common ones: gpt-4, gpt-35-turbo, chat
DEPLOYMENT = os.getenv("AZURE_OPENAI_CHAT_DEPLOYMENT", "gpt-4")

print("Testing Azure OpenAI connection...")
print(f"Endpoint: {os.getenv('AZURE_OPENAI_ENDPOINT', '(not set)')}")
print(f"Deployment: {DEPLOYMENT}")

try:
    response = client.chat.completions.create(
        model=DEPLOYMENT,
        messages=[{"role": "user", "content": "Say 'Hello' in one word."}],
        max_tokens=10,
    )
    reply = response.choices[0].message.content
    print(f"Success! Response: {reply}")
except Exception as e:
    print(f"Error: {e}")
