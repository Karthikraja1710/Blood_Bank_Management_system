from typing import List, Dict, Any
import math
from datetime import date

# --- Decision Tree for Donor Eligibility ---
class DonorEligibilityTree:
    """
    A rule-based Decision Tree implementation to determining donor eligibility.
    """
    def predict(self, donor_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Traverses the tree to check eligibility.
        Input donor_data expects: age, weight, last_donation_days_ago, has_health_issues
        """
        # Node 1: Age Check
        if donor_data.get('age') < 18 or donor_data.get('age') > 65:
            return {"eligible": False, "reason": "Age requirement not met (18-65)."}
        
        # Node 2: Weight Check
        if donor_data.get('weight') < 50:
            return {"eligible": False, "reason": "Weight requirement not met (min 50kg)."}
            
        # Node 3: Health Issues
        if donor_data.get('has_health_issues', False):
             return {"eligible": False, "reason": "Health screening failed."}

        # Node 4: Last Donation
        last_donation = donor_data.get('last_donation_days_ago')
        if last_donation is not None and last_donation < 56:
             return {"eligible": False, "reason": f"Must wait {56 - last_donation} more days."}

        return {"eligible": True, "reason": "Eligible to donate."}


# --- Ranking Algorithm for Donor Selection ---
def rank_donors(donors: List[Dict[str, Any]], request_blood_type: str) -> List[Dict[str, Any]]:
    """
    Ranks donors based on compatibility, distance, and donation history.
    """
    ranked_donors = []
    
    blood_compatibility = {
        'A+': ['A+', 'A-', 'O+', 'O-'],
        'A-': ['A-', 'O-'],
        'B+': ['B+', 'B-', 'O+', 'O-'],
        'B-': ['B-', 'O-'],
        'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], # Universal recipient
        'AB-': ['AB-', 'A-', 'B-', 'O-'],
        'O+': ['O+', 'O-'],
        'O-': ['O-']
    }
    
    compatible_types = blood_compatibility.get(request_blood_type, [])
    
    for donor in donors:
        score = 0
        
        # 1. Blood Type Match (High Priority)
        if donor['blood_type'] == request_blood_type:
            score += 50  # Exact match
        elif donor['blood_type'] in compatible_types:
            score += 30  # Compatible
        else:
            continue # Skip incompatible
            
        # 2. Distance (Lower is better)
        # Assuming donor dict has 'distance_km'
        dist = donor.get('distance_km', 100)
        score += max(0, 40 - dist) # Up to 40 points for close proximity
        
        # 3. Recency (Encourage safe rotation)
        days_ago = donor.get('last_donation_days_ago', 365)
        if days_ago > 365:
            score += 10 # Haven't donated in a while, good candidate
        
        donor['dispatch_score'] = round(score, 2)
        ranked_donors.append(donor)
        
    # Sort by score descending
    return sorted(ranked_donors, key=lambda x: x['dispatch_score'], reverse=True)


# --- Logistic Regression Simulation ---
class DonationProbabilityModel:
    """
    Simulates a Logistic Regression model to predict probability of acceptance.
    P(Y=1) = 1 / (1 + e^-(w1*x1 + w2*x2 + b))
    Features:
    x1: Distance (negative weight)
    x2: Past Donations Count (positive weight)
    """
    def __init__(self):
        # Pre-defined weights (simulating a trained model)
        self.w_distance = -0.1
        self.w_past_donations = 0.5
        self.bias = 0.0
        
    def sigmoid(self, z):
        return 1 / (1 + math.exp(-z))
        
    def predict_probability(self, distance_km: float, past_donations: int) -> float:
        z = (self.w_distance * distance_km) + (self.w_past_donations * past_donations) + self.bias
        return round(self.sigmoid(z), 4)

    def classify(self, distance_km: float, past_donations: int, threshold: float = 0.5) -> str:
        prob = self.predict_probability(distance_km, past_donations)
        return "High Probability" if prob >= threshold else "Low Probability"
