from fastapi import FastAPI 
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import pipeline

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Loading BERT models...")
ner_pipeline = pipeline(
    "ner",
    model="Ioana23/bert-finetuned-resumes-ner",
    aggregation_strategy="simple"
)
print("NER model loaded.")

class ResumeInput(BaseModel):
    text:str

@app.get("/health")
def health():
    return {"status": "ok"} 

@app.post("/parse-resume")
def parse_resume(input: ResumeInput):
    return{"received": input.text[:100]}