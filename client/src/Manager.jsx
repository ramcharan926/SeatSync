
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import OrganizerDashboard from "./OrganizerDashboard";
import EventManagement from "./EventManagement";
import TicketVerification from "./TicketVerification";
import RecentBookings from "./RecentBookings";
import Analytics from "./Analytics";
import "./Manager.css";

function Manager() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function handleLogout() {
    sessionStorage.removeItem("managerToken");
    navigate("/manager/login", { replace: true });
  }

  function openSection(section) {
    setActiveSection(section);
    setSidebarOpen(false);
  }

  function goToEvents() {
    openSection("Events");
    setTimeout(() => {
      document.getElementById("event-management")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  }

  const navItems = [
    { label: "Dashboard", icon: "▦" },
    { label: "Events", icon: "▣" },
    { label: "Bookings", icon: "🎟" },
    { label: "Check-ins", icon: "▥" },
    { label: "Analytics", icon: "▤" },
  ];

  return (
    <div className="manager-layout">
      <aside
        className="manager-sidebar"
        style={
          sidebarOpen
            ? {
                display: "flex",
                position: "fixed",
                inset: "0 auto 0 0",
                zIndex: 10,
                height: "100vh",
              }
            : undefined
        }
      >
        <h1 className="manager-brand">
          ✦ Seat<span>Sync</span>
        </h1>

        <nav className="manager-nav">
          {navItems.map((item) => (
            <button
              key={item.label}
              className={activeSection === item.label ? "active" : ""}
              onClick={() => {
                if (item.label === "Events") {
                  goToEvents();
                } else {
                  openSection(item.label);
                }
              }}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <button className="manager-logout" onClick={handleLogout}>
          ⇥ Log Out
        </button>
      </aside>

      <div className="manager-main">
        <header className="manager-topbar">
          <button
            className="manager-mobile-menu"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle navigation"
          >
            ☰
          </button>

          <input
            className="manager-search"
            placeholder="Search events, bookings..."
            onChange={(e) => {
              if (e.target.value.trim()) {
                setActiveSection("Events");
              }
            }}
          />

          <div className="manager-profile">● Manager</div>
        </header>

        <main className="manager-content">
          <section className="manager-welcome">
            <div>
              <h2>Welcome back! 👋</h2>
              <p>
                Track your events, bookings, revenue, and attendance in one
                place.
              </p>
            </div>

            <button
              className="manager-create-button"
              onClick={goToEvents}
            >
              + Create Event
            </button>
          </section>

          {activeSection === "Dashboard" && (
            <>
              <section className="manager-section">
                <OrganizerDashboard />
              </section>
              
             {/* <section className="manager-section">
                <RecentBookings />
              </section> */}

              {/* <section className="manager-section">
                <h2>Upcoming Events & Management</h2>
                <EventManagement />
              </section> */}

              {/* <section className="manager-section">
                <h2>Ticket Verification</h2>
                <TicketVerification />
              </section> */}
            </>
          )}

          {activeSection === "Events" && (
            <section className="manager-section" id="event-management">
              <EventManagement />
            </section>
          )}

          {activeSection === "Bookings" && (
             <section className="manager-section">
              <RecentBookings />
             </section>
           )}

          {activeSection === "Check-ins" && (
            <section className="manager-section">
              <h2>Ticket Check-ins</h2>
              <TicketVerification />
            </section>
          )}

         
           {activeSection === "Analytics" && (
             <section className="manager-section analytics-full-page">
    <Analytics />
            </section>
            )}

        </main>
      </div>
    </div>
  );
}

export default Manager;
