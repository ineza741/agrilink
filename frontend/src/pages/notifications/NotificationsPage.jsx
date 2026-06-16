import {
  AlertTriangle,
  Bell,
  Bug,
  CalendarDays,
  CheckCircle2,
  Mail,
  MessageSquareText,
  RadioTower,
  Tractor,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFarmerData } from "../../context/FarmerDataContext";

const NOTIFICATION_STORAGE_KEY = "agri-feed-notification-module-v1";

function loadStoredState() {
  try {
    return JSON.parse(localStorage.getItem(NOTIFICATION_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveStoredState(state) {
  localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(state));
}

function createBaseNotifications(farmName) {
  return [
    {
      id: "critical-moisture",
      category: "weather",
      severity: "critical",
      title: `Critical: Low Soil Moisture in ${farmName}`,
      body: "Moisture levels have dropped below the irrigation threshold. Trigger an evening irrigation cycle within the next 12 hours.",
      time: "2 mins ago",
      channels: ["in-app", "sms", "email"],
      read: false,
      confirmed: false,
      summary: false,
    },
    {
      id: "pest-warning",
      category: "pests",
      severity: "warning",
      title: "Warning: High Pest Risk Detected",
      body: "Local humidity and canopy conditions favor aphid migration over the next 48 hours. Inspect edge rows before spraying.",
      time: "1 hour ago",
      channels: ["in-app", "email"],
      read: false,
      confirmed: false,
      summary: false,
    },
    {
      id: "market-report",
      category: "market",
      severity: "info",
      title: "Market Update: Wholesale Buyers Active",
      body: "Regional grain buyers are offering improved collection rates for deliveries above 5 tons this week.",
      time: "4 hours ago",
      channels: ["in-app", "email"],
      read: true,
      confirmed: false,
      summary: false,
    },
    {
      id: "weekly-summary",
      category: "system",
      severity: "report",
      title: "Scheduled Weekly Summary Ready",
      body: "Your analytics digest for the week has been generated. Review it in the Analytics & Reports module.",
      time: "Today, 06:00",
      channels: ["email", "in-app"],
      read: true,
      confirmed: true,
      summary: true,
    },
  ];
}

function alertIcon(category, severity) {
  if (severity === "critical") return AlertTriangle;
  if (category === "pests") return Bug;
  if (category === "market") return Bell;
  return CalendarDays;
}

function channelLabel(channel) {
  if (channel === "sms") return "SMS";
  if (channel === "email") return "Email";
  return "In-App";
}

export function NotificationsPage() {  const { currentFarms } = useFarmerData();  const farmName = currentFarms[0]?.name || "your farm";
  const stored = useMemo(() => loadStoredState(), []);
  const [activeTab, setActiveTab] = useState(stored.activeTab || "inbox");
  const [deliveryOptions, setDeliveryOptions] = useState(
    stored.deliveryOptions || {
      email: true,
      sms: false,
      push: true,
      scheduledSummary: true,
    }
  );
  const [notifications, setNotifications] = useState(stored.notifications || createBaseNotifications(farmName));

  useEffect(() => {
    saveStoredState({ activeTab, deliveryOptions, notifications });
  }, [activeTab, deliveryOptions, notifications]);

  useEffect(() => {
    if (!stored.notifications) {
      setNotifications(createBaseNotifications(farmName));
    }
  }, [farmName, stored.notifications]);

  const sortedNotifications = useMemo(() => {
    const priority = { critical: 0, warning: 1, info: 2, report: 3 };
    return [...notifications].sort((left, right) => {
      const severityDiff = priority[left.severity] - priority[right.severity];
      if (severityDiff !== 0) return severityDiff;
      return Number(left.read) - Number(right.read);
    });
  }, [notifications]);

  const inboxItems = sortedNotifications.filter((item) => !item.read || item.severity === "critical");
  const historyItems = sortedNotifications.filter((item) => item.read || item.confirmed);
  const unreadCount = notifications.filter((item) => !item.read).length;
  const criticalCount = notifications.filter((item) => item.severity === "critical").length;
  const warningCount = notifications.filter((item) => item.severity === "warning").length;
  const systemCount = notifications.filter((item) => item.category === "system").length;

  const markAllAsRead = () => {
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
  };

  const toggleOption = (key) => {
    setDeliveryOptions((current) => ({ ...current, [key]: !current[key] }));
  };

  const confirmAlert = (id) => {
    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, confirmed: true, read: true } : item))
    );
  };

  const dismissAlert = (id) => {
    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
  };

  const activeList = activeTab === "history" ? historyItems : inboxItems;

  return (
    <section className="management-page prototype-alert-page">`r`n      <div className="prototype-alert-main standalone">
          <div className="page-title-block prototype-alert-title">
            <h1>Notification &amp; Alert Center</h1>
            <p>Monitor weather, pest, market, and system alerts with smart prioritization and multi-channel delivery.</p>
          </div>

          <div className="prototype-alert-tabs">
            <button type="button" className={activeTab === "inbox" ? "active" : ""} onClick={() => setActiveTab("inbox")}>
              Current Inbox
            </button>
            <button type="button" className={activeTab === "history" ? "active" : ""} onClick={() => setActiveTab("history")}>
              Alert History
            </button>
            <button type="button" className={activeTab === "preferences" ? "active" : ""} onClick={() => setActiveTab("preferences")}>
              Preferences
            </button>
          </div>

          <div className="prototype-alert-grid">
            <div className="prototype-alert-main-column">
              <div className="prototype-alert-list-head">
                <h2>{activeTab === "history" ? "Alert History Log" : `Unread Messages (${unreadCount})`}</h2>
                <button type="button" onClick={markAllAsRead}>Mark all as read</button>
              </div>

              <div className="prototype-alert-list">
                {activeList.map((alert) => {
                  const Icon = alertIcon(alert.category, alert.severity);
                  return (
                    <article key={alert.id} className="prototype-panel prototype-alert-card functional">
                      <div className="prototype-alert-card-top">
                        <div className={`prototype-alert-icon ${alert.severity}`}>
                          <Icon size={18} />
                        </div>
                        <div className="prototype-alert-copy">
                          <div className="prototype-alert-copy-head">
                            <h3>{alert.title}</h3>
                            <span>{alert.time}</span>
                          </div>
                          <p>{alert.body}</p>
                          <div className="prototype-alert-channel-row">
                            {alert.channels.map((channel) => (
                              <span key={channel} className="prototype-alert-channel-chip">
                                {channelLabel(channel)}
                              </span>
                            ))}
                            {alert.confirmed ? (
                              <span className="prototype-alert-confirmed-chip">
                                <CheckCircle2 size={14} />
                                <span>Confirmed</span>
                              </span>
                            ) : null}
                          </div>

                          {activeTab !== "history" ? (
                            <div className="prototype-alert-actions">
                              {alert.severity === "critical" ? (
                                <button type="button" className="prototype-alert-action primary" onClick={() => confirmAlert(alert.id)}>
                                  Confirm Receipt
                                </button>
                              ) : null}
                              <button type="button" className="prototype-alert-action" onClick={() => dismissAlert(alert.id)}>
                                {alert.read ? "Archive" : "Mark Read"}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            <aside className="prototype-alert-side-column">
              <article className="prototype-panel prototype-alert-preferences">
                <div className="prototype-alert-section-head">
                  <h2>Delivery Preferences</h2>
                </div>

                <div className="prototype-alert-toggle-list">
                  <div className="prototype-alert-toggle-row">
                    <div>
                      <strong>Email Alerts</strong>
                      <span>Weekly digests and critical alerts</span>
                    </div>
                    <button
                      type="button"
                      className={deliveryOptions.email ? "prototype-alert-toggle enabled" : "prototype-alert-toggle"}
                      aria-label="Email Alerts"
                      onClick={() => toggleOption("email")}
                    >
                      <i />
                    </button>
                  </div>

                  <div className="prototype-alert-toggle-row">
                    <div>
                      <strong>SMS Notifications</strong>
                      <span>High-severity warnings and confirmed field alerts</span>
                    </div>
                    <button
                      type="button"
                      className={deliveryOptions.sms ? "prototype-alert-toggle enabled" : "prototype-alert-toggle"}
                      aria-label="SMS Notifications"
                      onClick={() => toggleOption("sms")}
                    >
                      <i />
                    </button>
                  </div>

                  <div className="prototype-alert-toggle-row">
                    <div>
                      <strong>Push Notifications</strong>
                      <span>Real-time in-app delivery across connected devices</span>
                    </div>
                    <button
                      type="button"
                      className={deliveryOptions.push ? "prototype-alert-toggle enabled" : "prototype-alert-toggle"}
                      aria-label="Push Notifications"
                      onClick={() => toggleOption("push")}
                    >
                      <i />
                    </button>
                  </div>

                  <div className="prototype-alert-toggle-row">
                    <div>
                      <strong>Scheduled Summary Reports</strong>
                      <span>Morning brief with weather, market, and system summaries</span>
                    </div>
                    <button
                      type="button"
                      className={deliveryOptions.scheduledSummary ? "prototype-alert-toggle enabled" : "prototype-alert-toggle"}
                      aria-label="Scheduled Summary Reports"
                      onClick={() => toggleOption("scheduledSummary")}
                    >
                      <i />
                    </button>
                  </div>
                </div>

                <button type="button" className="prototype-alert-save-button">Save Settings</button>
              </article>

              <article className="prototype-panel prototype-alert-log">
                <h3>Activity Log (24h)</h3>
                <div className="prototype-alert-log-list">
                  <div className="prototype-alert-log-row">
                    <i className="red" />
                    <span>{criticalCount} Critical Alerts</span>
                  </div>
                  <div className="prototype-alert-log-row">
                    <i className="orange" />
                    <span>{warningCount} Warnings in Queue</span>
                  </div>
                  <div className="prototype-alert-log-row">
                    <i className="blue" />
                    <span>{systemCount} System Summaries</span>
                  </div>
                </div>
              </article>

              <article className="prototype-panel prototype-alert-channel-card">
                <div className="prototype-alert-channel-head">
                  <MessageSquareText size={18} />
                  <h3>Channel Coverage</h3>
                </div>
                <div className="prototype-alert-channel-grid">
                  <div>
                    <Mail size={18} />
                    <strong>Email</strong>
                    <span>{deliveryOptions.email ? "Enabled" : "Paused"}</span>
                  </div>
                  <div>
                    <Bell size={18} />
                    <strong>In-App</strong>
                    <span>Always Active</span>
                  </div>
                  <div>
                    <RadioTower size={18} />
                    <strong>SMS</strong>
                    <span>{deliveryOptions.sms ? "Enabled" : "Paused"}</span>
                  </div>
                </div>
              </article>

              <article className="prototype-alert-promo">
                <div className="prototype-alert-promo-image" />
                <div className="prototype-alert-promo-copy">
                  <strong>Mastering AI Alerts</strong>
                  <p>Learn how to customize thresholds and summaries for sharper field response times.</p>
                </div>
              </article>
            </aside>
          </div>
      </div>
    </section>
  );
}

