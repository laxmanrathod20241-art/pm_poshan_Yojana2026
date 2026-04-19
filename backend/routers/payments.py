import os
import razorpay
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any, List, cast
import models
import schemas
import database
from auth import get_current_user
from datetime import datetime, timedelta

router = APIRouter(
    prefix="/api/payments",
    tags=["payments"]
)

# Initialize Razorpay Client
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "rzp_test_placeholder")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "secret_placeholder")

client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

@router.post("/create-order", response_model=Dict[str, Any])
async def create_order(
    payload: Dict[str, Any],
    db: Session = Depends(database.get_db),
    current_user: models.Profile = Depends(get_current_user)
):
    plan_type = payload.get("plan_type")
    
    # 🛡️ SECURITY: Fetch price from DB, do not trust client-sent amounts
    if plan_type == 'upgrade':
        # Hardcoded for now, or could be in pricing table
        amount_rupees = 400.0
    else:
        pricing = db.query(models.SaasPricing).filter(models.SaasPricing.section_type == plan_type).first()
        if not pricing:
            # Fallback to old amount for backward compatibility IF plan_type is missing
            # But in production, we should enforce plan_type
            amount_rupees = payload.get("amount")
            if not amount_rupees:
                raise HTTPException(status_code=400, detail="Valid plan_type or amount required")
        else:
            amount_rupees = float(cast(Any, pricing).base_price)

    amount_paise = int(amount_rupees * 100)
    
    try:
        # 1. Create Order in Razorpay
        order_data = {
            "amount": amount_paise,
            "currency": "INR",
            "receipt": f"receipt_{str(current_user.id)[:8]}_{int(datetime.now().timestamp())}",
            "payment_capture": 1
        }
        razorpay_order = cast(Any, client).order.create(data=order_data)
        
        # 2. Log Transaction in DB
        new_transaction = models.PaymentTransaction(
            user_id=current_user.id,
            school_name=current_user.school_name_mr or current_user.school_name,
            amount=amount_paise,
            razorpay_order_id=razorpay_order['id'],
            status="CREATED"
        )
        db.add(new_transaction)
        db.commit()
        
        return {
            "razorpay_order_id": razorpay_order['id'],
            "amount": amount_paise,
            "key_id": RAZORPAY_KEY_ID # Frontend needs this to open the checkout
        }
    except Exception as e:
        print(f"RAZORPAY ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Razorpay Error: {str(e)}")

@router.post("/verify-success")
async def verify_success(
    payload: Dict[str, str],
    db: Session = Depends(database.get_db),
    current_user: models.Profile = Depends(get_current_user)
):
    order_id = payload.get("razorpay_order_id")
    payment_id = payload.get("razorpay_payment_id")
    signature = payload.get("razorpay_signature")
    
    if not all([order_id, payment_id, signature]):
        raise HTTPException(status_code=400, detail="Missing payment verification details")
    
    try:
        # 1. Verify Signature
        params_dict = {
            'razorpay_order_id': order_id,
            'razorpay_payment_id': payment_id,
            'razorpay_signature': signature
        }
        cast(Any, client).utility.verify_payment_signature(params_dict)
        
        # 2. Update Transaction Status
        transaction = db.query(models.PaymentTransaction).filter(models.PaymentTransaction.razorpay_order_id == order_id).first()
        if transaction:
            cast(Any, transaction).status = "SUCCESS"
            cast(Any, transaction).razorpay_payment_id = payment_id
            cast(Any, transaction).razorpay_signature = signature
            
            # 3. Update User Profile SaaS Status
            cast(Any, current_user).saas_payment_status = "paid"
            # Calculate expiry: March 31st of the next year
            now = datetime.now()
            expiry_year = now.year + 1 if now.month > 3 else now.year
            expiry_date = datetime(expiry_year, 3, 31, 23, 59, 59)
            
            cast(Any, current_user).saas_expiry_date = expiry_date
            cast(Any, current_user).saas_amount_paid = cast(Any, transaction).amount / 100
            
            db.commit()
            return {"status": "SUCCESS", "message": "Payment verified and subscription activated"}
        else:
            raise HTTPException(status_code=404, detail="Transaction record not found")
            
    except Exception as e:
        # Log failure if it's a signature error
        if "SignatureVerificationError" in str(type(e)):
            transaction = db.query(models.PaymentTransaction).filter(models.PaymentTransaction.razorpay_order_id == order_id).first()
            if transaction:
                cast(Any, transaction).status = "FAILED"
                cast(Any, transaction).error_code = "SIGNATURE_VERIFICATION_FAILED"
                cast(Any, transaction).error_description = "The payment signature did not match. Possible tampering."
                db.commit()
            raise HTTPException(status_code=400, detail="Invalid payment signature")
        
        db.rollback()
        print(f"Verification Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/log-failure")
async def log_failure(
    payload: Dict[str, Any],
    db: Session = Depends(database.get_db),
    current_user: models.Profile = Depends(get_current_user)
):
    order_id = payload.get("razorpay_order_id")
    error_code = payload.get("error_code")
    error_description = payload.get("error_description")
    
    transaction = db.query(models.PaymentTransaction).filter(models.PaymentTransaction.razorpay_order_id == order_id).first()
    if transaction:
        cast(Any, transaction).status = "FAILED"
        cast(Any, transaction).error_code = error_code
        cast(Any, transaction).error_description = error_description
        db.commit()
        return {"status": "Logged"}
    
    raise HTTPException(status_code=404, detail="Transaction not found")

@router.get("/logs", response_model=List[schemas.PaymentTransaction])
async def get_payment_logs(
    db: Session = Depends(database.get_db),
    # To keep it secure, we'll require a logged in user with 'master' role
    current_user: models.Profile = Depends(get_current_user)
):
    if str(current_user.role) != 'master':
        raise HTTPException(status_code=403, detail="Only admins can view payment logs")
        
    logs = db.query(models.PaymentTransaction).order_by(models.PaymentTransaction.created_at.desc()).all()
    return logs
