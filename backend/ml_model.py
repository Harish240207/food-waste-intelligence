import pandas as pd
from xgboost import XGBRegressor
from sqlalchemy import create_engine

engine = create_engine("sqlite:///./food.db")

def train_model():
    df = pd.read_sql("billing", engine)

    df["day"] = pd.to_datetime(df["time"]).dt.dayofweek
    X = df[["day"]]
    y = df["quantity"]

    model = XGBRegressor()
    model.fit(X, y)

    return model

def predict_demand(day):
    model = train_model()
    return model.predict([[day]])[0]
