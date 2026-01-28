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

/* ✅ Hook-safe row with count-up animation */
function ArchiveRow({ r, badgeClass }) {
  const avgAnim = useCountUp(Number(r.avg_last7_qty || 0), 850);
  const predAnim = useCountUp(Number(r.predicted_qty || 0), 850);

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

export default function ForecastArchive() {
  const heroImg =
    "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=2400&q=80";

  const [historyDates, setHistoryDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [items, setItems] = useState([]);

  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await api.get("/forecast/history");
      const list = res.data || [];
      setHistoryDates(list);

      // ✅ Auto-select latest saved date once
      if (list.length > 0 && !selectedDate) {
        setSelectedDate(list[0].forecast_date);
      }
    } catch (e) {
      toast.error("Failed to load forecast history");
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadByDate = async (date) => {
    if (!date) return;
    try {
      setLoadingItems(true);
      const res = await api.get(`/forecast/history/${date}`);
      setItems(res.data || []);
    } catch (e) {
      toast.error("Failed to load forecast items");
      setItems([]);
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    loadByDate(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // ✅ KPIs
  const totalPredicted = useMemo(() => {
    return (items || []).reduce((sum, r) => sum + Number(r.predicted_qty || 0), 0);
  }, [items]);

  const totalAvg7 = useMemo(() => {
    return (items || []).reduce((sum, r) => sum + Number(r.avg_last7_qty || 0), 0);
  }, [items]);

  const highDemandCount = useMemo(() => {
    return (items || []).filter((x) => x.tag === "HIGH_DEMAND").length;
  }, [items]);

  const riskCount = useMemo(() => {
    return (items || []).filter((x) => x.tag === "OVERPRODUCTION_RISK").length;
  }, [items]);

  const totalPredictedAnim = useCountUp(totalPredicted, 1200);
  const totalAvg7Anim = useCountUp(totalAvg7, 1100);
  const highDemandAnim = useCountUp(highDemandCount, 850);
  const riskAnim = useCountUp(riskCount, 850);

  const flashTotal = useFlashOnChange(totalPredicted, 700);

  const exportSelectedCSV = () => {
    if (!items.length) return toast.error("No data to export");

    try {
      const headers = [
        "forecast_date",
        "generated_at",
        "food_name",
        "avg_last7_qty",
        "predicted_qty",
        "confidence",
        "suggestion",
        "tag",
        "history_points",
      ];

      const escapeCsv = (v) => {
        const s = String(v ?? "");
        const safe = s.split('"').join('""');
        return `"${safe}"`;
      };

      const csv = [
        headers.join(","),
        ...items.map((r) => headers.map((h) => escapeCsv(r[h])).join(",")),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `forecast_${selectedDate || "archive"}.csv`;
      a.click();

      toast.success("Exported archive CSV ✅");
    } catch {
      toast.error("Export failed");
    }
  };

  const saveTodayForecast = async () => {
    try {
      await api.post("/forecast/save");
      toast.success("Forecast saved to history ✅");
      await loadHistory(); // update list
    } catch {
      toast.error("Failed to save forecast");
    }
  };

  const chartData = useMemo(() => {
    return (items || []).slice(0, 10).map((r) => ({
      name: r.food_name,
      predicted: Number(r.predicted_qty || 0),
      avg7: Number(r.avg_last7_qty || 0),
    }));
  }, [items]);

  const selectedMeta = useMemo(() => {
    return historyDates.find((x) => x.forecast_date === selectedDate);
  }, [historyDates, selectedDate]);

  const badgeClass = (tag) => {
    if (tag === "HIGH_DEMAND") return "pill pill-green";
    if (tag === "OVERPRODUCTION_RISK") return "pill pill-red";
    return "pill pill-gray";
  };

  return (
    <>
      {/* HERO */}
      <div className="hero">
        <div className="hero-bgimg" style={{ backgroundImage: `url(${heroImg})` }} />
        <div className="hero-overlay-dark" />

        <div className="hero-box">
          <div className="hero-tag">
            <span className="hero-tag-dot" />
            FORECAST ARCHIVE
          </div>

          <h1>Forecast History</h1>
          <p>
            View saved AI demand predictions by date. This proves your model works
            historically and supports reporting.
          </p>

          <div className="hero-actions">
            <button className="btn btn-primary" onClick={loadHistory}>
              Refresh History
            </button>

            <button className="btn btn-ghost" onClick={saveTodayForecast}>
              Save Today Forecast
            </button>

            <button className="btn btn-ghost" onClick={exportSelectedCSV} disabled={!items.length}>
              Export Selected Day CSV
            </button>

            <button className={`btn btn-ghost ${flashTotal ? "flash" : ""}`} disabled={!items.length}>
              Total Predicted: {Math.round(totalPredictedAnim)} units
            </button>
          </div>
        </div>
      </div>

      <div className="page">
        {/* ✅ KPI Row */}
        <div className="dashboard-grid">
          <div className="card glass kpi">
            <h3>Avg Demand Total</h3>
            <p>{Math.round(totalAvg7Anim)}</p>
            <small>Sum of avg_last7</small>
          </div>

          <div className="card glass kpi">
            <h3>High Demand Items</h3>
            <p>{Math.round(highDemandAnim)}</p>
            <small>Increase suggestion</small>
          </div>

          <div className="card glass kpi">
            <h3>Waste Risk Items</h3>
            <p>{Math.round(riskAnim)}</p>
            <small>Reduce suggestion</small>
          </div>
        </div>

        {/* DATE SELECT */}
        <div className="panel card glass">
          <div className="panel-head">
            <h2>Select Saved Forecast Date</h2>
            <span className="muted">
              {loadingHistory
                ? "Loading..."
                : historyDates.length
                ? `${historyDates.length} saved days`
                : "No saved forecasts"}
            </span>
          </div>

          {historyDates.length === 0 ? (
            <div className="muted">
              No archived forecasts yet. Click <b>Save Today Forecast</b> to
              permanently store today’s forecast.
            </div>
          ) : (
            <div className="form-row archive-date-row">
              <div>
                <label className="muted">Saved Dates</label>
                <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}>
                  {historyDates.map((d) => (
                    <option key={d.forecast_date} value={d.forecast_date}>
                      {d.forecast_date} (items: {d.items})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="muted">Generated At</label>
                <input value={selectedMeta?.generated_at || ""} readOnly />
              </div>
            </div>
          )}
        </div>

        {/* CHART */}
        <div className="panel card glass">
          <div className="panel-head">
            <h2>Archive Chart</h2>
            <span className="muted">{selectedDate ? `Forecast for: ${selectedDate}` : "—"}</span>
          </div>

          {loadingItems ? (
            <div className="muted">Loading chart...</div>
          ) : chartData.length === 0 ? (
            <div className="muted">No data available for this date.</div>
          ) : (
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barGap={8}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }} />
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
                    labelStyle={{ color: "rgba(246,211,101,0.95)", fontWeight: 900 }}
                  />
                  <Bar dataKey="avg7" radius={[10, 10, 0, 0]} />
                  <Bar dataKey="predicted" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* TABLE */}
        <div className="panel card glass">
          <div className="panel-head">
            <h2>Archived Forecast Table</h2>
            <span className="muted">{items.length ? `${items.length} items` : "No items"}</span>
          </div>

          {loadingItems ? (
            <div className="muted">Loading table...</div>
          ) : items.length === 0 ? (
            <div className="muted">No saved forecast for this date.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Food</th>
                  <th>Avg7</th>
                  <th>Predicted</th>
                  <th>Suggestion</th>
                  <th>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <ArchiveRow
                    key={`${r.id}-${r.food_name}`}
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
