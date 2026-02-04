from pydantic import BaseModel
from typing import List, Dict, Optional

class BloodSearchResult(BaseModel):
    id: str
    name: str
    address: str
    distance_km: float
    eta_minutes: int
    units_available: int
    inventory: Dict[str, int]
    latitude: float
    longitude: float
    contact_number: Optional[str] = None
    google_maps_url: str

class BloodSearchResponse(BaseModel):
    results: List[BloodSearchResult]

from datetime import date

class DonorEligibilityResponse(BaseModel):
    eligible: bool
    reasons: List[str]
    next_eligible_date: Optional[date] = None
