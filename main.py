from pathlib import Path
import joblib
import pandas as pd
from fastapi import FastAPI
from fastapi.responses import FileResponse
from pydantic import BaseModel

BASE_DIR = Path(__file__).parent
model = joblib.load(BASE_DIR / "credit_risk_model.pkl")
threshold = float(joblib.load(BASE_DIR / "best_threshold.pkl"))

app = FastAPI(title="Credit Risk API")


class Applicant(BaseModel):
    person_age: int
    person_income: float
    person_home_ownership: str
    person_emp_length: float
    loan_intent: str
    loan_grade: str
    loan_amnt: float
    loan_int_rate: float
    loan_percent_income: float
    cb_person_default_on_file: str
    cb_person_cred_hist_length: int


@app.get("/")
def home():
    return FileResponse(BASE_DIR / "index.html")


@app.get("/style.css")
def css():
    return FileResponse(BASE_DIR / "style.css", media_type="text/css")


@app.get("/script.js")
def js():
    return FileResponse(BASE_DIR / "script.js", media_type="application/javascript")


@app.get("/health")
def health():
    return {"message": "Credit Risk API is running"}


@app.post("/predict")
def predict(applicant: Applicant):
    df = pd.DataFrame([applicant.model_dump()])
    prob = float(model.predict_proba(df)[0][1])
    return {
        "default_probability": round(prob, 4),
        "threshold_used": round(threshold, 4),
        "prediction": "Default" if prob >= threshold else "No default",
    }
