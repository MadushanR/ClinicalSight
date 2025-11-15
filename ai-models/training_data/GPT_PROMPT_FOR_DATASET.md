# Prompt for GPT to Generate High-Quality Fall Risk Training Dataset

## TASK
Generate a realistic, clinically-validated CSV dataset for training a fall risk prediction model in elderly care facilities. The dataset should contain 2000-5000 rows of synthetic but realistic resident observations.

## CSV STRUCTURE
Create a CSV file with these exact columns (header row required):

**Column Names (in this exact order):**
```
has_fall_event,mobility_level,use_of_aid,dizziness_flag,unsteady_gait_flag,mmse_score,cognitive_impairment_flag,confusion_flag,polypharmacy_count,high_risk_med_flag,bp_systolic,oxygen_sat,agitation_flag,withdrawn_flag,age_group,fell_within_30_days
```

## FEATURE DEFINITIONS

1. **has_fall_event** (0 or 1)
   - 0 = No recent fall in past 30 days
   - 1 = Had a fall in past 30 days
   - Distribution: ~25-30% should be 1 (falls are common but not majority)

2. **mobility_level** (0, 1, 2, or 3)
   - 0 = Independent (walks without assistance)
   - 1 = Independent with aid (uses cane/walker independently)
   - 2 = Requires some assistance (needs staff help occasionally)
   - 3 = Requires significant assistance (dependent on staff)
   - Distribution: 30% level 0, 35% level 1, 25% level 2, 10% level 3

3. **use_of_aid** (0 or 1)
   - 0 = No walking aid
   - 1 = Uses cane, walker, wheelchair, or other assistive device
   - Distribution: ~40-50% should be 1

4. **dizziness_flag** (0 or 1)
   - 0 = No reported dizziness
   - 1 = Reports dizziness or vertigo
   - Distribution: ~20-25% should be 1

5. **unsteady_gait_flag** (0 or 1)
   - 0 = Stable gait
   - 1 = Unsteady, shuffling, or irregular gait
   - Distribution: ~30-35% should be 1

6. **mmse_score** (integer 0-30)
   - Mini-Mental State Examination score
   - Normal: 24-30, Mild impairment: 18-23, Moderate: 10-17, Severe: 0-9
   - Distribution: Mean ~23, SD ~5, range 10-30 (most residents have some cognitive decline)

7. **cognitive_impairment_flag** (0 or 1)
   - 0 = MMSE >= 20 (no significant impairment)
   - 1 = MMSE < 20 (cognitive impairment present)
   - Distribution: ~30-35% should be 1

8. **confusion_flag** (0 or 1)
   - 0 = Oriented and clear
   - 1 = Acute confusion, disorientation, or delirium
   - Distribution: ~15-20% should be 1

9. **polypharmacy_count** (integer 0-15)
   - Number of daily medications
   - Distribution: Mean ~5, SD ~2.5, range 0-12 (elderly typically on multiple meds)

10. **high_risk_med_flag** (0 or 1)
    - 0 = Not taking fall-risk medications
    - 1 = Takes sedatives, antipsychotics, antihypertensives, or diuretics
    - Distribution: ~35-40% should be 1

11. **bp_systolic** (integer 90-180)
    - Systolic blood pressure in mmHg
    - Distribution: Mean ~130, SD ~18, range 95-170
    - Include some low (<100) and high (>160) outliers

12. **oxygen_sat** (integer 85-100)
    - Oxygen saturation percentage
    - Distribution: Mean ~96, SD ~3, most 92-100, some hypoxia cases 88-91

13. **agitation_flag** (0 or 1)
    - 0 = Calm behavior
    - 1 = Agitated, restless, or aggressive behavior
    - Distribution: ~12-15% should be 1

14. **withdrawn_flag** (0 or 1)
    - 0 = Socially engaged
    - 1 = Withdrawn, isolated, or unresponsive
    - Distribution: ~10-15% should be 1

15. **age_group** (0, 1, 2, or 3)
    - 0 = Under 65 years
    - 1 = 65-74 years
    - 2 = 75-84 years
    - 3 = 85+ years
    - Distribution: 5% group 0, 25% group 1, 45% group 2, 25% group 3

16. **fell_within_30_days** (0 or 1) **[TARGET VARIABLE]**
    - 0 = Did NOT fall in the 30 days following observation
    - 1 = DID fall in the 30 days following observation
    - Distribution: ~28-35% should be 1 (realistic fall rate in care facilities)

## CRITICAL CLINICAL CORRELATIONS

Make the data realistic by including these evidence-based correlations:

### Strong Positive Correlations (increase fall risk):
- Previous falls (has_fall_event=1) → fell_within_30_days=1 (strongest predictor, ~60-70% correlation)
- Unsteady gait + mobility_level ≥2 → fell_within_30_days=1 (~55-65%)
- Cognitive impairment + polypharmacy_count ≥6 → fell_within_30_days=1 (~50-60%)
- Dizziness + high_risk_med_flag → fell_within_30_days=1 (~45-55%)
- Age_group=3 + mobility_level ≥2 → fell_within_30_days=1 (~50-60%)

### Synergistic Effects (multiple factors compound risk):
- has_fall_event=1 + unsteady_gait_flag=1 + use_of_aid=1 → very high fall risk (~75-85%)
- cognitive_impairment_flag=1 + confusion_flag=1 + high_risk_med_flag=1 → very high risk (~70-80%)
- mobility_level=3 + dizziness_flag=1 + bp_systolic<100 → very high risk (~70-80%)

### Protective Factors (lower fall risk):
- mobility_level=0 + mmse_score>25 + age_group<2 → low fall risk (~10-15%)
- No previous falls + no gait issues + no high-risk meds → low fall risk (~12-18%)

### Realistic Exceptions (to avoid perfect correlation):
- Include ~5-10% cases where high-risk residents DON'T fall (good care prevented it)
- Include ~3-5% cases where low-risk residents DO fall (unlucky accident)

## DATA QUALITY REQUIREMENTS

1. **No Missing Values**: Every cell must have a value
2. **Realistic Ranges**: All values within specified ranges
3. **Clinical Plausibility**: 
   - If mmse_score < 20, then cognitive_impairment_flag must = 1
   - If mmse_score >= 20, then cognitive_impairment_flag must = 0
   - If mobility_level ≥ 1, consider use_of_aid likely = 1
   - If age_group = 3, polypharmacy_count typically ≥ 4
4. **Balanced Classes**: Target variable should be 28-35% positive (falls)
5. **Statistical Distribution**: Use normal distributions where appropriate (MMSE, BP, O2 sat)

## OUTPUT FORMAT

Generate a CSV file with:
- First row: Exact column headers (copy from above)
- 2000-5000 data rows
- Comma-separated values
- No quotes around numbers
- No extra spaces

## EXAMPLE ROWS

```csv
has_fall_event,mobility_level,use_of_aid,dizziness_flag,unsteady_gait_flag,mmse_score,cognitive_impairment_flag,confusion_flag,polypharmacy_count,high_risk_med_flag,bp_systolic,oxygen_sat,agitation_flag,withdrawn_flag,age_group,fell_within_30_days
1,2,1,1,1,18,1,1,6,1,145,94,0,0,3,1
0,0,0,0,0,28,0,0,2,0,125,98,0,0,1,0
1,3,1,1,1,15,1,1,8,1,155,92,1,0,3,1
0,1,1,0,0,24,0,0,4,0,130,96,0,1,2,0
```

## VALIDATION CHECKLIST

After generating, verify:
- [ ] Exactly 16 columns
- [ ] Header row matches exactly
- [ ] 2000-5000 data rows
- [ ] cognitive_impairment_flag consistent with mmse_score
- [ ] Target variable (fell_within_30_days) is 28-35% positive
- [ ] Strong correlation between previous falls and future falls
- [ ] Realistic age distribution (most residents 75-85 years old)
- [ ] No impossible combinations (e.g., mobility_level=0 but needs significant assistance)

---

**IMPORTANT**: This data will train a clinical decision support system. Prioritize realism and clinical accuracy over random generation. Use evidence-based correlations from geriatric fall risk research.
