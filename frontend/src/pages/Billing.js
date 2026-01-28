import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../api";
import toast from "react-hot-toast";
import useCountUp from "../hooks/useCountUp";
import "../styles/winnow.css";

export default function Billing() {
  const heroImg =
    "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=2400&q=80";

  const [foods, setFoods] = useState([]);
  const [selectedFood, setSelectedFood] = useState("");
  const [price, setPrice] = useState(0);
  const [qty, setQty] = useState(1);

  const [bills, setBills] = useState([]);
  const [loadingBills, setLoadingBills] = useState(false);

  // ✅ Add bill loading (prevents double clicks)
  const [adding, setAdding] = useState(false);

  // ✅ flash states (premium KPI highlight)
  const [flashRevenue, setFlashRevenue] = useState(false);
  const [flashSold, setFlashSold] = useState(false);
  const [flashEntries, setFlashEntries] = useState(false);

  // ✅ flash for add bill total button when value changes
  const [flashTotalBtn, setFlashTotalBtn] = useState(false);

  // ✅ select ref for auto-focus
  const foodSelectRef = useRef(null);

  const total = useMemo(
    () => Number(price || 0) * Number(qty || 0),
    [price, qty]
  );

  const loadFoods = async () => {
    try {
      const res = await api.get("/foods");
      setFoods(res.data || []);
    } catch (e) {
      toast.error("Failed to load foods");
    }
  };

  const loadBills = async () => {
    try {
      setLoadingBills(true);
      const res = await api.get("/billing");
      setBills(res.data || []);
    } catch (e) {
      toast.error("Failed to load bills");
    } finally {
      setLoadingBills(false);
    }
  };

  useEffect(() => {
    loadFoods();
    loadBills();

    // ✅ focus food dropdown on page open (POS UX)
    const t = setTimeout(() => {
      foodSelectRef.current?.focus();
    }, 350);
    return () => clearTimeout(t);
  }, []);

  const handleSelect = (e) => {
    const foodName = e.target.value;
    setSelectedFood(foodName);

    const food = foods.find((f) => f.name === foodName);
    setPrice(food ? Number(food.price || 0) : 0);
  };

  const resetForm = () => {
    setQty(1);
    setSelectedFood("");
    setPrice(0);

    // ✅ focus dropdown after reset
    setTimeout(() => {
      foodSelectRef.current?.focus();
    }, 50);
  };

  const addBill = async () => {
    try {
      if (adding) return;
      if (!selectedFood) return toast.error("Select a food item first");

      setAdding(true);

      await api.post("/billing", {
        food_name: selectedFood,
        quantity: qty,
        total: total,
      });

      toast.success("Bill added successfully ✅");

      resetForm();
      await loadBills();
    } catch (e) {
      toast.error("Bill add failed");
    } finally {
      setAdding(false);
    }
  };

  const deleteBill = async (id) => {
    try {
      await api.delete(`/billing/${id}`);
      toast.success("Bill deleted");
      await loadBills();
    } catch (e) {
      toast.error("Delete failed");
    }
  };

  // ✅ Billing totals
  const totalRevenue = useMemo(() => {
    return (bills || []).reduce((sum, b) => sum + Number(b.total || 0), 0);
  }, [bills]);

  const totalItemsSold = useMemo(() => {
    return (bills || []).reduce((sum, b) => sum + Number(b.quantity || 0), 0);
  }, [bills]);

  const revenueAnimated = useCountUp(totalRevenue, 900);
  const soldAnimated = useCountUp(totalItemsSold, 800);

  // ✅ detect KPI changes and flash
  const prevRevenueRef = useRef(null);
  const prevSoldRef = useRef(null);
  const prevEntriesRef = useRef(null);

  useEffect(() => {
    if (
      prevRevenueRef.current !== null &&
      prevRevenueRef.current !== totalRevenue
    ) {
      setFlashRevenue(true);
      const t = setTimeout(() => setFlashRevenue(false), 650);
      return () => clearTimeout(t);
    }
    prevRevenueRef.current = totalRevenue;
  }, [totalRevenue]);

  useEffect(() => {
    if (
      prevSoldRef.current !== null &&
      prevSoldRef.current !== totalItemsSold
    ) {
      setFlashSold(true);
      const t = setTimeout(() => setFlashSold(false), 650);
      return () => clearTimeout(t);
    }
    prevSoldRef.current = totalItemsSold;
  }, [totalItemsSold]);

  useEffect(() => {
    if (prevEntriesRef.current !== null && prevEntriesRef.current !== bills.length) {
      setFlashEntries(true);
      const t = setTimeout(() => setFlashEntries(false), 650);
      return () => clearTimeout(t);
    }
    prevEntriesRef.current = bills.length;
  }, [bills.length]);

  // ✅ flash total button when total changes
  const didMountRef = useRef(false);
  useEffect(() => {
    // avoid flash on first render
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    setFlashTotalBtn(true);
    const t = setTimeout(() => setFlashTotalBtn(false), 450);
    return () => clearTimeout(t);
  }, [total]);

  // ✅ keyboard: Enter to add bill
  const onKeyDownAdd = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addBill();
    }
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
            BILLING SYSTEM
          </div>
          <h1>Billing</h1>
          <p>
            Add food purchase entries. Data is stored and used for analytics &
            demand prediction.
          </p>

          <div className="hero-actions">
            <button className="btn btn-ghost">
              ₹{Math.round(revenueAnimated)} Revenue
            </button>
            <button className="btn btn-ghost">
              {Math.round(soldAnimated)} Items Sold
            </button>

            {/* ✅ useful premium action */}
            <button className="btn btn-primary" onClick={loadBills}>
              Refresh Bills
            </button>
          </div>
        </div>
      </div>

      <div className="page">
        {/* ✅ SUMMARY KPIs */}
        <div className="dashboard-grid">
          <div className={`card glass kpi ${flashRevenue ? "flash" : ""}`}>
            <h3>Total Revenue (Recent)</h3>
            <p>₹{Math.round(revenueAnimated)}</p>
            <small>Based on last 50 bills</small>
          </div>

          <div className={`card glass kpi ${flashSold ? "flash" : ""}`}>
            <h3>Total Items Sold</h3>
            <p>{Math.round(soldAnimated)}</p>
            <small>Sum of quantities</small>
          </div>

          <div className={`card glass kpi ${flashEntries ? "flash" : ""}`}>
            <h3>Bill Entries</h3>
            <p>{bills.length}</p>
            <small>Last 50 entries</small>
          </div>
        </div>

        {/* ADD BILL */}
        <div className="panel card glass">
          <div className="panel-head">
            <h2>Add Billing Entry</h2>
            <span className="muted">POS-style billing</span>
          </div>

          <div className="form-row">
            <div>
              <label className="muted">Food Item</label>
              <select
                ref={foodSelectRef}
                value={selectedFood}
                onChange={handleSelect}
                onKeyDown={onKeyDownAdd}
              >
                <option value="">Select food</option>
                {foods.map((f) => (
                  <option key={f.id} value={f.name}>
                    {f.name} — ₹{f.price}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="muted">Quantity</label>
              <div className="qty-row">
                <button
                  className="qty-btn"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1}
                >
                  −
                </button>

                <div className="qty-pill">{qty}</div>

                <button
                  className="qty-btn"
                  onClick={() => setQty((q) => q + 1)}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 14,
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <button
              className={`btn btn-primary ${flashTotalBtn ? "flash" : ""}`}
              onClick={addBill}
              disabled={adding || !selectedFood}
              title={!selectedFood ? "Select food first" : "Add bill"}
            >
              {adding ? "Adding..." : `Add Bill (₹${Math.round(total)})`}
            </button>

            <button
              className="btn btn-ghost"
              onClick={() => {
                loadFoods();
                toast.success("Foods refreshed");
              }}
            >
              Refresh Foods
            </button>
          </div>
        </div>

        {/* RECENT BILLS */}
        <div className="panel card glass">
          <div className="panel-head">
            <h2>Recent Bills</h2>
            <span className="muted">Last 50 entries</span>
          </div>

          {loadingBills ? (
            <div className="muted">Loading bills...</div>
          ) : bills.length === 0 ? (
            <div className="muted">No bills yet. Add your first bill above.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Food</th>
                  <th>Qty</th>
                  <th>Total</th>
                  <th>Time</th>
                  <th style={{ width: 120 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((b) => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 900 }}>{b.food_name}</td>
                    <td>{b.quantity}</td>
                    <td style={{ fontWeight: 900 }}>₹{b.total}</td>
                    <td className="muted">{b.created_at}</td>
                    <td>
                      <button
                        className="btn btn-danger"
                        style={{ padding: "8px 10px" }}
                        onClick={() => deleteBill(b.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div style={{ marginTop: 12 }}>
            <button className="btn btn-ghost" onClick={loadBills}>
              Refresh Bills
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
