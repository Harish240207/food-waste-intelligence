from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from database import get_db, init_db
import warnings
warnings.filterwarnings("ignore")
import lightgbm as lgb
lgb.basic._log_warning = lambda msg: None


import io
import csv
import random
from datetime import datetime, timedelta
from datetime import datetime, timedelta
import numpy as np
import os
import requests
import pandas as pd
from dotenv import load_dotenv

app = Flask(__name__)
CORS(app)

init_db()
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()


# ======================================
# ✅ Safe DB connection
# ======================================
def db():
    conn = get_db()
    try:
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.execute("PRAGMA journal_mode = WAL;")
    except:
        pass
    return conn


# ======================================
# ✅ Helper: load events map
# ======================================
def load_event_map(conn):
    """
    Returns:
      events_map[date_str] = {
        impact: float,
        is_holiday: 0/1,
        is_festival: 0/1,
        is_exam: 0/1,
        is_special_menu: 0/1,
        title: str
      }
    """
    events = conn.execute("""
        SELECT event_date, event_type, title, impact
        FROM events
    """).fetchall()

    events_map = {}

    for e in events:
        d = str(e["event_date"])
        t = (e["event_type"] or "").strip().lower()

        if d not in events_map:
            events_map[d] = {
                "impact": 0.0,
                "is_holiday": 0,
                "is_festival": 0,
                "is_exam": 0,
                "is_special_menu": 0,
                "title": "",
            }

        # total impact score (sum if multiple events on same day)
        events_map[d]["impact"] += float(e["impact"] or 0)

        # type flags
        if "holiday" in t:
            events_map[d]["is_holiday"] = 1
        if "festival" in t:
            events_map[d]["is_festival"] = 1
        if "exam" in t:
            events_map[d]["is_exam"] = 1
        if "menu" in t or "special" in t:
            events_map[d]["is_special_menu"] = 1

        # title store
        if not events_map[d]["title"]:
            events_map[d]["title"] = str(e["title"] or "")

    return events_map


# ============================
# AUTH
# ============================

@app.route("/auth/login", methods=["POST"])
def login():
    data = request.json or {}
    username = data.get("username", "")
    password = data.get("password", "")

    conn = db()
    user = conn.execute(
        "SELECT id, username, role FROM users WHERE username=? AND password=?",
        (username, password)
    ).fetchone()
    conn.close()

    if not user:
        return jsonify({"message": "Invalid username/password"}), 401

    token = f"{user['username']}::{user['role']}"
    return jsonify({
        "token": token,
        "user": {"username": user["username"], "role": user["role"]}
    })


@app.route("/auth/me", methods=["GET"])
def me():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if "::" not in token:
        return jsonify({"message": "Unauthorized"}), 401
    username, role = token.split("::", 1)
    return jsonify({"username": username, "role": role})


# ============================
# EVENTS API  ✅ NEW
# ============================

@app.route("/events", methods=["GET"])
def events_list():
    conn = db()
    rows = conn.execute("""
        SELECT id, event_date, event_type, title, impact, created_at
        FROM events
        ORDER BY event_date DESC
        LIMIT 120
    """).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/events", methods=["POST"])
def events_add():
    """
    body:
    {
      "event_date": "2026-01-26",
      "event_type": "Holiday" | "Festival" | "Exam" | "Special Menu",
      "title": "Republic Day",
      "impact": -1
    }
    """
    data = request.json or {}
    event_date = (data.get("event_date") or "").strip()
    event_type = (data.get("event_type") or "").strip()
    title = (data.get("title") or "").strip()
    impact = float(data.get("impact", 0) or 0)

    if not event_date or not event_type or not title:
        return jsonify({"message": "event_date, event_type and title required"}), 400

    # ✅ validate date format
    try:
        datetime.strptime(event_date, "%Y-%m-%d")
    except:
        return jsonify({"message": "event_date must be YYYY-MM-DD"}), 400

    conn = db()
    try:
        conn.execute("""
            INSERT INTO events (event_date, event_type, title, impact)
            VALUES (?, ?, ?, ?)
        """, (event_date, event_type, title, impact))
        conn.commit()
    except Exception:
        conn.close()
        return jsonify({"message": "Event already exists for this date + type"}), 400

    conn.close()
    return jsonify({"message": "Event added"})


@app.route("/events/<int:event_id>", methods=["DELETE"])
def events_delete(event_id):
    conn = db()
    conn.execute("DELETE FROM events WHERE id=?", (event_id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Event deleted"})


# ============================
# FOODS ✅ FINAL FIX
# ============================

def _to_float(x, default=0.0):
    try:
        if x is None or x == "":
            return float(default)
        return float(x)
    except:
        return float(default)

def _to_int(x, default=0):
    try:
        if x is None or x == "":
            return int(default)
        return int(x)
    except:
        return int(default)

def _normalize_food_payload(data: dict):
    """
    Accept multiple payload formats from frontend:
    - name / food_name / foodName
    - price / selling_price / sellingPrice
    - cost_price / costPrice / cost
    """
    name = (
        data.get("name")
        or data.get("food_name")
        or data.get("foodName")
        or data.get("food")
        or ""
    )

    price = (
        data.get("price")
        if data.get("price") is not None
        else data.get("selling_price")
        if data.get("selling_price") is not None
        else data.get("sellingPrice")
    )

    cost_price = (
        data.get("cost_price")
        if data.get("cost_price") is not None
        else data.get("costPrice")
        if data.get("costPrice") is not None
        else data.get("cost")
    )

    name = str(name).strip()
    price = _to_float(price, 0)
    cost_price = _to_float(cost_price, 0)

    return name, price, cost_price


@app.route("/foods", methods=["GET"])
def get_foods():
    conn = db()
    foods = conn.execute("SELECT * FROM foods ORDER BY name").fetchall()
    conn.close()
    return jsonify([dict(f) for f in foods])


@app.route("/foods", methods=["POST"])
def add_food():
    data = request.get_json(silent=True) or {}
    print("✅ ADD FOOD payload:", data)

    name, price, cost_price = _normalize_food_payload(data)

    if not name:
        return jsonify({
            "message": "Food name required",
            "received": data
        }), 400

    conn = db()

    # ✅ check if already exists (case-insensitive)
    existing = conn.execute(
        "SELECT id FROM foods WHERE LOWER(name)=LOWER(?)",
        (name,)
    ).fetchone()

    if existing:
        conn.close()
        return jsonify({"message": "Food already exists"}), 400

    try:
        conn.execute(
            "INSERT INTO foods (name, price, cost_price) VALUES (?, ?, ?)",
            (name, price, cost_price)
        )
        conn.commit()
    except Exception as e:
        conn.close()
        return jsonify({
            "message": "Food add failed",
            "error": str(e)
        }), 400

    conn.close()
    return jsonify({"message": "Food added"}), 201


@app.route("/foods/<int:food_id>", methods=["PUT"])
def update_food(food_id):
    data = request.get_json(silent=True) or {}
    print("✅ UPDATE FOOD payload:", food_id, data)

    name, price, cost_price = _normalize_food_payload(data)

    conn = db()
    existing = conn.execute("SELECT * FROM foods WHERE id=?", (food_id,)).fetchone()
    if not existing:
        conn.close()
        return jsonify({"message": "Food not found"}), 404

    # ✅ allow updating name also
    # if frontend didn't send name, keep old name
    if not name:
        name = existing["name"]

    try:
        conn.execute("""
            UPDATE foods
            SET name=?, price=?, cost_price=?
            WHERE id=?
        """, (name, price, cost_price, food_id))
        conn.commit()
    except Exception as e:
        conn.close()
        return jsonify({
            "message": "Update failed",
            "error": str(e)
        }), 400

    conn.close()
    return jsonify({"message": "Food updated"})


@app.route("/foods/<int:food_id>", methods=["DELETE"])
def delete_food(food_id):
    print("✅ DELETE FOOD:", food_id)

    conn = db()
    existing = conn.execute("SELECT id FROM foods WHERE id=?", (food_id,)).fetchone()
    if not existing:
        conn.close()
        return jsonify({"message": "Food not found"}), 404

    try:
        conn.execute("DELETE FROM foods WHERE id=?", (food_id,))
        conn.commit()
    except Exception as e:
        conn.close()
        return jsonify({
            "message": "Delete failed",
            "error": str(e)
        }), 400

    conn.close()
    return jsonify({"message": "Food deleted"})


# ============================
# BILLING
# ============================

@app.route("/billing", methods=["POST"])
def add_bill():
    data = request.json or {}
    food_name = data.get("food_name")
    quantity = int(data.get("quantity", 1) or 1)
    total = float(data.get("total", 0) or 0)

    if not food_name:
        return jsonify({"message": "food_name required"}), 400

    conn = db()
    conn.execute("""
        INSERT INTO billing (food_name, quantity, total)
        VALUES (?, ?, ?)
    """, (food_name, quantity, total))
    conn.commit()
    conn.close()

    return jsonify({"message": "Bill added"})


@app.route("/billing", methods=["GET"])
def list_bills():
    conn = db()
    bills = conn.execute("""
        SELECT id, food_name, quantity, total, created_at
        FROM billing
        ORDER BY created_at DESC
        LIMIT 50
    """).fetchall()
    conn.close()
    return jsonify([dict(b) for b in bills])


@app.route("/billing/<int:bill_id>", methods=["DELETE"])
def delete_bill(bill_id):
    conn = db()
    conn.execute("DELETE FROM billing WHERE id=?", (bill_id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Bill deleted"})


# ============================
# DASHBOARD
# ============================

@app.route("/dashboard", methods=["GET"])
def dashboard():
    conn = db()

    top = conn.execute("""
        SELECT food_name, SUM(quantity) as qty
        FROM billing
        GROUP BY food_name
        ORDER BY qty DESC
        LIMIT 1
    """).fetchone()

    weekly = conn.execute("""
        SELECT DATE(created_at) as day, SUM(total) as revenue
        FROM billing
        WHERE created_at >= DATE('now', '-7 day')
        GROUP BY day
        ORDER BY day
    """).fetchall()

    monthly = conn.execute("""
        SELECT strftime('%Y-%m', created_at) as month, SUM(total) as revenue
        FROM billing
        GROUP BY month
        ORDER BY month
    """).fetchall()

    conn.close()

    return jsonify({
        "top_item": dict(top) if top else None,
        "weekly": [dict(w) for w in weekly],
        "monthly": [dict(m) for m in monthly]
    })


# ============================
# ✅ FORECAST (LightGBM + Events)
# ============================

@app.route("/forecast", methods=["GET"])
def forecast():
    """
    ✅ Forecast with event-based features:
    - Uses last 60 days of billing data.
    - Features: time index, weekday, lags, rolling mean
    - PLUS: event flags and impact score.
    """
    conn = db()

    rows = conn.execute("""
        SELECT food_name, DATE(created_at) as day, SUM(quantity) as qty
        FROM billing
        WHERE created_at >= DATE('now', '-60 day')
        GROUP BY food_name, day
        ORDER BY day
    """).fetchall()

    # ✅ load events map
    events_map = load_event_map(conn)

    conn.close()

    tomorrow = (datetime.now() + timedelta(days=1)).date()
    tomorrow_str = tomorrow.strftime("%Y-%m-%d")

    if not rows:
        return jsonify({"date": tomorrow_str, "forecasts": []})

    df = pd.DataFrame([dict(r) for r in rows])
    df["day"] = pd.to_datetime(df["day"])
    df = df.sort_values(["food_name", "day"]).reset_index(drop=True)

    forecasts = []

    for food_name, g in df.groupby("food_name"):
        g = g.sort_values("day").copy()

        # continuous timeline
        full_days = pd.date_range(g["day"].min(), g["day"].max(), freq="D")
        g = g.set_index("day").reindex(full_days).rename_axis("day").reset_index()
        g["food_name"] = food_name
        g["qty"] = g["qty"].fillna(0)

        # basic features
        g["t"] = np.arange(len(g))
        g["weekday"] = g["day"].dt.weekday
        g["lag1"] = g["qty"].shift(1)
        g["lag2"] = g["qty"].shift(2)
        g["lag3"] = g["qty"].shift(3)
        g["roll7"] = g["qty"].rolling(7).mean()

        # ✅ event-based features
        def event_features(d):
            d_str = pd.to_datetime(d).strftime("%Y-%m-%d")
            e = events_map.get(d_str)
            if not e:
                return pd.Series([0.0, 0, 0, 0, 0])
            return pd.Series([
                float(e.get("impact", 0.0)),
                int(e.get("is_holiday", 0)),
                int(e.get("is_festival", 0)),
                int(e.get("is_exam", 0)),
                int(e.get("is_special_menu", 0)),
            ])

        g[["event_impact", "is_holiday", "is_festival", "is_exam", "is_special_menu"]] = g["day"].apply(event_features)

        g = g.dropna().reset_index(drop=True)

        # fallback for low data
        if len(g) < 15:
            qty_series = g["qty"].values if len(g) else np.array([0.0])
            avg7 = float(np.mean(qty_series[-7:])) if len(qty_series) else 0.0
            predicted = avg7
            confidence = 55
            points = int(len(g))
        else:
            X = g[
                [
                    "t", "weekday", "lag1", "lag2", "lag3", "roll7",
                    "event_impact", "is_holiday", "is_festival", "is_exam", "is_special_menu"
                ]
            ]
            y = g["qty"]

            model = lgb.LGBMRegressor(
                n_estimators=600,
                learning_rate=0.05,
                num_leaves=31,
                subsample=0.9,
                colsample_bytree=0.9,
                reg_lambda=1.0,
                random_state=42,
                verbose=-1
            )

            model.fit(X, y)

            qty_series = g["qty"].values
            avg7 = float(np.mean(qty_series[-7:])) if len(qty_series) >= 7 else float(np.mean(qty_series))

            last_row = g.iloc[-1]
            next_t = int(last_row["t"] + 1)

            lag1 = float(qty_series[-1])
            lag2 = float(qty_series[-2]) if len(qty_series) >= 2 else 0.0
            lag3 = float(qty_series[-3]) if len(qty_series) >= 3 else 0.0
            roll7 = avg7

            # tomorrow event
            e = events_map.get(tomorrow_str, {})
            ev_impact = float(e.get("impact", 0.0))
            is_holiday = int(e.get("is_holiday", 0))
            is_festival = int(e.get("is_festival", 0))
            is_exam = int(e.get("is_exam", 0))
            is_special_menu = int(e.get("is_special_menu", 0))

            X_next = np.array([[
                next_t,
                tomorrow.weekday(),
                lag1, lag2, lag3,
                roll7,
                ev_impact, is_holiday, is_festival, is_exam, is_special_menu
            ]])

            predicted = float(model.predict(X_next)[0])
            predicted = max(0.0, predicted)

            points = int(len(g))
            if points >= 45:
                confidence = 92
            elif points >= 30:
                confidence = 85
            elif points >= 20:
                confidence = 75
            else:
                confidence = 60

        # suggestion logic
        if predicted > avg7 * 1.15:
            suggestion = "Increase"
            tag = "HIGH_DEMAND"
        elif predicted < avg7 * 0.85:
            suggestion = "Reduce"
            tag = "OVERPRODUCTION_RISK"
        else:
            suggestion = "Maintain"
            tag = "STABLE"

        forecasts.append({
            "food_name": food_name,
            "avg_last7_qty": round(float(avg7), 2),
            "predicted_qty": round(float(predicted), 2),
            "confidence": confidence,
            "suggestion": suggestion,
            "tag": tag,
            "history_points": points
        })

    forecasts.sort(key=lambda x: x["predicted_qty"], reverse=True)

    return jsonify({
        "date": tomorrow_str,
        "forecasts": forecasts[:15]
    })


# ============================
# ✅ SAVE FORECAST
# ============================

@app.route("/forecast/save", methods=["POST"])
def forecast_save():
    fc = forecast().json
    forecast_date = fc.get("date")
    forecasts = fc.get("forecasts", [])

    if not forecast_date:
        return jsonify({"message": "forecast_date missing"}), 400
    if not forecasts:
        return jsonify({"message": "No forecasts available to save"}), 400

    conn = db()
    saved, skipped = 0, 0

    for f in forecasts:
        try:
            conn.execute("""
                INSERT INTO forecast_history
                (forecast_date, food_name, avg_last7_qty, predicted_qty, confidence, suggestion, tag, history_points)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                forecast_date,
                f.get("food_name"),
                float(f.get("avg_last7_qty", 0)),
                float(f.get("predicted_qty", 0)),
                int(f.get("confidence", 0)),
                f.get("suggestion", ""),
                f.get("tag", ""),
                int(f.get("history_points", 0))
            ))
            saved += 1
        except:
            skipped += 1

    conn.commit()
    conn.close()

    return jsonify({
        "message": "Forecast save completed",
        "forecast_date": forecast_date,
        "saved": saved,
        "skipped": skipped
    })

@app.route("/demo/seed-forecast-history", methods=["POST"])
def seed_forecast_history():
    """
    Creates demo forecast_history for multiple past days.
    Useful for prototype submission.
    """
    conn = db()

    # take current forecast as template
    fc = forecast().json
    forecasts = fc.get("forecasts", [])

    if not forecasts:
        conn.close()
        return jsonify({"message": "No forecast data available to seed"}), 400

    created = 0
    skipped = 0

    # generate last 30 days demo
    for i in range(30, 0, -1):
        day = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")

        for f in forecasts:
            try:
                conn.execute("""
                    INSERT INTO forecast_history
                    (forecast_date, food_name, avg_last7_qty, predicted_qty, confidence, suggestion, tag, history_points)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    day,
                    f.get("food_name"),
                    float(f.get("avg_last7_qty", 0)),
                    float(f.get("predicted_qty", 0)),
                    int(f.get("confidence", 0)),
                    f.get("suggestion", ""),
                    f.get("tag", ""),
                    int(f.get("history_points", 0))
                ))
                created += 1
            except:
                skipped += 1

    conn.commit()
    conn.close()

    return jsonify({
        "message": "Demo forecast archive seeded ✅",
        "created_rows": created,
        "skipped_rows": skipped
    })

# ============================
# ✅ FORECAST HISTORY
# ============================

@app.route("/forecast/history", methods=["GET"])
def forecast_history():
    conn = db()
    dates = conn.execute("""
        SELECT forecast_date,
               COUNT(*) as items,
               MAX(generated_at) as generated_at
        FROM forecast_history
        GROUP BY forecast_date
        ORDER BY forecast_date DESC
        LIMIT 60
    """).fetchall()
    conn.close()
    return jsonify([dict(d) for d in dates])


@app.route("/forecast/history/<date>", methods=["GET"])
def forecast_history_date(date):
    conn = db()
    rows = conn.execute("""
        SELECT id, forecast_date, generated_at,
               food_name, avg_last7_qty, predicted_qty,
               confidence, suggestion, tag, history_points
        FROM forecast_history
        WHERE forecast_date = ?
        ORDER BY predicted_qty DESC
    """, (date,)).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])



@app.route("/demo/seed-archive-30days", methods=["POST"])
def seed_archive_30days():
    conn = db()
    try:
        # ✅ get foods
        foods = conn.execute("SELECT name FROM foods").fetchall()
        if not foods:
            return jsonify({"ok": False, "message": "No foods found in foods table"}), 400

        food_names = [f["name"] for f in foods]

        # ✅ create 30 days
        base_date = datetime.now().date()

        inserted_days = 0
        inserted_rows = 0

        for i in range(30):
            forecast_date = (base_date - timedelta(days=i)).strftime("%Y-%m-%d")
            generated_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            for food in food_names:
                # realistic demo numbers
                avg7 = random.randint(5, 25)
                predicted = max(0, int(avg7 + random.randint(-4, 6)))

                # tag + suggestion logic
                if predicted >= avg7 + 3:
                    tag = "HIGH_DEMAND"
                    suggestion = "Increase production"
                elif predicted <= max(0, avg7 - 3):
                    tag = "OVERPRODUCTION_RISK"
                    suggestion = "Reduce production"
                else:
                    tag = "NORMAL"
                    suggestion = "Maintain stock"

                confidence = random.randint(70, 96)
                history_points = random.randint(20, 60)

                # ✅ insert with replace to avoid duplicates
                conn.execute("""
                    INSERT OR REPLACE INTO forecast_history (
                        forecast_date, generated_at,
                        food_name, avg_last7_qty, predicted_qty,
                        confidence, suggestion, tag, history_points
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    forecast_date, generated_at,
                    food, float(avg7), float(predicted),
                    int(confidence), suggestion, tag, int(history_points)
                ))

                inserted_rows += 1

            inserted_days += 1

        conn.commit()

        return jsonify({
            "ok": True,
            "message": f"Seeded forecast archive for {inserted_days} days",
            "days": inserted_days,
            "rows": inserted_rows
        })

    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500
    finally:
        conn.close()

# ============================
# ✅ FORECAST EXPORT CSV
# ============================

@app.route("/forecast/export", methods=["GET"])
def forecast_export():
    fc = forecast().json
    forecasts = fc.get("forecasts", [])
    date = fc.get("date", "")

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "date", "food_name", "avg_last7_qty", "predicted_qty",
        "confidence", "suggestion", "tag", "history_points"
    ])

    for f in forecasts:
        writer.writerow([
            date,
            f.get("food_name"),
            f.get("avg_last7_qty"),
            f.get("predicted_qty"),
            f.get("confidence"),
            f.get("suggestion"),
            f.get("tag"),
            f.get("history_points")
        ])

    mem = io.BytesIO()
    mem.write(output.getvalue().encode("utf-8"))
    mem.seek(0)

    return send_file(
        mem,
        mimetype="text/csv",
        as_attachment=True,
        download_name="forecast_report.csv"
    )


# ============================
# ✅ FORECAST ACCURACY
# ============================

@app.route("/forecast/accuracy", methods=["GET"])
def forecast_accuracy():
    conn = db()
    today = datetime.now().strftime("%Y-%m-%d")

    actual_rows = conn.execute("""
        SELECT food_name, SUM(quantity) as qty
        FROM billing
        WHERE DATE(created_at) = DATE('now')
        GROUP BY food_name
    """).fetchall()

    conn.close()

    actual_map = {r["food_name"]: float(r["qty"]) for r in actual_rows}

    fc = forecast().json
    forecasts = fc.get("forecasts", [])

    comparisons, errors = [], []

    for f in forecasts:
        food = f["food_name"]
        predicted = float(f.get("predicted_qty", 0))
        actual = float(actual_map.get(food, 0))

        if predicted <= 0 and actual <= 0:
            err_pct = 0
        elif predicted > 0:
            err_pct = abs(predicted - actual) / predicted * 100
        else:
            err_pct = 100

        errors.append(err_pct)

        comparisons.append({
            "food_name": food,
            "predicted_qty": round(predicted, 2),
            "actual_qty": round(actual, 2),
            "error_percent": round(err_pct, 2),
            "confidence": f.get("confidence", 0),
            "suggestion": f.get("suggestion"),
            "tag": f.get("tag"),
        })

    comparisons.sort(key=lambda x: x["error_percent"], reverse=True)

    avg_error = float(np.mean(errors)) if errors else 0.0
    accuracy_score = max(0.0, round(100.0 - avg_error, 2))

    return jsonify({
        "date": today,
        "accuracy_score": accuracy_score,
        "avg_error_percent": round(avg_error, 2),
        "items": comparisons[:12]
    })


# ============================
# ✅ SMART INSIGHTS
# ============================

@app.route("/smart-insights", methods=["GET"])
def smart_insights():
    fc = forecast().json
    forecasts = fc.get("forecasts", [])

    insights = {"high_demand": [], "waste_risk": [], "stable": []}

    for f in forecasts:
        if f["tag"] == "HIGH_DEMAND":
            insights["high_demand"].append({
                "title": f"Increase {f['food_name']}",
                "message": f"Predicted demand {f['predicted_qty']} vs avg {f['avg_last7_qty']}.",
                "food_name": f["food_name"]
            })
        elif f["tag"] == "OVERPRODUCTION_RISK":
            insights["waste_risk"].append({
                "title": f"Reduce {f['food_name']}",
                "message": f"Demand drop predicted ({f['predicted_qty']}). Risk of overproduction.",
                "food_name": f["food_name"]
            })
        else:
            insights["stable"].append({
                "title": f"Maintain {f['food_name']}",
                "message": "Demand stable based on history.",
                "food_name": f["food_name"]
            })

    return jsonify(insights)


# ============================
# ✅ WASTE COST
# ============================

@app.route("/waste-cost", methods=["GET"])
def waste_cost():
    conn = db()

    fc = forecast().json
    forecasts = fc.get("forecasts", [])

    foods = conn.execute("SELECT name, cost_price FROM foods").fetchall()
    cost_map = {f["name"]: float(f["cost_price"]) for f in foods}

    total_risk_cost = 0.0
    risk_items = []

    for f in forecasts:
        if f["tag"] == "OVERPRODUCTION_RISK":
            cost_price = cost_map.get(f["food_name"], 0.0)
            extra = max(0.0, float(f["avg_last7_qty"]) - float(f["predicted_qty"]))
            loss = extra * cost_price

            total_risk_cost += loss
            risk_items.append({
                "food_name": f["food_name"],
                "extra_units_risk": round(extra, 2),
                "cost_price": cost_price,
                "estimated_loss": round(loss, 2)
            })

    conn.close()

    risk_items.sort(key=lambda x: x["estimated_loss"], reverse=True)

    return jsonify({
        "estimated_waste_cost": round(total_risk_cost, 2),
        "risk_items": risk_items[:10]
    })

import random

@app.route("/demo/seed-billing-30days", methods=["GET","POST"])
def seed_demo_billing_30days():
    """
    Seeds last 30 days billing data for demo purpose.
    Uses foods table prices so totals are correct.
    """

    conn = db()

    foods = conn.execute("SELECT name, price FROM foods ORDER BY name").fetchall()
    if not foods:
        conn.close()
        return jsonify({"message": "No foods found. Add foods first."}), 400

    # ✅ Optional: clear previous billing history (recommended for demo)
    conn.execute("DELETE FROM billing")

    today = datetime.now().date()
    inserted = 0

    # 🔥 more customers on weekends
    for i in range(30):
        day = today - timedelta(days=i)
        weekday = day.weekday()  # 0=Mon ... 6=Sun

        # base customer flow
        if weekday in (5, 6):  # Sat/Sun
            bills_count = random.randint(60, 120)
        else:
            bills_count = random.randint(35, 80)

        for _ in range(bills_count):
            food = random.choice(foods)
            food_name = food["name"]
            unit_price = float(food["price"] or 10)

            # quantity bias (mostly 1 or 2)
            qty = random.choices([1, 2, 3, 4], weights=[60, 25, 10, 5])[0]
            total = round(qty * unit_price, 2)

            # random time during the day
            hour = random.randint(8, 20)
            minute = random.randint(0, 59)
            second = random.randint(0, 59)

            created_at = f"{day} {hour:02d}:{minute:02d}:{second:02d}"

            conn.execute("""
                INSERT INTO billing (food_name, quantity, total, created_at)
                VALUES (?, ?, ?, ?)
            """, (food_name, qty, total, created_at))

            inserted += 1

    conn.commit()
    conn.close()

    return jsonify({
        "message": "✅ Demo billing data created for last 30 days",
        "days": 30,
        "inserted_rows": inserted
    })


# ============================
# ✅ ALERTS
# ============================

@app.route("/alerts", methods=["GET"])
def alerts():
    insights = smart_insights().json
    waste = waste_cost().json

    alerts_list = []

    for item in insights.get("waste_risk", [])[:5]:
        alerts_list.append({
            "type": "waste",
            "severity": "warning",
            "title": item["title"],
            "message": item["message"]
        })

    for item in insights.get("high_demand", [])[:5]:
        alerts_list.append({
            "type": "demand",
            "severity": "info",
            "title": item["title"],
            "message": item["message"]
        })

    alerts_list.insert(0, {
        "type": "cost",
        "severity": "danger" if waste.get("estimated_waste_cost", 0) > 200 else "info",
        "title": "Estimated Waste Cost Risk",
        "message": f"Potential loss: ₹{waste.get('estimated_waste_cost', 0)}"
    })

    return jsonify(alerts_list[:12])

# ============================
# ✅ AI CHATBOT (GEMINI)
# ============================

@app.route("/ai/chat", methods=["POST"])
def ai_chat():
    data = request.json or {}
    message = (data.get("message") or "").strip()
    language = (data.get("language") or "English").strip()

    if not message:
        return jsonify({"reply": "Please type a message"}), 400

    # ✅ fetch project data
    conn = db()
    try:
        today_stats = conn.execute("""
            SELECT 
                IFNULL(SUM(total), 0) as revenue,
                IFNULL(SUM(quantity), 0) as qty
            FROM billing
            WHERE DATE(created_at) = DATE('now')
        """).fetchone()

        top_foods = conn.execute("""
            SELECT food_name, SUM(quantity) as qty
            FROM billing
            WHERE created_at >= DATE('now','-7 day')
            GROUP BY food_name
            ORDER BY qty DESC
            LIMIT 5
        """).fetchall()
    finally:
        conn.close()

    fc = forecast().json
    forecasts = fc.get("forecasts", [])[:8]

    # ✅ BASIC LOCAL RESPONSE (always ready)
    msg = message.lower()

    if "increase" in msg or "tomorrow" in msg:
        inc = [f["food_name"] for f in forecasts if f.get("tag") == "HIGH_DEMAND"]
        return jsonify({"reply": f"✅ Items to increase tomorrow: {', '.join(inc) if inc else 'No high demand items detected'}"})

    if "waste" in msg or "risk" in msg:
        risk = [f["food_name"] for f in forecasts if f.get("tag") == "OVERPRODUCTION_RISK"]
        return jsonify({"reply": f"⚠️ Waste risk items: {', '.join(risk) if risk else 'No waste risk items detected'}"})

    if "revenue" in msg or "sales" in msg:
        return jsonify({"reply": f"📌 Today's Revenue: ₹{float(today_stats['revenue']):.2f}, Total Qty Sold: {int(today_stats['qty'])}"})

    if "top" in msg:
        top = [f"{x['food_name']} ({x['qty']})" for x in top_foods]
        return jsonify({"reply": "🔥 Top selling foods (last 7 days): " + (", ".join(top) if top else "No data")})

    # ✅ Attempt Gemini only if API key exists (optional)
    if GEMINI_API_KEY:
        try:
            context = f"""
You are an AI assistant for a Food Waste Reduction system.

Answer in {language}.

TODAY STATS:
Revenue: ₹{float(today_stats["revenue"] or 0):.2f}
Total quantity sold: {int(today_stats["qty"] or 0)}

TOP SELLING FOODS (Last 7 days):
{[dict(x) for x in top_foods]}

TOMORROW FORECAST:
{forecasts}

Now answer the user query in a short clear way.
"""
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
            payload = {"contents": [{"parts": [{"text": context + "\n\nUser: " + message}]}]}

            r = requests.post(url, json=payload, timeout=20)
            out = r.json()

            reply = (
                out.get("candidates", [{}])[0]
                .get("content", {})
                .get("parts", [{}])[0]
                .get("text", "")
            )
            if reply:
                return jsonify({"reply": reply})

        except:
            pass

    # ✅ fallback default
    return jsonify({
        "reply": "✅ I can answer based on dashboard + billing + forecast data.\nTry: 'top items', 'waste risk', 'increase tomorrow', 'today revenue'."
    })


if __name__ == "__main__":
    app.run(debug=True)
