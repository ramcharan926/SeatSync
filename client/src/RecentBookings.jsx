
import { useEffect, useState } from "react";

const API_URL = "http://localhost:5000";

function RecentBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadBookings() {
      try {
        const token = sessionStorage.getItem("managerToken");

        if (!token) {
          throw new Error("Please log in as manager.");
        }

        const response = await fetch(
          `${API_URL}/api/manager/bookings`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load bookings.");
        }

        setBookings(data);
      } catch (err) {
        setError(err.message || "Unable to load bookings.");
      } finally {
        setLoading(false);
      }
    }

    loadBookings();
  }, []);

  return (
    <section className="recent-bookings">
      <h2>Recent Bookings</h2>
      <p className="recent-bookings-subtitle">
        Latest customer ticket reservations
      </p>

      {loading && <p>Loading bookings...</p>}
      {error && <p role="alert">{error}</p>}

      {!loading && !error && bookings.length === 0 && (
        <p>No bookings found yet.</p>
      )}

      {!loading && !error && bookings.length > 0 && (
        <div className="bookings-table-wrapper">
          <table className="bookings-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Event</th>
                <th>Tickets</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {bookings.map((booking) => (
                <tr key={booking._id}>
                  <td>
                    <strong>{booking.customerName}</strong>
                    <small>{booking.email}</small>
                  </td>
                  <td>{booking.eventTitle}</td>
                  <td>{booking.ticketCount}</td>
                  <td>
                    ₹{Number(booking.totalAmount).toLocaleString("en-IN")}
                  </td>
                  <td>
                    <span
                      className={
                        booking.checkedIn
                          ? "booking-status checked-in"
                          : "booking-status pending"
                      }
                    >
                      {booking.checkedIn ? "Checked in" : "Not checked in"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default RecentBookings;
