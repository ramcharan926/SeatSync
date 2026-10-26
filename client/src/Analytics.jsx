
import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  Cell,
} from "recharts";

const API_URL = "https://seatsync-zi33.onrender.com";

const chartColors = [
  "#8b7cff",
  "#32d6a0",
  "#45b8ff",
  "#ffb86b",
  "#f472b6",
];

function Analytics() {
  const [data, setData] = useState([]);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const token = sessionStorage.getItem("managerToken");

        if (!token) {
          throw new Error("Please log in as manager.");
        }

        const [analyticsResponse, trendsResponse] = await Promise.all([
          fetch(`${API_URL}/api/manager/analytics`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/api/manager/booking-trends`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const analyticsResult = await analyticsResponse.json();
        const trendsResult = await trendsResponse.json();

        if (!analyticsResponse.ok) {
          throw new Error(
            analyticsResult.message || "Failed to load analytics."
          );
        }

        if (!trendsResponse.ok) {
          throw new Error(
            trendsResult.message || "Failed to load booking trends."
          );
        }

        setData(analyticsResult);
        setTrends(trendsResult);
      } catch (err) {
        setError(err.message || "Unable to load analytics.");
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, []);

  if (loading) {
    return <p className="analytics-message">Loading analytics...</p>;
  }

  if (error) {
    return <p className="analytics-message">{error}</p>;
  }

  const totalTickets = data.reduce(
    (sum, item) => sum + item.ticketsSold,
    0
  );

  const totalRevenue = data.reduce(
    (sum, item) => sum + item.revenue,
    0
  );

  const totalBookings = data.reduce(
    (sum, item) => sum + item.totalBookings,
    0
  );

  const chartTooltipStyle = {
    backgroundColor: "#101a31",
    border: "1px solid #344263",
    borderRadius: "12px",
    color: "#f4f6ff",
    padding: "10px 14px",
  };

  return (
    <div className="analytics-dashboard">
      <div className="analytics-header">
        <div>
          <p className="analytics-eyebrow">PERFORMANCE OVERVIEW</p>
          <h2>Event Analytics</h2>
          <p>Track ticket sales and revenue across your events.</p>
        </div>
        <span className="analytics-live">● Live Data</span>
      </div>

      <div className="analytics-kpis">
        <article className="analytics-kpi">
          <span>Total Tickets Sold</span>
          <strong>{totalTickets.toLocaleString("en-IN")}</strong>
          <small>Across all events</small>
        </article>

        <article className="analytics-kpi">
          <span>Total Revenue</span>
          <strong>₹{totalRevenue.toLocaleString("en-IN")}</strong>
          <small>From all bookings</small>
        </article>

        <article className="analytics-kpi">
          <span>Total Bookings</span>
          <strong>{totalBookings.toLocaleString("en-IN")}</strong>
          <small>Confirmed reservations</small>
        </article>
      </div>

      {data.length === 0 ? (
        <p className="analytics-message">
          No booking data available yet.
        </p>
      ) : (
        <div className="analytics-chart-grid">
          <section className="analytics-chart-card">
            <div className="analytics-chart-heading">
              <div>
                <h3>Ticket Sales</h3>
                <p>Tickets sold per event</p>
              </div>
              <span className="analytics-chart-icon">▥</span>
            </div>

            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={data}
                margin={{ top: 12, right: 8, left: -12, bottom: 45 }}
              >
                <CartesianGrid
                  stroke="#293653"
                  strokeDasharray="4 5"
                  vertical={false}
                />
                <XAxis
                  dataKey="eventName"
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  tick={{ fill: "#a5b2d3", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "#8e9dbc", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  itemStyle={{ color: "#a99bff" }}
                  cursor={{ fill: "rgba(139,124,255,0.08)" }}
                />
                <Bar
                  dataKey="ticketsSold"
                  name="Tickets sold"
                  radius={[7, 7, 0, 0]}
                  maxBarSize={55}
                >
                  {data.map((item, index) => (
                    <Cell
                      key={item.eventName + index}
                      fill={chartColors[index % chartColors.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </section>

          <section className="analytics-chart-card">
            <div className="analytics-chart-heading">
              <div>
                <h3>Revenue by Event</h3>
                <p>Revenue generated in INR</p>
              </div>
              <span className="analytics-chart-icon">₹</span>
            </div>

            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={data}
                margin={{ top: 12, right: 8, left: 0, bottom: 45 }}
              >
                <CartesianGrid
                  stroke="#293653"
                  strokeDasharray="4 5"
                  vertical={false}
                />
                <XAxis
                  dataKey="eventName"
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  tick={{ fill: "#a5b2d3", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(value) => `₹${value}`}
                  tick={{ fill: "#8e9dbc", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  formatter={(value) => [
                    `₹${Number(value).toLocaleString("en-IN")}`,
                    "Revenue",
                  ]}
                  cursor={{ fill: "rgba(50,214,160,0.08)" }}
                />
                <Bar
                  dataKey="revenue"
                  name="Revenue"
                  radius={[7, 7, 0, 0]}
                  maxBarSize={55}
                >
                  {data.map((item, index) => (
                    <Cell
                      key={item.eventName + index}
                      fill={index % 2 === 0 ? "#32d6a0" : "#45b8ff"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </section>
        </div>
      )}

      {/* Booking Trends Chart */}
      <section className="analytics-chart-card analytics-trends-card">
        <div className="analytics-chart-heading">
          <div>
            <h3>Booking Trends</h3>
            <p>Daily bookings over time</p>
          </div>
          <span className="analytics-chart-icon">↗</span>
        </div>

        {trends.length === 0 ? (
          <p className="analytics-message">
            No booking date data available yet.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={trends}
              margin={{ top: 15, right: 20, left: 5, bottom: 5 }}
            >
              <CartesianGrid
                stroke="#293653"
                strokeDasharray="4 5"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fill: "#a5b2d3", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: "#a5b2d3", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={chartTooltipStyle}
                labelStyle={{ color: "#f4f6ff" }}
              />
              <Line
                type="monotone"
                dataKey="bookings"
                name="Bookings"
                stroke="#8b7cff"
                strokeWidth={3}
                dot={{ r: 4, fill: "#8b7cff" }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </section>
    </div>
  );
}

export default Analytics;
