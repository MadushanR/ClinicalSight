# Resident Safety & AI Metrics Guide

Beginner-friendly overview of three related but distinct metrics used in the system:
"Fall Risk", "Risk Level", and "Attention".

---
## 1. Quick Definitions

| Term | Type | What It Represents | Where Calculated | Shown As |
|------|------|--------------------|------------------|----------|
| Fall Risk (Probability) | Numeric (0.0–1.0) | AI model estimate of the chance of a fall in the next 7 days | `AIModelService.getFallRiskPrediction` (calls `/fall/predict`) | Percentage bar (e.g. 42%) |
| Risk Level | Categorical (Low / Medium / High) | Composite score combining fall risk probability + most recent vitals + recent fall event | `WellnessService.determineRiskLevel` | Colored badge |
| Attention Flag | Boolean (Yes / No) | Operational triage indicator: should staff review this resident now? | `WellnessService.getAllResidentSummaries` | "Needs Attention" count / table column |

---
## 2. How Each Is Computed

### 2.1 Fall Risk Probability (AI Model)
**Goal:** Predict likelihood of a fall within the next 7 days.

1. Backend gathers last 7 days of shift observations for the resident.
2. Each observation is converted to a feature dictionary (15 features):
   - Previous fall event (`has_fall_event`)
   - Mobility level (encoded)
   - Use of aid (walker/cane)
   - Dizziness flag
   - Unsteady gait flag
   - MMSE score (cognitive baseline)
   - Cognitive impairment flag
   - Confusion flag
   - Polypharmacy count (# of meds)
   - High-risk medication flag
   - Systolic blood pressure (`bp_systolic`)
   - Oxygen saturation (`oxygen_sat`)
   - Agitation flag
   - Withdrawn flag
   - Age group (bucketed: <65, 65–74, 75–84, 85+)
3. Features array is POSTed to the AI service (`/fall/predict`).
4. AI model (Gradient Boosting + temporal weighting) returns a probability.
5. Backend stores/returns that number (e.g. 0.42 → 42%).

Important notes:
- Uses multiple recent observations (temporal weighting gives more influence to the most recent days).
- A probability of 0.70 means "70% likelihood of a fall in the next week" based on patterns observed.
- If there is no recent observation data → returns 0.0 (insufficient data fallback).

### 2.2 Risk Level (Composite Clinical Score)
**Goal:** Provide a simple clinical category blending prediction + current condition.

1. Start with a score of 0.
2. Add points from fall risk probability:
   - ≥ 0.70 → +4
   - ≥ 0.40 → +2
   - ≥ 0.20 → +1
3. Look at the MOST RECENT shift observation only and add:
   - Fever (temperature ≥ 38.0°C) → +3
   - Systolic BP < 100 or > 160 → +2
   - Heart rate < 60 or > 100 → +1
   - Oxygen saturation < 90% → +2
   - Documented fall event (recent) → +3
4. Convert total score:
   - Score ≥ 6 → High
   - Score ≥ 3 → Medium
   - Score < 3 → Low

Important notes:
- Risk Level is NOT the AI model output; it is a post-processing layer in Java.
- It can raise concern even if fall risk probability is moderate (e.g., vitals are unstable).
- It only uses the latest observation for vitals; fall risk model used up to 7 days.

### 2.3 Attention Flag (Triage Gate)
**Goal:** Fast, binary indicator for workflow ("show me all residents needing review").

Set to "Yes" if ANY of these hold:
1. `riskLevel` is High OR Medium
2. `fallRiskProbability` ≥ 0.50 (model sees elevated fall probability)
3. Medication adherence concern level is "high" or "critical" (from AI medication model)

Else → "No".

Important notes:
- It's intentionally broad (Medium risk already included) to avoid missing edge cases.
- Medication adherence issues alone can trigger Attention.
- Mood currently does NOT directly trigger Attention in the restored logic (though mood changes are tracked separately).

---
## 3. How They Relate (Similarities & Differences)

| Aspect | Fall Risk | Risk Level | Attention |
|--------|-----------|------------|-----------|
| Source | AI model (ML) | AI + latest vitals + recent fall event | Derived rule (OR conditions) |
| Data Span | Last 7 days (temporal weighting) | Latest observation + AI probability | Aggregated results from Risk Level + AI + medication concern |
| Format | Numeric probability | Category string | Yes / No |
| Purpose | Predictive analytics | Clinical severity classification | Operational triage |
| Upstream dependency | Shift observations | Fall Risk + latest vitals | Fall Risk + Risk Level + Medication concern |
| Modifiable thresholds | In AI service / training | Java scoring constants | Simple Java if conditions |

### Shared Inputs
- Both Fall Risk and Risk Level consider fall-related indicators (previous fall, gait instability, mobility issues).
- Attention reuses outputs from both (e.g., a High Risk Level triggers Attention immediately).

### Key Distinctions
- Fall Risk is purely predictive and probabilistic.
- Risk Level fuses prediction + clinical snapshot into a simpler label.
- Attention flattens everything to a binary: "Act now or routine".

---
## 4. Example Scenarios

| Fall Risk Prob | Latest Vitals / Flags | Calculated Risk Level | Attention? | Reason |
|----------------|-----------------------|-----------------------|------------|--------|
| 0.72 | All vitals normal | Medium (4 points) | Yes | Medium risk level |
| 0.38 | Fever + low O2 | High (2 + 3 + 2 = 7) | Yes | High risk level |
| 0.18 | Recent fall event | Medium (1 + 3 = 4) | Yes | Fall event elevates score |
| 0.55 | Stable vitals | Medium (2 points) | Yes | Probability ≥ 0.50 |
| 0.22 | Stable vitals, normal meds | Low (1 point) | No | No condition met |
| 0.28 | Med concern = critical | Low (2 points) | Yes | Critical medication concern |

---
## 5. Why Designed This Way

- **Separation of concerns:** Prediction (AI) vs interpretation (Risk Level) vs action (Attention).
- **Clinical safety:** A moderate probability + unstable vitals ≠ safe; composite score captures synergy.
- **Simplicity for dashboard:** Staff can sort by probability OR filter by Attention without parsing all raw data.
- **Extensibility:** Each layer can evolve independently (swap model, adjust scoring, change attention triggers).

---
## 6. Where To Look in Code

| Concept | File / Method |
|---------|---------------|
| Fall Risk feature building | `AIModelService.getFallRiskFeatures` |
| Fall Risk API call | `AIModelService.getFallRiskPrediction` (calls Flask `/fall/predict`) |
| Risk Level scoring | `WellnessService.determineRiskLevel` |
| Attention flag assignment | `WellnessService.getAllResidentSummaries` (inside mapping) |
| DTO structure | `ResidentSummaryDTO` |

---
## 7. How To Modify (Common Customizations)

### 7.1 Change Risk Level Thresholds
Edit the final mapping in `determineRiskLevel`:
```java
if (riskScore >= 7) return "High"; // was 6
if (riskScore >= 4) return "Medium"; // was 3
return "Low";
```

### 7.2 Adjust Fall Risk Influence
Increase weight of AI probability on clinical score:
```java
if (fallRiskProbability >= 0.7) riskScore += 5; // was 4
else if (fallRiskProbability >= 0.4) riskScore += 3; // was 2
```

### 7.3 Make Attention Stricter
Replace logic with:
```java
if ("High".equals(riskLevel) || 
    (fallRiskProbability != null && fallRiskProbability >= 0.60) ||
    "critical".equals(medConcern)) {
    attentionFlag = "Yes";
}
```

### 7.4 Add Mood Escalation
After computing riskLevel:
```java
if (moodSummary != null && moodSummary.toLowerCase().contains("high concern")) {
    attentionFlag = "Yes";
}
```

### 7.5 Externalize Thresholds (Optional)
Add to `application.properties`:
```
risk.high.threshold=6
risk.medium.threshold=3
attention.fall.threshold=0.50
```
Inject with `@Value("${risk.high.threshold}")` etc.

---
## 8. Edge Cases & Safeguards

| Edge Case | Current Behavior | Potential Improvement |
|-----------|------------------|-----------------------|
| No observations last 7 days | Fall Risk = 0.0; Risk Level may be Low | Display "Insufficient data" badge |
| Missing vitals in latest observation | Those factors skipped | Show explicit "Vitals incomplete" tooltip |
| Model API failure | Fall Risk = 0.0 | Retry with backoff + heuristic fallback |
| Very high fall risk but normal vitals | Medium risk level (points only from probability) | Add direct override: fallRisk ≥ 0.8 → High |
| Medication critical, low fall risk | Attention = Yes | Show dual badges for clarity |

---
## 9. Glossary

| Term | Meaning |
|------|---------|
| MMSE | Mini-Mental State Examination (cognitive baseline score) |
| Polypharmacy | Use of multiple medications simultaneously (higher counts raise fall risk) |
| Hypoxia | Low oxygen saturation (< 90%) |
| Temporal weighting | Recent observations given higher weight in model averaging |
| Composite score | A sum of weighted factors turned into a category |

---
## 10. FAQ
**Q: Why not just use the AI probability for everything?**  
A: Pure prediction ignores acute issues like fever or sudden hypoxia which increase real-world risk independent of historical fall patterns.

**Q: Can Risk Level ever be lower than what the probability suggests?**  
A: Yes. If probability is moderate but no vitals are abnormal, score may remain Medium instead of High.

**Q: Does Attention mean emergency?**  
A: Not necessarily—"Yes" means "review soon"; High risk + Attention usually indicates prioritization.

**Q: Why include Medium in Attention?**  
A: Medium often reflects evolving instability; surfacing earlier reduces missed deterioration.

**Q: Where do I add new factors (e.g., cognitive decline trend)?**  
A: Extend `determineRiskLevel` (add points) or enrich feature generation for the AI model.

---
## 11. Inputs & Manual Testing

This section lists the raw inputs (observation fields / model features) and how changing them will influence each metric so you can manually test behavior.

### 11.1 Feature-to-Metric Impact Matrix

| Input / Flag / Value | Fall Risk Probability (AI) | Risk Level (Composite) | Attention Flag |
|----------------------|----------------------------|------------------------|----------------|
| Previous fall event (recent) | Strong increase (model feature) | +3 points | Via Risk Level (if Medium/High) |
| Mobility limitation / lower mobility code | Moderate increase | None direct (unless encoded elsewhere) | Indirect via higher fall risk ≥ 0.50 |
| Uses assistive device (walker/cane) | Slight–moderate increase | None | Indirect via probability |
| Dizziness flag | Increase | None | Indirect |
| Unsteady gait flag | Strong increase | None | Indirect |
| MMSE low score / cognitive impairment | Increase (cognition risk) | None | Indirect |
| Confusion flag | Increase | None | Indirect |
| Polypharmacy count high (e.g. ≥5) | Increase | None | Indirect |
| High-risk medication flag | Increase | None | Indirect |
| Systolic BP <100 or >160 | Small/no direct model change (unless included) | +2 points | Via Risk Level |
| Oxygen saturation <90% | Model: mild (if feature) | +2 points | Via Risk Level |
| Temperature ≥38.0°C | Usually not fall feature (unless added) | +3 points | Via Risk Level |
| Heart rate <60 or >100 | Usually not fall feature (unless added) | +1 point | Via Risk Level |
| Agitation flag | Increase | None | Indirect |
| Withdrawn flag | Slight increase | None | Indirect |
| Age bucket (older) | Baseline increase | None | Indirect |
| Medication adherence concern = high/critical | Not used | Not used | Direct trigger (Yes) |
| Fall risk probability ≥0.50 | — | Contributes points (threshold buckets) | Direct trigger (Yes) |
| Risk Level Medium / High | — | — | Direct trigger (Yes) |

Legend:
- "Increase" indicates the AI model is expected to push probability upward when that feature is active/worse.
- Points columns refer to `determineRiskLevel` scoring rules.
- Attention triggers are evaluated after computing fall risk + risk level + medication concern.

### 11.2 Suggested Manual Test Cases

| Test Case | Changes to Make | Expected Outcome |
|-----------|-----------------|------------------|
| Baseline resident | Normal vitals, no flags | Low risk probability (~0–0.15), Risk Level Low, Attention No |
| Add unsteady gait + dizziness | Set both flags true in latest 3 observations | Probability rises (>0.30), Risk Level may still Low/Medium (points from probability), Attention Yes if probability ≥0.50 or Medium |
| Acute vital deterioration | Keep probability moderate (~0.35), set fever + low O2 in latest observation | Risk Level High (points 2 +3 + maybe +2), Attention Yes |
| Medication adherence failure only | Set adherence concern = critical, keep all else normal, probability low (~0.20) | Risk Level Low, Attention Yes (med concern) |
| Recent fall event added | Add fall event flag in latest observation | Probability jump + Risk Level gains +3 → likely Medium+, Attention Yes |
| Polypharmacy escalation | Increase med count, add high-risk medication flag | Probability increases (model), potential Medium risk level via probability points; Attention Yes if Medium or ≥0.50 |
| Combined high scenario | Fall event + unsteady gait + dizziness + low O2 | Probability high (≥0.60–0.70), Risk Level High, Attention Yes |

### 11.3 How to Perform Manual Field Changes
Depending on your data storage:
1. Create or edit a latest Shift Observation record for a resident:
   - Set flags (e.g., `unsteadyGait=true`, `dizziness=true`).
   - Adjust vitals (e.g., `oxygenSat=88`, `temperature=38.2`).
   - Mark `hasFallEvent=true`.
2. Ensure at least 2–3 prior observations exist so temporal weighting can take effect.
3. Trigger a backend refresh (navigate to dashboard after cache interval or temporarily invalidate cache) to fetch updated predictions.
4. Observe:
   - Fall Risk % change (dashboard bar).
   - Risk Level badge shift (Low → Medium/High).
   - Attention column toggling to Yes if criteria met.

If direct DB access is available, batch edits can simulate historical pattern (e.g., multiple days of dizziness) to magnify probability.

### 11.4 Interpreting Changes
| Observation Change | If Probability Barely Moves | If Probability Jumps | Action |
|--------------------|-----------------------------|----------------------|--------|
| Vital abnormal only | Risk Level increases | Risk Level increases more | Investigate acute issue |
| Multiple gait-related flags | Might need more days of data | Immediate rise | Assess fall prevention plan |
| Medication concern critical | Attention Yes without prob change | Same + probability may rise later | Review adherence root cause |
| Single isolated fall event | Medium risk level via +3 points | Higher if model weights it strongly | Update fall prevention interventions |

### 11.5 Tips for Controlled Experiments
- Change ONE variable at a time across a 3–day window to isolate effect.
- Record baseline probability before modifications.
- Use residents with ample historical observations to reduce noise.
- Revert changes after test (avoid contaminating future modeling).

### 11.6 Adding New Inputs (Prototype Flow)
1. Add field to Shift Observation entity.
2. Populate data for several residents.
3. Extend feature builder (`AIModelService.getFallRiskFeatures`).
4. Retrain / adjust Flask model to consume new feature.
5. Optionally add scoring points in `determineRiskLevel`.
6. Update this guide.

### 11.7 Quick Reference: Strongest Levers
- Previous fall event
- Unsteady gait
- Dizziness (when persistent)
- Cognitive impairment + confusion combo
- Oxygen saturation < 90%
- Fever + recent fall synergy

These typically produce the largest combined shifts across probability, composite score, and triage.

## 12. Summary
- **Fall Risk** = AI probability (multi-observation, predictive).  
- **Risk Level** = Composite clinical category (probability + latest vitals + fall history).  
- **Attention** = Binary triage flag (any elevated signal → Yes).  
They build on each other: Observations → Features → Fall Risk → Risk Level → Attention.

Use them together: sort by fall probability for forecasting, filter by Attention for workflow, scan Risk Level for severity context.

---
*Last updated: 2025-11-06*
