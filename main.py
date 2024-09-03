import os
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles  # Import StaticFiles
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import openai
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Now you can access the API key from the environment
openai.api_key = os.getenv("OPENAI_API_KEY")

app = FastAPI()

# Mount the static directory to serve static files like CSS and JS
app.mount("/static", StaticFiles(directory="static"), name="static")

# CORS middleware to allow requests from the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this according to your needs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Message(BaseModel):
    text: str

@app.get("/")
def serve_frontend():
    try:
        return FileResponse(os.path.join(os.getcwd(), "static/index.html"))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found")

@app.post("/chat/")
async def chat(message: Message):
    user_message = message.text

    try:
        response = openai.Completion.create(
            engine="text-davinci-003",
            prompt=user_message,
            max_tokens=50
        )
        bot_response = response.choices[0].text.strip()
    except Exception as e:
        print(f"Error: {str(e)}")
        bot_response = "I'm sorry, but I can't provide a useful response at the moment."

    return {"user_message": user_message, "bot_response": bot_response}