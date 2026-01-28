import api from "../api";
import toast from "react-hot-toast";
import "../styles/winnow.css";

export default function Reports() {
  const heroImg =
    "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=2400&q=80";

  const downloadCSV = async () => {
    try {
      const res = await api.get("/reports/export", { responseType: "blob" });
      const blob = new Blob([res.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "canteen_report.csv";
      a.click();
      toast.success("Report exported");
    } catch (e) {
      toast.error("Export failed");
    }
  };

  return (
    <>
      <div className="hero">
        <div className="hero-bgimg" style={{ backgroundImage: `url(${heroImg})` }} />
        <div className="hero-overlay-dark" />

        <div className="hero-box">
          <div className="hero-tag">
            <span className="hero-tag-dot" />
            REPORTING SUITE
          </div>

          <h1>Reports & Export</h1>
          <p>
            Export billing & analytics reports for management review. Works like
            real SaaS dashboards.
          </p>

          <div className="hero-actions">
            <button className="btn btn-primary" onClick={downloadCSV}>
              Export CSV (Excel)
            </button>
            <button className="btn btn-ghost">Last 30 Days</button>
          </div>
        </div>
      </div>

      <div className="page">
        <div className="panel card glass">
          <div className="panel-head">
            <h2>What’s included</h2>
            <span className="muted">Operational export</span>
          </div>

          <ul className="muted" style={{ lineHeight: 1.8, margin: 0, paddingLeft: 18 }}>
            <li>Billing history (last 30 days)</li>
            <li>Food items sold with time stamp</li>
            <li>Revenue totals</li>
            <li>Can be used to create management reports</li>
          </ul>
        </div>
      </div>
    </>
  );
}
