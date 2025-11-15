import numpy as np  
import pandas as pd  
  
# Exact column order  
COLUMNS = [  
    "has_fall_event",  
    "mobility_level",  
    "use_of_aid",  
    "dizziness_flag",  
    "unsteady_gait_flag",  
    "mmse_score",  
    "cognitive_impairment_flag",  
    "confusion_flag",  
    "polypharmacy_count",  
    "high_risk_med_flag",  
    "bp_systolic",  
    "oxygen_sat",  
    "agitation_flag",  
    "withdrawn_flag",  
    "age_group",  
    "fell_within_30_days",  
]  
  
def sigmoid(x):  
    return 1.0 / (1.0 + np.exp(-x))  
  
def calibrate_intercept(scores, target_rate, max_iter=80, low=-8.0, high=8.0):  
    # Binary search for intercept s.t. mean(sigmoid(b0 + scores)) ~= target_rate  
    for _ in range(max_iter):  
        mid = 0.5 * (low + high)  
        m = sigmoid(mid + scores).mean()  
        if m < target_rate:  
            low = mid  
        else:  
            high = mid  
    return 0.5 * (low + high)  
  
def generate_fall_risk_dataset(  
    n=2_000_000,  
    seed=17,  
    target_past_rate=0.27,      # has_fall_event mean 25–30%  
    target_future_rate=0.32     # fell_within_30_days mean 28–35%  
):  
    rng = np.random.default_rng(seed)  
  
    # Age group distribution: 5%, 25%, 45%, 25% (0:<65, 1:65–74, 2:75–84, 3:85+)  
    age_group = rng.choice([0, 1, 2, 3], size=n, p=[0.05, 0.25, 0.45, 0.25]).astype(np.int8)  
  
    # Mobility distribution: 30% 0, 35% 1, 25% 2, 10% 3  
    mobility_level = rng.choice([0, 1, 2, 3], size=n, p=[0.30, 0.35, 0.25, 0.10]).astype(np.int8)  
  
    # use_of_aid: more likely when mobility >=1; keep overall ~40–50%  
    p_aid = np.where(mobility_level == 0, 0.10,  
             np.where(mobility_level == 1, 0.55,  
             np.where(mobility_level == 2, 0.70, 0.80)))  
    use_of_aid = rng.binomial(1, p_aid).astype(np.int8)  
  
    # MMSE by age group: overall mean ~23, sd ~5, range 10–30  
    mmse_means = {0: 25.0, 1: 24.0, 2: 22.5, 3: 21.0}  
    mmse = np.empty(n, dtype=np.int16)  
    for g in [0, 1, 2, 3]:  
        idx = np.where(age_group == g)[0]  
        vals = np.round(rng.normal(mmse_means[g], 5.0, size=idx.size)).astype(np.int16)  
        vals = np.clip(vals, 10, 30)  
        mmse[idx] = vals  
    mmse = mmse.astype(np.int8)  
  
    # cognitive_impairment_flag: MMSE < 20 => 1 else 0 (strict rule)  
    cognitive_impairment_flag = (mmse < 20).astype(np.int8)  
  
    # Polypharmacy: mean ~5, sd ~2.5; higher with age; clamp to 0..15 (typical 0..12)  
    poly_mu = {0: 4.5, 1: 5.2, 2: 6.0, 3: 7.5}  
    polypharmacy_count = np.empty(n, dtype=np.int16)  
    for g in [0, 1, 2, 3]:  
        idx = np.where(age_group == g)[0]  
        vals = np.round(rng.normal(poly_mu[g], 2.5, size=idx.size)).astype(np.int16)  
        vals = np.clip(vals, 0, 15)  
        polypharmacy_count[idx] = vals  
    polypharmacy_count = polypharmacy_count.astype(np.int8)  
  
    # high_risk_med_flag ~35–40%, increasing with polypharmacy and older age  
    p_high = np.clip(0.15 + 0.03 * polypharmacy_count + 0.05 * (age_group >= 2), 0.0, 0.85)  
    high_risk_med_flag = rng.binomial(1, p_high).astype(np.int8)  
  
    # bp_systolic: mean ~130, sd ~18, most 95–170 with outliers; slight increase with age; sedation lowers BP  
    bp_base_mean = 128 + 1.0 * age_group  
    bp = rng.normal(bp_base_mean - 5.0 * high_risk_med_flag, 18.0, size=n)  
    bp = np.round(bp).astype(np.int16)  
    bp = np.clip(bp, 95, 170)  
    # Inject some outliers (<100 and >160), disjoint sets ~3% each  
    low_out_idx = rng.choice(n, size=int(0.03 * n), replace=False)  
    remaining = np.setdiff1d(np.arange(n), low_out_idx)  
    high_out_idx = rng.choice(remaining, size=int(0.03 * n), replace=False)  
    bp[low_out_idx] = np.clip(np.round(rng.normal(95, 4.0, size=low_out_idx.size)).astype(np.int16), 90, 100)  
    bp[high_out_idx] = np.clip(np.round(rng.normal(168, 6.0, size=high_out_idx.size)).astype(np.int16), 160, 180)  
    bp_systolic = bp  
  
    # oxygen_sat: mean ~96, sd ~3, mostly 92–100; some hypoxia 88–91; clamp 85–100  
    normal_size = int(0.90 * n)  
    normal_idx = rng.choice(n, size=normal_size, replace=False)  
    low_idx = np.setdiff1d(np.arange(n), normal_idx)  
    oxygen_sat = np.empty(n, dtype=np.int16)  
    oxygen_sat[normal_idx] = np.clip(np.round(  
        rng.normal(96 - 0.3 * age_group[normal_idx], 2.5, size=normal_idx.size)  
    ).astype(np.int16), 92, 100)  
    oxygen_sat[low_idx] = np.clip(np.round(rng.normal(90, 1.8, size=low_idx.size)).astype(np.int16), 85, 92)  
    oxygen_sat = oxygen_sat.astype(np.int8)  
  
    # dizziness_flag: ~20–25%, more likely with low O2 and high-risk meds  
    p_diz = 0.20 + 0.10 * (oxygen_sat < 92) + 0.08 * high_risk_med_flag  
    p_diz = np.clip(p_diz, 0.05, 0.70)  
    dizziness_flag = rng.binomial(1, p_diz).astype(np.int8)  
  
    # unsteady_gait_flag: ~30–35%, tied to mobility and dizziness  
    p_unsteady = (0.21  
                  + 0.10 * (mobility_level == 1)  
                  + 0.18 * (mobility_level == 2)  
                  + 0.28 * (mobility_level == 3)  
                  + 0.08 * dizziness_flag)  
    p_unsteady = np.clip(p_unsteady, 0.05, 0.85)  
    unsteady_gait_flag = rng.binomial(1, p_unsteady).astype(np.int8)  
  
    # confusion_flag: ~15–20%, higher with impairment, low O2, high-risk meds  
    p_conf = (0.08  
              + 0.20 * cognitive_impairment_flag  
              + 0.06 * (oxygen_sat < 92)  
              + 0.06 * high_risk_med_flag)  
    p_conf = np.clip(p_conf, 0.04, 0.85)  
    confusion_flag = rng.binomial(1, p_conf).astype(np.int8)  
  
    # agitation_flag: ~12–15%, linked to confusion and high-risk meds  
    p_agit = (0.08  
              + 0.12 * confusion_flag  
              + 0.06 * high_risk_med_flag)  
    p_agit = np.clip(p_agit, 0.03, 0.85)  
    agitation_flag = rng.binomial(1, p_agit).astype(np.int8)  
  
    # withdrawn_flag: ~10–15%, linked to impairment/confusion, anticorrelated with agitation  
    p_withdrawn = (0.09  
                   + 0.10 * cognitive_impairment_flag  
                   + 0.05 * confusion_flag  
                   - 0.04 * agitation_flag)  
    p_withdrawn = np.clip(p_withdrawn, 0.02, 0.80)  
    withdrawn_flag = rng.binomial(1, p_withdrawn).astype(np.int8)  
  
    # has_fall_event (past 30 days): logistic risk calibrated to ~27%  
    score_past = (  
        0.50 * unsteady_gait_flag  
        + 0.40 * dizziness_flag  
        + 0.35 * high_risk_med_flag  
        + 0.25 * (polypharmacy_count >= 6)  
        + 0.25 * (oxygen_sat < 92)  
        + 0.20 * confusion_flag  
        + 0.15 * (mobility_level >= 2)  
        + 0.10 * (age_group == 3)  
        - 0.10 * ((mobility_level == 0) & (mmse > 25) & (age_group < 2))  
        + rng.normal(0.0, 0.20, size=n)  
    ).astype(np.float32)  
    b0_past = calibrate_intercept(score_past, target_rate=target_past_rate)  
    p_past = sigmoid(b0_past + score_past)  
    has_fall_event = rng.binomial(1, p_past).astype(np.int8)  
  
    # fell_within_30_days (TARGET): strong correlations, synergies, protective factors, noise  
    low_bp = (bp_systolic < 100).astype(np.int8)  
    low_oxy = (oxygen_sat < 92).astype(np.int8)  
    poly_hi = (polypharmacy_count >= 6).astype(np.int8)  
    mob_ge2 = (mobility_level >= 2).astype(np.int8)  
    age_85p = (age_group == 3).astype(np.int8)  
  
    score_now = (  
        1.25 * has_fall_event  # strongest predictor  
        + 0.90 * unsteady_gait_flag  
        + 0.70 * mob_ge2  
        + 0.55 * ((unsteady_gait_flag == 1) & (mob_ge2 == 1))               # synergy: unsteady + mobility>=2  
        + 0.60 * ((cognitive_impairment_flag == 1) & (poly_hi == 1))        # cog + poly>=6  
        + 0.55 * ((dizziness_flag == 1) & (high_risk_med_flag == 1))        # dizziness + high-risk meds  
        + 0.55 * ((age_85p == 1) & (mob_ge2 == 1))                          # age_group=3 + mobility>=2  
        # Triple synergies (very high risk bands ~70–85%):  
        + 1.20 * ((has_fall_event == 1) & (unsteady_gait_flag == 1) & (use_of_aid == 1))  
        + 1.00 * ((cognitive_impairment_flag == 1) & (confusion_flag == 1) & (high_risk_med_flag == 1))  
        + 1.00 * ((mobility_level == 3) & (dizziness_flag == 1) & (low_bp == 1))  
        # Additional contributors:  
        + 0.30 * confusion_flag  
        + 0.15 * agitation_flag  
        + 0.20 * low_oxy  
        + 0.20 * poly_hi  
        + 0.10 * use_of_aid  
        + 0.15 * low_bp  
        + 0.15 * age_85p  
        + 0.10 * (mmse <= 17)  
        # Protective factors:  
        - 0.80 * ((mobility_level == 0) & (mmse > 25) & (age_group < 2))  
        - 0.60 * ((has_fall_event == 0) & (unsteady_gait_flag == 0) & (high_risk_med_flag == 0))  
        + rng.normal(0.0, 0.35, size=n)  # noise for realism and exceptions  
    ).astype(np.float32)  
  
    # Calibrate to target future fall rate  
    b0_now = calibrate_intercept(score_now, target_rate=target_future_rate)  
    p_now = sigmoid(b0_now + score_now)  
    fell_within_30_days = rng.binomial(1, p_now).astype(np.int8)  
  
    # Realistic exceptions:  
    high_risk_idx = np.where(p_now >= 0.75)[0]  
    low_risk_idx = np.where(p_now <= 0.20)[0]  
    if high_risk_idx.size:  
        flip_high = rng.choice(high_risk_idx, size=int(0.08 * high_risk_idx.size), replace=False)  
        fell_within_30_days[flip_high] = 0  
    if low_risk_idx.size:  
        flip_low = rng.choice(low_risk_idx, size=int(0.04 * low_risk_idx.size), replace=False)  
        fell_within_30_days[flip_low] = 1  
  
    # Small final rebalance to keep class rate ~ target within [0.28, 0.35]  
    final_rate = fell_within_30_days.mean()  
    target = target_future_rate  
    if final_rate < 0.28 or final_rate > 0.35:  
        closeness = np.abs(p_now - 0.5)  
        idx_sorted = np.argsort(closeness)  # near 0.5 first  
        current_pos = fell_within_30_days.sum()  
        desired_pos = int(round(target * n))  
        delta = desired_pos - current_pos  
        if delta > 0:  
            candidates = idx_sorted[fell_within_30_days[idx_sorted] == 0][:abs(delta)]  
            fell_within_30_days[candidates] = 1  
        elif delta < 0:  
            candidates = idx_sorted[fell_within_30_days[idx_sorted] == 1][:abs(delta)]  
            fell_within_30_days[candidates] = 0  
  
    # Assemble DataFrame with exact column order and compact dtypes  
    df = pd.DataFrame({  
        "has_fall_event": has_fall_event,  
        "mobility_level": mobility_level,  
        "use_of_aid": use_of_aid,  
        "dizziness_flag": dizziness_flag,  
        "unsteady_gait_flag": unsteady_gait_flag,  
        "mmse_score": mmse,  
        "cognitive_impairment_flag": cognitive_impairment_flag,  
        "confusion_flag": confusion_flag,  
        "polypharmacy_count": polypharmacy_count,  
        "high_risk_med_flag": high_risk_med_flag,  
        "bp_systolic": bp_systolic,  
        "oxygen_sat": oxygen_sat,  
        "agitation_flag": agitation_flag,  
        "withdrawn_flag": withdrawn_flag,  
        "age_group": age_group,  
        "fell_within_30_days": fell_within_30_days,  
    })[COLUMNS]  
  
    # Cleanliness checks  
    assert not df.isna().any().any(), "Missing values found"  
    assert df["mmse_score"].between(10, 30).all()  
    assert (df["cognitive_impairment_flag"] == (df["mmse_score"] < 20).astype(np.int8)).all()  
    assert df["polypharmacy_count"].between(0, 15).all()  
    assert df["bp_systolic"].between(90, 180).all()  
    assert df["oxygen_sat"].between(85, 100).all()  
    assert df["age_group"].isin([0, 1, 2, 3]).all()  
    assert df["mobility_level"].isin([0, 1, 2, 3]).all()  
  
    # Quick summary  
    summary = {  
        "rows": len(df),  
        "has_fall_event_rate": round(df["has_fall_event"].mean(), 3),  
        "fell_within_30_days_rate": round(df["fell_within_30_days"].mean(), 3),  
        "dizziness_rate": round(df["dizziness_flag"].mean(), 3),  
        "unsteady_rate": round(df["unsteady_gait_flag"].mean(), 3),  
        "cognitive_impairment_rate": round(df["cognitive_impairment_flag"].mean(), 3),  
        "confusion_rate": round(df["confusion_flag"].mean(), 3),  
        "high_risk_med_rate": round(df["high_risk_med_flag"].mean(), 3),  
        "agitation_rate": round(df["agitation_flag"].mean(), 3),  
        "withdrawn_rate": round(df["withdrawn_flag"].mean(), 3),  
        "age_group_counts": {int(k): float(v) for k, v in df["age_group"].value_counts(normalize=True).to_dict().items()},  
        "mobility_counts": {int(k): float(v) for k, v in df["mobility_level"].value_counts(normalize=True).to_dict().items()},  
        "mmse_mean": float(df["mmse_score"].mean()),  
        "poly_mean": float(df["polypharmacy_count"].mean()),  
        "bp_mean": float(df["bp_systolic"].mean()),  
        "oxygen_mean": float(df["oxygen_sat"].mean()),  
    }  
    print("Summary:", summary)  
  
    return df  
  
if __name__ == "__main__":  
    df = generate_fall_risk_dataset(  
        n=2_000_000,  
        seed=17,  
        target_past_rate=0.27,  
        target_future_rate=0.32  
    )  
    out_path = "fall_risk_2M.csv"  
    df.to_csv(out_path, index=False)  
    print(f"Saved {out_path} with {len(df):,} rows.")  
    # Preview first 10 rows (CSV-formatted)  
    print(df.head(10).to_csv(index=False))  