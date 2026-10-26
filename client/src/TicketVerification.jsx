
import { useState, useEffect } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

function TicketVerification() {
  const [ticketId, setTicketId] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Initialize QR scanner
  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      },
      false
    );

    scanner.render(
      (decodedText) => {
        setTicketId(decodedText.trim());
        setResult(null);
        scanner.clear().catch(() => {});
      },
      () => {}
    );

    return () => {
      scanner.clear().catch(() => {});
    };
  }, []);

  // Verify and check in a ticket
  const verifyTicket = async (e) => {
    e.preventDefault();

    if (!ticketId.trim()) {
      setResult({
        valid: false,
        message: "Please enter or scan a ticket ID.",
      });
      return;
    }

    // Read the organizer key saved by OrganizerDashboard
   const token = sessionStorage.getItem("managerToken");

if (!token) {
  setResult({
    valid: false,
    message: "Please log in as a manager first.",
  });
  return;
}

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(
       `https://seatsync-zi33.onrender.com/api/tickets/${encodeURIComponent(
  ticketId.trim()
)}`,
        {
          method: "POST",
          headers: {
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
},
        }
      );

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        valid: false,
        message: "Unable to connect to the server. Check that it is running.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: "500px",
        margin: "40px auto",
        padding: "20px",
      }}
    >
      <h2>SeatSync Ticket Verification</h2>

      <h3>Scan Ticket QR Code</h3>

      <div
        id="qr-reader"
        style={{
          width: "100%",
          maxWidth: "500px",
          margin: "0 auto",
        }}
      />

      <p>Or enter the ticket ID manually below.</p>

      <form onSubmit={verifyTicket}>
        <label htmlFor="ticket-id">Ticket ID</label>

        <input
          id="ticket-id"
          type="text"
          value={ticketId}
          onChange={(e) => setTicketId(e.target.value)}
          placeholder="Scan or enter ticket ID"
          required
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "12px",
            boxSizing: "border-box",
          }}
        />

        <button type="submit" disabled={loading}>
          {loading ? "Verifying..." : "Verify Ticket"}
        </button>
      </form>

      {result && (
        <div
          role="status"
          style={{
            marginTop: "20px",
            padding: "15px",
            border: "1px solid #ccc",
            borderRadius: "8px",
          }}
        >
          <h3>{result.message}</h3>

          {result.valid && result.ticket && (
            <div>
              <p>
                <strong>Customer:</strong>{" "}
                {result.ticket.customerName}
              </p>

              <p>
                <strong>Event:</strong> {result.ticket.event}
              </p>

              <p>
                <strong>Date:</strong>{" "}
                {result.ticket.date
                  ? new Date(result.ticket.date).toLocaleString()
                  : "Not available"}
              </p>

              <p>
                <strong>Venue:</strong> {result.ticket.venue},{" "}
                {result.ticket.city}
              </p>

              <p>
                <strong>Tickets:</strong> {result.ticket.ticketCount}
              </p>

              <p>
                <strong>Total:</strong> ₹{result.ticket.totalAmount}
              </p>

              <p>
                <strong>Ticket ID:</strong> {result.ticket.ticketId}
              </p>

              <p>
                <strong>Status:</strong> Entry allowed; ticket checked in.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TicketVerification;
