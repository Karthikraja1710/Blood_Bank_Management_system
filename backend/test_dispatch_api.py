import urllib.request
import json

url = "http://localhost:8000/api/dispatch/find-best-donor"

# Mock Data Payload
payload = {
  "hospital_location": "Central_Hub",
  "blood_type": "A+",
  "donors": [
    {
      "id": "D1",
      "name": "John Doe",
      "location": "Loc_North", # Distance 3
      "blood_type": "A+",
      "past_donations": 5,
      "age": 30,
      "weight": 75,
      "last_donation_days_ago": 100,
      "has_health_issues": False
    },
    {
      "id": "D2", 
      "name": "Jane Smith",
      "location": "Loc_South", # Distance 4
      "blood_type": "O+", # Compatible
      "past_donations": 1,
      "age": 25,
      "weight": 60,
      "last_donation_days_ago": 200,
      "has_health_issues": False
    },
    {
      "id": "D3",
      "name": "Bob Ineligible",
      "location": "Loc_North",
      "blood_type": "A+",
      "past_donations": 0,
      "age": 17, # Underage
      "weight": 80,
      "last_donation_days_ago": None,
      "has_health_issues": False
    },
    {
      "id": "D4",
      "name": "Alice FarAway",
      "location": "Unknown_Loc", # Defaults to 10km
      "blood_type": "A+",
      "past_donations": 10,
      "age": 40,
      "weight": 70,
      "last_donation_days_ago": 60,
      "has_health_issues": False
    }
  ]
}

print("--- Testing Smart Dispatch Algorithm ---")
try:
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as response:
        result = json.loads(response.read().decode('utf-8'))
        print("Status: 200 OK")
        print(json.dumps(result, indent=2))
except urllib.error.HTTPError as e:
    print(f"HTTP Error: {e.code}")
    print("Error:", e.read().decode('utf-8'))
except Exception as e:
    print(f"Request failed: {e}")
