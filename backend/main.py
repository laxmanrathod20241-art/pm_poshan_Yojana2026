from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import shutil, os, uuid
from dotenv import load_dotenv

load_dotenv()
from sqlalchemy.orm import Session
import models, schemas, auth, crud
from database import SessionLocal, engine, get_db
from typing import Dict, Any, List, Optional, Union
from datetime import timedelta, date
from sqlalchemy.dialects.postgresql import UUID

# We trigger table creation in the startup event below

# FastAPI Initialization
app = FastAPI(
    title="PM-POSHAN Tracker API",
    description="Backend API for PM-POSHAN School Lunch Tracking System",
    version="1.0.0",
    docs_url="/docs" if os.getenv("ENABLE_DOCS", "true").lower() == "true" else None,
    redoc_url=None
)

# Configure CORS
allowed_origins_raw = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8000,http://127.0.0.1:8000")
allowed_origins = [origin.strip() for origin in allowed_origins_raw.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    """Create tables on startup, ensure upload directory exists, and seed data."""
    models.Base.metadata.create_all(bind=engine)
    os.makedirs("static/uploads", exist_ok=True)
    
    # 📝 Seed Master Data (SaaS Pricing)
    db = SessionLocal()
    try:
        pricing_data = [
            ("primary", 800, 'इ. १ ते ५ वी शिक्षक वार्षिक शुल्क'),
            ("upper_primary", 800, 'इ. ६ ते ८ वी शिक्षक वार्षिक शुल्क'),
            ("combo", 1200, 'इ. १ ते ८ वी शिक्षक वार्षिक शुल्क (Combo Package)')
        ]
        for section, price, desc in pricing_data:
            existing = db.query(models.SaasPricing).filter(models.SaasPricing.section_type == section).first()
            if not existing:
                db.add(models.SaasPricing(section_type=section, base_price=price, description=desc))
        db.commit()
    finally:
        db.close()

# 📂 Find the exact location of this file (main.py)
script_dir = os.path.dirname(__file__)
# 🔗 Build the path to the 'static' folder correctly
static_path = os.path.join(script_dir, "static")

# Mount it using the absolute path we just built
app.mount("/static", StaticFiles(directory=static_path), name="static")


@app.get("/")
def read_root():
    return {"status": "PMPY Backend Online", "port": 5434}

from routers import payments
app.include_router(payments.router)

# 1. User Login (Generate Token)
@app.post("/login", response_model=schemas.Token)
def login_for_access_token(response: Response, form_data: schemas.UserLogin, db: Session = Depends(get_db)):
    print(f"DEBUG: Login attempt for {form_data.email}")
    try:
        user = db.query(models.Profile).filter(models.Profile.email == form_data.email).first()
        if not user or not auth.verify_password(form_data.password.strip(), user.hashed_password):
            raise HTTPException(
                status_code=401,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
        user_id_str = str(user.id)
        access_token = auth.create_access_token(
            data={"sub": user.email, "id": user_id_str}, 
            expires_delta=access_token_expires
        )
        
        # 🍪 Set HttpOnly Cookie
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            max_age=auth.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            expires=auth.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            samesite="lax",
            secure=False # Set to True if using HTTPS
        )
        
        print(f"DEBUG: Login successful for {user.email}")
        return {"access_token": access_token, "token_type": "bearer"}
    except Exception as e:
        print(f"DEBUG: Login Error: {str(e)}")
        import traceback
        traceback.print_exc()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

# 2. CREATE a Profile (Updated with Password Hashing)
@app.post("/profiles/", response_model=schemas.Profile)
def create_profile(profile: schemas.ProfileCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(models.Profile).filter(models.Profile.email == profile.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_pwd = auth.get_password_hash(profile.password)
    db_profile = models.Profile(
        id=profile.id, 
        email=profile.email, 
        role=profile.role, 
        is_onboarded=profile.is_onboarded,
        hashed_password=hashed_pwd
    )
    db.add(db_profile)
    db.commit()
    db.refresh(db_profile)
    return db_profile

@app.post("/register/validate-udise")
def validate_udise(data: Dict[str, str], db: Session = Depends(get_db)):
    udise = data.get("udise")
    if not udise or len(udise) != 11 or not udise.isdigit():
        raise HTTPException(status_code=400, detail="Invalid UDISE format. Must be exactly 11 digits.")
    existing = db.query(models.Profile).filter(models.Profile.school_udise == udise).first()
    if existing:
        return {"valid": False, "message": "UDISE already registered"}
    return {"valid": True}

@app.post("/register")
def register_teacher(data: schemas.TeacherRegistrationFinal, db: Session = Depends(get_db)):
    udise = data.step1_data.school_udise
    if not udise or len(udise) != 11 or not udise.isdigit():
        raise HTTPException(status_code=400, detail="Invalid UDISE format. Must be exactly 11 digits.")
    
    existing_udise = db.query(models.Profile).filter(models.Profile.school_udise == udise).first()
    if existing_udise:
        raise HTTPException(status_code=400, detail="UDISE already registered")

    existing_email = db.query(models.Profile).filter(models.Profile.email == data.email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_pwd = auth.get_password_hash(data.password)
    user_id = str(uuid.uuid4())
    
    db_profile = models.Profile(
        id=user_id,
        email=data.email,
        role="teacher",
        hashed_password=hashed_pwd,
        first_name=data.step1_data.first_name,
        last_name=data.step1_data.last_name,
        mobile_number=data.step1_data.mobile_number,
        school_name=data.step1_data.school_name,
        principal_name=data.step1_data.principal_name,
        principal_contact_number=data.step1_data.principal_contact_number,
        school_udise=udise,
        is_onboarded=False
    )
    db.add(db_profile)
    db.commit()
    db.refresh(db_profile)
    return {"status": "success", "message": "Registration successful", "user_id": user_id}

# 3. GET a Profile (Current User)
@app.get("/profiles/me", response_model=schemas.Profile)
def read_current_profile(current_user: models.Profile = Depends(auth.get_current_user)):
    return current_user

# 4. GET a Profile by ID (Admin or Specific Lookup)
@app.get("/profiles/{user_id}", response_model=schemas.Profile)
def read_profile(user_id: str, db: Session = Depends(get_db), current_user: models.Profile = Depends(auth.get_current_user)):
    if user_id != str(current_user.id) and current_user.role != "master":
        raise HTTPException(status_code=403, detail="Not authorized to view this profile")
    db_user = db.query(models.Profile).filter(models.Profile.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="Profile not found in Local DB")
    return db_user

# --- OPERATIONAL ROUTES ---

# 5. Process Daily Consumption (Complex logic)
@app.post("/process-consumption")
def process_consumption(
    data: Dict[str, Any], 
    db: Session = Depends(get_db), 
    current_user: models.Profile = Depends(auth.get_current_user)
):
    try:
        return crud.process_daily_consumption(
            db, 
            teacher_id=str(current_user.id),
            log_date=date.fromisoformat(data['log_date']),
            is_holiday=data.get('is_holiday', False),
            holiday_remarks=data.get('holiday_remarks'),
            meals_primary=data.get('meals_primary', 0),
            meals_upper=data.get('meals_upper', 0),
            main_foods=data.get('main_foods', []),
            ingredients=data.get('ingredients', []),
            is_overridden=data.get('is_overridden', False),
            original_template=data.get('original_template', {}),
            grams_primary=data.get('grams_primary', {}),
            grams_upper=data.get('grams_upper', {})
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# 6. Inventory Stock (Get/Update)
@app.get("/inventory", response_model=List[schemas.InventoryStock])
def get_inventory(db: Session = Depends(get_db), current_user: models.Profile = Depends(auth.get_current_user)):
    return db.query(models.InventoryStock).filter(models.InventoryStock.teacher_id == str(current_user.id)).order_by(models.InventoryStock.item_name.asc()).all()

# 7. Daily Logs (Get by Date Range)
@app.get("/daily-logs", response_model=List[schemas.DailyLog])
def get_daily_logs(
    start_date: date, 
    end_date: date, 
    log_date: Optional[date] = None,
    db: Session = Depends(get_db), 
    current_user: models.Profile = Depends(auth.get_current_user)
):
    query = db.query(models.DailyLog).filter(
        models.DailyLog.teacher_id == str(current_user.id),
        models.DailyLog.log_date >= start_date,
        models.DailyLog.log_date <= end_date
    )
    if log_date:
        query = query.filter(models.DailyLog.log_date == log_date)
    return query.all()

@app.delete("/daily-logs")
def delete_daily_logs(
    log_date: Optional[date] = None, 
    id: Optional[str] = None,
    db: Session = Depends(get_db), 
    current_user: models.Profile = Depends(auth.get_current_user)
):
    # 1. Handle deletion by ID
    if id:
        db_item = db.query(models.DailyLog).filter(
            models.DailyLog.teacher_id == str(current_user.id),
            models.DailyLog.id == id
        ).first()
        if db_item:
            # Delete associated consumption logs for that date
            db.query(models.ConsumptionLog).filter(
                models.ConsumptionLog.teacher_id == str(current_user.id),
                models.ConsumptionLog.log_date == db_item.log_date
            ).delete()
            db.delete(db_item)
            db.commit()
            return {"status": "success", "message": "Log deleted by ID"}
            
    # 2. Handle deletion by Date
    if log_date:
        # Delete associated consumption logs first
        db.query(models.ConsumptionLog).filter(
            models.ConsumptionLog.teacher_id == str(current_user.id),
            models.ConsumptionLog.log_date == log_date
        ).delete()
        
        db_item = db.query(models.DailyLog).filter(
            models.DailyLog.teacher_id == str(current_user.id),
            models.DailyLog.log_date == log_date
        ).first()
        
        if db_item:
            db.delete(db_item)
            db.commit()
            return {"status": "success", "message": "Log deleted by date"}

    db.commit()
    return {"status": "success", "message": "No matching log found"}

# 8. Enrollment (Get/Create/Update)
@app.get("/enrollment", response_model=Optional[schemas.Enrollment])
def get_enrollment(db: Session = Depends(get_db), current_user: models.Profile = Depends(auth.get_current_user)):
    return db.query(models.StudentEnrollment).filter(models.StudentEnrollment.teacher_id == str(current_user.id)).first()

@app.post("/enrollment")
def upsert_enrollment(data: schemas.EnrollmentBase, db: Session = Depends(get_db), current_user: models.Profile = Depends(auth.get_current_user)):
    existing = db.query(models.StudentEnrollment).filter(models.StudentEnrollment.teacher_id == str(current_user.id)).first()
    if existing:
        for key, value in data.dict().items():
            setattr(existing, key, value)
    else:
        new_row = models.StudentEnrollment(teacher_id=str(current_user.id), **data.dict())
        db.add(new_row)
    db.commit()
    return {"status": "success"}

# 9. Generic Data Query (Supporting remaining tables)
# This mimics Supabase .from('table').select('*').eq('teacher_id', userId)
@app.get("/data/{table_name}")
def get_generic_data(
    table_name: str, 
    request: Request,
    db: Session = Depends(get_db), 
    current_user: models.Profile = Depends(auth.get_current_user)
):
    # Map table names to models
    table_map = {
        "schools": models.School,
        "profiles": models.Profile,
        "daily_logs": models.DailyLog,
        "student_enrollment": models.StudentEnrollment,
        "menu_master": models.MenuMaster,
        "inventory_stock": models.InventoryStock,
        "stock_receipts": models.StockReceipt,
        "consumption_logs": models.ConsumptionLog,
        "global_food_master": models.GlobalFoodMaster,
        "local_food_master": models.LocalFoodMaster,
        "menu_weekly_schedule": models.MenuWeeklySchedule,
        "monthly_reports": models.MonthlyReport,
        "item_ledger_reports": models.ItemLedgerReport,
        "financial_ledger_snapshots": models.FinancialLedgerSnapshot,
        "payment_receipts": models.PaymentReceipt,
        "saas_pricing": models.SaasPricing,
        "saas_coupons": models.SaasCoupon,
        "saas_subscriptions": models.SaasSubscription,
        "cooking_staff": models.CookingStaff,
        "fuel_tracking": models.FuelTracking,
        "monthly_mandhan": models.MonthlyMandhan,
        "teacher_subscriptions": models.SaasSubscription,
        "system_modules": models.SystemModule
    }
    
    # 🛠️ Handle hyphens/spaces and normalize table name
    original_table_name = table_name
    table_name = table_name.replace("-", "_").replace(" ", "_")
    
    if table_name not in table_map or table_map[table_name] is None:
        print(f"DEBUG: Table not found: {original_table_name} (normalized to {table_name})")
        raise HTTPException(status_code=404, detail=f"Table '{original_table_name}' not found or access restricted")
    
    model = table_map[table_name]
    query = db.query(model)

    # 🔍 APPLY FILTERS FROM QUERY PARAMS
    for key, value in request.query_params.items():
        if key == "or":
            # Handle .or(col1.eq.val1,col2.eq.val2)
            try:
                content = value.strip('()')
                # Use a more careful split that respects quotes if needed, 
                # but for now, we just handle the standard pattern used in frontend.
                conditions = content.split(',')
                or_filters = []
                for cond in conditions:
                    # Look for .eq. or .neq. as separators
                    if ".eq." in cond:
                        c_col, c_val = cond.split(".eq.", 1)
                        c_op = "eq"
                    elif ".neq." in cond:
                        c_col, c_val = cond.split(".neq.", 1)
                        c_op = "neq"
                    else:
                        continue
                        
                    c_val = c_val.strip('"')
                    if hasattr(model, c_col):
                        c_field = getattr(model, c_col)
                        if c_op == "eq": or_filters.append(c_field == c_val)
                        elif c_op == "neq": or_filters.append(c_field != c_val)
                if or_filters:
                    from sqlalchemy import or_
                    query = query.filter(or_(*or_filters))
            except Exception as e:
                print(f"DEBUG: Error parsing .or() filter: {e}")
        elif "__" in key:
            col, op = key.split("__", 1)
            if hasattr(model, col):
                field = getattr(model, col)
                if op == "lt": query = query.filter(field < value)
                elif op == "gt": query = query.filter(field > value)
                elif op == "lte": query = query.filter(field <= value)
                elif op == "gte": query = query.filter(field >= value)
                elif op == "ne": query = query.filter(field != value)
                elif op == "in": query = query.filter(field.in_(value.split(",")))
        elif hasattr(model, key):
            query = query.filter(getattr(model, key) == value)

    # ↕️ APPLY SORTING
    order_by = request.query_params.get("order_by")
    order_dir = request.query_params.get("order_dir", "asc")
    if order_by and hasattr(model, order_by):
        col = getattr(model, order_by)
        query = query.order_by(col.desc() if order_dir == "desc" else col.asc())

    # 🔒 Security: MASTER role can see EVERYTHING (except other admins in CRM)
    if current_user.role == "master":
        if table_name == "profiles":
            query = query.filter(model.role != "master")
        results = query.all()
        print(f"DEBUG: Master user fetched {len(results)} records from {table_name}")
        return results
        
    # 🔒 Teacher role: Strict isolation
    if table_name == "profiles":
        return query.filter(models.Profile.id == str(current_user.id)).all()
        
    if hasattr(model, 'teacher_id'):
        query = query.filter(model.teacher_id == str(current_user.id))
        
        # 🟢 ADD DEFAULT SORTING for inventory and receipts
        if table_name == "inventory_stock":
            query = query.order_by(model.item_name.asc())
        elif table_name == "stock_receipts":
            query = query.order_by(model.receipt_date.desc(), model.created_at.desc())
            
        return query.all()
    else:
        # Public tables
        return query.all()

@app.post("/data/{table_name}")
def post_generic_data(table_name: str, data: Union[Dict[str, Any], List[Dict[str, Any]]], db: Session = Depends(get_db), current_user: models.Profile = Depends(auth.get_current_user)):
    table_map = {
        "schools": models.School,
        "menu_master": models.MenuMaster,
        "stock_receipts": models.StockReceipt,
        "menu_weekly_schedule": models.MenuWeeklySchedule,
        "monthly_reports": models.MonthlyReport,
        "payment_receipts": models.PaymentReceipt,
        "student_enrollment": models.StudentEnrollment,
        "inventory_stock": models.InventoryStock,
        "cooking_staff": models.CookingStaff,
        "fuel_tracking": models.FuelTracking,
        "monthly_mandhan": models.MonthlyMandhan,
        "global_food_master": models.GlobalFoodMaster,
        "local_food_master": models.LocalFoodMaster,
        "saas_pricing": models.SaasPricing,
        "saas_coupons": models.SaasCoupon,
        "item_ledger_reports": models.ItemLedgerReport,
        "financial_ledger_snapshots": models.FinancialLedgerSnapshot
    }
    
    # 🛠️ Handle hyphens/spaces and normalize table name
    original_table_name = table_name
    table_name = table_name.replace("-", "_").replace(" ", "_")
    
    if table_name not in table_map:
        raise HTTPException(status_code=404, detail=f"Table '{original_table_name}' not found or insertion restricted")
    
    model = table_map[table_name]
    
    # Handle Bulk Operations
    if isinstance(data, list):
        processed_items = []
        for item_data in data:
            if hasattr(model, 'teacher_id'):
                item_data['teacher_id'] = str(current_user.id)
            
            # Specialized Upsert for Menu Weekly Schedule
            if table_name == "menu_weekly_schedule":
                existing = db.query(model).filter(
                    model.teacher_id == str(current_user.id),
                    model.week_pattern == item_data.get('week_pattern'),
                    model.day_name == item_data.get('day_name')
                ).first()
                
                if existing:
                    for k, v in item_data.items():
                        if k != 'id': # Don't update the primary key
                            setattr(existing, k, v)
                    processed_items.append(existing)
                    continue

            db_item = model(**item_data)
            db.add(db_item)
            processed_items.append(db_item)
        
        db.commit()
        for itm in processed_items:
            db.refresh(itm)
        return processed_items

    # Handle Single Item
    if hasattr(model, 'teacher_id'):
        data['teacher_id'] = str(current_user.id)
        
    db_item = model(**data)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.patch("/data/{table_name}")
def patch_generic_data(
    table_name: str, 
    data: Dict[str, Any], 
    id: Optional[str] = Query(None), 
    db: Session = Depends(get_db), 
    current_user: models.Profile = Depends(auth.get_current_user)
):
    table_map = {
        "schools": models.School,
        "profiles": models.Profile,
        "daily_logs": models.DailyLog,
        "student_enrollment": models.StudentEnrollment,
        "menu_master": models.MenuMaster,
        "inventory_stock": models.InventoryStock,
        "stock_receipts": models.StockReceipt,
        "consumption_logs": models.ConsumptionLog,
        "global_food_master": models.GlobalFoodMaster,
        "local_food_master": models.LocalFoodMaster,
        "menu_weekly_schedule": models.MenuWeeklySchedule,
        "monthly_reports": models.MonthlyReport,
        "financial_ledger_snapshots": models.FinancialLedgerSnapshot,
        "payment_receipts": models.PaymentReceipt,
        "saas_pricing": models.SaasPricing,
        "saas_coupons": models.SaasCoupon,
        "saas_subscriptions": models.SaasSubscription,
        "cooking_staff": models.CookingStaff,
        "fuel_tracking": models.FuelTracking,
        "monthly_mandhan": models.MonthlyMandhan,
        "system_modules": models.SystemModule,
        "item_ledger_reports": models.ItemLedgerReport
    }
    
    # 🛠️ Handle hyphens/spaces and normalize table name
    original_table_name = table_name
    table_name = table_name.replace("-", "_").replace(" ", "_")
    
    if table_name not in table_map or table_map[table_name] is None:
        raise HTTPException(status_code=404, detail=f"Table '{original_table_name}' not found or update restricted")
    with open("backend_debug.log", "a") as f:
        f.write(f"PATCH /data/{table_name} | Query ID: {id} | Payload ID: {data.get('id')} | Role: {current_user.role}\n")

    # 🛠️ ULTRA-RESILIENT FALLBACK:
    # If table_name contains a hyphen or looks like a UUID (even with prefixes like underscores)
    # we treat it as a direct record update for saas_pricing.
    potential_id = table_name.lstrip('_') # Remove potential browser hook prefixes
    is_uuid = False
    try:
        uuid.UUID(potential_id)
        is_uuid = True
    except:
        # Fallback check for hyphenated IDs that might not be pure UUIDs
        if "-" in potential_id and len(potential_id) > 20:
            is_uuid = True

    if is_uuid:
        id = potential_id
        table_name = "saas_pricing"
        print(f"DEBUG: Resiliently corrected Table: {table_name}, ID: {id}")

    if table_name not in table_map:
        raise HTTPException(status_code=404, detail=f"Table {table_name} not found or update restricted")

    # 🛠️ If ID is missing from query, check if it's in the data body
    if not id and 'id' in data:
        id = data['id']
        print(f"DEBUG: Using ID from payload: {id}")
    
    if not id:
        raise HTTPException(status_code=400, detail="Missing record ID in query or payload")

    model = table_map[table_name]
    from sqlalchemy.inspection import inspect
    pk_name = inspect(model).primary_key[0].name
    pk_column = getattr(model, pk_name)

    # 🛠️ Type-safe ID conversion
    query_id = id
    if id and isinstance(pk_column.type, UUID):
        try:
            query_id = uuid.UUID(id)
            print(f"DEBUG: Cast ID to UUID: {query_id}")
        except:
            print(f"DEBUG: Failed to cast ID to UUID: {id}")

    # 🔒 Security: MASTER role can patch EVERYTHING
    if current_user.role == "master":
        print(f"DEBUG: Master user bypassing ownership checks for {table_name}")
        db_item = db.query(model).filter(pk_column == query_id).first()
    
    # 🔒 Teacher role: Strict ownership check
    elif table_name == "profiles":
        db_item = db.query(model).filter(model.id == str(current_user.id)).first()
    elif hasattr(model, 'teacher_id'):
        db_item = db.query(model).filter(model.teacher_id == str(current_user.id)).filter(pk_column == query_id).first()
    else:
        # Prevent non-master users from modifying global tables
        print(f"DEBUG: Access Denied for role {current_user.role} on global table {table_name}")
        raise HTTPException(status_code=403, detail="Access denied: Master role required for global table updates")

    if not db_item:
        print(f"DEBUG: Item NOT FOUND in table {table_name} with ID {id}")
        raise HTTPException(status_code=404, detail=f"Record with ID {id} not found in {table_name}")
    
    for key, value in data.items():
        setattr(db_item, key, value)
    
    db.commit()
    db.refresh(db_item)
    return db_item

@app.patch("/data/{table_name}/bulk")
def bulk_patch_generic_data(
    table_name: str, 
    data: List[Dict[str, Any]], 
    db: Session = Depends(get_db), 
    current_user: models.Profile = Depends(auth.get_current_user)
):
    table_map = {
        "menu_master": models.MenuMaster,
        "inventory_stock": models.InventoryStock,
        "cooking_staff": models.CookingStaff,
        "fuel_tracking": models.FuelTracking
    }
    
    table_name = table_name.replace("-", "_").replace(" ", "_")
    if table_name not in table_map:
        raise HTTPException(status_code=404, detail=f"Table '{table_name}' not found for bulk update")
    
    model = table_map[table_name]
    from sqlalchemy.inspection import inspect
    pk_name = inspect(model).primary_key[0].name
    
    updated_items = []
    for item_data in data:
        item_id = item_data.get(pk_name)
        if not item_id: continue
        
        # Cast ID to UUID if necessary
        query_id = item_id
        from sqlalchemy.dialects.postgresql import UUID as PG_UUID
        if isinstance(getattr(model, pk_name).type, (PG_UUID, UUID)):
            try:
                query_id = uuid.UUID(str(item_id))
            except:
                continue

        # Check ownership
        db_item = db.query(model).filter(model.teacher_id == str(current_user.id)).filter(getattr(model, pk_name) == query_id).first()
        
        if db_item:
            for key, value in item_data.items():
                if key != pk_name:
                    setattr(db_item, key, value)
            updated_items.append(db_item)
    
    db.commit()
    return {"status": "success", "updated_count": len(updated_items)}

@app.delete("/data/{table_name}")
def delete_generic_data(table_name: str, id: str, db: Session = Depends(get_db), current_user: models.Profile = Depends(auth.get_current_user)):
    table_map = {
        "daily_logs": models.DailyLog,
        "consumption_logs": models.ConsumptionLog,
        "menu_master": models.MenuMaster,
        "stock_receipts": models.StockReceipt,
        "inventory_stock": models.InventoryStock,
        "student_enrollment": models.StudentEnrollment,
        "menu_weekly_schedule": models.MenuWeeklySchedule,
        "monthly_reports": models.MonthlyReport,
        "cooking_staff": models.CookingStaff,
        "fuel_tracking": models.FuelTracking,
        "global_food_master": models.GlobalFoodMaster,
        "local_food_master": models.LocalFoodMaster,
        "saas_pricing": models.SaasPricing,
        "saas_coupons": models.SaasCoupon,
        "payment_receipts": models.PaymentReceipt,
        "monthly_mandhan": models.MonthlyMandhan,
        "item_ledger_reports": models.ItemLedgerReport,
        "financial_ledger_snapshots": models.FinancialLedgerSnapshot
    }
    
    # 🛠️ Handle hyphens/spaces and normalize table name
    original_table_name = table_name
    table_name = table_name.replace("-", "_").replace(" ", "_")
    
    if table_name not in table_map:
        raise HTTPException(status_code=404, detail=f"Table '{original_table_name}' not found or deletion restricted")
    
    model = table_map[table_name]
    from sqlalchemy.inspection import inspect
    pk_name = inspect(model).primary_key[0].name
    
    # Check ownership (Bypassed for Master on global tables)
    if current_user.role == "master":
        db_item = db.query(model).filter(getattr(model, pk_name) == id).first()
    elif hasattr(model, 'teacher_id'):
        db_item = db.query(model).filter(model.teacher_id == str(current_user.id)).filter(getattr(model, pk_name) == id).first()
    else:
        raise HTTPException(status_code=403, detail="Access Denied: Cannot delete global system records")
        
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    db.delete(db_item)
    db.commit()
    return {"status": "success"}

# --- MEDIA / FILE UPLOAD ---
# (Keeping existing upload endpoint below)

@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...), 
    db: Session = Depends(get_db),
    current_user: models.Profile = Depends(auth.get_current_user)
):
    # 1. Generate unique filename to prevent overwrites
    if not file.filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join("static/uploads", unique_filename)

    # 2. Save the file to disk
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # 3. Create a record in the database
    db_media = models.Media(
        filename=file.filename,
        file_path=file_path,
        file_type=file.content_type,
        uploaded_by=str(current_user.id)
    )
    db.add(db_media)
    db.commit()
    db.refresh(db_media)

    return {
        "status": "Success",
        "message": "File uploaded locally",
        "file_id": db_media.id,
        "url": f"/static/uploads/{unique_filename}"
    }

if __name__ == "__main__":
    import uvicorn
    import sys
    from pathlib import Path
    
    # Add the current directory to sys.path to allow internal imports
    current_dir = Path(__file__).parent
    if str(current_dir) not in sys.path:
        sys.path.append(str(current_dir))
        
    print(f"STARTING PMPY Backend on http://127.0.0.1:8000")
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
