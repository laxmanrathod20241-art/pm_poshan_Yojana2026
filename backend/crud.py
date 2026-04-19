from sqlalchemy.orm import Session
from sqlalchemy import text
import models, schemas
from datetime import date
from typing import List, Optional, Dict, Any
import uuid
from decimal import Decimal

# --- Generic CRUD Helpers ---

def get_items(db: Session, model, skip: int = 0, limit: int = 100, filters: Dict[str, Any] = None):
    query = db.query(model)
    if filters:
        for key, value in filters.items():
            query = query.filter(getattr(model, key) == value)
    return query.offset(skip).limit(limit).all()

def create_item(db: Session, model, item_data: dict):
    db_item = model(**item_data)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

def update_item(db: Session, model, item_id: Any, item_data: dict, id_col="id"):
    db_item = db.query(model).filter(getattr(model, id_col) == item_id).first()
    if db_item:
        for key, value in item_data.items():
            setattr(db_item, key, value)
        db.commit()
        db.refresh(db_item)
    return db_item

def delete_item(db: Session, model, item_id: Any, id_col="id"):
    db_item = db.query(model).filter(getattr(model, id_col) == item_id).first()
    if db_item:
        db.delete(db_item)
        db.commit()
    return db_item

# --- CORE BUSINESS LOGIC: CONSUMPTION ENGINE ---
# This is a Python port of the 'process_daily_consumption' PG function.

def process_daily_consumption(
    db: Session,
    teacher_id: str,
    log_date: date,
    is_holiday: bool,
    holiday_remarks: Optional[str],
    meals_primary: int,
    meals_upper: int,
    main_foods: List[str],
    ingredients: List[str],
    is_overridden: bool,
    original_template: Dict[str, Any],
    grams_primary: Dict[str, float],
    grams_upper: Dict[str, float]
):
    # 1. RESTORE INVENTORY (Reverse existing logs for this date)
    old_logs = db.query(models.ConsumptionLog).filter(
        models.ConsumptionLog.teacher_id == teacher_id,
        models.ConsumptionLog.log_date == log_date
    ).all()

    for old_log in old_logs:
        items_to_restore = (old_log.main_foods_all or []) + (old_log.ingredients_used or [])
        for item in items_to_restore:
            grams = 0
            if old_log.standard_group == 'primary':
                grams = grams_primary.get(item, 100)
                restore_kg = Decimal(str((old_log.meals_served_primary * grams) / 1000.0))
            else:
                grams = grams_upper.get(item, 150)
                restore_kg = Decimal(str((old_log.meals_served_upper_primary * grams) / 1000.0))
            
            if restore_kg > 0:
                # Update stock
                stock = db.query(models.InventoryStock).filter(
                    models.InventoryStock.teacher_id == teacher_id,
                    (models.InventoryStock.item_name == item) | (models.InventoryStock.item_code == item),
                    models.InventoryStock.standard_group == old_log.standard_group
                ).first()
                if stock:
                    stock.current_balance += restore_kg

    # 2. CLEAR OLD STATE
    db.query(models.ConsumptionLog).filter(
        models.ConsumptionLog.teacher_id == teacher_id,
        models.ConsumptionLog.log_date == log_date
    ).delete()

    # 3. APPLY NEW CONSUMPTION
    borrowed_p = {}
    borrowed_u = {}

    if not is_holiday:
        # Process Primary
        if meals_primary > 0:
            for item in main_foods + ingredients:
                grams = grams_primary.get(item, 100)
                deduct_kg = Decimal(str((meals_primary * grams) / 1000.0))
                if deduct_kg > 0:
                    stock = db.query(models.InventoryStock).filter(
                        models.InventoryStock.teacher_id == teacher_id,
                        (models.InventoryStock.item_name == item) | (models.InventoryStock.item_code == item),
                        models.InventoryStock.standard_group == 'primary'
                    ).first()
                    
                    if not stock:
                        # Create a new stock record if it doesn't exist
                        stock = models.InventoryStock(
                            teacher_id=teacher_id,
                            item_name=item,
                            current_balance=Decimal('0'),
                            standard_group='primary'
                        )
                        db.add(stock)
                        db.flush() # Ensure it has an ID and is queryable

                    # Calculate borrowed amount based on available stock
                    borrowed_amt = Decimal('0')
                    if stock.current_balance >= deduct_kg:
                        borrowed_amt = Decimal('0')
                    elif stock.current_balance > 0:
                        borrowed_amt = deduct_kg - stock.current_balance
                    else:
                        borrowed_amt = deduct_kg
                        
                    if borrowed_amt > 0:
                        borrowed_p[item] = float(borrowed_amt)
                    
                    stock.current_balance -= deduct_kg

            db_cons_primary = models.ConsumptionLog(
                teacher_id=teacher_id,
                log_date=log_date,
                meals_served_primary=meals_primary,
                meals_served_upper_primary=0,
                main_food=main_foods[0] if main_foods else None,
                main_foods_all=main_foods,
                ingredients_used=ingredients,
                is_overridden=is_overridden,
                original_template=original_template,
                standard_group='primary',
                borrowed_items=borrowed_p
            )
            db.add(db_cons_primary)

        # Process Upper Primary
        if meals_upper > 0:
            for item in main_foods + ingredients:
                grams = grams_upper.get(item, 150)
                deduct_kg = Decimal(str((meals_upper * grams) / 1000.0))
                if deduct_kg > 0:
                    stock = db.query(models.InventoryStock).filter(
                        models.InventoryStock.teacher_id == teacher_id,
                        (models.InventoryStock.item_name == item) | (models.InventoryStock.item_code == item),
                        models.InventoryStock.standard_group == 'upper_primary'
                    ).first()
                    
                    if not stock:
                        # Create a new stock record if it doesn't exist
                        stock = models.InventoryStock(
                            teacher_id=teacher_id,
                            item_name=item,
                            current_balance=Decimal('0'),
                            standard_group='upper_primary'
                        )
                        db.add(stock)
                        db.flush()

                    # Calculate borrowed amount based on available stock
                    borrowed_amt = Decimal('0')
                    if stock.current_balance >= deduct_kg:
                        borrowed_amt = Decimal('0')
                    elif stock.current_balance > 0:
                        borrowed_amt = deduct_kg - stock.current_balance
                    else:
                        borrowed_amt = deduct_kg
                        
                    if borrowed_amt > 0:
                        borrowed_u[item] = float(borrowed_amt)
                    
                    stock.current_balance -= deduct_kg

            db_cons_upper = models.ConsumptionLog(
                teacher_id=teacher_id,
                log_date=log_date,
                meals_served_primary=0,
                meals_served_upper_primary=meals_upper,
                main_food=main_foods[0] if main_foods else None,
                main_foods_all=main_foods,
                ingredients_used=ingredients,
                is_overridden=is_overridden,
                original_template=original_template,
                standard_group='upper_primary',
                borrowed_items=borrowed_u
            )
            db.add(db_cons_upper)

    # 4. UPSERT ATTENDANCE LOG
    existing_log = db.query(models.DailyLog).filter(
        models.DailyLog.teacher_id == teacher_id,
        models.DailyLog.log_date == log_date
    ).first()

    if existing_log:
        existing_log.meals_served_primary = meals_primary
        existing_log.meals_served_upper_primary = meals_upper
        existing_log.is_holiday = is_holiday
        existing_log.holiday_remarks = holiday_remarks
    else:
        db_daily_log = models.DailyLog(
            teacher_id=teacher_id,
            log_date=log_date,
            meals_served_primary=meals_primary,
            meals_served_upper_primary=meals_upper,
            is_holiday=is_holiday,
            holiday_remarks=holiday_remarks
        )
        db.add(db_daily_log)

    db.commit()
    return {"status": "success", "message": "Consumption processed and inventory updated"}
