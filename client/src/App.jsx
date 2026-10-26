
import { useEffect, useState } from "react";
import "./App.css";
import ManagerLogin from "./ManagerLogin";
import Manager from "./Manager";
import { Routes, Route,Link,Navigate, useLocation } from "react-router-dom";


function CustomerHome() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [customerName, setCustomerName] = useState("");
  const [email, setEmail] = useState("");
  const [ticketCount, setTicketCount] = useState(1);
  const [bookingMessage, setBookingMessage] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  
  
const [seatStatuses, setSeatStatuses] = useState({
  bookedSeats: [],
  lockedSeats: [],
});
const [selectedSeats, setSelectedSeats] = useState([]);
const [seatLocks, setSeatLocks] = useState([]);
const [lockExpiresAt, setLockExpiresAt] = useState(null);
const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
   fetch("https://seatsync-zi33.onrender.com/api/events")
      .then((res) => {
        if (!res.ok) throw new Error("Could not load events");
        return res.json();
      })
      .then(setEvents)
      .catch(() => setError("Unable to load events. Please try again."))
      .finally(() => setLoading(false));
  }, []);
  
useEffect(() => {
  if (!lockExpiresAt) return;

  const updateCountdown = () => {
    const seconds = Math.max(
      0,
      Math.ceil((new Date(lockExpiresAt).getTime() - Date.now()) / 1000)
    );

    setRemainingSeconds(seconds);

    if (seconds === 0) {
      setSeatLocks([]);
      setSelectedSeats([]);
      setLockExpiresAt(null);
      setBookingError("Seat lock expired. Please select seats again.");

      if (selectedEvent) {
        fetch(`https://seatsync-zi33.onrender.com/api/seat-locks/${selectedEvent._id}`)
          .then((response) => response.json())
          .then(setSeatStatuses)
          .catch(() => {});
      }
    }
  };

  updateCountdown();
  const timer = setInterval(updateCountdown, 1000);

  return () => clearInterval(timer);
}, [lockExpiresAt]);


  const categories = ["All", "Music", "Comedy", "Technology", "Other"];

  const filteredEvents = events.filter((event) => {
    const matchesSearch = [
      event.title,
      event.city,
      event.venue,
      event.category,
    ]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase());

    return (
      matchesSearch &&
      (category === "All" || event.category === category)
    );
  });
//
 
async function openBooking(event) {
  setSelectedEvent(event);
  setCustomerName("");
  setEmail("");
  setTicketCount(1);
  setSelectedSeats([]);
  setSeatLocks([]);
  setLockExpiresAt(null);
  setRemainingSeconds(0);
  setBookingMessage("");
  setBookingError("");
  setSeatStatuses({ bookedSeats: [], lockedSeats: [] });

  try {
    const response = await fetch(
      `https://seatsync-zi33.onrender.com/api/seat-locks/${event._id}`
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Could not load seats.");
    }

    setSeatStatuses(data);
  } catch (error) {
    setBookingError(error.message || "Could not load seats.");
  }
}

  //

function toggleSeat(seatNumber) {
  if (seatLocks.length > 0) return;

  if (
    seatStatuses.bookedSeats.includes(seatNumber) ||
    seatStatuses.lockedSeats.includes(seatNumber)
  ) {
    return;
  }

  setSelectedSeats((previous) => {
    if (previous.includes(seatNumber)) {
      return previous.filter((item) => item !== seatNumber);
    }

    return [...previous, seatNumber];
  });
}


async function lockSelectedSeats() {
  setBookingError("");

  if (!selectedSeats.length) {
    setBookingError("Please select at least one seat.");
    return;
  }

  setBookingLoading(true);

  try {
    const response = await fetch("https://seatsync-zi33.onrender.com/api/seat-locks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      

body: JSON.stringify({
  eventId: selectedEvent._id,
  selectedSeats,
}),


    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message);

    setSeatLocks(data.locks);
    setLockExpiresAt(data.locks[0].expiresAt);
    setSeatStatuses((previous) => ({
      ...previous,
      lockedSeats: [
        ...new Set([...previous.lockedSeats, ...selectedSeats]),
      ],
    }));
  } catch (error) {
    setBookingError(error.message || "Could not lock seats.");

    const response = await fetch(
      `https://seatsync-zi33.onrender.com/api/seat-locks/${selectedEvent._id}`
    );
    if (response.ok) setSeatStatuses(await response.json());
  } finally {
    setBookingLoading(false);
  }
}

  async function handleBooking(e) {
    e.preventDefault();
    if (
  !seatLocks.length ||
  seatLocks.length !== selectedSeats.length ||
  remainingSeconds <= 0
) {
  setBookingError("Please lock your seats before confirming.");
  return;
}
    setBookingMessage("");
    setBookingError("");
    setBookingLoading(true);

    try {
      const response = await fetch("https://seatsync-zi33.onrender.com/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
       
       body: JSON.stringify({
        eventId: selectedEvent._id,
        customerName,
        email,
        ticketCount: selectedSeats.length,
        selectedSeats,
        locks: seatLocks,
       }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Booking failed");
      }

      setBookingMessage(
        data.emailSent
          ? `Booking successful! Confirmation email sent. Total: ₹${data.booking.totalAmount}.`
          : `Booking successful, but confirmation email could not be sent. Total: ₹${data.booking.totalAmount}.`
      );

      setEvents((previousEvents) =>
        previousEvents.map((event) =>
          event._id === selectedEvent._id
            ? { ...event, totalSeats: data.remainingSeats }
            : event
        )
      );

      setSelectedEvent((previous) =>
        previous
          ? { ...previous, totalSeats: data.remainingSeats }
          : previous
      );
    } catch (err) {
      setBookingError(err.message || "Unable to complete booking.");
    } finally {
      setBookingLoading(false);
    }
  }

  return (
    <div className="app">
      <nav className="navbar">
        <Link className="logo" to="/">
          SeatSync<span className="logo-dot">.</span>
        </Link>

        <a className="nav-link" href="#events">
          Explore Events
        </a>
      </nav>

      <header className="hero">
        <p className="eyebrow">YOUR NEXT EXPERIENCE STARTS HERE</p>

        <h1>
          Find your next
          <br />
          <span>unforgettable</span> event.
        </h1>

        <p className="hero-description">
          Discover concerts, comedy shows and tech events.
          Find your vibe and make memories.
        </p>

        <a className="explore-button" href="#events">
          Explore events <span>→</span>
        </a>
      </header>

      <main id="events" className="events-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">WHAT'S HAPPENING</p>
            <h2>Upcoming events</h2>
          </div>

          <span className="event-count">
            {filteredEvents.length} events
          </span>
        </div>

        <input
          className="search-input"
          type="search"
          placeholder="Search by event, venue or city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="category-list">
          {categories.map((item) => (
            <button
              key={item}
              className={`category-button ${
                category === item ? "active" : ""
              }`}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>

        {loading && <p className="status-message">Loading events...</p>}
        {error && <p className="status-message error">{error}</p>}

        {!loading && !error && filteredEvents.length === 0 && (
          <p className="status-message">
            No events found. Try another search or category.
          </p>
        )}

        <div className="event-grid">
          {filteredEvents.map((event) => (
            <article className="event-card" key={event._id}>
              
<div className={`event-art ${event.category?.toLowerCase()}`}>
  
<img
  src={
    {
      // Pune
"Echoes of Tomorrow":
  "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=900",

"The Laugh Lounge":
  "https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=900",

"Beyond Tomorrow":
  "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=900",

// Delhi
"Neon Nights Festival":
  "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=900",

"The Comedy Circuit":
  "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=900",

"Quantum Future Expo":
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=900",
      "Bangalore Beats Festival":
  "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=900",

"Bangalore Laugh Factory":
  "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=900",

"Bangalore FutureTech Summit":
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=900",
      "Ranchi Comedy Night":
  "https://images.unsplash.com/photo-1503095396549-807759245b35?w=900",

"Ranchi Music Carnival":
  "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=900",
       "Laugh & Beats Live 2026":
  "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=900",
      "Comedy Night Live":
        "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=900",
      "Rockstorm Music Festival":
        "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=900",
      "Food Fiesta 2026":
        "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=900",
      "Colors of Creativity":
        "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=900",
      "Startup Innovation Expo":
        "https://images.unsplash.com/photo-1511578314322-379afb476865?w=900",
      "Gaming Arena Championship":
        "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=900",
      "City Marathon 2026":
        "https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=900",
      "Wellness & Yoga Retreat":
        "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=900",
      "Lens & Light Photography Show":
        "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=900",
      "Future Science & Robotics Fair":
        "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=900",
    }[event.title] ||
    (
      event.category === "Music"
        ? "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=900"
        : event.category === "Comedy"
        ? "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=900"
        : event.category === "Technology"
        ? "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=900"
        : "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=900"
    )
  }
  alt={`${event.title} event`}
  loading="lazy"
/>

               <span className="event-category">{event.category}</span>
              </div>
 

              <div className="event-content">
                <p className="event-date">
                  {new Date(event.date).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>

                <h3>{event.title}</h3>

                <p className="event-description">
                  {event.description || "Come and enjoy this event."}
                </p>

                <p className="event-location">
                  <span>⌖</span> {event.venue}, {event.city}
                </p>

                <div className="event-footer">
                  <div>
                    <span className="price-label">Starting from</span>
                    <p className="event-price">₹{event.price}</p>
                  </div>

                  <span className="seats">{event.totalSeats} seats</span>
                </div>

                <button
                  type="button"
                  className="book-button"
                  disabled={event.totalSeats < 1}
                  onClick={() => openBooking(event)}
                >
                  {event.totalSeats < 1 ? "Sold Out" : "Book Tickets →"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </main>

      {selectedEvent && (
        <div className="booking-overlay">
          <section
            className="booking-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-title"
          >
            <button
              className="booking-close"
              onClick={() => setSelectedEvent(null)}
              aria-label="Close booking form"
            >
              ×
            </button>

            <p className="eyebrow">RESERVE YOUR SPOT</p>
            <h2 id="booking-title">{selectedEvent.title}</h2>

            <p className="booking-subtitle">
              {selectedEvent.city} · ₹{selectedEvent.price} per ticket
            </p>

           
{bookingMessage ? (
  <div className="confirmation-card">
    <div className="confirmation-icon">✓</div>
    <p className="eyebrow">BOOKING CONFIRMED</p>
    <h2>You're going!</h2>
    <p className="confirmation-event">{selectedEvent.title}</p>
    <p className="booking-success">{bookingMessage}</p>
    <p className="confirmation-note">
      Check your email for your individual tickets and QR codes.
    </p>
    <button
      type="button"
      className="book-button"
      onClick={() => setSelectedEvent(null)}
    >
      Done
    </button>
  </div>
) : (

              <form
  className="booking-form"
  onSubmit={handleBooking}
  onClick={(e) => e.stopPropagation()}
>
                <label htmlFor="customerName">Your name</label>
                <input
                  id="customerName"
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter your name"
                  required
                  maxLength={100}
                />

                <label htmlFor="email">Email address</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />

                
<label>Select your seats</label>

<div className="seat-screen">SCREEN</div>

<div className="seat-grid">
  {Array.from({ length: 10 }).map((_, rowIndex) => (
    <div className="seat-row" key={rowIndex}>
      {Array.from({ length: 10 }).map((_, colIndex) => {
        const seat = `${String.fromCharCode(65 + rowIndex)}${colIndex + 1}`;
        const booked = seatStatuses.bookedSeats.includes(seat);
        const locked = seatStatuses.lockedSeats.includes(seat);
        const selected = selectedSeats.includes(seat);

        return (
          <button
            key={seat}
            type="button"
            className={`seat ${booked ? "booked" : ""} ${
              locked && !selected ? "locked" : ""
            } ${selected ? "selected" : ""}`}
            disabled={booked || (locked && !selected) || seatLocks.length > 0}
            onClick={(e) => {
  e.preventDefault();
  e.stopPropagation();
  toggleSeat(seat);
}}
          >
            {seat}
          </button>
        );
      })}
    </div>
  ))}
</div>

<p>Selected seats: {selectedSeats.join(", ") || "None"}</p>

{seatLocks.length === 0 ? (
  <button
    type="button"
    className="book-button"
    onClick={lockSelectedSeats}
    disabled={bookingLoading || selectedSeats.length === 0}
  >
    {bookingLoading ? "Locking..." : "Lock Selected Seats"}
  </button>
) : (
  <p>
    Time remaining: {Math.floor(remainingSeconds / 60)}:
    {String(remainingSeconds % 60).padStart(2, "0")}
  </p>
)}


{/* PASTE YOUR SEAT-SELECTION CODE HERE */}

<div className="booking-total">
  <span>Total amount</span>
  <strong>
    ₹{selectedEvent.price * selectedSeats.length}
  </strong>
</div>

                {bookingError && (
                  <p className="booking-error">{bookingError}</p>
                )}

                
         <button
         className="book-button"
         type="submit"
         disabled={
         bookingLoading ||
         seatLocks.length === 0 ||
         seatLocks.length !== selectedSeats.length ||
         remainingSeconds <= 0 ||
        !customerName.trim() ||
        !email.trim()
         }
         >
       {bookingLoading ? "Processing..." : "Simulate Payment & Confirm"}
       </button>
              </form>
            )}
          </section>
        </div>
      )}

      <footer className="footer">
        <Link className="logo" to="/">
          SeatSync<span className="logo-dot">.</span>
        </Link>
        <p>Find your people. Find your event.</p>
      </footer>
    </div>
  );
}

function App() {
  const location = useLocation();

  const isLoggedIn = Boolean(
    sessionStorage.getItem("managerToken")
  );

  return (
    <Routes>
      <Route path="/" element={<CustomerHome />} />

      <Route
        path="/manager/login"
        element={<ManagerLogin />}
      />

      <Route
        path="/manager"
        element={
          sessionStorage.getItem("managerToken") ? (
            <Manager />
          ) : (
            <Navigate to="/manager/login" replace />
          )
        }
      />
    </Routes>
  );
}

export default App;
