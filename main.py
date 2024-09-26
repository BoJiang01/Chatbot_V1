import os
import io
import json
import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import openai

# Load environment variables from .env file
load_dotenv()

# Access the API key from the environment
openai.api_key = os.getenv("OPENAI_API_KEY")

app = FastAPI()

# Mount the static directory to serve static files like CSS and JS
app.mount("/static", StaticFiles(directory="static"), name="static")

# CORS middleware to allow requests from the frontend
app.add_middleware(
   CORSMiddleware,
   allow_origins=["*"],
   allow_credentials=True,
   allow_methods=["*"],
   allow_headers=["*"],
)

# Model for incoming chat messages
class Message(BaseModel):
   text: str

# Variable to store the uploaded dataset
uploaded_df = None

@app.post("/upload-csv/")
async def upload_csv(file: UploadFile = File(...)):
    global uploaded_df

    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload a CSV file.")

    try:
        contents = await file.read()
        # Read the CSV into a DataFrame
        uploaded_df = pd.read_csv(io.BytesIO(contents))

        # If the dataset is empty, raise an error
        if uploaded_df.empty:
            raise HTTPException(status_code=400, detail="The uploaded dataset is empty. Please upload a valid CSV file.")

        # If the header is missing or invalid, set default column names
        if uploaded_df.columns.isnull().any():
            uploaded_df = pd.read_csv(io.BytesIO(contents), header=None)
            uploaded_df.columns = [f"Column_{i+1}" for i in range(uploaded_df.shape[1])]

        return {"message": "CSV file uploaded successfully."}
    
    except pd.errors.EmptyDataError:
        raise HTTPException(status_code=400, detail="The uploaded CSV file is empty or not formatted correctly.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred while processing the CSV file: {str(e)}")

@app.get("/")
def serve_frontend():
    try:
        return FileResponse(os.path.join(os.getcwd(), "static/index.html"))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="The requested file was not found")

@app.post("/chat/")
async def chat(message: Message):
    global uploaded_df
    user_message = message.text

    # Ensure dataset is available
    if uploaded_df is None:
        return {"user_message": user_message, "bot_response": "Please upload a dataset first."}

    try:
        # Construct the prompt for the ChatGPT API to interpret the user's intent
        prompt = construct_chatgpt_prompt(user_message, uploaded_df)
        
        # Call the OpenAI API to analyze the user's message using gpt-3.5-turbo
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful data analyst assistant."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1000,
            temperature=0
        )

        # Extract the response text and parse it as JSON
        interpretation = response['choices'][0]['message']['content'].strip()
        result = json.loads(interpretation)

        return result  # Directly return the JSON response containing bot_response and potentially the chart
      
    except json.JSONDecodeError:
        return {"user_message": user_message, "bot_response": "I couldn't understand your request. Please specify a valid chart type and columns."}
    except Exception as e:
        print(f"An error occurred: {str(e)}")
        return {"user_message": user_message, "bot_response": f"Error generating the visualization: {str(e)}"}

def construct_chatgpt_prompt(user_message, df):
    # Construct a prompt that includes column names, types, and sample values for context
    column_info = []
    for col in df.columns:
        sample_values = df[col][:10]  # Getting up to 5 unique sample values
        col_type = "categorical" if df[col].dtype == "object" else "numerical"
        if pd.api.types.is_datetime64_any_dtype(df[col]):
            col_type = "temporal"
        column_info.append({
            "column_name": col,
            "data_type": col_type,
            "sample_values": sample_values.tolist()
        })

    prompt = f"""
You are an expert in data visualization. The user has provided the following query: '{user_message}'.

You have access to a dataset with the following columns and associated information:
{json.dumps(column_info, indent=2)}

If the user's request relates to creating a data visualization (pay close attention to words refering to columns of the dataset), generate a JSON response that contains:
1. "bot_response": A concise explanation of the chart that you've created.
2. "chart": A full Vega-Lite specification, including:
   - "$schema": The URL for the Vega-Lite schema.
   - "data": A JSON object that includes the sample data points under the "values" key.
   - "mark": The type of visualization to be generated (e.g., "bar", "line", "point").
   - "encoding": Details on how the data fields are mapped to the axes and other visual elements (x-axis, y-axis, color, etc.).

If the user's request is unrelated to data visualization or analysis, provide the following response:
{{
  "bot_response": "It seems that your request is unrelated to data visualization. It does not involve any analysis or visualization task."
}}

Here is an example of the Vega-Lite specification format:
{{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "data": {{
    "values": [
      {{"category": "A", "group": "x", "value": 0.1}},
      {{"category": "A", "group": "y", "value": 0.6}},
      {{"category": "A", "group": "z", "value": 0.9}},
      {{"category": "B", "group": "x", "value": 0.7}},
      {{"category": "B", "group": "y", "value": 0.2}},
      {{"category": "B", "group": "z", "value": 1.1}},
      {{"category": "C", "group": "x", "value": 0.6}},
      {{"category": "C", "group": "y", "value": 0.1}},
      {{"category": "C", "group": "z", "value": 0.2}}
    ]
  }},
  "mark": "bar",
  "encoding": {{
    "x": {{"field": "category"}},
    "y": {{"field": "value", "type": "quantitative"}},
    "xOffset": {{"field": "group"}},
    "color": {{"field": "group"}}
  }}
}}
"""

    return prompt