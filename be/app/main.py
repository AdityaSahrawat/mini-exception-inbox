from fastapi import FastAPI, Depends, HTTPException, Query, Path
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import timedelta, date as date_type
from pydantic import BaseModel, Field
from typing import List, Optional

from .database import get_db, engine, Base
from .models import ExceptionItem, CleanPlan, CleanActual

app = FastAPI(
    title="Mini Exception Inbox API",
    description="Backend API for manufacturing exception detection and tracking.",
    version="1.0.0"
)

# Enable CORS for local development (Next.js is typically on port 3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, set this to specific domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database tables on startup (in case seed wasn't run)
Base.metadata.create_all(bind=engine)


# --- Pydantic Schemas ---
class ExceptionSchema(BaseModel):
    id: int
    date: date_type
    plant_id: str
    product_code: str
    planned_units: int
    actual_units: int
    deficit_pct: float
    severity: str
    status: str

    class Config:
        from_attributes = True

class TrendPoint(BaseModel):
    date: date_type
    planned_units: int
    actual_units: int

class ExceptionDetailResponse(BaseModel):
    exception: ExceptionSchema
    trend: List[TrendPoint]

class StatusUpdateSchema(BaseModel):
    status: str = Field(..., description="Status must be 'open', 'acknowledged', or 'resolved'")


# --- Endpoints ---

@app.get("/exceptions", response_model=List[ExceptionSchema])
def get_exceptions(
    product_code: Optional[str] = Query(None, description="Filter by product code / SKU"),
    severity: Optional[str] = Query(None, description="Filter by severity ('high' or 'medium')"),
    status: Optional[str] = Query(None, description="Filter by status ('open', 'acknowledged', 'resolved')"),
    db: Session = Depends(get_db)
):
    """
    Retrieve all exceptions.
    Sorted by date descending, and then by deficit percentage descending (worst deficit first) within the same date.
    """
    query = db.query(ExceptionItem)
    
    if product_code:
        query = query.filter(ExceptionItem.product_code == product_code.strip().upper())
        
    if severity:
        query = query.filter(ExceptionItem.severity == severity.strip().lower())
        
    if status:
        query = query.filter(ExceptionItem.status == status.strip().lower())
        
    # Sort: date desc, deficit_pct desc
    query = query.order_by(desc(ExceptionItem.date), desc(ExceptionItem.deficit_pct))
    
    return query.all()


@app.get("/exceptions/{id}", response_model=ExceptionDetailResponse)
def get_exception_detail(
    id: int = Path(..., description="The ID of the exception"),
    db: Session = Depends(get_db)
):
    """
    Retrieve detailed view of a single exception, including a last 7-days plan-vs-actual trend.
    """
    exc = db.query(ExceptionItem).filter(ExceptionItem.id == id).first()
    if not exc:
        raise HTTPException(status_code=404, detail="Exception not found")
        
    # Find the 7 days leading up to and including the exception date
    end_date = exc.date
    start_date = end_date - timedelta(days=6)
    
    # Query CleanPlan and CleanActual for this product code in the date range
    plans = db.query(CleanPlan).filter(
        CleanPlan.product_code == exc.product_code,
        CleanPlan.date >= start_date,
        CleanPlan.date <= end_date
    ).all()
    
    actuals = db.query(CleanActual).filter(
        CleanActual.product_code == exc.product_code,
        CleanActual.date >= start_date,
        CleanActual.date <= end_date
    ).all()
    
    # Create maps for fast trend building
    plan_map = {p.date: p.planned_units for p in plans}
    actual_map = {a.date: a.units_produced for a in actuals}
    
    # Construct 7-day trend
    trend = []
    current_day = start_date
    while current_day <= end_date:
        planned_val = plan_map.get(current_day, 0)
        actual_val = actual_map.get(current_day, 0)
        
        trend.append(TrendPoint(
            date=current_day,
            planned_units=planned_val,
            actual_units=actual_val
        ))
        current_day += timedelta(days=1)
        
    return ExceptionDetailResponse(
        exception=ExceptionSchema.model_validate(exc),
        trend=trend
    )


@app.patch("/exceptions/{id}", response_model=ExceptionSchema)
def update_exception_status(
    id: int = Path(..., description="The ID of the exception to update"),
    status_update: StatusUpdateSchema = None,
    db: Session = Depends(get_db)
):
    """
    Update exception status (to 'acknowledged' or 'resolved').
    """
    if not status_update or status_update.status not in ["open", "acknowledged", "resolved"]:
        raise HTTPException(status_code=400, detail="Invalid status value. Must be 'open', 'acknowledged', or 'resolved'")
        
    exc = db.query(ExceptionItem).filter(ExceptionItem.id == id).first()
    if not exc:
        raise HTTPException(status_code=404, detail="Exception not found")
        
    exc.status = status_update.status
    db.commit()
    db.refresh(exc)
    
    return exc


@app.get("/products", response_model=List[str])
def get_products(db: Session = Depends(get_db)):
    """
    Helper endpoint to get a unique list of products that have exceptions.
    Helps populate frontend filter dropdowns.
    """
    products = db.query(ExceptionItem.product_code).distinct().all()
    return [p[0] for p in products if p[0]]
