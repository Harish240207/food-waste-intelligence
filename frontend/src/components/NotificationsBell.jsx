export default function NotificationsBell({ count = 0, onClick }) {
  return (
    <button className="bell" onClick={onClick} title="Notifications">
      🔔
      {count > 0 && <span className="bell-badge">{count}</span>}
    </button>
  );
}
