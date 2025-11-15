-- =========================================================
-- FULL DATABASE RESET SCRIPT
-- Drops old database and creates fresh schema
-- =========================================================

-- Drop and recreate database
DROP DATABASE IF EXISTS clinicalsight;
CREATE DATABASE clinicalsight;
USE clinicalsight;

-- =========================================================
-- TABLE DEFINITIONS
-- =========================================================

-- Resident table (removed baseline vitals and care flags)
CREATE TABLE resident (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    room_number VARCHAR(50),
    room_unit VARCHAR(50),
    date_of_birth VARCHAR(50),
    gender VARCHAR(50),
    age INT,
    diagnoses TEXT,
    emergency_contact VARCHAR(255),
    emergency_phone VARCHAR(50),
    residence VARCHAR(255),
    care_level VARCHAR(100),
    move_in_date VARCHAR(50),
    baseline_mmse INT DEFAULT 25,
    last_updated DATETIME
);

-- Shift worker table (updated with all fields)
CREATE TABLE shift_worker (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    password VARCHAR(255),
    phone VARCHAR(50),
    role VARCHAR(100),
    sex VARCHAR(50),
    shift_preference VARCHAR(50),
    avatar_url VARCHAR(500),
    notes TEXT
);

-- Shift observation table
CREATE TABLE shift_observation (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    resident_id BIGINT,
    shift_worker_id BIGINT,
    timestamp DATETIME,
    time_of_day VARCHAR(50), -- Morning / Afternoon / Evening / Night

    -- Falls/Stability
    falls_has_event BOOLEAN,
    falls_event_type VARCHAR(255),
    falls_location VARCHAR(255),
    falls_contributing_factors VARCHAR(500),
    falls_assistive_device_used BOOLEAN,
    falls_injury VARCHAR(255),

    -- Mood
    mood_has_change BOOLEAN,
    mood_baseline VARCHAR(255),
    mood_triggers VARCHAR(500),
    mood_other_trigger VARCHAR(255),
    mood_severity INT,
    mood_notes TEXT,
    happy_flag BOOLEAN,
    depression_flag BOOLEAN,
    agitation_flag BOOLEAN,
    withdrawn_flag BOOLEAN,
    confusion_flag BOOLEAN,

    -- Medication
    medication_has_issue BOOLEAN,
    medication_name VARCHAR(255),
    medication_action VARCHAR(255),
    medication_reason VARCHAR(500),
    medication_staff_action VARCHAR(500),
    polypharmacy_count INT,
    high_risk_med_flag BOOLEAN,

    -- Vitals
    temperature DOUBLE,
    heart_rate INT,
    respiratory_rate INT,
    bp_systolic INT,
    bp_diastolic INT,
    oxygen_sat INT,
    pain_score INT,

    -- Cognitive
    mmse_score INT,
    cognitive_impairment_flag BOOLEAN,

    -- Mobility
    mobility_level INT, -- 0=Independent, 1=Supervision, 2=Partial assist, 3=Full assist, 4=Bedbound
    use_of_aid BOOLEAN,
    dizziness_flag BOOLEAN,
    unsteady_gait_flag BOOLEAN,

    -- Clinical flags (derived)
    hypotension_flag BOOLEAN,
    tachycardia_flag BOOLEAN,
    hypoxia_flag BOOLEAN,
    fever_flag BOOLEAN,

    -- Analytics fields
    hr_7d_mean DOUBLE,
    sbp_7d_mean DOUBLE,
    hr_7d_delta DOUBLE,
    sbp_7d_delta DOUBLE,
    prior_fall_90d INT,
    fall_next_7d DOUBLE,
    missed_dose_ratio_7d DOUBLE,

    FOREIGN KEY (resident_id) REFERENCES resident(id),
    FOREIGN KEY (shift_worker_id) REFERENCES shift_worker(id)
);

-- Shift report table
CREATE TABLE shift_report (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    resident_id BIGINT,
    shift_worker_id BIGINT,
    report_time DATETIME,
    report_text TEXT,
    FOREIGN KEY (resident_id) REFERENCES resident(id),
    FOREIGN KEY (shift_worker_id) REFERENCES shift_worker(id)
);

-- =========================================================
-- INDEXES
-- =========================================================
CREATE INDEX idx_shift_obs_resident_timestamp ON shift_observation(resident_id, timestamp);
CREATE INDEX idx_shift_obs_worker ON shift_observation(shift_worker_id);

-- =========================================================
-- SAMPLE DATA
-- =========================================================

-- Insert shift workers
INSERT INTO shift_worker (first_name, last_name, name, email, password, phone, role, sex, shift_preference, avatar_url, notes)
VALUES
 ('Alice','Ng','Alice Ng','alice.ng@example.com','pw','555-1001','RN','Female','day','',''),
 ('Ben','Ortiz','Ben Ortiz','ben.ortiz@example.com','pw','555-1002','PSW','Male','evening','',''),
 ('Cara','Lee','Cara Lee','cara.lee@example.com','pw','555-1003','LPN','Female','day','',''),
 ('Dev','Singh','Dev Singh','dev.singh@example.com','pw','555-1004','RN','Male','night','',''),
 ('Eve','Chan','Eve Chan','eve.chan@example.com','pw','555-1005','PSW','Female','flex','','');

-- Insert residents (20)
INSERT INTO resident (
    name, room_number, room_unit, date_of_birth, gender, age, diagnoses,
    emergency_contact, emergency_phone,
    residence, care_level, move_in_date, baseline_mmse, last_updated
)
SELECT 
    CONCAT('Resident ', seq) AS name,
    CONCAT('R', LPAD(seq,3,'0')) AS room_number,
    CONCAT('R', LPAD(seq,3,'0')) AS room_unit,
    DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL (65 + FLOOR(RAND()*31)) YEAR),'%Y-%m-%d') AS date_of_birth,
    ELT(1 + FLOOR(RAND()*3), 'Male','Female','Other') AS gender,
    65 + FLOOR(RAND()*31) AS age,
    'Hypertension, Diabetes' AS diagnoses,
    CONCAT('Contact ', seq) AS emergency_contact,
    CONCAT('555-20', LPAD(seq,3,'0')) AS emergency_phone,
    'Sunrise Community' AS residence,
    ELT(1 + (seq % 4), 'Independent','Assisted','Memory Care','Skilled Nursing') AS care_level,
    DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL FLOOR(RAND()*400) DAY),'%Y-%m-%d') AS move_in_date,
    18 + FLOOR(RAND()*13) AS baseline_mmse,
    NOW() AS last_updated
FROM (
    SELECT 1 AS seq UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
    UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10
    UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15
    UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19 UNION ALL SELECT 20
) AS seqs;

-- Insert sample shift observations (100 records)
INSERT INTO shift_observation (
    resident_id, shift_worker_id, timestamp, time_of_day,
    falls_has_event, falls_event_type, falls_location, falls_contributing_factors, falls_assistive_device_used, falls_injury,
    mood_has_change, mood_baseline, mood_triggers, mood_other_trigger, mood_severity, mood_notes,
    happy_flag, depression_flag, agitation_flag, withdrawn_flag, confusion_flag,
    medication_has_issue, medication_name, medication_action, medication_reason, medication_staff_action,
    polypharmacy_count, high_risk_med_flag,
    temperature, heart_rate, respiratory_rate, bp_systolic, bp_diastolic, oxygen_sat, pain_score,
    mmse_score, cognitive_impairment_flag,
    mobility_level, use_of_aid, dizziness_flag, unsteady_gait_flag,
    hypotension_flag, tachycardia_flag, hypoxia_flag, fever_flag,
    hr_7d_mean, sbp_7d_mean, hr_7d_delta, sbp_7d_delta, prior_fall_90d, fall_next_7d, missed_dose_ratio_7d
)
SELECT
    (seq % 20) + 1 AS resident_id,
    (SELECT id FROM shift_worker ORDER BY RAND() LIMIT 1) AS shift_worker_id,
    DATE_SUB(NOW(), INTERVAL FLOOR(RAND()*30) DAY) + INTERVAL FLOOR(RAND()*24) HOUR AS timestamp,
    ELT(1 + FLOOR(RAND()*4), 'Morning','Afternoon','Evening','Night') AS time_of_day,
    
    -- Falls
    (RAND() < 0.1) AS falls_has_event,
    IF(RAND() < 0.1, ELT(1 + FLOOR(RAND()*3), 'Slip','Trip','Loss of balance'), NULL) AS falls_event_type,
    IF(RAND() < 0.1, ELT(1 + FLOOR(RAND()*4), 'Bedroom','Bathroom','Hallway','Common area'), NULL) AS falls_location,
    IF(RAND() < 0.1, 'Wet floor', NULL) AS falls_contributing_factors,
    (RAND() < 0.5) AS falls_assistive_device_used,
    IF(RAND() < 0.1, ELT(1 + FLOOR(RAND()*3), 'None','Minor bruising','Laceration'), NULL) AS falls_injury,
    
    -- Mood
    (RAND() < 0.2) AS mood_has_change,
    ELT(1 + FLOOR(RAND()*6), 'Normal','Happier than usual','Sad/tearful','Agitated/irritable','Withdrawn/quiet','Confused/Wandering') AS mood_baseline,
    NULL AS mood_triggers,
    NULL AS mood_other_trigger,
    NULL AS mood_severity,
    NULL AS mood_notes,
    FALSE AS happy_flag,
    FALSE AS depression_flag,
    FALSE AS agitation_flag,
    FALSE AS withdrawn_flag,
    FALSE AS confusion_flag,
    
    -- Medication
    (RAND() < 0.05) AS medication_has_issue,
    NULL AS medication_name,
    NULL AS medication_action,
    NULL AS medication_reason,
    NULL AS medication_staff_action,
    FLOOR(RAND()*8) + 2 AS polypharmacy_count,
    (RAND() < 0.3) AS high_risk_med_flag,
    
    -- Vitals
    36.0 + (RAND() * 2) AS temperature,
    60 + FLOOR(RAND()*40) AS heart_rate,
    12 + FLOOR(RAND()*8) AS respiratory_rate,
    100 + FLOOR(RAND()*40) AS bp_systolic,
    60 + FLOOR(RAND()*20) AS bp_diastolic,
    92 + FLOOR(RAND()*8) AS oxygen_sat,
    FLOOR(RAND()*10) AS pain_score,
    
    -- Cognitive
    18 + FLOOR(RAND()*13) AS mmse_score,
    (RAND() < 0.3) AS cognitive_impairment_flag,
    
    -- Mobility
    FLOOR(RAND()*5) AS mobility_level,
    (RAND() < 0.4) AS use_of_aid,
    (RAND() < 0.2) AS dizziness_flag,
    (RAND() < 0.3) AS unsteady_gait_flag,
    
    -- Clinical flags
    (RAND() < 0.1) AS hypotension_flag,
    (RAND() < 0.15) AS tachycardia_flag,
    (RAND() < 0.08) AS hypoxia_flag,
    (RAND() < 0.05) AS fever_flag,
    
    -- Analytics
    70.0 + (RAND() * 20) AS hr_7d_mean,
    120.0 + (RAND() * 20) AS sbp_7d_mean,
    -5.0 + (RAND() * 10) AS hr_7d_delta,
    -10.0 + (RAND() * 20) AS sbp_7d_delta,
    FLOOR(RAND()*3) AS prior_fall_90d,
    RAND() * 0.5 AS fall_next_7d,
    RAND() * 0.2 AS missed_dose_ratio_7d
FROM (
    SELECT n + 1 AS seq FROM (
        SELECT a.N + b.N * 10 AS n
        FROM (SELECT 0 AS N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 
              UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a
        CROSS JOIN (SELECT 0 AS N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 
                    UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) b
    ) nums
    WHERE n < 100
) AS seqs;

-- Update time_of_day based on timestamp (using id in WHERE to satisfy safe update mode)
UPDATE shift_observation
SET time_of_day = CASE
    WHEN HOUR(timestamp) < 12 THEN 'Morning'
    WHEN HOUR(timestamp) < 17 THEN 'Afternoon'
    WHEN HOUR(timestamp) < 21 THEN 'Evening'
    ELSE 'Night'
END
WHERE id > 0;

-- =========================================================
-- VERIFICATION QUERIES
-- =========================================================
SELECT COUNT(*) AS total_residents FROM resident;
SELECT COUNT(*) AS total_shift_workers FROM shift_worker;
SELECT COUNT(*) AS total_observations FROM shift_observation;

SELECT 'Database reset complete!' AS status;
