#!/usr/bin/env python
import sys
import httpx
import traceback

def test_apis():
    """Test the fixed APIs"""
    base_url = "http://127.0.0.1:8000"
    
    tests = [
        ("GET /", f"{base_url}/", "GET"),
        ("GET /api/v1/pond/all", f"{base_url}/api/v1/pond/all", "GET"),
        ("GET /mock/water-score/1", f"{base_url}/mock/water-score/1", "GET"),
        ("GET /mock/water-score/2", f"{base_url}/mock/water-score/2", "GET"),
        ("GET /digital-twin/1", f"{base_url}/digital-twin/1", "GET"),
        # simple water-only what‑if to exercise null-handling in disease
        # helper (no crash expected).
        (
            "GET /digital-twin/1/what-if minimal",
            f"{base_url}/digital-twin/1/what-if?temperature=50&ph=2",
            "GET",
        ),
        # regression reproduction case: increase stocking_density only
        (
            "GET /digital-twin/1/what-if high stocking",
            f"{base_url}/digital-twin/1/what-if?stocking_density=500&scenario_name=High%20density%20test",
            "GET",
        ),
    ]
    
    results = []
    
    for name, url, method in tests:
        try:
            print(f"Testing {name}...", file=sys.stderr)
            with httpx.Client(timeout=10) as client:
                resp = client.request(method, url)
                results.append({
                    "test": name,
                    "status": resp.status_code,
                    "success": 200 <= resp.status_code < 300 or resp.status_code == 404,
                    "response": resp.text[:200]
                })
                print(f"✓ {name} -> {resp.status_code}", file=sys.stderr)
        except Exception as e:
            print(f"✗ {name} -> ERROR: {str(e)}", file=sys.stderr)
            traceback.print_exc()
            results.append({
                "test": name,
                "status": "ERROR",
                "success": False,
                "error": str(e)
            })
    
    print("\n=== TEST RESULTS ===")
    for result in results:
        print(f"{result['test']}: {'PASS' if result['success'] else 'FAIL'} - Status: {result.get('status', 'ERROR')}")
    
    all_passed = all(r['success'] for r in results)
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(test_apis())
