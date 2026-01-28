import { useEffect, useMemo, useState } from "react";
import api from "../api";
import toast from "react-hot-toast";
import "../styles/winnow.css";

import useCountUp from "../hooks/useCountUp";
import useFlashOnChange from "../hooks/useFlashOnChange";

export default function Admin() {
  const heroImg =
    "https://images.unsplash.com/photo-1528712306091-ed0763094c98?auto=format&fit=crop&w=2400&q=80";

  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(false);

  // add food
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");

  // search
  const [query, setQuery] = useState("");

  const loadFoods = async () => {
    try {
      setLoading(true);
      const res = await api.get("/foods");
      setFoods(res.data || []);
    } catch {
      toast.error("Failed to load foods");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFoods();
  }, []);

  const filteredFoods = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return foods;
    return foods.filter((f) =>
      (f.name || "").toLowerCase().includes(q)
    );
  }, [foods, query]);

  // KPIs
  const totalFoods = foods.length;
  const avgPrice = totalFoods
    ? foods.reduce((s, f) => s + Number(f.price || 0), 0) / totalFoods
    : 0;
  const avgCost = totalFoods
    ? foods.reduce((s, f) => s + Number(f.cost_price || 0), 0) / totalFoods
    : 0;

  const totalFoodsAnim = useCountUp(totalFoods, 800);
  const avgPriceAnim = useCountUp(avgPrice, 900);
  const avgCostAnim = useCountUp(avgCost, 900);

  const flashFoods = useFlashOnChange(totalFoods, 650);
  const flashPrice = useFlashOnChange(avgPrice, 650);
  const flashCost = useFlashOnChange(avgCost, 650);

  const addFood = async () => {
    try {
      if (!name.trim() || !price)
        return toast.error("Fill Food name + Price");

      await api.post("/foods", {
        name: name.trim(),
        price: Number(price),
        cost_price: Number(costPrice || 0),
      });

      toast.success("Food added ✅");
      setName("");
      setPrice("");
      setCostPrice("");
      loadFoods();
    } catch {
      toast.error("Food add failed / already exists");
    }
  };

  const updateFood = async (food) => {
    try {
      await api.put(`/foods/${food.id}`, {
        price: Number(food.price || 0),
        cost_price: Number(food.cost_price || 0),
      });
      toast.success("Updated ✅");
      loadFoods();
    } catch {
      toast.error("Update failed");
    }
  };

  const deleteFood = async (id, foodName) => {
    if (!window.confirm(`Delete "${foodName}"?\nThis cannot be undone.`)) return;
    try {
      await api.delete(`/foods/${id}`);
      toast.success("Food deleted");
      loadFoods();
    } catch {
      toast.error("Delete failed");
    }
  };

  const updateLocal = (id, key, value) => {
    const clean = value === "" ? "" : value.replace(/[^0-9.]/g, "");
    setFoods((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [key]: clean } : f))
    );
  };

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
            ADMIN CONTROL PANEL
          </div>

          <h1>Food Management</h1>
          <p>Add / Update / Delete food items.</p>

          <button className="btn btn-ghost" onClick={loadFoods}>
            Refresh Foods
          </button>
        </div>
      </div>

      <div className="page">
        {/* KPI */}
        <div className="dashboard-grid">
          <div className={`card glass kpi ${flashFoods ? "flash" : ""}`}>
            <h3>Total Food Items</h3>
            <p>{Math.round(totalFoodsAnim)}</p>
          </div>

          <div className={`card glass kpi ${flashPrice ? "flash" : ""}`}>
            <h3>Avg Selling Price</h3>
            <p>₹{Math.round(avgPriceAnim)}</p>
          </div>

          <div className={`card glass kpi ${flashCost ? "flash" : ""}`}>
            <h3>Avg Cost Price</h3>
            <p>₹{Math.round(avgCostAnim)}</p>
          </div>
        </div>

        {/* ✅ ADD FOOD – FIXED (NO OVERLAP) */}
        <div className="panel card glass add-food-panel">
          <div className="panel-head">
            <h2>Add Food</h2>
            <span className="muted">Menu configuration</span>
          </div>

          <div className="add-food-grid">
            <div className="field">
              <label className="muted">Food Name</label>
              <input
                placeholder="Eg: Idli"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="field">
              <label className="muted">Selling Price (₹)</label>
              <input
                type="number"
                placeholder="Eg: 10"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>

            <div className="field">
              <label className="muted">Cost Price (₹)</label>
              <input
                type="number"
                placeholder="Eg: 6"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
              />
            </div>

            <div className="field button-field">
              <button className="btn btn-primary" onClick={addFood}>
                Add Food
              </button>
            </div>
          </div>
        </div>

        {/* FOOD LIST */}
        <div className="panel card glass">
          <div className="panel-head">
            <h2>Food List</h2>
            <span className="muted">
              Showing {filteredFoods.length} of {foods.length}
            </span>
          </div>

          <table className="table">
            <colgroup>
              <col style={{ width: "45%" }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: "25%" }} />
            </colgroup>

            <thead>
              <tr>
                <th>Food</th>
                <th style={{ textAlign: "center" }}>Price (₹)</th>
                <th style={{ textAlign: "center" }}>Cost Price (₹)</th>
                <th style={{ textAlign: "center" }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredFoods.map((f) => (
                <tr key={f.id}>
                  <td className="food-cell">{f.name}</td>

                  <td style={{ textAlign: "center" }}>
                    <input
                      className="table-input"
                      type="number"
                      value={f.price}
                      onChange={(e) =>
                        updateLocal(f.id, "price", e.target.value)
                      }
                    />
                  </td>

                  <td style={{ textAlign: "center" }}>
                    <input
                      className="table-input"
                      type="number"
                      value={f.cost_price ?? 0}
                      onChange={(e) =>
                        updateLocal(f.id, "cost_price", e.target.value)
                      }
                    />
                  </td>

                  <td className="actions-cell">
                    <button
                      className="btn btn-primary"
                      onClick={() => updateFood(f)}
                    >
                      Update
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => deleteFood(f.id, f.name)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
