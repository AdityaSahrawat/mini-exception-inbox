import os
import pandas as pd
from datetime import datetime
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app.models import RawPlan, RawActual, CleanPlan, CleanActual, ExceptionItem

# Path configurations
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(os.path.dirname(BASE_DIR), "data")

PLAN_CSV = os.path.join(DATA_DIR, "production_plan.csv")
ACTUAL_CSV = os.path.join(DATA_DIR, "actual_production.csv")

# Mock sample data to fall back on if CSVs are not present
MOCK_PLAN_DATA = [
    # --- 2017-01-01 to 2017-01-07 ---
    {"plan_date": "2017-01-01", "plant": "PLANT-01", "sku": "FG-001", "planned_units": 100.0},
    {"plan_date": "2017-01-01", "plant": "PLANT-01", "sku": "FG-002", "planned_units": 150.0},
    {"plan_date": "2017-01-02", "plant": "PLANT-01", "sku": "FG-001", "planned_units": 120.0},
    {"plan_date": "2017-01-02", "plant": "PLANT-02", "sku": "FG-003", "planned_units": 80.0},
    {"plan_date": "2017-01-03", "plant": "PLANT-01", "sku": "FG-001", "planned_units": 110.0},
    {"plan_date": "2017-01-03", "plant": "PLANT-02", "sku": "FG-002", "planned_units": 200.0},
    {"plan_date": "2017-01-04", "plant": "PLANT-01", "sku": "FG-001", "planned_units": 130.0},
    {"plan_date": "2017-01-04", "plant": "PLANT-02", "sku": "FG-003", "planned_units": 90.0},
    {"plan_date": "2017-01-05", "plant": "PLANT-01", "sku": "FG-001", "planned_units": 140.0},
    {"plan_date": "2017-01-05", "plant": "PLANT-02", "sku": "FG-002", "planned_units": 210.0},
    {"plan_date": "2017-01-06", "plant": "PLANT-01", "sku": "FG-001", "planned_units": 150.0},
    {"plan_date": "2017-01-06", "plant": "PLANT-02", "sku": "FG-003", "planned_units": 95.0},
    {"plan_date": "2017-01-07", "plant": "PLANT-01", "sku": "FG-001", "planned_units": 160.0},
    {"plan_date": "2017-01-07", "plant": "PLANT-02", "sku": "FG-002", "planned_units": 220.0},
    # --- 2017-01-08 to 2017-01-14 ---
    {"plan_date": "2017-01-08", "plant": "PLANT-03", "sku": "FG-004", "planned_units": 50.0},
    {"plan_date": "2017-01-08", "plant": "PLANT-01", "sku": "FG-001", "planned_units": 170.0},
    {"plan_date": "2017-01-09", "plant": "PLANT-03", "sku": "FG-004", "planned_units": 55.0},
    {"plan_date": "2017-01-09", "plant": "PLANT-04", "sku": "FG-005", "planned_units": 300.0},
    {"plan_date": "2017-01-10", "plant": "PLANT-03", "sku": "FG-004", "planned_units": 60.0},
    {"plan_date": "2017-01-10", "plant": "PLANT-04", "sku": "FG-005", "planned_units": 310.0},
    {"plan_date": "2017-01-11", "plant": "PLANT-03", "sku": "FG-004", "planned_units": 65.0},
    {"plan_date": "2017-01-11", "plant": "PLANT-01", "sku": "FG-002", "planned_units": 180.0},
    {"plan_date": "2017-01-12", "plant": "PLANT-03", "sku": "FG-004", "planned_units": 70.0},
    {"plan_date": "2017-01-12", "plant": "PLANT-04", "sku": "FG-005", "planned_units": 320.0},
    {"plan_date": "2017-01-13", "plant": "PLANT-03", "sku": "FG-004", "planned_units": 75.0},
    {"plan_date": "2017-01-13", "plant": "PLANT-01", "sku": "FG-001", "planned_units": 180.0},
    {"plan_date": "2017-01-14", "plant": "PLANT-03", "sku": "FG-004", "planned_units": 80.0},
    {"plan_date": "2017-01-14", "plant": "PLANT-04", "sku": "FG-005", "planned_units": 330.0},
]

MOCK_ACTUAL_DATA = [
    # --- 2017-01-01 to 2017-01-07 ---
    {"date": "2017-01-01", "plant_id": "PLANT-01", "product_code": "FG-001", "units_produced": 50},
    {"date": "2017-01-01", "plant_id": "PLANT-01", "product_code": "FG-002", "units_produced": 130},
    {"date": "2017-01-02", "plant_id": "PLANT-01", "product_code": "FG-001", "units_produced": 115},
    {"date": "2017-01-02", "plant_id": "PLANT-02", "product_code": "fg-003", "units_produced": 40},
    {"date": "2017-01-03", "plant_id": "PLANT-01", "product_code": "FG-001", "units_produced": 110},
    {"date": "2017-01-03", "plant_id": "PLANT-02", "product_code": "FG-002", "units_produced": 100},
    {"date": "2017-01-04", "plant_id": "PLANT-01", "product_code": "FG-001", "units_produced": 125},
    {"date": "2017-01-04", "plant_id": "PLANT-02", "product_code": "FG-003", "units_produced": 88},
    {"date": "2017-01-05", "plant_id": "PLANT-01", "product_code": "FG-001", "units_produced": 135},
    {"date": "2017-01-05", "plant_id": "PLANT-02", "product_code": "FG-002", "units_produced": 195},
    {"date": "2017-01-06", "plant_id": "PLANT-01", "product_code": "FG-001", "units_produced": 145},
    {"date": "2017-01-06", "plant_id": "PLANT-02", "product_code": "FG-003", "units_produced": 90},
    {"date": "2017-01-07", "plant_id": "PLANT-01", "product_code": "FG-001", "units_produced": 155},
    {"date": "2017-01-07", "plant_id": "PLANT-02", "product_code": "FG-002", "units_produced": 215},
    # --- 2017-01-08 to 2017-01-14 ---
    # FG-004 has high deficit on 2017-01-08 (30 vs 50)
    {"date": "2017-01-08", "plant_id": "PLANT-03", "product_code": "FG-004", "units_produced": 30},
    {"date": "2017-01-08", "plant_id": "PLANT-01", "product_code": "FG-001", "units_produced": 168},
    # FG-004 has medium deficit on 2017-01-09 (48 vs 55)
    {"date": "2017-01-09", "plant_id": "PLANT-03", "product_code": "FG-004", "units_produced": 48},
    # FG-005 has high deficit on 2017-01-09 (180 vs 300)
    {"date": "2017-01-09", "plant_id": "PLANT-04", "product_code": "FG-005", "units_produced": 180},
    {"date": "2017-01-10", "plant_id": "PLANT-03", "product_code": "FG-004", "units_produced": 58},
    # FG-005 has medium deficit on 2017-01-10 (270 vs 310)
    {"date": "2017-01-10", "plant_id": "PLANT-04", "product_code": "FG-005", "units_produced": 270},
    {"date": "2017-01-11", "plant_id": "PLANT-03", "product_code": "FG-004", "units_produced": 64},
    # FG-002 has high deficit on 2017-01-11 (100 vs 180)
    {"date": "2017-01-11", "plant_id": "PLANT-01", "product_code": "FG-002", "units_produced": 100},
    {"date": "2017-01-12", "plant_id": "PLANT-03", "product_code": "FG-004", "units_produced": 69},
    {"date": "2017-01-12", "plant_id": "PLANT-04", "product_code": "FG-005", "units_produced": 315},
    {"date": "2017-01-13", "plant_id": "PLANT-03", "product_code": "FG-004", "units_produced": 74},
    {"date": "2017-01-13", "plant_id": "PLANT-01", "product_code": "FG-001", "units_produced": 178},
    {"date": "2017-01-14", "plant_id": "PLANT-03", "product_code": "FG-004", "units_produced": 79},
    {"date": "2017-01-14", "plant_id": "PLANT-04", "product_code": "FG-005", "units_produced": 328},
]


def clean_db():
    print("Dropping existing tables...")
    Base.metadata.drop_all(bind=engine)
    print("Creating new tables...")
    Base.metadata.create_all(bind=engine)

def seed_raw_data(db: Session):
    print("Seeding raw data...")
    
    # 1. Seed Raw Production Plan
    if os.path.exists(PLAN_CSV):
        plan_df = pd.read_csv(PLAN_CSV)
        raw_plans = []
        for _, row in plan_df.iterrows():
            raw_plans.append(RawPlan(
                plan_date=str(row['plan_date']) if pd.notna(row['plan_date']) else None,
                plant=str(row['plant']) if pd.notna(row['plant']) else None,
                sku=str(row['sku']) if pd.notna(row['sku']) else None,
                planned_units=float(row['planned_units']) if pd.notna(row['planned_units']) else None
            ))
        db.bulk_save_objects(raw_plans)
        db.commit()
        print(f"Seeded {len(raw_plans)} rows into raw_plan table from CSV.")
    else:
        print(f"Plan CSV not found at {PLAN_CSV}. Seeding mock plans...")
        raw_plans = [RawPlan(**item) for item in MOCK_PLAN_DATA]
        db.bulk_save_objects(raw_plans)
        db.commit()
        print(f"Seeded {len(raw_plans)} mock rows into raw_plan table.")

    # 2. Seed Raw Actual Production
    if os.path.exists(ACTUAL_CSV):
        actual_df = pd.read_csv(ACTUAL_CSV)
        raw_actuals = []
        for _, row in actual_df.iterrows():
            raw_actuals.append(RawActual(
                date=str(row['date']) if pd.notna(row['date']) else None,
                plant_id=str(row['plant_id']) if pd.notna(row['plant_id']) else None,
                product_code=str(row['product_code']) if pd.notna(row['product_code']) else None,
                units_produced=int(row['units_produced']) if pd.notna(row['units_produced']) else None
            ))
        db.bulk_save_objects(raw_actuals)
        db.commit()
        print(f"Seeded {len(raw_actuals)} rows into raw_actual table from CSV.")
    else:
        print(f"Actual CSV not found at {ACTUAL_CSV}. Seeding mock actuals...")
        raw_actuals = [RawActual(**item) for item in MOCK_ACTUAL_DATA]
        db.bulk_save_objects(raw_actuals)
        db.commit()
        print(f"Seeded {len(raw_actuals)} mock rows into raw_actual table.")

def process_and_clean_data(db: Session):
    print("Processing and cleaning data...")
    
    # --- Clean Plan Data ---
    raw_plans = db.query(RawPlan).all()
    clean_plans = []
    
    for rp in raw_plans:
        if not rp.plan_date or not rp.plant or not rp.sku or rp.planned_units is None:
            continue
        
        clean_sku = rp.sku.strip().upper()
        clean_plant = rp.plant.strip().upper()
        
        try:
            parsed_date = datetime.strptime(rp.plan_date.strip(), "%Y-%m-%d").date()
        except ValueError:
            continue
            
        clean_plans.append(CleanPlan(
            date=parsed_date,
            plant_id=clean_plant,
            product_code=clean_sku,
            planned_units=int(round(rp.planned_units))
        ))
        
    db.bulk_save_objects(clean_plans)
    db.commit()
    print(f"Cleaned and saved {len(clean_plans)} rows into clean_plan table.")

    # --- Clean Actual Data ---
    raw_actuals = db.query(RawActual).all()
    clean_actuals = []
    
    for ra in raw_actuals:
        if not ra.date or not ra.plant_id or not ra.product_code or ra.units_produced is None:
            continue
            
        clean_pc = ra.product_code.strip().upper()
        clean_plant = ra.plant_id.strip().upper()
        
        try:
            parsed_date = datetime.strptime(ra.date.strip(), "%Y-%m-%d").date()
        except ValueError:
            continue
            
        clean_actuals.append(CleanActual(
            date=parsed_date,
            plant_id=clean_plant,
            product_code=clean_pc,
            units_produced=int(ra.units_produced)
        ))
        
    db.bulk_save_objects(clean_actuals)
    db.commit()
    print(f"Cleaned and saved {len(clean_actuals)} rows into clean_actual table.")

def detect_and_seed_exceptions(db: Session):
    print("Detecting exceptions...")
    
    plans = db.query(CleanPlan).all()
    actuals = db.query(CleanActual).all()
    
    actual_dict = {}
    for act in actuals:
        key = (act.date, act.plant_id, act.product_code)
        actual_dict[key] = act.units_produced
        
    exceptions = []
    
    for plan in plans:
        key = (plan.date, plan.plant_id, plan.product_code)
        
        actual_units = actual_dict.get(key, 0)
        planned_units = plan.planned_units
        
        if planned_units <= 0:
            continue
            
        if actual_units < 0.9 * planned_units:
            deficit_pct = ((planned_units - actual_units) / planned_units) * 100
            
            if actual_units < 0.7 * planned_units:
                severity = "high"
            else:
                severity = "medium"
                
            exceptions.append(ExceptionItem(
                date=plan.date,
                plant_id=plan.plant_id,
                product_code=plan.product_code,
                planned_units=planned_units,
                actual_units=actual_units,
                deficit_pct=round(deficit_pct, 2),
                severity=severity,
                status="open"
            ))
            
    db.bulk_save_objects(exceptions)
    db.commit()
    print(f"Detected and saved {len(exceptions)} exceptions into exceptions table.")

def main():
    db = SessionLocal()
    try:
        clean_db()
        seed_raw_data(db)
        process_and_clean_data(db)
        detect_and_seed_exceptions(db)
        print("Database seeding completed successfully!")
    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    main()
