from sqlalchemy import Column, Integer, String, Float, Date
from database import Base

class RawPlan(Base):
    __tablename__ = "raw_plan"
    
    id = Column(Integer, primary_key=True, index=True)
    plan_date = Column(String, nullable=True)
    plant = Column(String, nullable=True)
    sku = Column(String, nullable=True)
    planned_units = Column(Float, nullable=True)

class RawActual(Base):
    __tablename__ = "raw_actual"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(String, nullable=True)
    plant_id = Column(String, nullable=True)
    product_code = Column(String, nullable=True)
    units_produced = Column(Integer, nullable=True)

class CleanPlan(Base):
    __tablename__ = "clean_plan"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, index=True)
    plant_id = Column(String, nullable=False)
    product_code = Column(String, nullable=False, index=True)
    planned_units = Column(Integer, nullable=False)

class CleanActual(Base):
    __tablename__ = "clean_actual"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, index=True)
    plant_id = Column(String, nullable=False)
    product_code = Column(String, nullable=False, index=True)
    units_produced = Column(Integer, nullable=False)

class ExceptionItem(Base):
    __tablename__ = "exceptions"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, index=True)
    plant_id = Column(String, nullable=False)
    product_code = Column(String, nullable=False, index=True)
    planned_units = Column(Integer, nullable=False)
    actual_units = Column(Integer, nullable=False)
    deficit_pct = Column(Float, nullable=False)  # deficit percentage, e.g. 15.5 for 15.5% deficit (or ratio)
    severity = Column(String, nullable=False)     # 'high' or 'medium'
    status = Column(String, default="open", nullable=False)  # 'open', 'acknowledged', 'resolved'
