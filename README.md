# ClinicalSight 🏥

**A Full-Stack Healthcare Dashboard Application**

> ClinicalSight is an AI-powered healthcare management system that helps caregivers detect early signs of declining wellness in residents. By combining clinical notes, vitals, mobility observations, and fall history, the system predicts mood/behavior changes and fall likelihood before serious incidents occur.

## 🎯 Problem Statement

Many long-term care residents experience subtle changes in mood and physical stability that are difficult for staff to recognize early because this information is spread across shift notes, vitals, and incident logs. Research shows that up to 60% of mood or behavior changes in seniors go under-recognized, contributing to social withdrawal and reduced engagement. Additionally, nearly half of long-term care residents experience at least one fall each year, often with serious injury, long recovery times and costly hospital admittances.

## 💡 Solution

ClinicalSight provides a **unified dashboard** that highlights emerging risks and suggests timely interventions, improving safety, emotional support, and overall quality of care. Staff receive simple, actionable insights that enable proactive rather than reactive care.

## 🚀 Quick Start

### Prerequisites
- Node.js (for frontend)
- Python 3.8+ (for AI models)
- Java 21+ (for backend)
- Maven (for backend build)

### 1. Create Virtual Environment
```bash
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate
```

### 2. Start AI Models Service
```bash
cd ai-models
pip install -r requirements.txt
python app.py
```
*Runs on port 5000*

### 3. Start Frontend
```bash
cd frontend
npm install
npm start
```
*Runs on port 3000*

### 4. Start Backend
```bash
cd backend
.\mvnw.cmd spring-boot:run
```
*Runs on port 8081*

## 🏗️ Architecture

**Three-tier architecture:**
- **Frontend**: React (port 3000) - User dashboard and data entry
- **Backend**: Spring Boot (port 8081) - REST API and data persistence
- **AI Service**: Flask (port 5000) - Machine learning predictions

## 🤖 AI Models

### 1. Fall Risk Predictor
- **Algorithm**: Gradient Boosting
- **Features**: 15 clinical features with temporal weighting
- **Output**: Risk probability and recommendations

### 2. Mood Analyzer
- **Algorithm**: Bidirectional LSTM
- **Input**: 7-day sequences (10 features/day)
- **Output**: Mood decline predictions and insights

### 3. Medication Adherence Tracker
- **Algorithm**: Bidirectional LSTM
- **Input**: Refusal patterns (11 features/day)
- **Output**: Adherence risk and intervention suggestions

## 👥 Target Users

- **Nurses & Personal Support Workers** - Daily monitoring and intervention
- **Nurse Practitioners & Physicians** - Clinical interpretation and care planning
- **Care Coordinators & Social Workers** - Behavioral and emotional support planning
- **Facility Administrators & Quality/Risk Managers** - Safety outcomes and compliance
- **Family & Resident Advocates** - Transparent communication and shared decisions

## 💼 Business Value

- **Preventive Care**: Enables proactive intervention vs reactive response
- **Reduced Injuries**: Early fall risk detection prevents incidents
- **Cost Savings**: Avoid emergency transfers and hospital admissions
- **Staff Efficiency**: Automated trend analysis reduces workload
- **Better Outcomes**: Improved resident emotional and physical well-being

## 🔮 Innovation

This project uniquely combines multiple ML approaches (ensemble methods + deep learning) to create a comprehensive predictive system. The Bidirectional LSTM models analyze 7-day sequences to detect subtle patterns that human observers might miss, providing explainable insights with evidence-based recommendations.

## 📋 Repository Structure

```
├── ai-models/           # Flask AI service & ML models
├── frontend/            # React dashboard application
└── backend/             # Spring Boot REST API
```