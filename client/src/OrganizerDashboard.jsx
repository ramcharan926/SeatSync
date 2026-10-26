
import { useEffect, useState } from "react";
import "./OrganizerDashboard.css";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const API_URL = "http://localhost:5000";

function OrganizerDashboard() {
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [events, setEvents] = useState([]);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchDashboard() {
    setLoading(true);
    setError("");

    const token = sessionStorage.getItem("managerToken");

    if (!token) {
      setError("Please log in as manager.");
      setLoading(false);
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [statsRes, bookingsRes, eventsRes, trendsRes] =
        await Promise.all([
          fetch(`${API_URL}/api/organizer/dashboard`, { headers }),
          fetch(`${API_URL}/api/manager/bookings`, { headers }),
          fetch(`${API_URL}/api/events`),
          fetch(`${API_URL}/api/manager/booking-trends`, { headers }),
        ]);

      const [statsData, bookingsData, eventsData, trendsData] =
        await Promise.all([
          statsRes.json(),
          bookingsRes.json(),
          eventsRes.json(),
          trendsRes.json(),
        ]);

      if (!statsRes.ok) {
        throw new Error(statsData.message || "Failed to load dashboard.");
      }
      if (!bookingsRes.ok) {
        throw new Error(bookingsData.message || "Failed to load bookings.");
      }
      if (!eventsRes.ok) {
        throw new Error(eventsData.message || "Failed to load events.");
      }
      if (!trendsRes.ok) {
        throw new Error(trendsData.message || "Failed to load booking trends.");
      }

      setStats(statsData);
      setBookings(
        Array.isArray(bookingsData)
          ? bookingsData
          : bookingsData.bookings || []
      );
      setEvents(Array.isArray(eventsData) ? eventsData : []);
      setTrends(Array.isArray(trendsData) ? trendsData : []);
    } catch (err) {
      setError(err.message || "Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDashboard();
  }, []);

  const cards = stats
    ? [
        {
          label: "Total Events",
          value: stats.totalEvents,
          icon: "▦",
          color: "blue",
        },
        {
          label: "Total Bookings",
          value: stats.totalBookings,
          icon: "▤",
          color: "pink",
        },
        {
          label: "Tickets Sold",
          value: stats.totalTicketsSold,
          icon: "♟",
          color: "purple",
        },
        {
          label: "Total Revenue",
          value: `₹${Number(stats.totalRevenue).toLocaleString("en-IN")}`,
          icon: "₹",
          color: "green",
        },
      ]
    : [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingEvents = events
    .filter((event) => new Date(event.date) >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 2);

  const checkedIn = Number(stats?.checkedInTickets || 0);
  const totalTickets = Number(stats?.totalTicketsSold || 0);
  const pending = Math.max(0, totalTickets - checkedIn);
  const recentBookings = bookings.slice(0, 5);

  const chartTooltipStyle = {
    backgroundColor: "#101a31",
    border: "1px solid #344263",
    borderRadius: "10px",
    color: "#f4f6ff",
  };

  const hasRevenueTrend = trends.some(
    (item) => typeof item.revenue === "number"
  );

  return (
    <main className="organizer-dashboard">
      <header className="dashboard-heading">
        <div>
          <h1>Welcome back, Ram! 👋</h1>
          <p className="dashboard-subtitle">
            Track your events, bookings, revenue, and attendance in one place.
          </p>
        </div>

        <button
          className="dashboard-refresh"
          onClick={fetchDashboard}
          disabled={loading}
        >
          {loading ? "Loading..." : "+ Refresh Dashboard"}
        </button>
      </header>

      {error && <p className="dashboard-error">{error}</p>}
      {loading && <p className="dashboard-loading">Loading dashboard data...</p>}

      {stats && !loading && (
        <>
          <section className="dashboard-stats">
            {cards.map((card) => (
              <article className={`stat-card ${card.color}`} key={card.label}>
                <span className="stat-icon">{card.icon}</span>
                <div>
                  <p className="stat-label">{card.label}</p>
                  <p className="stat-value">{card.value ?? 0}</p>
                </div>
              </article>
            ))}
          </section>

          <section className="dashboard-middle">
            <article className="dashboard-panel trend-panel">
              <div className="panel-heading">
                <h2>Bookings &amp; Revenue Trend</h2>
                <span className="analytics-live">● Live Data</span>
              </div>

              {trends.length === 0 ? (
                <p className="panel-subtitle">
                  No booking trend data available yet.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart
                    data={trends}
                    margin={{ top: 12, right: 12, left: -15, bottom: 5 }}
                  >
                    <CartesianGrid
                      stroke="#293653"
                      strokeDasharray="4 5"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#a5b2d3", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="bookings"
                      allowDecimals={false}
                      tick={{ fill: "#a5b2d3", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    {hasRevenueTrend && (
                      <YAxis
                        yAxisId="revenue"
                        orientation="right"
                        tick={{ fill: "#a5b2d3", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                    )}
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Legend />
                    <Line
                      yAxisId="bookings"
                      type="monotone"
                      dataKey="bookings"
                      name="Bookings"
                      stroke="#8b7cff"
                      strokeWidth={3}
                      connectNulls
                      dot={{ r: 3, fill: "#8b7cff" }}
                      activeDot={{ r: 6 }}
                    />
                    {hasRevenueTrend && (
                      <Line
                        yAxisId="revenue"
                        type="monotone"
                        dataKey="revenue"
                        name="Revenue (₹)"
                        stroke="#3984ff"
                        strokeWidth={3}
                        connectNulls
                        dot={{ r: 3, fill: "#3984ff" }}
                        activeDot={{ r: 6 }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              )}

              {!hasRevenueTrend && trends.length > 0 && (
                <p className="panel-subtitle">
                  Daily revenue will appear when the trend API provides revenue values.
                </p>
              )}
            </article>

            <article className="dashboard-panel ticket-panel">
              <h2>Ticket Status</h2>
              <div className="ticket-summary">
                <div
                  className="ticket-donut"
                  style={{
                    background: `conic-gradient(#22d3a0 ${
                      totalTickets ? (checkedIn / totalTickets) * 100 : 0
                    }%, #3984ff 0)`,
                  }}
                >
                  <div>
                    <span>Total</span>
                    <strong>{totalTickets}</strong>
                  </div>
                </div>

                <div className="ticket-legend">
                  <p>
                    <span className="legend-dot checked" />
                    Checked-in <strong>{checkedIn}</strong>
                  </p>
                  <p>
                    <span className="legend-dot pending" />
                    Pending <strong>{pending}</strong>
                  </p>
                </div>
              </div>
            </article>
          </section>

          <section className="dashboard-bottom">
            <article className="dashboard-panel recent-panel">
              <div className="panel-heading">
                <h2>Recent Bookings</h2>
                <button
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent("seatsync-navigate", {
                        detail: "Bookings",
                      })
                    )
                  }
                >
                  View All →
                </button>
              </div>

              <div className="table-scroll">
                <table className="recent-bookings-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Customer</th>
                      <th>Event</th>
                      <th>Tickets</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBookings.length ? (
                      recentBookings.map((booking, index) => (
                        <tr key={booking._id || index}>
                          <td>{index + 1}</td>
                          <td>{booking.customerName || "Customer"}</td>
                          <td>
                            {booking.eventTitle || booking.event?.title || "Event"}
                          </td>
                          <td>{booking.ticketCount || 0}</td>
                          <td>
                            ₹{Number(booking.totalAmount || 0).toLocaleString("en-IN")}
                          </td>
                          <td>
                            <span
                              className={`booking-status ${
                                booking.checkedIn ? "checked-status" : ""
                              }`}
                            >
                              {booking.checkedIn ? "Checked-in" : "Confirmed"}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6">No bookings yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="dashboard-panel upcoming-panel">
              <div className="panel-heading">
                <h2>Upcoming Events</h2>
                <button
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent("seatsync-navigate", {
                        detail: "Events",
                      })
                    )
                  }
                >
                  View All →
                </button>
              </div>

              {upcomingEvents.length ? (
                upcomingEvents.map((event) => (
                  <div className="upcoming-event" key={event._id}>
                    <div className="event-thumb">♫</div>
                    <div className="upcoming-event-info">
                      <strong>{event.title}</strong>
                      <span>
                        ⌖ {event.venue || event.city || "Venue to be announced"}
                      </span>
                      <span>
                        ▦{" "}
                        {new Date(event.date).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <span className="event-seats">
                      {event.totalSeats} seats
                    </span>
                  </div>
                ))
              ) : (
                <p className="panel-subtitle">No upcoming events found.</p>
              )}
            </article>
          </section>
        </>
      )}
    </main>
  );
}

export default OrganizerDashboard;
