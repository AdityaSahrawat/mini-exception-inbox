import os
import pandas as pd
from datetime import datetime
from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
from models import RawPlan, RawActual, CleanPlan, CleanActual, ExceptionItem

# Path configurations
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(os.path.dirname(BASE_DIR), "data")

PLAN_CSV = os.path.join(DATA_DIR, "production_plan.csv")
ACTUAL_CSV = os.path.join(DATA_DIR, "actual_production.csv")

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
        print(f"Seeded {len(raw_plans)} rows into raw_plan table.")
    else:
        print(f"Plan CSV not found at {PLAN_CSV}")

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
        print(f"Seeded {len(raw_actuals)} rows into raw_actual table.")
    else:
        print(f"Actual CSV not found at {ACTUAL_CSV}")

def process_and_clean_data(db: Session):
    print("Processing and cleaning data...")
    
    # --- Clean Plan Data ---
    raw_plans = db.query(RawPlan).all()
    clean_plans = []
    
    for rp in raw_plans:
        if not rp.plan_date or not rp.plant or not rp.sku or rp.planned_units is None:
            continue  # Skip rows with missing essential data
        
        # Clean SKU: strip whitespace and convert to uppercase
        clean_sku = rp.sku.strip().upper()
        # Clean plant: strip whitespace and convert to uppercase
        clean_plant = rp.plant.strip().upper()
        
        # Parse date
        try:
            parsed_date = datetime.strptime(rp.plan_date.strip(), "%Y-%m-%d").date()
        except ValueError:
            # Skip rows with invalid date formats
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
    
    # Fetch all clean plans and convert to dictionary for fast matching
    plans = db.query(CleanPlan).all()
    actuals = db.query(CleanActual).all()
    
    # Store actual production in a dictionary for fast lookup: (date, plant_id, product_code) -> units_produced
    actual_dict = {}
    for act in actuals:
        key = (act.date, act.plant_id, act.product_code)
        actual_dict[key] = act.units_produced
        
    exceptions = []
    
    for plan in plans:
        key = (plan.date, plan.plant_id, plan.product_code)
        
        # If there is no actual production, it means units_produced = 0
        actual_units = actual_dict.get(key, 0)
        planned_units = plan.planned_units
        
        if planned_units <= 0:
            continue
            
        # Exception criteria: units_produced < 0.9 * planned_units
        if actual_units < 0.9 * planned_units:
            # Deficit percentage = (Planned - Actual) / Planned * 100
            deficit_pct = ((planned_units - actual_units) / planned_units) * 100
            
            # Severity criteria:
            # - high if units_produced < 0.7 * planned_units (i.e. deficit > 30%)
            # - medium otherwise (deficit between 10% and 30%)
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
