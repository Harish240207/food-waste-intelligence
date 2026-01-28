export default function ProtectedRoute({ user, allow = [], children }) {
  if (!user) {
    return (
      <div className="page">
        <div className="panel card glass">
          <h2>Unauthorized</h2>
          <p className="muted">Please login to continue.</p>
        </div>
      </div>
    );
  }

  if (allow.length > 0 && !allow.includes(user.role)) {
    return (
      <div className="page">
        <div className="panel card glass">
          <h2>Access Denied</h2>
          <p className="muted">
            Your role <b>{user.role}</b> cannot access this page.
          </p>
        </div>
      </div>
    );
  }

  return children;
}
