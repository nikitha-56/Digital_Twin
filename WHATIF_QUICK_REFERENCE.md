# What-If Endpoint — Quick API Reference

## Endpoint
```
GET /digital-twin/{pond_id}/what-if
```

---

## Quick Examples

### 1️⃣ Test High Temperature Stress
```bash
curl "http://localhost:8000/digital-twin/1/what-if?temperature=32&scenario_name=Heat%20wave"
```
**Expected Impact:** Health score drops, disease risk increases, feed efficiency decreases

---

### 2️⃣ Test Water Quality Improvement
```bash
curl "http://localhost:8000/digital-twin/1/what-if?do=8.0&ammonia=0.02&ph=7.8&scenario_name=Water%20exchange%20result"
```
**Expected Impact:** Health score improves, status may upgrade, new flags resolve

---

### 3️⃣ Test High Stocking Density
```bash
curl "http://localhost:8000/digital-twin/1/what-if?stocking_density=500&scenario_name=High%20density%20test"
```
**Expected Impact:** Disease probability increases, new flags appear, health score drops

---

### 4️⃣ Test Molting Stage with Reduced Feed
```bash
curl "http://localhost:8000/digital-twin/1/what-if?molting_stage=true&feed_type=low_protein&scenario_name=Molting%20adjustment"
```
**Expected Impact:** Feed efficiency reduced 30%, mortality forecast adjusted

---

### 5️⃣ Test Worst-Case Disease Scenario
```bash
curl "http://localhost:8000/digital-twin/1/what-if?risk_level_override=Critical&bsi_override=0.9&ammonia=0.3&scenario_name=Disease%20outbreak"
```
**Expected Impact:** Health score critical, status "Critical", disease-driven suggestions priority

---

### 6️⃣ Test Multiple Optimizations
```bash
curl "http://localhost:8000/digital-twin/1/what-if?temperature=27&do=6.5&stocking_density=300&molting_stage=false&scenario_name=Optimized%20conditions"
```
**Expected Impact:** Health score likely improves, status may upgrade, multiple improvements noted

---

### 7️⃣ Test Shallow Pond Feed Layer Distribution
```bash
curl "http://localhost:8000/digital-twin/1/what-if?pond_depth=0.8&shrimp_size=12&scenario_name=Shallow%20pond%20scenario"
```
**Expected Impact:** Different layer distribution (0.3 bottom, 0.5 mid, 0.2 surface)

---

### 8️⃣ Test Deep Pond Feed Layer Distribution
```bash
curl "http://localhost:8000/digital-twin/1/what-if?pond_depth=2.5&scenario_name=Deep%20pond%20scenario"
```
**Expected Impact:** Different layer distribution (0.6 bottom, 0.35 mid, 0.05 surface)

---

### 9️⃣ Test Single Parameter Change (Lightweight)
```bash
curl "http://localhost:8000/digital-twin/1/what-if?ph=8.2"
```
**Expected Impact:** Only pH parameter tested, others remain baseline

---

### 🔟 Test Disease with No Scenario Name
```bash
curl "http://localhost:8000/digital-twin/1/what-if?stocking_density=550"
```
**Note:** Will use "Unnamed Scenario" as the label

---

## Parameter Validation

| Parameter | Type | Range | Example |
|-----------|------|-------|---------|
| temperature | float | 5-35 | 28.5 |
| ph | float | 6.0-9.0 | 7.8 |
| do | float | 0-15 | 5.5 |
| ammonia | float | 0-5 | 0.1 |
| nitrate | float | 0-200 | 25.0 |
| turbidity | float | 0-500 | 40.0 |
| salinity | float | 0-40 | 15.0 |
| stocking_density | int | 1-2000 | 300 |
| shrimp_stage | string | juvenile/sub-adult/adult | juvenile |
| bsi_override | float | 0-1 | 0.65 |
| risk_level_override | string | Low/Medium/High/Critical | High |
| feed_type | string | high_protein/standard/low_protein | standard |
| molting_stage | boolean | true/false | true |
| shrimp_size | float | 0.1-50 | 18.5 |
| pond_depth | float | 0.5-5.0 | 1.5 |
| scenario_name | string | any | "Test scenario" |

---

## Response Structure Summary

```javascript
{
  pond_id: number,
  scenario_name: string,
  timestamp: ISO_8601_string,
  parameters_tested: {
    [param_name]: {
      before: number,
      after: number
    }
  },
  hypothetical: {
    farmer_summary: {...},      // Plain-English summary
    fusion: {...},               // Multimodal analysis
    suggestions: [...]           // Action list
  },
  current: {
    composite_health_score: float,
    pond_status: string,
    primary_concern: string,
    cross_modal_flags: [string]
  },
  delta: {
    health_score_change: float,
    status_change: "improved|unchanged|degraded",
    new_flags: [string],
    resolved_flags: [string],
    parameter_changes: [
      {
        parameter: string,
        before: number,
        after: number,
        impact: "negative|positive|neutral"
      }
    ]
  },
  simulation_note: string
}
```

---

## Response Time

Typical response times:
- **No parameters** (baseline): ~150-200ms
- **1-3 parameters**: ~200-300ms
- **5+ parameters**: ~300-500ms

All computation is local (no external API calls).

---

## Error Responses

```bash
# Pond not found
HTTP 404
{"detail": "Pond not found"}

# Invalid parameter type (e.g., temperature as string)
HTTP 422
{"detail": [{"field": "temperature", "message": "value is not a valid float"}]}
```

---

## Tips & Tricks

### 💡 Compare Multiple Scenarios
Run the same endpoint multiple times with different parameters to compare outcomes:
```bash
# Scenario A: Increase temperature
GET /digital-twin/1/what-if?temperature=30&scenario_name=Scenario_A

# Scenario B: Increase stocking density
GET /digital-twin/1/what-if?stocking_density=400&scenario_name=Scenario_B

# Compare delta.health_score_change and delta.status_change
```

### 💡 Override vs. Parameterized Changes
- Use **parameter fields** (temperature, ph, do) for realistic water/condition changes
- Use **override fields** (bsi_override, risk_level_override) for worst-case modeling

### 💡 Harvest the Suggestions
The `hypothetical.suggestions` array contains prioritized actions the system recommends. Sort by `urgency` (immediate > today > this_week) to identify critical interventions.

### 💡 Check New vs Resolved Flags
- **new_flags**: Represents newly introduced risks (e.g., "high_stocking_density_stress")
- **resolved_flags**: Risks that disappear with the new conditions

### 💡 Use simulation_note for User Communication
The `simulation_note` field is pre-formatted, plain-English text. Display it directly to farm operators without further processing.

---

## Integration Example (JavaScript/React)

```javascript
async function runWhatIfScenario(pond_id, params) {
  const query = new URLSearchParams(params).toString();
  const response = await fetch(
    `http://localhost:8000/digital-twin/${pond_id}/what-if?${query}`
  );
  
  if (!response.ok) {
    console.error('What-if scenario failed:', response.status);
    return null;
  }
  
  const result = await response.json();
  
  // Display simulation note to user
  console.log(result.simulation_note);
  
  // Compare scenarios
  console.log(`Health score change: ${(result.delta.health_score_change * 100).toFixed(1)}%`);
  console.log(`Status: ${result.delta.status_change}`);
  
  // Show recommendations
  if (result.hypothetical.suggestions.length > 0) {
    console.log(`Top suggestion: ${result.hypothetical.suggestions[0].title}`);
  }
  
  return result;
}

// Usage
runWhatIfScenario(1, {
  temperature: 30,
  stocking_density: 400,
  scenario_name: "Summer conditions"
});
```

---

## Frontend Implementation Pattern

```
1. User adjusts sliders/inputs for scenario
2. Send GET /digital-twin/{pond_id}/what-if with parameters
3. Display results:
   ├─ Current state (left panel)
   ├─ Hypothetical state (right panel)
   ├─ Delta comparison (center)
   └─ simulation_note (bottom summary)
4. Show recommendations from hypothetical.suggestions
5. Highlight new_flags in red, resolved_flags in green
6. Allow user to "Save scenario" → store parameters for later replay
```

---

## Known Behaviors

✅ **Partial updates work**: Only changed parameters affect hypothetical — others stay as baseline  
✅ **Deterministic**: Same pond_id + params = same results  
✅ **Fast**: Local computation, no external API calls  
✅ **Safe**: No actual pond data is modified  
✅ **Comprehensive**: All three modalities (water/disease/feed) computed  

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Pond not found | Verify pond_id exists in database |
| Empty suggestions | Hypothetical state may be near-optimal; check simulation_note |
| health_score_change is 0 | All parameters provided match current values |
| status_change is "unchanged" | Hypothetical and current have same composite score |

---

**Last Updated:** 2026-03-05  
**Endpoint Status:** ✅ Ready for Testing
