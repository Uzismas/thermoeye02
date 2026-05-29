import Link from "next/link";
import Image from "next/image";
import { clinicalModelVersion } from "../clinical-analysis";
import { navigationItems } from "../mock-data";
import type { SessionUser, ViewId } from "../types";

export function Sidebar({
  activeView,
}: {
  activeView: ViewId;
}) {
  const subnav: Partial<Record<ViewId, string[]>> = {
    governance: ["Data Overview", "Data Sources", "De-identification", "Data Usage Log", "Consent Management"],
    performance: ["Overview", "Performance Metrics", "Calibration", "Error Analysis", "Model Drift", "Version History"],
  };

  return (
    <aside className="side-nav" aria-label="Primary navigation">
      <Link className="brand" href="/console/dashboard" aria-label="Thermoeye dashboard">
        <Image
          className="brand-logo"
          src="/thermoeye-logo.png"
          alt="Thermoeye"
          width={266}
          height={150}
          priority
        />
      </Link>

      <nav className="nav-list" aria-label="Workspace views">
        {navigationItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <div className="nav-group" key={item.id}>
              <Link
                className={`nav-item ${isActive ? "active" : ""}`}
                href={`/console/${item.id}`}
                aria-current={isActive ? "page" : undefined}
              >
                <span className={`nav-icon ${item.icon}`} aria-hidden="true" />
                {item.label}
              </Link>
              {isActive && subnav[item.id] ? (
                <div className="subnav-list" aria-label={`${item.label} sections`}>
                  {subnav[item.id]?.map((label, index) => (
                    <span className={index === 0 ? "active" : ""} key={label}>{label}</span>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>

      <div className="pilot-status" aria-label="Pilot environment status">
        <p>AI Model Status</p>
        <span><i className="status-dot" />Active</span>
        <small>{clinicalModelVersion}</small>
        <small>Last updated: 12 May 2025 02:15 PM</small>
      </div>

      <button className="help-link" type="button">Help &amp; Support</button>
    </aside>
  );
}

export function Topbar({
  onNavigate,
  onAuditExport,
  user,
  onLogout,
}: {
  onNavigate: (viewId: ViewId) => void;
  onAuditExport: () => void;
  user: SessionUser;
  onLogout: () => void;
}) {
  return (
    <header className="topbar">
      <div className="topbar-actions">
        <button className="icon-button notification-button" type="button" aria-label="Notifications">
          <span aria-hidden="true" />
        </button>
        <label className="hospital-picker">
          <span className="visually-hidden">Hospital</span>
          <select aria-label="Select hospital tenant" defaultValue="Bangkok Neurology Hospital">
            <option>Bangkok Neurology Hospital</option>
            <option>All Partner Hospitals</option>
            <option>Chiang Mai Memory Hospital</option>
            <option>Bangkok International Hospital</option>
          </select>
        </label>
        <div className="user-chip" aria-label="Signed in user">
          <span className="avatar" aria-hidden="true">{user.name.slice(0, 1)}</span>
          <strong>Dr. Nattapong</strong>
          <span>
            {user.role === "Doctor" ? "Neurologist" : user.hospital}
          </span>
        </div>
        <button className="ghost-button compact-action" type="button" onClick={onAuditExport}>
          Export audit
        </button>
        <button className="primary-button compact-action" type="button" onClick={() => onNavigate("cases")}>
          New scan
        </button>
        <button className="text-button compact-action" type="button" onClick={onLogout}>
          Sign out
        </button>
      </div>
    </header>
  );
}
