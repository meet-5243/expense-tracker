import os
import io
import datetime
from datetime import date as dt_date, timedelta
import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pymongo import MongoClient
from bson import ObjectId
import bson
import xgboost as xgb
from sklearn.metrics import mean_absolute_error, mean_squared_error
from dotenv import load_dotenv

# Load environment variables (checking local development paths)
if os.path.exists("backend/.env"):
    load_dotenv("backend/.env")
elif os.path.exists(".env"):
    load_dotenv(".env")
else:
    load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
if not MONGODB_URI:
    raise RuntimeError("MONGODB_URI environment variable is not set!")

app = FastAPI(title="RupeeControl ML Prediction Service")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connect to MongoDB
try:
    client = MongoClient(MONGODB_URI)
    # Default to 'test' database if database name is not specified in the URI path segment
    db = client.get_default_database()
except Exception as e:
    print(f"Failed to connect to MongoDB directly via default database: {e}")
    # Fallback db name selection
    client = MongoClient(MONGODB_URI)
    db = client.get_database("test")

# Feature columns used for training and prediction
FEATURE_COLS = [
    'dayofweek', 'dayofmonth', 'month',
    'lag_1', 'lag_2', 'lag_3', 'lag_7',
    'roll_mean_3', 'roll_mean_7', 'roll_mean_14', 'roll_mean_30'
]

class PredictResponse(BaseModel):
    userId: str
    prediction: float
    isFallback: bool
    fallbackReason: str | None = None
    metrics: dict | None = None
    minAmount: float
    maxAmount: float

class TrainResponse(BaseModel):
    userId: str
    status: str
    metrics: dict

def get_daily_expenses_df(user_id: str) -> pd.DataFrame:
    """
    Fetches raw transaction records for the user from MongoDB, aggregates them
    into daily totals, and fills in missing dates with 0.0 up to the current date.
    """
    expenses_col = db["expenses"]
    cursor = expenses_col.find({"userId": ObjectId(user_id)})
    
    raw_data = []
    for doc in cursor:
        raw_data.append({
            "date": doc["date"],
            "amount": float(doc["amount"])
        })
        
    if not raw_data:
        return pd.DataFrame(columns=["date", "amount"])
        
    df = pd.DataFrame(raw_data)
    df['date'] = pd.to_datetime(df['date'])
    # Convert to timezone-naive dates
    df['date'] = df['date'].dt.date
    
    # Group by date and sum amounts
    df_daily = df.groupby('date')['amount'].sum().reset_index()
    
    # Reindex to a complete daily frequency from the user's first expense until today
    min_date = df_daily['date'].min()
    today = dt_date.today()
    
    if min_date > today:
        min_date = today
        
    all_dates = pd.date_range(start=min_date, end=today, freq='D').date
    df_all = pd.DataFrame({'date': all_dates})
    
    df_daily = pd.merge(df_all, df_daily, on='date', how='left').fillna(0.0)
    df_daily = df_daily.sort_values('date').reset_index(drop=True)
    return df_daily

def create_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Constructs time-series features (lags, rolling averages, date components).
    """
    df = df.copy()
    df['date_dt'] = pd.to_datetime(df['date'])
    
    # Calendar features
    df['dayofweek'] = df['date_dt'].dt.dayofweek
    df['dayofmonth'] = df['date_dt'].dt.day
    df['month'] = df['date_dt'].dt.month
    
    # Lags
    df['lag_1'] = df['amount'].shift(1)
    df['lag_2'] = df['amount'].shift(2)
    df['lag_3'] = df['amount'].shift(3)
    df['lag_7'] = df['amount'].shift(7)
    
    # Rolling means (shifted by 1 to prevent data leakage)
    df['roll_mean_3'] = df['amount'].shift(1).rolling(window=3, min_periods=1).mean()
    df['roll_mean_7'] = df['amount'].shift(1).rolling(window=7, min_periods=1).mean()
    df['roll_mean_14'] = df['amount'].shift(1).rolling(window=14, min_periods=1).mean()
    df['roll_mean_30'] = df['amount'].shift(1).rolling(window=30, min_periods=1).mean()
    
    return df

@app.get("/health")
def health_check():
    return {"status": "healthy", "time": datetime.datetime.utcnow().isoformat()}

@app.post("/train/{user_id}", response_model=TrainResponse)
def train_model(user_id: str):
    try:
        df_daily = get_daily_expenses_df(user_id)
        
        # Enforce minimum training criteria
        if len(df_daily) < 14:
            raise HTTPException(
                status_code=400, 
                detail=f"User has only {len(df_daily)} days of historical data. Minimum 14 days required."
            )
            
        df_features = create_features(df_daily)
        # Drop rows that contain NaN due to lags
        df_clean = df_features.dropna(subset=['lag_1', 'lag_2', 'lag_3', 'lag_7']).copy()
        
        if len(df_clean) < 5:
            raise HTTPException(
                status_code=400,
                detail="Insufficient valid data points remaining after removing NaN lag periods."
            )
            
        # Chronological train/test split (80% train, 20% test)
        split_idx = int(len(df_clean) * 0.8)
        if split_idx == 0 or split_idx == len(df_clean):
            # Fallback split logic if dataset is very small
            split_idx = max(1, len(df_clean) - 3)
            
        train_df = df_clean.iloc[:split_idx]
        test_df = df_clean.iloc[split_idx:]
        
        X_train = train_df[FEATURE_COLS]
        y_train = train_df['amount']
        X_test = test_df[FEATURE_COLS]
        y_test = test_df['amount']
        
        # Train XGBoost Regressor
        model = xgb.XGBRegressor(
            n_estimators=50,
            max_depth=3,
            learning_rate=0.1,
            random_state=42
        )
        model.fit(X_train, y_train)
        
        # Evaluate model
        predictions = model.predict(X_test)
        mae = float(mean_absolute_error(y_test, predictions))
        rmse = float(np.sqrt(mean_squared_error(y_test, predictions)))
        
        # Evaluate baseline (7-day rolling mean)
        baseline_preds = test_df['roll_mean_7'].fillna(0.0)
        baseline_mae = float(mean_absolute_error(y_test, baseline_preds))
        baseline_rmse = float(np.sqrt(mean_squared_error(y_test, baseline_preds)))
        
        # Serialize model using joblib
        buffer = io.BytesIO()
        joblib.dump(model, buffer)
        buffer.seek(0)
        model_binary = bson.Binary(buffer.read())
        
        # Save model and evaluation metrics to MongoDB
        models_col = db["user_models"]
        models_col.update_one(
            {"userId": ObjectId(user_id)},
            {"$set": {
                "model": model_binary,
                "metrics": {
                    "mae": mae,
                    "rmse": rmse,
                    "baseline_mae": baseline_mae,
                    "baseline_rmse": baseline_rmse
                },
                "updatedAt": datetime.datetime.utcnow()
            }},
            upsert=True
        )
        
        return TrainResponse(
            userId=user_id,
            status="Model trained and saved successfully",
            metrics={
                "mae": mae,
                "rmse": rmse,
                "baseline_mae": baseline_mae,
                "baseline_rmse": baseline_rmse
            }
        )
        
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to train model: {str(e)}")

@app.get("/predict/{user_id}", response_model=PredictResponse)
def predict_tomorrow(user_id: str):
    try:
        df_daily = get_daily_expenses_df(user_id)
        
        # Fallback to Simple Moving Average if history is too short
        if len(df_daily) < 14:
            # Predict based on the average of last 7 days (or all available days if < 7)
            window_size = min(len(df_daily), 7)
            if window_size == 0:
                prediction = 0.0
                min_amount = 0.0
                max_amount = 0.0
            else:
                last_days = df_daily['amount'].tail(window_size)
                prediction = float(last_days.mean())
                min_amount = float(last_days.min())
                max_amount = float(last_days.max())
            return PredictResponse(
                userId=user_id,
                prediction=round(prediction, 2),
                isFallback=True,
                fallbackReason="Insufficient historical data to train the ML model (less than 14 days of data). Falling back to Simple Moving Average.",
                minAmount=round(min_amount, 2),
                maxAmount=round(max_amount, 2)
            )
            
        # Append tomorrow's date to calculate lag & rolling features for tomorrow
        tomorrow = dt_date.today() + timedelta(days=1)
        tomorrow_row = pd.DataFrame({'date': [tomorrow], 'amount': [0.0]})
        df_with_tomorrow = pd.concat([df_daily, tomorrow_row], ignore_index=True)
        
        # Generate time-series features
        df_features = create_features(df_with_tomorrow)
        
        # Tomorrow's features are located at the last row of df_features
        tomorrow_features = df_features.tail(1)[FEATURE_COLS]
        
        # Fetch the trained model from MongoDB
        models_col = db["user_models"]
        model_doc = models_col.find_one({"userId": ObjectId(user_id)})
        
        # If no model exists, train one now on the fly
        if not model_doc:
            try:
                # Trigger training
                train_res = train_model(user_id)
                model_doc = models_col.find_one({"userId": ObjectId(user_id)})
            except Exception as e:
                # If training fails on the fly, use SMA fallback
                last_days = df_daily['amount'].tail(7)
                prediction = float(last_days.mean())
                min_amount = float(last_days.min()) if len(last_days) > 0 else 0.0
                max_amount = float(last_days.max()) if len(last_days) > 0 else 0.0
                return PredictResponse(
                    userId=user_id,
                    prediction=round(prediction, 2),
                    isFallback=True,
                    fallbackReason=f"Failed to auto-train model: {str(e)}. Falling back to Simple Moving Average.",
                    minAmount=round(min_amount, 2),
                    maxAmount=round(max_amount, 2)
                )
                
        # Load model from database and run prediction
        try:
            model_binary = model_doc["model"]
            metrics = model_doc["metrics"]
            model = joblib.load(io.BytesIO(model_binary))
            
            # Run prediction
            pred_val = model.predict(tomorrow_features)[0]
            # Clip negative predictions to 0.0 since expenses cannot be negative
            pred_val = max(0.0, float(pred_val))
            
            # Calculate range using model MAE
            mae = metrics.get("mae", 0.0)
            min_amount = max(0.0, pred_val - mae)
            max_amount = pred_val + mae
            
            return PredictResponse(
                userId=user_id,
                prediction=round(pred_val, 2),
                isFallback=False,
                metrics=metrics,
                minAmount=round(min_amount, 2),
                maxAmount=round(max_amount, 2)
            )
        except Exception as load_err:
            # If the stored model fails to de-serialize (e.g. version mismatch / corrupted stream),
            # clean it up from MongoDB and fall back to SMA calculation
            print(f"Warning: Failed to load stored model for user {user_id} ({load_err}). Falling back to SMA.")
            try:
                models_col.delete_one({"userId": ObjectId(user_id)})
            except Exception:
                pass
                
            last_days = df_daily['amount'].tail(7)
            prediction = float(last_days.mean())
            min_amount = float(last_days.min()) if len(last_days) > 0 else 0.0
            max_amount = float(last_days.max()) if len(last_days) > 0 else 0.0
            return PredictResponse(
                userId=user_id,
                prediction=round(prediction, 2),
                isFallback=True,
                fallbackReason=f"Stored model was incompatible or corrupted. Resetting model and falling back to Simple Moving Average.",
                minAmount=round(min_amount, 2),
                maxAmount=round(max_amount, 2)
            )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")
