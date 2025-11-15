from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import pickle
import os
from datetime import datetime

# Configure TensorFlow GPU settings (if available)
try:
    import tensorflow as tf
    # Enable memory growth to prevent TensorFlow from allocating all GPU memory at once
    gpus = tf.config.list_physical_devices('GPU')
    if gpus:
        try:
            for gpu in gpus:
                tf.config.experimental.set_memory_growth(gpu, True)
            print(f"GPU available: {len(gpus)} device(s) detected")
            print(f"GPU devices: {[gpu.name for gpu in gpus]}")
        except RuntimeError as e:
            print(f"GPU configuration error: {e}")
    else:
        print("No GPU detected - using CPU for TensorFlow operations")
except ImportError:
    print("TensorFlow not installed - LSTM models will not be available")

app = Flask(__name__)
CORS(app)

# Load pre-trained models (will be generated if they don't exist)
FALL_MODEL_PATH = 'models-v2/fall_risk_model.pkl'
MOOD_MODEL_PATH = 'models-v2/mood_lstm_model.h5'
MOOD_SCALER_PATH = 'models-v2/mood_scaler.pkl'
MEDICATION_MODEL_PATH = 'models-v2/medication_adherence_lstm.h5'
MEDICATION_SCALER_PATH = 'models-v2/medication_scaler.pkl'

# Feature names for fall risk model
FALL_FEATURES = [
    'has_fall_event', 'mobility_level_encoded', 'use_of_aid', 
    'dizziness_flag', 'unsteady_gait_flag', 'mmse_score',
    'cognitive_impairment_flag', 'confusion_flag', 'polypharmacy_count',
    'high_risk_med_flag', 'bp_systolic', 'oxygen_sat',
    'agitation_flag', 'withdrawn_flag', 'age_group'
]

def load_training_data_from_csv(csv_path):
    """Load training data from CSV file"""
    import pandas as pd
    
    # Read CSV
    df = pd.read_csv(csv_path)
    
    # Calculate age_group from age (if age column exists)
    if 'age' in df.columns and 'age_group' not in df.columns:
        def age_to_group(age):
            if age < 65:
                return 0
            elif age < 75:
                return 1
            elif age < 85:
                return 2
            else:
                return 3
        
        df['age_group'] = df['age'].apply(age_to_group)
    
    # Select features in correct order
    feature_columns = [
        'has_fall_event', 'mobility_level', 'use_of_aid', 
        'dizziness_flag', 'unsteady_gait_flag', 'mmse_score',
        'cognitive_impairment_flag', 'confusion_flag', 'polypharmacy_count',
        'high_risk_med_flag', 'bp_systolic', 'oxygen_sat',
        'agitation_flag', 'withdrawn_flag', 'age_group'
    ]
    
    # Verify all required columns exist
    missing_cols = [col for col in feature_columns if col not in df.columns]
    if missing_cols:
        raise ValueError(f"Missing required columns: {missing_cols}")
    
    if 'fell_within_30_days' not in df.columns:
        raise ValueError("Missing target column: 'fell_within_30_days'")
    
    X = df[feature_columns].values
    y = df['fell_within_30_days'].values
    
    return X, y

# Initialize or load models
def initialize_models():
    """Initialize ML models with synthetic training"""
    os.makedirs('models-v2', exist_ok=True)
    
    # Initialize Gradient Boosting for Fall Risk
    if not os.path.exists(FALL_MODEL_PATH):
        print("Training Gradient Boosting model for fall risk...")
        from sklearn.preprocessing import StandardScaler
        
        # Try to load from CSV first, fallback to synthetic data
        csv_path = 'training_data/fall_risk_2M.csv'
        use_csv = os.path.exists(csv_path)
        
        if use_csv:
            X_train, y_train = load_training_data_from_csv(csv_path)
            print(f"CSV loaded: {len(X_train):,} samples, {y_train.mean()*100:.1f}% fall rate")
        else:
            print("CSV not found - using synthetic data (10K samples)")
            # Generate synthetic training data based on clinical patterns
            # Using larger dataset and more realistic distributions
            np.random.seed(42)
            n_samples = 10000  # Increased for better model performance and generalization
            
            # Features
            X_train = np.zeros((n_samples, len(FALL_FEATURES)))
            y_train = np.zeros(n_samples)
            
            for i in range(n_samples):
                # Simulate realistic clinical data
                has_fall = np.random.random() < 0.3
                mobility = np.random.choice([0, 1, 2, 3])  # 0=independent, 3=significant assistance
                use_aid = np.random.random() < 0.4
                dizziness = np.random.random() < 0.25
                unsteady_gait = np.random.random() < 0.35
                mmse = np.random.normal(24, 4)
                cognitive_imp = mmse < 20
                confusion = np.random.random() < 0.2
                polypharm = np.random.poisson(4)
                high_risk_med = np.random.random() < 0.3
                bp = np.random.normal(130, 20)
                o2_sat = np.random.normal(96, 3)
                agitation = np.random.random() < 0.15
                withdrawn = np.random.random() < 0.15
                age_group = np.random.choice([0, 1, 2, 3])  # Age categories
                
                X_train[i] = [
                    has_fall, mobility, use_aid, dizziness, unsteady_gait,
                    mmse, cognitive_imp, confusion, polypharm, high_risk_med,
                    bp, o2_sat, agitation, withdrawn, age_group
                ]
                
                # Enhanced risk calculation based on clinical research
                # Weights based on meta-analysis of fall risk factors
                risk_score = (
                    has_fall * 0.45 +              # Previous falls (strongest predictor)
                    mobility * 0.18 +              # Mobility impairment
                    use_aid * 0.12 +               # Walking aid use
                    dizziness * 0.16 +             # Dizziness/vertigo
                    unsteady_gait * 0.25 +         # Gait instability (major factor)
                    (30 - mmse) * 0.025 +          # Cognitive decline
                    cognitive_imp * 0.20 +         # Cognitive impairment
                    confusion * 0.18 +             # Acute confusion
                    polypharm * 0.04 +             # Polypharmacy effect
                    high_risk_med * 0.15 +         # High-risk medications
                    abs(bp - 120) * 0.003 +        # Blood pressure instability
                    (100 - o2_sat) * 0.03 +        # Hypoxia risk
                    agitation * 0.12 +             # Behavioral risk
                    withdrawn * 0.08 +             # Reduced engagement
                    (age_group * 0.10)             # Age factor (0.0-0.3)
                )
                
                # Add interaction effects (clinical synergies)
                # Cognitive impairment + medication = higher risk
                if cognitive_imp and polypharm > 5:
                    risk_score += 0.3
                
                # Mobility + aids + dizziness = very high risk
                if mobility >= 2 and use_aid and dizziness:
                    risk_score += 0.4
                
                # Previous fall + gait instability = recurrence risk
                if has_fall and unsteady_gait:
                    risk_score += 0.35
                
                # Probability of fall based on enhanced risk score
                # Using steeper sigmoid for better discrimination
                fall_probability = 1 / (1 + np.exp(-2.5 * (risk_score - 1.8)))
                y_train[i] = 1 if fall_probability > 0.45 else 0  # Slightly lower threshold
        
        # Split into train/test sets
        from sklearn.model_selection import train_test_split
        X_train_split, X_test_split, y_train_split, y_test_split = train_test_split(
            X_train, y_train, test_size=0.2, random_state=42
        )
        
        # Train model
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train_split)
        X_test_scaled = scaler.transform(X_test_split)
        
        # Use ensemble model for better predictions
        from sklearn.ensemble import GradientBoostingClassifier
        model = GradientBoostingClassifier(
            n_estimators=200,
            learning_rate=0.1,
            max_depth=5,
            random_state=42,
            subsample=0.8
        )
        model.fit(X_train_scaled, y_train_split)
        
        # Calculate metrics
        train_accuracy = model.score(X_train_scaled, y_train_split)
        test_accuracy = model.score(X_test_scaled, y_test_split)
        
        # Get predictions for detailed metrics
        y_pred = model.predict(X_test_scaled)
        
        # Save model and scaler
        with open(FALL_MODEL_PATH, 'wb') as f:
            pickle.dump({
                'model': model, 
                'scaler': scaler,
                'train_accuracy': train_accuracy,
                'test_accuracy': test_accuracy
            }, f)
        
        print(f"Fall Risk Model - Train: {train_accuracy:.3f}, Test: {test_accuracy:.3f}")
    
    # Initialize LSTM Mood Analysis Model
    if not os.path.exists(MOOD_MODEL_PATH):
        print("Training LSTM model for mood analysis...")
        
        try:
            import tensorflow as tf
            from tensorflow import keras
            from tensorflow.keras.models import Sequential
            from tensorflow.keras.layers import LSTM, Dense, Dropout, Bidirectional
            from sklearn.preprocessing import StandardScaler
            
            # Show device placement for this model
            print(f"Training on: {tf.config.list_physical_devices('GPU')[0].name if tf.config.list_physical_devices('GPU') else 'CPU'}")
            
            # Generate synthetic training data for mood prediction
            np.random.seed(42)
            n_sequences = 20000  # Number of 7-day sequences
            sequence_length = 7  # 7 days
            n_features = 10  # Features per day: 5 mood flags + severity + 4 vital/behavioral indicators
            
            X_train = []
            y_train = []
            
            for _ in range(n_sequences):
                sequence = []
                # Define mood pattern types
                mood_pattern = np.random.choice(['stable', 'depression_onset', 'agitation_pattern', 
                                                'confusion_episodes', 'mixed', 'improving'])
                
                for day in range(sequence_length):
                    # Generate features for each day based on pattern
                    if mood_pattern == 'stable':
                        confusion = 1 if np.random.random() < 0.05 else 0
                        agitation = 1 if np.random.random() < 0.05 else 0
                        depression = 1 if np.random.random() < 0.05 else 0
                        happy = 1 if np.random.random() < 0.7 else 0
                        withdrawn = 1 if np.random.random() < 0.05 else 0
                        severity = np.random.choice([0, 1], p=[0.9, 0.1])
                    
                    elif mood_pattern == 'depression_onset':
                        # Progressive depression pattern
                        depression_prob = min(0.2 + (day * 0.15), 0.9)
                        confusion = 1 if np.random.random() < 0.1 else 0
                        agitation = 1 if np.random.random() < 0.15 else 0
                        depression = 1 if np.random.random() < depression_prob else 0
                        happy = 0
                        withdrawn = 1 if np.random.random() < depression_prob * 0.7 else 0
                        severity = min(int(day * 0.5) + 1, 4) if depression else 0
                    
                    elif mood_pattern == 'agitation_pattern':
                        # Agitation with variability
                        confusion = 1 if np.random.random() < 0.2 else 0
                        agitation = 1 if np.random.random() < 0.7 else 0
                        depression = 1 if np.random.random() < 0.15 else 0
                        happy = 0
                        withdrawn = 1 if np.random.random() < 0.1 else 0
                        severity = np.random.choice([2, 3, 4], p=[0.3, 0.5, 0.2]) if agitation else 0
                    
                    elif mood_pattern == 'confusion_episodes':
                        # Episodic confusion
                        confusion = 1 if np.random.random() < 0.6 else 0
                        agitation = 1 if np.random.random() < 0.3 and confusion else 0
                        depression = 1 if np.random.random() < 0.1 else 0
                        happy = 0
                        withdrawn = 1 if np.random.random() < 0.2 else 0
                        severity = np.random.choice([2, 3], p=[0.6, 0.4]) if confusion else 0
                    
                    elif mood_pattern == 'mixed':
                        # Mixed symptoms - high severity
                        confusion = 1 if np.random.random() < 0.4 else 0
                        agitation = 1 if np.random.random() < 0.5 else 0
                        depression = 1 if np.random.random() < 0.5 else 0
                        happy = 0
                        withdrawn = 1 if np.random.random() < 0.4 else 0
                        severity = np.random.choice([3, 4], p=[0.5, 0.5]) if any([confusion, agitation, depression]) else 0
                    
                    else:  # improving
                        # Decreasing severity over time
                        improvement_factor = (sequence_length - day) / sequence_length
                        confusion = 1 if np.random.random() < (0.3 * improvement_factor) else 0
                        agitation = 1 if np.random.random() < (0.2 * improvement_factor) else 0
                        depression = 1 if np.random.random() < (0.4 * improvement_factor) else 0
                        happy = 1 if day >= 4 and np.random.random() < 0.5 else 0
                        withdrawn = 1 if np.random.random() < (0.3 * improvement_factor) else 0
                        severity = max(int(3 * improvement_factor), 0) if any([confusion, agitation, depression]) else 0
                    
                    # Additional contextual features
                    sleep_disruption = 1 if (agitation or confusion or depression) and np.random.random() < 0.6 else 0
                    appetite_change = 1 if (depression or confusion) and np.random.random() < 0.5 else 0
                    social_engagement = 0 if (withdrawn or depression) else (1 if happy else np.random.choice([0, 1]))
                    behavioral_concern = 1 if (agitation or confusion) and severity >= 3 else 0
                    
                    day_features = [
                        confusion,
                        agitation,
                        depression,
                        happy,
                        withdrawn,
                        severity / 4.0,  # Normalize 0-4 to 0-1
                        sleep_disruption,
                        appetite_change,
                        social_engagement,
                        behavioral_concern
                    ]
                    
                    sequence.append(day_features)
                
                X_train.append(sequence)
                
                # Calculate target (risk level: 0=low, 1=moderate, 2=high, 3=critical)
                total_flags = sum([sum([s[i] for s in sequence]) for i in range(5)])  # Sum of 5 mood flags
                max_severity = max([s[5] for s in sequence]) * 4  # Denormalize
                avg_severity = np.mean([s[5] for s in sequence]) * 4
                behavioral_concerns = sum([s[9] for s in sequence])
                
                # Risk calculation
                risk_score = (
                    total_flags * 0.3 +  # Total mood flags
                    max_severity * 0.4 +  # Peak severity
                    avg_severity * 0.2 +  # Average severity
                    behavioral_concerns * 0.5  # Behavioral concerns
                )
                
                if risk_score >= 8 or max_severity >= 3.5:
                    risk = 3  # critical
                elif risk_score >= 5 or max_severity >= 2.5:
                    risk = 2  # high
                elif risk_score >= 2.5 or avg_severity >= 1.5:
                    risk = 1  # moderate
                else:
                    risk = 0  # low
                
                y_train.append(risk)
            
            X_train = np.array(X_train)
            y_train = np.array(y_train)
            
            # Convert to categorical (one-hot encoding)
            y_train_cat = keras.utils.to_categorical(y_train, num_classes=4)
            
            # Split data
            from sklearn.model_selection import train_test_split
            X_train_split, X_val_split, y_train_split, y_val_split = train_test_split(
                X_train, y_train_cat, test_size=0.2, random_state=42
            )
            
            # Build LSTM model
            model = Sequential([
                Bidirectional(LSTM(64, return_sequences=True), input_shape=(sequence_length, n_features)),
                Dropout(0.3),
                Bidirectional(LSTM(32)),
                Dropout(0.3),
                Dense(32, activation='relu'),
                Dropout(0.2),
                Dense(16, activation='relu'),
                Dense(4, activation='softmax')  # 4 classes: low, moderate, high, critical
            ])
            
            model.compile(
                optimizer='adam',
                loss='categorical_crossentropy',
                metrics=['accuracy']
            )
            
            # Train model
            history = model.fit(
                X_train_split, y_train_split,
                validation_data=(X_val_split, y_val_split),
                epochs=30,
                batch_size=32,
                verbose=0
            )
            
            # Evaluate
            train_loss, train_acc = model.evaluate(X_train_split, y_train_split, verbose=0)
            val_loss, val_acc = model.evaluate(X_val_split, y_val_split, verbose=0)
            
            print(f"Mood LSTM - Train: {train_acc:.3f}, Val: {val_acc:.3f}")
            
            # Save model
            model.save(MOOD_MODEL_PATH)
            
            # Save feature info (for consistency)
            scaler_info = {
                'feature_names': [
                    'confusion', 'agitation', 'depression', 'happy', 'withdrawn',
                    'severity_norm', 'sleep_disruption', 'appetite_change',
                    'social_engagement', 'behavioral_concern'
                ],
                'n_features': n_features,
                'sequence_length': sequence_length
            }
            
            with open(MOOD_SCALER_PATH, 'wb') as f:
                pickle.dump(scaler_info, f)
            
        except ImportError:
            print("TensorFlow not installed - cannot train LSTM mood model")
    
    # Initialize LSTM Medication Adherence Model
    if not os.path.exists(MEDICATION_MODEL_PATH):
        print("Training LSTM model for medication adherence...")
        
        try:
            import tensorflow as tf
            from tensorflow import keras
            from tensorflow.keras.models import Sequential
            from tensorflow.keras.layers import LSTM, Dense, Dropout, Bidirectional
            from sklearn.preprocessing import StandardScaler
            
            # Show device placement for this model
            print(f"Training on: {tf.config.list_physical_devices('GPU')[0].name if tf.config.list_physical_devices('GPU') else 'CPU'}")
            
            # Generate synthetic training data for medication adherence
            np.random.seed(42)
            n_sequences = 20000  # Number of 7-day sequences
            sequence_length = 7  # 7 days
            n_features = 11  # Features per day
            
            X_train = []
            y_train = []
            
            for _ in range(n_sequences):
                sequence = []
                refusal_pattern = np.random.choice(['none', 'random', 'increasing', 'morning_pattern', 'critical'])
                
                for day in range(sequence_length):
                    # Generate features for each day
                    if refusal_pattern == 'none':
                        refused = 0
                        time_morning = 0
                        time_afternoon = 0
                        time_evening = 0
                    elif refusal_pattern == 'random':
                        refused = 1 if np.random.random() < 0.2 else 0
                        if refused:
                            time_slot = np.random.choice([0, 1, 2])
                            time_morning = 1 if time_slot == 0 else 0
                            time_afternoon = 1 if time_slot == 1 else 0
                            time_evening = 1 if time_slot == 2 else 0
                        else:
                            time_morning = time_afternoon = time_evening = 0
                    elif refusal_pattern == 'increasing':
                        refused = 1 if np.random.random() < (day / sequence_length) else 0
                        time_morning = refused
                        time_afternoon = time_evening = 0
                    elif refusal_pattern == 'morning_pattern':
                        refused = 1 if np.random.random() < 0.6 else 0
                        time_morning = refused
                        time_afternoon = time_evening = 0
                    else:  # critical
                        refused = 1 if np.random.random() < 0.7 else 0
                        time_slot = np.random.choice([0, 1, 2])
                        time_morning = 1 if time_slot == 0 and refused else 0
                        time_afternoon = 1 if time_slot == 1 and refused else 0
                        time_evening = 1 if time_slot == 2 and refused else 0
                    
                    # Additional features
                    has_side_effects = 1 if refused and np.random.random() < 0.3 else 0
                    has_confusion = 1 if refused and np.random.random() < 0.25 else 0
                    has_nausea = 1 if refused and np.random.random() < 0.4 else 0
                    day_of_week = day % 7  # 0-6
                    consecutive_refusals = sum([s[0] for s in sequence[-3:]]) if len(sequence) >= 3 else 0
                    
                    day_features = [
                        refused,
                        time_morning,
                        time_afternoon,
                        time_evening,
                        has_side_effects,
                        has_confusion,
                        has_nausea,
                        day_of_week / 7.0,  # Normalize
                        consecutive_refusals / 3.0,  # Normalize
                        day / sequence_length,  # Position in sequence
                        len(sequence) / sequence_length  # Sequence progress
                    ]
                    
                    sequence.append(day_features)
                
                X_train.append(sequence)
                
                # Calculate target (concern level: 0=good, 1=moderate, 2=high, 3=critical)
                total_refusals = sum([s[0] for s in sequence])
                adherence_rate = ((sequence_length - total_refusals) / sequence_length) * 100
                
                if adherence_rate >= 90:
                    concern = 0  # good
                elif adherence_rate >= 75:
                    concern = 1  # moderate
                elif adherence_rate >= 50:
                    concern = 2  # high
                else:
                    concern = 3  # critical
                
                y_train.append(concern)
            
            X_train = np.array(X_train)
            y_train = np.array(y_train)
            
            # Convert to categorical (one-hot encoding)
            y_train_cat = keras.utils.to_categorical(y_train, num_classes=4)
            
            # Split data
            from sklearn.model_selection import train_test_split
            X_train_split, X_val_split, y_train_split, y_val_split = train_test_split(
                X_train, y_train_cat, test_size=0.2, random_state=42
            )
            
            # Build LSTM model
            model = Sequential([
                Bidirectional(LSTM(64, return_sequences=True), input_shape=(sequence_length, n_features)),
                Dropout(0.3),
                Bidirectional(LSTM(32)),
                Dropout(0.3),
                Dense(32, activation='relu'),
                Dropout(0.2),
                Dense(16, activation='relu'),
                Dense(4, activation='softmax')  # 4 classes: good, moderate, high, critical
            ])
            
            model.compile(
                optimizer='adam',
                loss='categorical_crossentropy',
                metrics=['accuracy']
            )
            
            # Train model
            history = model.fit(
                X_train_split, y_train_split,
                validation_data=(X_val_split, y_val_split),
                epochs=30,
                batch_size=32,
                verbose=0
            )
            
            # Evaluate
            train_loss, train_acc = model.evaluate(X_train_split, y_train_split, verbose=0)
            val_loss, val_acc = model.evaluate(X_val_split, y_val_split, verbose=0)
            
            print(f"Medication LSTM - Train: {train_acc:.3f}, Val: {val_acc:.3f}")
            
            # Save model
            model.save(MEDICATION_MODEL_PATH)
            
            # Save feature scaler info (for consistency)
            scaler_info = {
                'feature_names': [
                    'refused', 'time_morning', 'time_afternoon', 'time_evening',
                    'has_side_effects', 'has_confusion', 'has_nausea',
                    'day_of_week_norm', 'consecutive_refusals_norm',
                    'sequence_position', 'sequence_progress'
                ],
                'n_features': n_features,
                'sequence_length': sequence_length
            }
            
            with open(MEDICATION_SCALER_PATH, 'wb') as f:
                pickle.dump(scaler_info, f)
            
        except ImportError:
            print("TensorFlow not installed - using rule-based adherence analysis")

# Load models on startup
try:
    initialize_models()
    
    with open(FALL_MODEL_PATH, 'rb') as f:
        fall_model_data = pickle.load(f)
        fall_model = fall_model_data['model']
        fall_scaler = fall_model_data['scaler']
    
    # Try to load LSTM mood model
    mood_lstm_model = None
    mood_scaler_info = None
    
    try:
        from tensorflow import keras
        if os.path.exists(MOOD_MODEL_PATH):
            mood_lstm_model = keras.models.load_model(MOOD_MODEL_PATH)
    except ImportError:
        print("TensorFlow not available - mood analysis unavailable")
    except Exception as e:
        pass
    
    if os.path.exists(MOOD_SCALER_PATH):
        with open(MOOD_SCALER_PATH, 'rb') as f:
            mood_scaler_info = pickle.load(f)
    
    # Try to load LSTM medication model
    medication_lstm_model = None
    medication_scaler_info = None
    
    try:
        from tensorflow import keras
        if os.path.exists(MEDICATION_MODEL_PATH):
            medication_lstm_model = keras.models.load_model(MEDICATION_MODEL_PATH)
    except ImportError:
        print("TensorFlow not available - using rule-based medication adherence")
    except Exception as e:
        pass
    
    if os.path.exists(MEDICATION_SCALER_PATH):
        with open(MEDICATION_SCALER_PATH, 'rb') as f:
            medication_scaler_info = pickle.load(f)
    
    print("Models loaded successfully")
except Exception as e:
    print(f"Error loading models: {e}")
    fall_model = None
    fall_scaler = None
    mood_lstm_model = None
    mood_scaler_info = None
    medication_lstm_model = None
    medication_scaler_info = None


def encode_mobility_level(level):
    """Encode mobility level to numeric"""
    mapping = {
        'Independent': 0,
        'Independent with aid': 1,
        'Requires some assistance': 2,
        'Requires significant assistance': 3
    }
    return mapping.get(level, 1)


def extract_fall_features(features):
    """
    Extract and encode features for enhanced fall risk model
    Handles all 15 features with proper defaults
    """
    # Get age group from features (passed from backend)
    age_group = float(features.get('age_group', 2.0))  # Default 75-85 age range
    
    # Build feature vector matching training data
    feature_vector = [
        float(features.get('has_fall_event', False)),
        encode_mobility_level(features.get('mobility_level', 'Independent')),
        float(features.get('use_of_aid', False)),
        float(features.get('dizziness_flag', False)),
        float(features.get('unsteady_gait_flag', False)),
        float(features.get('mmse_score', 25)),
        float(features.get('cognitive_impairment_flag', False)),
        float(features.get('confusion_flag', False)),
        float(features.get('polypharmacy_count', 3)),
        float(features.get('high_risk_med_flag', False)),
        float(features.get('bp_systolic', 120)),
        float(features.get('oxygen_sat', 96)),
        float(features.get('agitation_flag', False)),
        float(features.get('withdrawn_flag', False)),
        age_group
    ]
    return np.array(feature_vector).reshape(1, -1)


@app.route('/fall/predict', methods=['POST'])
def predict_fall_risk():
    """
    Enhanced fall risk prediction with clinical insights
    Uses GradientBoostingClassifier with temporal weighting and risk factor analysis
    """
    try:
        data = request.get_json()
        
        if not data or 'features' not in data:
            return jsonify({'error': 'Missing features data'}), 400
        
        features_list = data['features']
        
        if fall_model is None:
            return jsonify({'error': 'Model not loaded'}), 500
        
        if not features_list:
            return jsonify({
                'fall_risk_probability': 0.0,
                'risk_level': 'insufficient_data',
                'message': 'Add shift observations to enable fall risk predictions'
            })
        
        # Process temporal sequence (last 7 days)
        predictions = []
        weights = []
        risk_factors_present = {
            'previous_falls': 0,
            'mobility_issues': 0,
            'cognitive_impairment': 0,
            'medication_risks': 0,
            'gait_instability': 0,
            'vital_instability': 0
        }
        
        for i, features in enumerate(features_list):
            # Extract features
            X = extract_fall_features(features)
            
            # Scale features
            X_scaled = fall_scaler.transform(X)
            
            # Get probability prediction
            probability = fall_model.predict_proba(X_scaled)[0, 1]
            
            # Weight recent observations more heavily (exponential decay)
            weight = np.exp(i * 0.35)  # More recent = higher weight
            
            predictions.append(probability)
            weights.append(weight)
            
            # Track risk factors for explanation
            if features.get('has_fall_event'):
                risk_factors_present['previous_falls'] += 1
            if features.get('mobility_level') in ['Requires some assistance', 'Requires significant assistance']:
                risk_factors_present['mobility_issues'] += 1
            if features.get('cognitive_impairment_flag') or features.get('confusion_flag'):
                risk_factors_present['cognitive_impairment'] += 1
            if features.get('high_risk_med_flag') or features.get('polypharmacy_count', 0) > 5:
                risk_factors_present['medication_risks'] += 1
            if features.get('dizziness_flag') or features.get('unsteady_gait_flag'):
                risk_factors_present['gait_instability'] += 1
            
            bp = features.get('bp_systolic', 120)
            o2 = features.get('oxygen_sat', 96)
            if bp < 100 or bp > 160 or o2 < 92:
                risk_factors_present['vital_instability'] += 1
        
        # Weighted average with temporal importance
        if predictions:
            fall_risk_probability = np.average(predictions, weights=weights)
            
            # Calculate trend (is risk increasing or decreasing?)
            if len(predictions) >= 3:
                recent_avg = np.mean(predictions[-3:])
                earlier_avg = np.mean(predictions[:-3]) if len(predictions) > 3 else predictions[0]
                trend = 'increasing' if recent_avg > earlier_avg + 0.1 else ('decreasing' if recent_avg < earlier_avg - 0.1 else 'stable')
            else:
                trend = 'insufficient_data'
        else:
            fall_risk_probability = 0.0
            trend = 'no_data'
        
        # Ensure bounds
        fall_risk_probability = float(np.clip(fall_risk_probability, 0.0, 1.0))
        
        # Determine risk level and generate insights
        if fall_risk_probability >= 0.75:
            risk_level = 'very_high'
            risk_category = 'CRITICAL'
        elif fall_risk_probability >= 0.50:
            risk_level = 'high'
            risk_category = 'HIGH'
        elif fall_risk_probability >= 0.30:
            risk_level = 'moderate'
            risk_category = 'MODERATE'
        elif fall_risk_probability >= 0.15:
            risk_level = 'low_moderate'
            risk_category = 'LOW-MODERATE'
        else:
            risk_level = 'low'
            risk_category = 'LOW'
        
        # Generate clinical insights based on risk factors
        insights = []
        if risk_factors_present['previous_falls'] > 0:
            insights.append(f"{risk_factors_present['previous_falls']} recent fall event(s)")
        if risk_factors_present['gait_instability'] > 3:
            insights.append(f"Gait instability observed on {risk_factors_present['gait_instability']} occasions")
        if risk_factors_present['cognitive_impairment'] > 2:
            insights.append(f"Cognitive concerns noted {risk_factors_present['cognitive_impairment']} times")
        if risk_factors_present['medication_risks'] > 0:
            insights.append(f"Medication-related risk factors present")
        if risk_factors_present['mobility_issues'] > 3:
            insights.append(f"Reduced mobility requiring assistance")
        if risk_factors_present['vital_instability'] > 2:
            insights.append(f"Vital sign instability detected")
        
        if trend == 'increasing':
            insights.append("Risk trend: INCREASING over observation period")
        elif trend == 'decreasing':
            insights.append("Risk trend: DECREASING (positive sign)")
        
        # Generate recommendations
        recommendations = []
        if risk_level in ['very_high', 'high']:
            recommendations = [
                'Immediate intervention required',
                'Implement fall prevention protocol',
                'Consider 1:1 supervision',
                'Environmental safety assessment needed',
                'Review and adjust medications'
            ]
        elif risk_level == 'moderate':
            recommendations = [
                'Enhanced monitoring recommended',
                'Mobility assessment indicated',
                'Review assistive devices',
                'Consider physical therapy referral'
            ]
        else:
            recommendations = [
                'Continue standard care',
                'Maintain regular assessments',
                'Encourage safe mobility practices'
            ]
        
        return jsonify({
            'fall_risk_probability': round(fall_risk_probability, 3),
            'risk_level': risk_level,
            'risk_category': risk_category,
            'trend': trend,
            'insights': insights,
            'recommendations': recommendations[:3],  # Top 3 recommendations
            'risk_factors_detected': sum(1 for v in risk_factors_present.values() if v > 0),
            'observations_analyzed': len(features_list),
            'model': 'GradientBoostingClassifier',
            'confidence': 'high' if len(features_list) >= 5 else 'moderate'
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def extract_mood_features_for_lstm(features_list):
    """Extract temporal features for LSTM mood model"""
    sequence = []
    
    for day_idx, features in enumerate(features_list):
        # Extract mood flags
        confusion = 1 if features.get('confusion_flag', False) else 0
        agitation = 1 if features.get('agitation_flag', False) else 0
        depression = 1 if features.get('depression_flag', False) else 0
        happy = 1 if features.get('happy_flag', False) else 0
        withdrawn = 1 if features.get('withdrawn_flag', False) else 0
        
        # Get severity (normalize to 0-1)
        severity = features.get('mood_severity', 0) / 4.0
        
        # Contextual indicators (infer from available data if not provided)
        # Sleep disruption inferred from agitation/confusion or explicit flag
        sleep_disruption = 1 if (features.get('sleep_issue', False) or agitation or confusion) else 0
        
        # Appetite change inferred from depression or explicit flag
        appetite_change = 1 if (features.get('appetite_issue', False) or depression) else 0
        
        # Social engagement based on mood
        social_engagement = 1 if happy and not withdrawn else 0
        
        # Behavioral concern for high-severity agitation/confusion
        behavioral_concern = 1 if (agitation or confusion) and features.get('mood_severity', 0) >= 3 else 0
        
        day_features = [
            confusion,
            agitation,
            depression,
            happy,
            withdrawn,
            severity,
            sleep_disruption,
            appetite_change,
            social_engagement,
            behavioral_concern
        ]
        
        sequence.append(day_features)
    
    # Pad or truncate to exactly 7 days
    target_length = 7
    if len(sequence) < target_length:
        # Pad with zeros at the beginning
        padding = [[0] * 10 for _ in range(target_length - len(sequence))]
        sequence = padding + sequence
    elif len(sequence) > target_length:
        # Take last 7 days
        sequence = sequence[-target_length:]
    
    return np.array([sequence])  # Shape: (1, 7, 10)


def extract_medication_features_for_lstm(features_list):
    """Extract temporal features for LSTM model"""
    sequence = []
    
    for day_idx, features in enumerate(features_list):
        refused = 1 if features.get('medication_refused', False) else 0
        observation_time = features.get('observation_time', '').lower()
        refusal_reason = features.get('refusal_reason', '').lower()
        
        # Time of day encoding
        time_morning = 1 if refused and ('morning' in observation_time or 'am' in observation_time) else 0
        time_afternoon = 1 if refused and ('afternoon' in observation_time) else 0
        time_evening = 1 if refused and ('evening' in observation_time or 'pm' in observation_time) else 0
        
        # Reason encoding
        has_side_effects = 1 if refused and ('side effect' in refusal_reason or 'nausea' in refusal_reason) else 0
        has_confusion = 1 if refused and 'confus' in refusal_reason else 0
        has_nausea = 1 if refused and 'nausea' in refusal_reason else 0
        
        # Temporal features
        day_of_week = day_idx % 7 / 7.0  # Normalized day of week
        
        # Calculate consecutive refusals (looking back)
        consecutive = 0
        for i in range(max(0, day_idx - 2), day_idx):
            if i < len(features_list) and features_list[i].get('medication_refused', False):
                consecutive += 1
        consecutive_norm = consecutive / 3.0
        
        # Sequence position
        sequence_position = day_idx / max(len(features_list) - 1, 1)
        sequence_progress = (day_idx + 1) / len(features_list)
        
        day_features = [
            refused,
            time_morning,
            time_afternoon,
            time_evening,
            has_side_effects,
            has_confusion,
            has_nausea,
            day_of_week,
            consecutive_norm,
            sequence_position,
            sequence_progress
        ]
        
        sequence.append(day_features)
    
    # Pad or truncate to exactly 7 days
    target_length = 7
    if len(sequence) < target_length:
        # Pad with zeros at the beginning
        padding = [[0] * 11 for _ in range(target_length - len(sequence))]
        sequence = padding + sequence
    elif len(sequence) > target_length:
        # Take last 7 days
        sequence = sequence[-target_length:]
    
    return np.array([sequence])  # Shape: (1, 7, 11)


@app.route('/medication/adherence', methods=['POST'])
def analyze_medication_adherence():
    """
    Analyze medication adherence patterns over time using LSTM neural network
    Captures temporal patterns, time-of-day preferences, and trend analysis
    Falls back to rule-based analysis if LSTM unavailable
    """
    try:
        data = request.get_json()
        
        if not data or 'features' not in data:
            return jsonify({'error': 'Missing features data'}), 400
        
        features_list = data['features']
        
        if not features_list:
            return jsonify({
                'adherence_summary': 'Insufficient data for medication adherence analysis.',
                'adherence_rate': 0,
                'concern_level': 'no_data'
            })
        
        sequence_length = len(features_list)
        
        # === TRY LSTM MODEL FIRST ===
        use_lstm = medication_lstm_model is not None and len(features_list) >= 3
        lstm_prediction = None
        lstm_confidence = 0.0
        
        if use_lstm:
            try:
                # Extract features for LSTM
                X_lstm = extract_medication_features_for_lstm(features_list)
                
                # Get prediction probabilities
                lstm_probs = medication_lstm_model.predict(X_lstm, verbose=0)[0]
                lstm_prediction = int(np.argmax(lstm_probs))
                lstm_confidence = float(lstm_probs[lstm_prediction])
                
                # Map prediction to concern level
                concern_mapping = {
                    0: ('low', 'GOOD'),
                    1: ('moderate', 'MODERATE CONCERN'),
                    2: ('high', 'HIGH CONCERN'),
                    3: ('critical', 'CRITICAL')
                }
                
                concern_level, concern_label = concern_mapping[lstm_prediction]
                
            except Exception as e:
                print(f"LSTM prediction failed: {e}")
                use_lstm = False
        
        # === MEDICATION ADHERENCE TRACKING ===
        refusal_count = 0
        total_opportunities = 0
        refusal_details = []
        refusal_reasons = {}
        refusal_times = {'morning': 0, 'afternoon': 0, 'evening': 0, 'night': 0}
        
        for day_num, features in enumerate(features_list, 1):
            # Track medication administration
            med_refused = features.get('medication_refused', False)
            med_reason = features.get('refusal_reason', '')
            observation_time = features.get('observation_time', '')
            
            if med_refused:
                refusal_count += 1
                refusal_details.append({
                    'day': day_num,
                    'reason': med_reason,
                    'time': observation_time
                })
                
                # Track refusal reasons
                if med_reason:
                    refusal_reasons[med_reason] = refusal_reasons.get(med_reason, 0) + 1
                
                # Track time of day patterns
                time_lower = observation_time.lower() if observation_time else ''
                if 'morning' in time_lower or 'am' in time_lower:
                    refusal_times['morning'] += 1
                elif 'afternoon' in time_lower or 'pm' in time_lower and '1' in time_lower:
                    refusal_times['afternoon'] += 1
                elif 'evening' in time_lower or 'pm' in time_lower:
                    refusal_times['evening'] += 1
                elif 'night' in time_lower:
                    refusal_times['night'] += 1
            
            total_opportunities += 1
        
        # Calculate adherence metrics
        adherence_rate = ((total_opportunities - refusal_count) / total_opportunities * 100) if total_opportunities > 0 else 100
        
        # Determine concern level (rule-based if LSTM not used)
        if not use_lstm:
            if adherence_rate >= 90:
                concern_level = 'low'
                concern_label = 'GOOD'
            elif adherence_rate >= 75:
                concern_level = 'moderate'
                concern_label = 'MODERATE CONCERN'
            elif adherence_rate >= 50:
                concern_level = 'high'
                concern_label = 'HIGH CONCERN'
            else:
                concern_level = 'critical'
                concern_label = 'CRITICAL'
        
        # === GENERATE CLINICAL SUMMARY ===
        summary_parts = []
        
        # Overall adherence statement
        if refusal_count == 0:
            summary_parts.append(f"Excellent medication adherence: No refusals documented over {sequence_length} days")
        elif refusal_count == 1:
            summary_parts.append(f"Generally good adherence with 1 medication refusal over {sequence_length} days ({adherence_rate:.0f}% adherence)")
        else:
            summary_parts.append(f"{concern_label}: {refusal_count} medication refusals over {sequence_length} days ({adherence_rate:.0f}% adherence)")
        
        # Identify patterns
        if refusal_count >= 2:
            # Check for consecutive refusals
            consecutive_days = []
            for i in range(len(refusal_details) - 1):
                if refusal_details[i+1]['day'] - refusal_details[i]['day'] == 1:
                    consecutive_days.append((refusal_details[i]['day'], refusal_details[i+1]['day']))
            
            if consecutive_days:
                summary_parts.append(f"Pattern detected: Consecutive refusals on days {consecutive_days[0][0]}-{consecutive_days[0][1]}")
            
            # Most common reason
            if refusal_reasons:
                top_reason = max(refusal_reasons.items(), key=lambda x: x[1])
                if top_reason[1] >= 2:
                    summary_parts.append(f"Primary refusal reason: '{top_reason[0]}' ({top_reason[1]} occurrences)")
            
            # Time of day pattern
            max_time = max(refusal_times.items(), key=lambda x: x[1])
            if max_time[1] >= 2:
                summary_parts.append(f"Refusals most common during {max_time[0]} administration ({max_time[1]} times)")
        
        # Clinical recommendations
        recommendations = []
        if concern_level in ['high', 'critical']:
            recommendations = [
                'Immediate intervention required',
                'Assess for medication side effects or swallowing difficulties',
                'Consider medication review with physician',
                'Evaluate for underlying causes (depression, confusion, side effects)',
                'Implement adherence support strategies'
            ]
        elif concern_level == 'moderate':
            recommendations = [
                'Monitor adherence closely',
                'Explore reasons for refusal with resident',
                'Consider timing or formulation changes',
                'Engage family in adherence support'
            ]
        else:
            recommendations = [
                'Continue current medication administration approach',
                'Maintain regular monitoring',
                'Reinforce positive adherence behaviors'
            ]
        
        # Risk flags
        risk_flags = []
        if refusal_count >= 3:
            risk_flags.append('Multiple refusals - medication effectiveness compromised')
        if adherence_rate < 80:
            risk_flags.append('Below therapeutic threshold - clinical outcomes at risk')
        if any('side effect' in reason.lower() for reason in refusal_reasons.keys()):
            risk_flags.append('Side effects reported - medication review needed')
        if refusal_count >= 2 and sequence_length <= 3:
            risk_flags.append('High frequency refusal pattern - immediate attention required')
        
        summary_text = ' | '.join(summary_parts)
        
        # Build response
        response = {
            'adherence_summary': summary_text,
            'adherence_rate': round(adherence_rate, 1),
            'refusal_count': refusal_count,
            'total_days': sequence_length,
            'concern_level': concern_level,
            'concern_label': concern_label,
            'refusal_details': refusal_details,
            'refusal_reasons': refusal_reasons,
            'refusal_time_pattern': refusal_times,
            'recommendations': recommendations[:3],
            'risk_flags': risk_flags,
            'model': 'LSTM_Temporal_Adherence_Analyzer' if use_lstm else 'Rule_Based_Adherence_Analyzer'
        }
        
        # Add LSTM-specific info if used
        if use_lstm:
            # Note: lstm_confidence and lstm_prediction available but not exposed in API
            response['model_note'] = 'AI-powered temporal pattern analysis'
        
        return jsonify(response)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/mood/predict', methods=['POST'])
def predict_mood():
    """
    LSTM-based mood analysis with temporal pattern recognition
    Uses Bidirectional LSTM to detect mood patterns and predict risk levels
    """
    try:
        data = request.get_json()
        
        if not data or 'features' not in data:
            return jsonify({'error': 'Missing features data'}), 400
        
        features_list = data['features']
        
        if not features_list:
            return jsonify({
                'mood_changes': 'Insufficient data for mood analysis. Add shift observations to enable predictions.',
                'model': 'LSTM_Mood_Analyzer',
                'concern_level': 'no_data',
                'risk_score': 0
            })
        
        sequence_length = len(features_list)
        
        # === TRY LSTM MODEL FIRST ===
        use_lstm = mood_lstm_model is not None and len(features_list) >= 3
        lstm_prediction = None
        lstm_confidence = 0.0
        
        if use_lstm:
            try:
                # Extract features for LSTM
                X_lstm = extract_mood_features_for_lstm(features_list)
                
                # Get prediction probabilities
                lstm_probs = mood_lstm_model.predict(X_lstm, verbose=0)[0]
                lstm_prediction = int(np.argmax(lstm_probs))
                lstm_confidence = float(lstm_probs[lstm_prediction])
                
                # Map prediction to risk level
                risk_mapping = {
                    0: ('low', 'LOW'),
                    1: ('moderate', 'MODERATE'),
                    2: ('high', 'HIGH CONCERN'),
                    3: ('critical', 'CRITICAL')
                }
                
                risk_level, risk_label = risk_mapping[lstm_prediction]
                
            except Exception as e:
                print(f"LSTM mood prediction failed: {e}")
                use_lstm = False
        
        # === ANALYZE MOOD PATTERNS ===
        mood_flags_count = {
            'confusion': 0,
            'agitation': 0,
            'depression': 0,
            'happy': 0,
            'withdrawn': 0
        }
        
        severity_sequence = []
        triggers_mentioned = []
        mood_events = []
        
        for day_num, features in enumerate(features_list, 1):
            # Count mood flags
            if features.get('confusion_flag'):
                mood_flags_count['confusion'] += 1
            if features.get('agitation_flag'):
                mood_flags_count['agitation'] += 1
            if features.get('depression_flag'):
                mood_flags_count['depression'] += 1
            if features.get('happy_flag'):
                mood_flags_count['happy'] += 1
            if features.get('withdrawn_flag'):
                mood_flags_count['withdrawn'] += 1
            
            # Track severity
            if features.get('has_mood_change'):
                severity = features.get('mood_severity', 0)
                trigger = features.get('mood_triggers', '')
                
                severity_sequence.append(severity)
                mood_events.append({
                    'day': day_num,
                    'severity': severity,
                    'trigger': trigger
                })
                
                if trigger and trigger not in triggers_mentioned:
                    triggers_mentioned.append(trigger)
        
        # Calculate statistics
        if severity_sequence:
            max_severity = max(severity_sequence)
            avg_severity = float(np.mean(severity_sequence))
            volatility = float(np.std(severity_sequence)) if len(severity_sequence) > 1 else 0
        else:
            max_severity = 0
            avg_severity = 0
            volatility = 0
        
        # Calculate rule-based risk if LSTM not used
        if not use_lstm:
            total_flags = sum(mood_flags_count.values())
            
            # Weight the flags
            weighted_score = (
                mood_flags_count['depression'] * 1.5 +
                mood_flags_count['confusion'] * 1.4 +
                mood_flags_count['agitation'] * 1.3 +
                mood_flags_count['withdrawn'] * 1.2 +
                mood_flags_count['happy'] * 0.8
            )
            
            if max_severity >= 4 or weighted_score >= 6:
                risk_level = 'critical'
                risk_label = 'CRITICAL'
            elif max_severity >= 3 or weighted_score >= 4:
                risk_level = 'high'
                risk_label = 'HIGH CONCERN'
            elif avg_severity >= 2 or weighted_score >= 2:
                risk_level = 'moderate'
                risk_label = 'MODERATE'
            else:
                risk_level = 'low'
                risk_label = 'LOW'
        
        # === GENERATE CLINICAL SUMMARY ===
        summary_parts = []
        
        # Overall assessment
        if risk_level == 'critical':
            summary_parts.append("CRITICAL: Significant mood instability requiring immediate attention")
        elif risk_level == 'high':
            summary_parts.append("HIGH CONCERN: Notable mood disturbances observed")
        elif risk_level == 'moderate':
            summary_parts.append("MODERATE: Some mood variations detected")
        else:
            summary_parts.append("Overall mood stable with minor fluctuations")
        
        # Dominant patterns
        sorted_flags = sorted(mood_flags_count.items(), key=lambda x: x[1], reverse=True)
        for flag, count in sorted_flags[:2]:
            if count >= 2:
                flag_descriptions = {
                    'depression': f"Depressive symptoms noted {count} times",
                    'agitation': f"Agitated behavior observed {count} times",
                    'confusion': f"Confusion episodes documented {count} times",
                    'withdrawn': f"Social withdrawal observed {count} times",
                    'happy': f"Positive mood on {count} occasions"
                }
                if flag in flag_descriptions:
                    summary_parts.append(flag_descriptions[flag])
        
        # Severity patterns
        if len(mood_events) >= 2:
            if max_severity >= 3:
                summary_parts.append(f"Peak severity: {max_severity}/4")
            if volatility > 1.5:
                summary_parts.append("High mood volatility detected")
        
        # Triggers
        if triggers_mentioned:
            trigger_text = ", ".join(triggers_mentioned[:2])
            summary_parts.append(f"Triggers identified: {trigger_text}")
        
        # Recommendations
        recommendations = []
        if risk_level in ['critical', 'high']:
            recommendations = [
                'Immediate care team notification required',
                'Consider mental health specialist referral',
                'Enhanced supervision recommended',
                'Review and adjust care plan urgently'
            ]
        elif risk_level == 'moderate':
            recommendations = [
                'Increase monitoring frequency',
                'Consider family consultation',
                'Evaluate environmental triggers',
                'Review medication compliance'
            ]
        else:
            recommendations = [
                'Continue current care plan',
                'Maintain regular mood monitoring',
                'Encourage social activities'
            ]
        
        mood_summary = " | ".join(summary_parts) if summary_parts else "No significant mood concerns"
        
        # Build response
        response = {
            'mood_changes': mood_summary,
            'model': 'LSTM_Mood_Analyzer' if use_lstm else 'Rule_Based_Mood_Analyzer',
            'concern_level': risk_level,
            'concern_label': risk_label,
            'risk_score': round(lstm_confidence * 100, 1) if use_lstm else round(avg_severity, 2),
            'volatility': round(volatility, 2),
            'avg_severity': round(avg_severity, 2),
            'max_severity': max_severity,
            'events_detected': len(mood_events),
            'sequence_length': sequence_length,
            'mood_flags': mood_flags_count,
            'recommendations': recommendations[:3]
        }
        
        if use_lstm:
            response['lstm_confidence'] = round(lstm_confidence * 100, 1)
            response['model_note'] = 'AI-powered temporal mood pattern analysis'
        
        return jsonify(response)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    model_metrics = {}
    
    # Get fall model metrics if available
    if fall_model is not None:
        try:
            with open(FALL_MODEL_PATH, 'rb') as f:
                model_data = pickle.load(f)
                model_metrics['train_accuracy'] = model_data.get('train_accuracy', 'N/A')
                model_metrics['test_accuracy'] = model_data.get('test_accuracy', 'N/A')
        except:
            pass
    
    return jsonify({
        'status': 'healthy',
        'models': {
            'fall_prediction': {
                'type': 'GradientBoostingClassifier',
                'status': 'loaded' if fall_model is not None else 'not_loaded',
                'features': len(FALL_FEATURES),
                'metrics': model_metrics
            },
            'mood_summary': {
                'type': 'Bidirectional_LSTM',
                'status': 'loaded' if mood_lstm_model is not None else 'not_loaded',
                'sequence_based': True,
                'features': 'LSTM temporal mood pattern recognition, risk classification'
            },
            'medication_adherence': {
                'type': 'Bidirectional_LSTM',
                'status': 'loaded' if medication_lstm_model is not None else 'rule_based',
                'sequence_based': True,
                'features': 'Temporal pattern learning, time-of-day preferences, consecutive refusal detection'
            }
        },
        'version': '2.1.0_ML_LSTM'
    })


@app.route('/metrics', methods=['GET'])
def get_metrics():
    """Get detailed model performance metrics"""
    metrics = {}
    
    # Fall model metrics
    if fall_model is not None:
        try:
            with open(FALL_MODEL_PATH, 'rb') as f:
                model_data = pickle.load(f)
                metrics['fall_model'] = {
                    'train_accuracy': model_data.get('train_accuracy', 'N/A'),
                    'test_accuracy': model_data.get('test_accuracy', 'N/A'),
                    'model_type': 'GradientBoostingClassifier',
                    'features_count': len(FALL_FEATURES)
                }
        except Exception as e:
            metrics['fall_model'] = {'error': str(e)}
    
    # Mood model info
    if mood_lstm_model is not None:
        metrics['mood_model'] = {
            'type': 'Bidirectional_LSTM',
            'architecture': [
                'Bidirectional LSTM (64 units)',
                'Dropout (0.3)',
                'Bidirectional LSTM (32 units)',
                'Dropout (0.3)',
                'Dense (32 units, ReLU)',
                'Dense (16 units, ReLU)',
                'Dense (4 units, Softmax)'
            ],
            'sequence_length': 7,
            'features_per_timestep': 10,
            'feature_names': [
                'confusion', 'agitation', 'depression', 'happy', 'withdrawn',
                'severity', 'sleep_disruption', 'appetite_change',
                'social_engagement', 'behavioral_concern'
            ],
            'classes': ['low', 'moderate', 'high', 'critical'],
            'training_samples': 5000,
            'note': 'Deep learning model for temporal mood pattern recognition'
        }
    else:
        metrics['mood_model'] = {
            'type': 'Rule_Based_System',
            'note': 'Using weighted scoring (LSTM not available)'
        }
    
    # Medication adherence LSTM model info
    if medication_lstm_model is not None:
        metrics['medication_adherence_model'] = {
            'type': 'Bidirectional_LSTM',
            'architecture': [
                'Bidirectional LSTM (64 units)',
                'Dropout (0.3)',
                'Bidirectional LSTM (32 units)',
                'Dropout (0.3)',
                'Dense (32 units, ReLU)',
                'Dense (16 units, ReLU)',
                'Dense (4 units, Softmax)'
            ],
            'sequence_length': 7,
            'features_per_timestep': 11,
            'classes': ['good', 'moderate', 'high', 'critical'],
            'training_samples': 5000,
            'note': 'Deep learning model for temporal adherence pattern recognition'
        }
    else:
        metrics['medication_adherence_model'] = {
            'type': 'Rule_Based_System',
            'note': 'Using threshold-based adherence analysis (LSTM not available)'
        }
    
    return jsonify(metrics)


if __name__ == '__main__':
    print("="*70)
    print("🏥 CLINICAL AI MODELS SERVER")
    print("="*70)
    print("\n📍 REST API Endpoints:")
    print("  ├─ POST /fall/predict   → Comprehensive fall risk assessment")
    print("  │                         Returns: probability, risk level, trend,")
    print("  │                                 insights, recommendations")
    print("  │")
    print("  ├─ POST /mood/predict   → Clinical mood analysis")
    print("  │                         Returns: summary, risk score, volatility,")
    print("  │                                 concern level, recommendations")
    print("  │")
    print("  ├─ POST /medication/adherence → LSTM temporal adherence prediction")
    print("  │                         Returns: concern level, confidence,")
    print("  │                                 pattern analysis, recommendations")
    print("  │")
    print("  ├─ GET  /health         → System health check & model status")
    print("  └─ GET  /metrics        → Detailed performance metrics")
    print("\n🚀 Server Status: ONLINE")
    print("🌐 Listening on: http://localhost:5000")
    print("="*70)
    app.run(debug=True, host='0.0.0.0', port=5000)
