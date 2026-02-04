from fastapi import APIRouter, HTTPException
from schemas.request import DonorEligibilityRequest
from schemas.response import DonorEligibilityResponse
from datetime import date, timedelta

router = APIRouter(prefix="/donor", tags=["donor"])

@router.post("/analyze", response_model=DonorEligibilityResponse)
async def analyze_donor_eligibility(data: DonorEligibilityRequest):
    reasons = []
    eligible = True
    next_eligible_date = None

    # Age Check
    if data.age < 18:
        eligible = False
        reasons.append("Donor must be at least 18 years old.")
    elif data.age > 65:
        eligible = False
        reasons.append("Donor must be 65 years old or younger.")

    # Weight Check
    if data.weight < 50:
        eligible = False
        reasons.append("Donor must weigh at least 50 kg.")

    # Tattoo/Piercing Check
    if data.has_tattoo_last_6_months:
        eligible = False
        reasons.append("Cannot donate within 6 months of getting a tattoo or piercing.")
        # Calculate strict deferral if date known, otherwise just boolean logic here
        
    # Last Donation Check
    if data.last_donation_date:
        days_since_donation = (date.today() - data.last_donation_date).days
        min_interval = 56 # 8 weeks for whole blood
        if days_since_donation < min_interval:
            eligible = False
            days_remaining = min_interval - days_since_donation
            next_eligible_date = date.today() + timedelta(days=days_remaining)
            reasons.append(f"Must wait {days_remaining} more days between whole blood donations.")
        else:
            next_eligible_date = date.today() # eligible now
    else:
        next_eligible_date = date.today()

    # Medical checks (simple mock list)
    deferred_meds = ["antibiotics", "accutane", "blood thinner"]
    for med in data.medications:
        if any(d in med.lower() for d in deferred_meds):
            eligible = False
            reasons.append(f"Taking {med} may affect eligibility. Please consult a doctor.")

    return DonorEligibilityResponse(
        eligible=eligible,
        reasons=reasons,
        next_eligible_date=next_eligible_date if not eligible and next_eligible_date and next_eligible_date > date.today() else None
    )
