import { useEffect, useMemo, useRef, useState } from "react";
import api from "../api";
import useCountUp from "../hooks/useCountUp";
import useFlashOnChange from "../hooks/useFlashOnChange";
import "../styles/winnow.css";
import AIFloatButton from "../components/AIFloatButton";

export default function Dashboard() {
  const heroImg =
    "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=2400&q=80";

  const [insights, setInsights] = useState({
    high_demand: [],
    waste_risk: [],
    stable: [],
  });

  const [wasteCost, setWasteCost] = useState({
    estimated_waste_cost: 0,
    risk_items: [],
  });

  const [loadingInsights, setLoadingInsights] = useState(false);
  const [loadingWaste, setLoadingWaste] = useState(false);

  const [lastUpdated, setLastUpdated] = useState("");

  const formatNow = () => {
    const d = new Date();
    return d.toLocaleString();
  };

  const loadAll = async () => {
    setLoadingInsights(true);
    setLoadingWaste(true);

    try {
      const [ins, waste] = await Promise.allSettled([
        api.get("/smart-insights"),
        api.get("/waste-cost"),
      ]);

      if (ins.status === "fulfilled") setInsights(ins.value.data);
      if (waste.status === "fulfilled") setWasteCost(waste.value.data);

      setLastUpdated(formatNow());
    } catch {
      // silent
    } finally {
      setLoadingInsights(false);
      setLoadingWaste(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const wasteRiskValue = useMemo(
    () => Number(wasteCost.estimated_waste_cost || 0),
    [wasteCost]
  );

  const highDemandValue = useMemo(
    () => Number(insights.high_demand?.length || 0),
    [insights]
  );

  const wasteRiskItemsValue = useMemo(
    () => Number(insights.waste_risk?.length || 0),
    [insights]
  );

  const wasteRiskAnimated = useCountUp(wasteRiskValue, 1000);
  const highDemandAnimated = useCountUp(highDemandValue, 800);
  const wasteRiskItemsAnimated = useCountUp(wasteRiskItemsValue, 800);

  const flashWasteCost = useFlashOnChange(wasteRiskValue, 650);
  const flashHighDemand = useFlashOnChange(highDemandValue, 650);
  const flashWasteItems = useFlashOnChange(wasteRiskItemsValue, 650);

  const didMount = useRef(false);
  const [heroFlash, setHeroFlash] = useState(false);

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    setHeroFlash(true);
    const t = setTimeout(() => setHeroFlash(false), 650);
    return () => clearTimeout(t);
  }, [wasteRiskValue]);

  const renderInsightItems = (list, emptyText) => {
    if (loadingInsights) return <div className="muted">Loading insights...</div>;
    if (!list || list.length === 0)
      return <div className="muted">{emptyText}</div>;

    return list.slice(0, 5).map((x, i) => (
      <div key={i} className="insight-item">
        <b>{x.title}</b>
        <div className="muted">{x.message}</div>
      </div>
    ));
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
            AI ANALYTICS DASHBOARD
          </div>

          <h1>Food Waste Intelligence</h1>
          <p>
            Billing analytics + smart suggestions to reduce food waste and improve
            hostel/canteen planning.
          </p>

          <div className="hero-actions">
            <button className={`btn btn-ghost ${heroFlash ? "flash" : ""}`}>
              Waste Risk ₹{Math.round(wasteRiskAnimated)}
            </button>

            <button className="btn btn-primary" onClick={loadAll}>
              Refresh Dashboard
            </button>

            <button className="btn btn-ghost">Updated: {lastUpdated || "—"}</button>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="dashboard-grid">
        <div className={`card glass kpi ${flashWasteCost ? "flash" : ""}`}>
          <h3>Waste Cost Risk</h3>
          <p>{loadingWaste ? "…" : `₹${Math.round(wasteRiskAnimated)}`}</p>
          <small>Estimated potential loss</small>
        </div>

        <div className={`card glass kpi ${flashHighDemand ? "flash" : ""}`}>
          <h3>High Demand Items</h3>
          <p>{loadingInsights ? "…" : Math.round(highDemandAnimated)}</p>
          <small>Increase production</small>
        </div>

        <div className={`card glass kpi ${flashWasteItems ? "flash" : ""}`}>
          <h3>Waste Risk Items</h3>
          <p>{loadingInsights ? "…" : Math.round(wasteRiskItemsAnimated)}</p>
          <small>Reduce production</small>
        </div>
      </div>

      {/* Smart Insights */}
      <div className="panel card glass">
        <div className="panel-head">
          <h2>Smart Suggestions</h2>
          <span className="muted">
            {loadingInsights ? "Loading..." : "AI recommendations"}
          </span>
        </div>

        <div className="insights-grid">
          <div className="insight-box">
            <div className="insight-title">🔥 Increase production</div>
            {renderInsightItems(insights.high_demand, "No high demand alerts yet")}
          </div>

          <div className="insight-box">
            <div className="insight-title">⚠ Reduce production (Waste risk)</div>
            {renderInsightItems(insights.waste_risk, "No waste risks detected")}
          </div>
        </div>
      </div>

      {/* ✅ Only floating button */}
      <AIFloatButton />
    </>
  );
}
