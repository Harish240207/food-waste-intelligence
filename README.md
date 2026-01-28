# 🍽️ Food Waste Intelligence
**Billing + Analytics + AI Forecasting Web Application**

## 📌 Project Description
Food Waste Intelligence is a smart web-based system designed to reduce food wastage in restaurants/hostels/canteens using billing data analytics and AI demand forecasting.

The system tracks daily sales, identifies high-demand and waste-risk items, and generates next-day demand predictions, helping management take better production decisions.


## ⚙️ How to Run the Project

### ✅ Step 1: Clone the repository
git clone https://github.com/<your-username>/food-waste-intelligence.git
cd food-waste-intelligence

✅ Step 2: Run Backend (Flask)
cd backend
pip install -r requirements.txt
python main.py

✅ Step 3: Run Frontend (React)
Open a new terminal:
cd frontend
npm install
npm start



## 🚀 Features

### ✅ Authentication & Roles
- Login system with roles: Admin / Manager / Cashier
- Role-based page access

### ✅ Food Management (Admin)
- Add / Update / Delete food items
- Selling price + cost price support

### ✅ Billing Module (Cashier)
- Add billing entries with food items
- Track quantity and revenue automatically

### ✅ Dashboard Analytics
- Total revenue (daily)
- Total quantity sold
- Top-selling food items
- Waste cost estimation

### ✅ AI Demand Forecasting
- Predicts tomorrow’s demand using billing history
- Shows confidence score + suggestions:
  - Increase production
  - Reduce production

### ✅ Forecast Archive
- Save forecasts daily
- View forecast history by date
- Export forecast data as CSV

### ✅ AI Assistant (Data Based)
- Data-based assistant to answer questions using billing + forecast + insights

- 
## 🛠️ Tech Stack

### Frontend
- React.js
- HTML / CSS (custom UI)
- Axios

### Backend
- Python Flask
- Flask-CORS
- SQLite3

### Machine Learning
- LightGBM Regressor
- Pandas, NumPy, scikit-learn

- 
