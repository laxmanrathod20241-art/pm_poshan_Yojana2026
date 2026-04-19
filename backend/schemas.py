from pydantic import BaseModel, ConfigDict, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from decimal import Decimal
from uuid import UUID

# --- Profile Schemas ---

class ProfileBase(BaseModel):
    email: str = Field(..., max_length=255)
    role: Optional[str] = Field("teacher", max_length=50)
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    school_name: Optional[str] = Field(None, max_length=255)
    school_id: Optional[Any] = None # Can be UUID or U-DISE str
    school_name_mr: Optional[str] = Field(None, max_length=255)
    center_name_mr: Optional[str] = Field(None, max_length=255)
    has_primary: Optional[bool] = True
    has_upper_primary: Optional[bool] = False
    is_onboarded: Optional[bool] = False
    onboarding_step: Optional[int] = 1
    saas_plan_type: Optional[str] = Field("primary", max_length=50)
    saas_payment_status: Optional[str] = Field("unpaid", max_length=20)
    saas_amount_paid: Optional[Decimal] = Decimal(0)
    saas_expiry_date: Optional[datetime] = None
    mobile_number: Optional[str] = Field(None, max_length=15, pattern=r"^\d{10,15}$")
    principal_name: Optional[str] = Field(None, max_length=150)
    principal_contact_number: Optional[str] = Field(None, max_length=15, pattern=r"^\d{10,15}$")
    school_udise: Optional[str] = Field(None, max_length=11, min_length=11, pattern=r"^\d{11}$")

class ProfileCreate(ProfileBase):
    id: str = Field(..., max_length=100)
    password: str = Field(..., min_length=8, max_length=100)

class Profile(ProfileBase):
    id: Any # UUID or string
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class TeacherRegistrationStep1(BaseModel):
    first_name: str = Field(..., max_length=100)
    last_name: str = Field(..., max_length=100)
    mobile_number: str = Field(..., max_length=15, pattern=r"^\d{10}$")
    school_name: str = Field(..., max_length=255)
    principal_name: str = Field(..., max_length=150)
    principal_contact_number: str = Field(..., max_length=15, pattern=r"^\d{10}$")
    school_udise: str = Field(..., max_length=11, min_length=11, pattern=r"^\d{11}$")

class TeacherRegistrationFinal(BaseModel):
    email: str = Field(..., max_length=255)
    password: str = Field(..., min_length=8, max_length=100)
    step1_data: TeacherRegistrationStep1

# --- Auth Schemas ---

class UserLogin(BaseModel):
    email: str = Field(..., max_length=255)
    password: str = Field(..., max_length=100)

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: Optional[str] = None
    email: Optional[str] = None

# --- School Schemas ---

class SchoolBase(BaseModel):
    name: str

class School(SchoolBase):
    id: UUID
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

# --- Operational Schemas ---

class DailyLogBase(BaseModel):
    log_date: date
    meals_served_primary: Optional[int] = 0
    meals_served_upper_primary: Optional[int] = 0
    is_holiday: Optional[bool] = False
    holiday_remarks: Optional[str] = None

class DailyLogCreate(DailyLogBase):
    pass

class DailyLog(DailyLogBase):
    id: UUID
    teacher_id: str
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class EnrollmentBase(BaseModel):
    std_1: Optional[int] = 0
    std_2: Optional[int] = 0
    std_3: Optional[int] = 0
    std_4: Optional[int] = 0
    std_5: Optional[int] = 0
    std_6: Optional[int] = 0
    std_7: Optional[int] = 0
    std_8: Optional[int] = 0

class Enrollment(EnrollmentBase):
    id: UUID
    teacher_id: str
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class MenuMasterBase(BaseModel):
    item_name: str
    item_code: str
    grams_primary: Optional[Decimal] = Decimal(0)
    grams_upper_primary: Optional[Decimal] = Decimal(0)
    item_category: Optional[str] = None
    source: Optional[str] = "local"
    sort_rank: Optional[int] = 999

class MenuMaster(MenuMasterBase):
    id: UUID
    teacher_id: str
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class InventoryStockBase(BaseModel):
    item_name: str
    item_code: Optional[str] = None
    current_balance: Decimal
    standard_group: Optional[str] = None

class InventoryStock(InventoryStockBase):
    id: UUID
    teacher_id: str
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class StockReceiptBase(BaseModel):
    item_name: str
    quantity_kg: Decimal
    receipt_date: date
    bill_no: Optional[str] = None
    standard_group: Optional[str] = None

class StockReceipt(StockReceiptBase):
    id: UUID
    teacher_id: str
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class ConsumptionLogBase(BaseModel):
    log_date: date
    meals_served_primary: Optional[int] = 0
    meals_served_upper_primary: Optional[int] = 0
    main_food: Optional[str] = None
    main_foods_all: Optional[List[str]] = None
    ingredients_used: Optional[List[str]] = None
    is_overridden: Optional[bool] = False
    standard_group: Optional[str] = None
    original_template: Optional[Dict[str, Any]] = None
    borrowed_items: Optional[Dict[str, Any]] = None

class ConsumptionLog(ConsumptionLogBase):
    id: UUID
    teacher_id: str
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class MenuScheduleBase(BaseModel):
    day_name: str
    week_pattern: str
    main_food_codes: Optional[List[str]] = None
    menu_items: Optional[List[str]] = None
    is_active: Optional[bool] = True

class MenuSchedule(MenuScheduleBase):
    id: UUID
    teacher_id: str
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

# --- Media Schema ---

class MediaBase(BaseModel):
    filename: str
    file_path: str
    file_type: str
    uploaded_by: str

class Media(MediaBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
# --- Financial & Reporting Schemas ---

class MonthlyMandhanBase(BaseModel):
    report_month: int
    report_year: int
    standard_group: Optional[str] = "primary"
    staff_total: Optional[Decimal] = Decimal(0)
    fuel_total: Optional[Decimal] = Decimal(0)
    veg_total: Optional[Decimal] = Decimal(0)
    is_applicable: Optional[bool] = True

class MonthlyMandhanCreate(MonthlyMandhanBase):
    pass

class MonthlyMandhan(MonthlyMandhanBase):
    id: UUID
    teacher_id: str
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

# --- Payment Transaction Schemas ---

class PaymentTransactionBase(BaseModel):
    user_id: Optional[UUID] = None
    school_name: Optional[str] = None
    amount: int
    razorpay_order_id: str
    status: str = "CREATED"

class PaymentTransactionCreate(PaymentTransactionBase):
    pass

class PaymentTransactionUpdate(BaseModel):
    razorpay_payment_id: Optional[str] = None
    razorpay_signature: Optional[str] = None
    status: Optional[str] = None
    error_code: Optional[str] = None
    error_description: Optional[str] = None

class PaymentTransaction(PaymentTransactionBase):
    id: UUID
    razorpay_payment_id: Optional[str] = None
    razorpay_signature: Optional[str] = None
    error_code: Optional[str] = None
    error_description: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)
