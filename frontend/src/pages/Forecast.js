import { useEffect, useMemo, useState } from "react";
import api from "../api";
import toast from "react-hot-toast";
import "../styles/winnow.css";

import useCountUp from "../hooks/useCountUp";
import useFlashOnChange from "../hooks/useFlashOnChange";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

/* ✅ Forecast row component (Hooks legal) */
function ForecastRow({ r, badgeClass }) {
  const predAnim = useCountUp(Number(r.predicted_qty || 0), 900);
  const avgAnim = useCountUp(Number(r.avg_last7_qty || 0), 900);

  return (
    <tr>
      <td style={{ fontWeight: 900 }}>{r.food_name}</td>
      <td>{Math.round(avgAnim)}</td>
      <td style={{ fontWeight: 900 }}>{Math.round(predAnim)}</td>
      <td>
        <span className={badgeClass(r.tag)}>{r.suggestion}</span>
      </td>
      <td>
        <div className="conf">
          <div className="conf-bar" style={{ width: `${r.confidence}%` }} />
          <span className="conf-text">{r.confidence}%</span>
        </div>
      </td>
    </tr>
  );
}

/* ✅ Accuracy table row component (Hooks legal) */
function AccuracyRow({ x, badgeClass }) {
  const predAnim = useCountUp(Number(x.predicted_qty || 0), 700);
  const actAnim = useCountUp(Number(x.actual_qty || 0), 700);

  return (
    <tr>
      <td style={{ fontWeight: 900 }}>{x.food_name}</td>
      <td>{Math.round(predAnim)}</td>
      <td>{Math.round(actAnim)}</td>
      <td style={{ fontWeight: 900 }}>{x.error_percent}%</td>
      <td>
        <span className={badgeClass(x.tag)}>{x.suggestion}</span>
      </td>
    </tr>
  );
}

export default function Forecast() {
  const heroImg =
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=2400&q=80";

  const [date, setDate] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // accuracy
  const [accuracy, setAccuracy] = useState(null);
  const [loadingAcc, setLoadingAcc] = useState(false);

  const loadForecast = async () => {
    try {
      setLoading(true);
      const res = await api.get("/forecast");
      setDate(res.data?.date || "");
      setRows(res.data?.forecasts || []);
    } catch (e) {
      toast.error("Forecast load failed");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAccuracy = async () => {
    try {
      setLoadingAcc(true);
      const res = await api.get("/forecast/accuracy");
      setAccuracy(res.data);
    } catch (e) {
      toast.error("Accuracy load failed");
      setAccuracy(null);
    } finally {
      setLoadingAcc(false);
    }
  };

  const refreshAll = async () => {
    try {
      await Promise.all([loadForecast(), loadAccuracy()]);
      toast.success("Forecast refreshed ✅");
    } catch {
      // silent
    }
  };

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveTodayForecast = async () => {
    try {
      await api.post("/forecast/save");
      toast.success("Forecast saved to history ✅");
    } catch {
      toast.error("Failed to save forecast");
    }
  };

  const exportCSV = async () => {
    try {
      const res = await api.get("/forecast/export", { responseType: "blob" });
      const blob = new Blob([res.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "forecast_report.csv";
      a.click();
      toast.success("Forecast report exported ✅");
    } catch {
      toast.error("Export failed");
    }
  };

  const badgeClass = (tag) => {
    if (tag === "HIGH_DEMAND") return "pill pill-green";
    if (tag === "OVERPRODUCTION_RISK") return "pill pill-red";
    return "pill pill-gray";
  };

  const chartData = useMemo(() => {
    return (rows || []).slice(0, 10).map((r) => ({
      name: r.food_name,
      predicted: Number(r.predicted_qty || 0),
      avg7: Number(r.avg_last7_qty || 0),
    }));
  }, [rows]);

  const summary = useMemo(() => {
    const s = { increase: 0, reduce: 0, maintain: 0 };
    (rows || []).forEach((r) => {
      if (r.suggestion === "Increase") s.increase++;
      else if (r.suggestion === "Reduce") s.reduce++;
      else s.maintain++;
    });
    return s;
  }, [rows]);

  // ✅ Total predicted qty
  const totalPredicted = useMemo(() => {
    return (rows || []).reduce((sum, r) => sum + Number(r.predicted_qty || 0), 0);
  }, [rows]);

  // ✅ Count-up KPI values
  const increaseAnim = useCountUp(summary.increase, 800);
  const reduceAnim = useCountUp(summary.reduce, 800);
  const accuracyAnim = useCountUp(accuracy?.accuracy_score || 0, 900);
  const totalPredictedAnim = useCountUp(totalPredicted, 1200);

  // ✅ Flash highlight when KPI changes
  const flashInc = useFlashOnChange(summary.increase, 650);
  const flashRed = useFlashOnChange(summary.reduce, 650);
  const flashAcc = useFlashOnChange(accuracy?.accuracy_score || 0, 650);
  const flashPred = useFlashOnChange(totalPredicted, 700);

  return (
    <>
      {/* HERO */}
      <div className="hero">
        <div
          className="hero-bgimg"
          style={{ backgroundImage: `url(${heroImg})` }}
        />
        <div className="hero-overlay-dark" />

        <div className="hero-box">
          <div className="hero-tag">
            <span className="hero-tag-dot" />
            AI DEMAND FORECAST
          </div>

          <h1>Forecast & Accuracy</h1>
          <p>
            Tomorrow forecast + smart actions. Also measures forecast accuracy using
            today’s actual billing.
          </p>

          <div className="hero-actions">
            <button
              className="btn btn-primary"
              onClick={refreshAll}
              disabled={loading || loadingAcc}
            >
              {loading || loadingAcc ? "Refreshing..." : "Refresh"}
            </button>

            <button className="btn btn-ghost" onClick={saveTodayForecast}>
              Save Today Forecast
            </button>

            <button className="btn btn-ghost" onClick={exportCSV}>
              Export Forecast CSV
            </button>

            <button className="btn btn-ghost" disabled>
              Forecast Date: {date || "—"}
            </button>

            <button
              className={`btn btn-ghost ${flashPred ? "flash" : ""}`}
              disabled={!rows.length}
            >
              Total Predicted: {Math.round(totalPredictedAnim)} units
            </button>
          </div>
        </div>
      </div>

      <div className="page">
        {/* ✅ KPI row */}
        <div className="dashboard-grid">
          <div className={`card glass kpi ${flashInc ? "flash" : ""}`}>
            <h3>Increase Items</h3>
            <p>{Math.round(increaseAnim)}</p>
            <small>High demand predicted</small>
          </div>

          <div className={`card glass kpi ${flashRed ? "flash" : ""}`}>
            <h3>Reduce Items</h3>
            <p>{Math.round(reduceAnim)}</p>
            <small>Overproduction risk</small>
          </div>

          <div className={`card glass kpi ${flashAcc ? "flash" : ""}`}>
            <h3>Forecast Accuracy</h3>
            <p>{accuracy ? `${Math.round(accuracyAnim)}%` : "—"}</p>
            <small>Auto computed</small>
          </div>
        </div>

        {/* ✅ Accuracy Panel */}
        <div className="panel card glass">
          <div className="panel-head">
            <h2>Forecast vs Actual (Today)</h2>
            <span className="muted">
              {loadingAcc
                ? "Loading..."
                : accuracy
                ? `Avg error: ${accuracy.avg_error_percent}%`
                : "No data yet"}
            </span>
          </div>

          {!accuracy || !accuracy.items || accuracy.items.length === 0 ? (
            <div className="muted">
              No billing data today. Add bills and refresh to see accuracy.
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Food</th>
                  <th>Predicted</th>
                  <th>Actual</th>
                  <th>Error %</th>
                  <th>Suggestion</th>
                </tr>
              </thead>
              <tbody>
                {accuracy.items.map((x, idx) => (
                  <AccuracyRow
                    key={`${x.food_name}-${x.tag}-${idx}`}
                    x={x}
                    badgeClass={badgeClass}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ✅ CHART */}
        <div className="panel card glass">
          <div className="panel-head">
            <h2>Predicted vs Average Demand</h2>
            <span className="muted">Top 10 items</span>
          </div>

          {loading ? (
            <div className="muted">Loading chart...</div>
          ) : chartData.length === 0 ? (
            <div className="muted">
              No forecast data yet. Add bills first, then refresh.
            </div>
          ) : (
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barGap={8}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }}
                  />
                  <YAxis
                    tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(10,12,16,0.88)",
                      border: "1px solid rgba(246,211,101,0.18)",
                      borderRadius: 14,
                      backdropFilter: "blur(12px)",
                      color: "rgba(255,255,255,0.92)",
                      fontWeight: 800,
                    }}
                    itemStyle={{ color: "rgba(255,255,255,0.9)" }}
                    labelStyle={{
                      color: "rgba(246,211,101,0.95)",
                      fontWeight: 900,
                    }}
                  />
                  <Bar dataKey="avg7" radius={[10, 10, 0, 0]} />
                  <Bar dataKey="predicted" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ✅ FORECAST TABLE */}
        <div className="panel card glass">
          <div className="panel-head">
            <h2>Forecast Table</h2>
            <span className="muted">Top 15 predictions</span>
          </div>

          {loading ? (
            <div className="muted">Loading forecast...</div>
          ) : rows.length === 0 ? (
            <div className="muted">No forecast data yet. Add bills and refresh.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Food</th>
                  <th>Avg (last 7)</th>
                  <th>Predicted</th>
                  <th>Suggestion</th>
                  <th>Confidence</th>
                </tr>
              </thead>

              <tbody>
                {rows.slice(0, 15).map((r, idx) => (
                  <ForecastRow
                    key={`${r.food_name}-${r.tag}-${idx}`}
                    r={r}
                    badgeClass={badgeClass}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
