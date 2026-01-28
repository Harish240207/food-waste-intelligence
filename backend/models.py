from sqlalchemy import Column, Integer, String, Float, DateTime
from database import Base
from datetime import datetime

class Billing(Base):
    __tablename__ = "billing"

    id = Column(Integer, primary_key=True)
    food_item = Column(String)
    quantity = Column(Integer)
    price = Column(Float)
    time = Column(DateTime, default=datetime.utcnow)
