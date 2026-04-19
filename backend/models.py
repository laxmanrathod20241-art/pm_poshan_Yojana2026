from sqlalchemy import Column, String, Boolean, DateTime, Integer, ForeignKey, Date, Numeric, Text
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from database import Base
import uuid

class School(Base):
    __tablename__ = "schools"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Profile(Base):
    __tablename__ = "profiles"
    id = Column(String, primary_key=True) # Keeping as String for compatibility with previously created IDs
    email = Column(String, unique=True, nullable=False)
    role = Column(String, default="teacher")
    first_name = Column(String)
    last_name = Column(String)
    school_name = Column(String)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id"))
    school_name_mr = Column(String)
    center_name_mr = Column(String)
    has_primary = Column(Boolean, default=True)
    has_upper_primary = Column(Boolean, default=False)
    is_onboarded = Column(Boolean, default=False)
    onboarding_step = Column(Integer, default=1)
    # SaaS Columns
    saas_plan_type = Column(String, default="primary")
    saas_payment_status = Column(String, default="unpaid")
    saas_amount_paid = Column(Numeric, default=0)
    saas_expiry_date = Column(DateTime(timezone=True))
    hashed_password = Column(String, nullable=True)
    mobile_number = Column(String, nullable=True)
    principal_name = Column(String, nullable=True)
    principal_contact_number = Column(String, nullable=True)
    school_udise = Column(String(11), unique=True, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class DailyLog(Base):
    __tablename__ = "daily_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    teacher_id = Column(String, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    log_date = Column(Date, nullable=False)
    meals_served_primary = Column(Integer, default=0)
    meals_served_upper_primary = Column(Integer, default=0)
    is_holiday = Column(Boolean, default=False)
    holiday_remarks = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class StudentEnrollment(Base):
    __tablename__ = "student_enrollment"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    teacher_id = Column(String, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    std_1 = Column(Integer, default=0)
    std_2 = Column(Integer, default=0)
    std_3 = Column(Integer, default=0)
    std_4 = Column(Integer, default=0)
    std_5 = Column(Integer, default=0)
    std_6 = Column(Integer, default=0)
    std_7 = Column(Integer, default=0)
    std_8 = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class MenuMaster(Base):
    __tablename__ = "menu_master"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    teacher_id = Column(String, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    item_name = Column(String, nullable=False)
    item_code = Column(String, nullable=False)
    grams_primary = Column(Numeric, default=0)
    grams_upper_primary = Column(Numeric, default=0)
    item_category = Column(String)
    source = Column(String, default="local")
    sort_rank = Column(Integer, default=999)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class InventoryStock(Base):
    __tablename__ = "inventory_stock"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    teacher_id = Column(String, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    item_name = Column(String, nullable=False)
    item_code = Column(String)
    current_balance = Column(Numeric, nullable=False, default=0)
    standard_group = Column(String) # 'primary', 'upper_primary'
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class StockReceipt(Base):
    __tablename__ = "stock_receipts"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    teacher_id = Column(String, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    item_name = Column(String, nullable=False)
    item_code = Column(String) # Link to menu_master.item_code
    quantity_kg = Column(Numeric, nullable=False)
    receipt_date = Column(Date, nullable=False)
    bill_no = Column(String)
    standard_group = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ConsumptionLog(Base):
    __tablename__ = "consumption_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    teacher_id = Column(String, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    log_date = Column(Date, nullable=False)
    meals_served_primary = Column(Integer, default=0)
    meals_served_upper_primary = Column(Integer, default=0)
    main_food = Column(String)
    main_foods_all = Column(JSONB)
    ingredients_used = Column(JSONB)
    is_overridden = Column(Boolean, default=False)
    standard_group = Column(String)
    original_template = Column(JSONB)
    borrowed_items = Column(JSONB)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class GlobalFoodMaster(Base):
    __tablename__ = "global_food_master"
    code = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    name_en = Column(String)
    item_category = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class LocalFoodMaster(Base):
    __tablename__ = "local_food_master"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    teacher_id = Column(String, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    local_code = Column(String, nullable=False)
    name = Column(String, nullable=False)
    name_en = Column(String)
    item_category = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class MenuWeeklySchedule(Base):
    __tablename__ = "menu_weekly_schedule"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    teacher_id = Column(String, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    day_name = Column(String, nullable=False)
    week_pattern = Column(String, nullable=False)
    main_food_codes = Column(JSONB)
    menu_items = Column(JSONB)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class MonthlyReport(Base):
    __tablename__ = "monthly_reports"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    teacher_id = Column(String, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    report_month = Column(Integer, nullable=False)
    report_year = Column(Integer, nullable=False)
    report_data = Column(JSONB)
    daily_ledger_data = Column(JSONB)
    standard_group = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class PaymentTransaction(Base):
    __tablename__ = "payment_transactions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True)
    school_name = Column(String)
    amount = Column(Integer, nullable=False) # In paise
    razorpay_order_id = Column(String, unique=True, nullable=False)
    razorpay_payment_id = Column(String, nullable=True)
    razorpay_signature = Column(String, nullable=True)
    status = Column(String, nullable=False, default="CREATED") # CREATED, SUCCESS, FAILED
    error_code = Column(String, nullable=True)
    error_description = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class FinancialLedgerSnapshot(Base):
    __tablename__ = "financial_ledger_snapshots"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    teacher_id = Column(String, nullable=False) # Soft link to profiles.id
    fiscal_year = Column(Integer, nullable=False)
    section_type = Column(String, default="primary")
    ledger_data = Column(JSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class PaymentReceipt(Base):
    __tablename__ = "payment_receipts"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    teacher_id = Column(String, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    receipt_date = Column(Date, nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    section_type = Column(String, default="primary")
    remarks = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class SaasPricing(Base):
    __tablename__ = "saas_pricing"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    section_type = Column(String, unique=True, nullable=False)
    base_price = Column(Numeric, nullable=False, default=800)
    description = Column(String)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class SaasCoupon(Base):
    __tablename__ = "saas_coupons"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String, unique=True, nullable=False)
    discount_percent = Column(Numeric, nullable=False, default=5)
    promoter_name = Column(String)
    usage_limit = Column(Integer)
    usage_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class SaasSubscription(Base):
    __tablename__ = "saas_subscriptions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    teacher_id = Column(String, ForeignKey("profiles.id", ondelete="CASCADE"))
    plan_type = Column(String, nullable=False)
    amount_paid = Column(Numeric, nullable=False)
    payment_status = Column(String, default="unpaid")
    razorpay_order_id = Column(String)
    razorpay_payment_id = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class CookingStaff(Base):
    __tablename__ = "cooking_staff"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    teacher_id = Column(String, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    staff_name = Column(String, nullable=False)
    post_name = Column(String)
    payment_type = Column(String) # 'per_student', 'per_day', 'monthly'
    rate_primary = Column(Numeric, default=0)
    rate_upper = Column(Numeric, default=0)
    monthly_cost = Column(Numeric, default=0)
    standard_group = Column(String)
    record_month = Column(Integer)
    record_year = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class FuelTracking(Base):
    __tablename__ = "fuel_tracking"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    teacher_id = Column(String, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    fuel_type = Column(String, nullable=False)
    fuel_rate_primary = Column(Numeric, default=0)
    fuel_rate_upper = Column(Numeric, default=0)
    veg_rate_primary = Column(Numeric, default=0)
    veg_rate_upper = Column(Numeric, default=0)
    monthly_cost = Column(Numeric, default=0)
    standard_group = Column(String)
    record_month = Column(Integer)
    record_year = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class MonthlyMandhan(Base):
    __tablename__ = "monthly_mandhan"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    teacher_id = Column(String, nullable=False) # Soft link to profiles.id
    report_month = Column(Integer, nullable=False)
    report_year = Column(Integer, nullable=False)
    standard_group = Column(String, default="primary")
    staff_total = Column(Numeric, default=0)
    fuel_total = Column(Numeric, default=0)
    veg_total = Column(Numeric, default=0)
    is_applicable = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class SystemModule(Base):
    __tablename__ = "system_modules"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    module_name = Column(String, nullable=False)
    route_path = Column(String, nullable=False)
    icon_name = Column(String, nullable=False)
    description = Column(Text)
    is_active_for_teachers = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
class ItemLedgerReport(Base):
    __tablename__ = "item_ledger_reports"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    teacher_id = Column(String, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    item_name = Column(String, nullable=False)
    date_range = Column(String, nullable=False)
    report_data = Column(JSONB)
    standard_group = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
