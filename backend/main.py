from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import chromadb
import os
import httpx
import pytesseract
from PIL import Image
import io
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

load_dotenv()

chroma_client = chromadb.PersistentClient(path="./chroma_db")
collection = chroma_client.get_or_create_collection(name="ortho_knowledge")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class NoteRequest(BaseModel):
    clinical_note: str

class QuestionRequest(BaseModel):
    question: str

@app.get("/")
def home():
    return {"message": "Ortho RAG Backend is running!"}

@app.post("/simplify")
def simplify_note(request: NoteRequest):

    results = collection.query(
        query_texts=[request.clinical_note],
        n_results=5
    )

    relevant_knowledge = ""
    if results and results["documents"]:
        chunks = results["documents"][0]
        relevant_knowledge = "\n\n".join(chunks)

    prompt = f"""You are a helpful assistant that explains orthopaedic 
    physiotherapy clinical notes to patients in simple everyday English.
    
    Use the following medical knowledge to help you explain accurately:
    {relevant_knowledge}
    
    Now explain this clinical note to the patient in very simple English 
    that anyone can understand. Avoid medical jargon. If you must use a 
    medical term explain what it means immediately after.
    Keep the explanation friendly, clear and reassuring.
    Do not lose the medical meaning while simplifying.
    
    Clinical Note: {request.clinical_note}
    
    Simple Explanation:"""

    response = httpx.post(
        url="https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {os.getenv('OPENROUTER_API_KEY')}",
            "Content-Type": "application/json"
        },
        json={
            "model": "google/gemma-3-4b-it:free",
            "messages": [
                {"role": "user", "content": prompt}
            ]
        },
        timeout=30.0
    )

    result = response.json()
    
    if "choices" not in result:
        return {"error": str(result)}
    
    simplified = result["choices"][0]["message"]["content"]
    return {"simplified": simplified}

@app.post("/ask")
def ask_question(request: QuestionRequest):
    
    results = collection.query(
        query_texts=[request.question],
        n_results=5
    )
    
    relevant_knowledge = ""
    if results and results["documents"]:
        chunks = results["documents"][0]
        relevant_knowledge = "\n\n".join(chunks)
    
    prompt = f"""You are a helpful assistant that answers patients' questions 
    about orthopaedic physiotherapy in simple everyday English.
    
    Use the following medical knowledge to help you answer accurately:
    {relevant_knowledge}
    
    Answer the following question in very simple English that anyone can 
    understand. Avoid medical jargon. If you must use a medical term 
    explain what it means immediately after.
    Keep the answer friendly, clear and reassuring.
    Do not lose the medical meaning while simplifying.
    If the question is not related to orthopaedic physiotherapy politely 
    let the patient know and suggest they ask their physiotherapist.
    
    Patient Question: {request.question}
    
    Answer:"""

    response = httpx.post(
        url="https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {os.getenv('OPENROUTER_API_KEY')}",
            "Content-Type": "application/json"
        },
        json={
    "models": [
        "google/gemma-3-4b-it:free",
        "qwen/qwen3-8b:free",
        "meta-llama/llama-3.2-3b-instruct:free"
    ],
    "messages": [
        {"role": "user", "content": prompt}
    ]
},
        timeout=30.0
    )

    result = response.json()
    
    if "choices" not in result:
        return {"error": str(result)}
    
    answer = result["choices"][0]["message"]["content"]
    return {"answer": answer}
    
@app.post("/extract-text")
async def extract_text(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        extracted_text = pytesseract.image_to_string(image)
        
        if not extracted_text.strip():
            return {"text": "", "message": "No text could be extracted from this image"}
        
        return {"text": extracted_text.strip()}
    except Exception as e:
        return {"error": str(e)}