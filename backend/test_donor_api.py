import urllib.request
import json

url = "http://localhost:8000/api/donor/analyze"

# Test Case 1: Eligible Donor
payload_eligible = {
    "age": 25,
    "weight": 65,
    "last_donation_date": None,
    "has_tattoo_last_6_months": False,
    "medications": [],
    "blood_type": "O+"
}

# Test Case 2: Ineligible Donor (Underage)
payload_underage = {
    "age": 16,
    "weight": 65,
    "last_donation_date": None,
    "has_tattoo_last_6_months": False,
    "medications": [],
    "blood_type": "A+"
}

# Test Case 3: Ineligible Donor (Recent Tattoo)
payload_tattoo = {
    "age": 30,
    "weight": 70,
    "last_donation_date": None,
    "has_tattoo_last_6_months": True,
    "medications": [],
    "blood_type": "B-"
}

def run_test(name, payload):
    print(f"--- Testing {name} ---")
    try:
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            print("Status: 200 OK")
            print("Response:", json.dumps(result, indent=2))
    except urllib.error.HTTPError as e:
        print(f"HTTP Error: {e.code}")
        print("Error:", e.read().decode('utf-8'))
    except Exception as e:
        print(f"Request failed: {e}")
    print("\n")

run_test("Eligible Donor", payload_eligible)
run_test("Underage Donor", payload_underage)
run_test("Recent Tattoo Donor", payload_tattoo)
