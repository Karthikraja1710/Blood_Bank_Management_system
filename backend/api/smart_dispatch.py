from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Any
from algorithms.graph import CityGraph
from algorithms.models import DonorEligibilityTree, rank_donors, DonationProbabilityModel

router = APIRouter(prefix="/dispatch", tags=["smart-dispatch"])

class DispatchRequest(BaseModel):
    hospital_location: str
    blood_type: str
    donors: List[dict] # Simplified for MVP, receiving list of donor objects
    # Expected donor format: {id, name, location, blood_type, past_donations, age, weight, last_donation_days_ago}

@router.post("/find-best-donor")
async def find_best_donor(req: DispatchRequest):
    graph = CityGraph()
    # Mocking a graph for demonstration
    # In a real app, this would be loaded from a DB or Map Service
    graph.add_edge("Hospital_A", "Central_Hub", 5)
    graph.add_edge("Central_Hub", "Loc_North", 3)
    graph.add_edge("Central_Hub", "Loc_South", 4)
    graph.add_edge("Loc_North", "Donor_1_Home", 2)
    graph.add_edge("Loc_South", "Donor_2_Home", 2)
    # Ensure all donor locations in request are in the graph or connected to 'Central_Hub'
    
    eligible_donors = []
    tree = DonorEligibilityTree()
    prob_model = DonationProbabilityModel()

    # 1. Filter by Eligibility (Decision Tree)
    for donor in req.donors:
        # Check basic eligibility rules
        status = tree.predict({
            "age": donor.get("age", 25),
            "weight": donor.get("weight", 70),
            "last_donation_days_ago": donor.get("last_donation_days_ago"),
            "has_health_issues": donor.get("has_health_issues", False)
        })
        
        if status["eligible"]:
            donor["eligibility_reason"] = status["reason"]
            eligible_donors.append(donor)

    # 2. Calculate Distances (Dijkstra)
    for donor in eligible_donors:
        donor_loc = donor.get("location", "Central_Hub") # Default if missing
        start_node = req.hospital_location if req.hospital_location in graph.adjacency_list else "Hospital_A"
        
        # If node not in graph, mock distance
        if donor_loc not in graph.adjacency_list:
            # Fallback for demo
            dist = 10.0 
        else:
            dist, _ = graph.find_shortest_path(start_node, donor_loc)
            if dist == float('infinity'): dist = 20.0 # Unreachable punishment
            
        donor["distance_km"] = dist

    # 3. Predict Acceptance Probability (Logistic Regression)
    for donor in eligible_donors:
        prob = prob_model.predict_probability(
            distance_km=donor["distance_km"],
            past_donations=donor.get("past_donations", 0)
        )
        donor["acceptance_probability"] = prob
        donor["likely_to_accept"] = prob_model.classify(donor["distance_km"], donor.get("past_donations", 0))

    # 4. Rank Candidates
    # Ranking uses: Blood Type Match, Distance, Recency
    ranked_results = rank_donors(eligible_donors, req.blood_type)
    
    return {
        "hospital": req.hospital_location,
        "requested_type": req.blood_type,
        "optimized_selection": ranked_results
    }
