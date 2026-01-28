export default function NotificationsDrawer({ open, onClose, alerts = [] }) {
  return (
    <>
      <div className={`drawer ${open ? "open" : ""}`}>
        <div className="drawer-head">
          <div>
            <div style={{ fontWeight: 900, fontSize: 16 }}>Notifications</div>
            <div className="muted">AI alerts & system insights</div>
          </div>

          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="drawer-body">
          {alerts.length === 0 ? (
            <div className="muted">No alerts</div>
          ) : (
            alerts.map((a, idx) => (
              <div key={idx} className="alert-item">
                <div className={`alert-dot ${a.severity || "info"}`} />
                <div style={{ flex: 1 }}>
                  <div className="alert-title">{a.title}</div>
                  <div className="alert-msg">{a.message}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* overlay */}
      {open && <div className="drawer-overlay" onClick={onClose} />}
    </>
  );
}
