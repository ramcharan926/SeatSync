
import { useEffect, useState } from "react";

const API_URL = "http://localhost:5000";

const emptyForm = {
  title: "",
  description: "",
  category: "Other",
  date: "",
  venue: "",
  city: "",
  ticketPrice: "",
  totalSeats: "",
};

function EventManagement({
  onEventCreated,
  onEventUpdated,
  onEventDeleted,
}) {
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [events, setEvents] = useState([]);

async function fetchEvents() {
  try {
    const response = await fetch(`${API_URL}/api/events`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Could not load events");
    }

    setEvents(Array.isArray(data) ? data : []);
  } catch (error) {
    setMessage(error.message || "Could not load events");
  }
}

useEffect(() => {
  fetchEvents();
}, []);
  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function startEdit(event) {
    setEditingId(event._id);
    setForm({
      title: event.title || "",
      description: event.description || "",
      category: event.category || "Other",
      date: event.date ? new Date(event.date).toISOString().slice(0, 16) : "",
      venue: event.venue || "",
      city: event.city || "",
      ticketPrice: event.price ?? "",
      totalSeats: event.totalSeats ?? "",
    });
    setMessage("");
    document.getElementById("event-management")?.scrollIntoView({
      behavior: "smooth",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setMessage("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");

    const payload = {
      title: form.title,
      description: form.description,
      category: form.category,
      date: form.date,
      venue: form.venue,
      city: form.city,
      price: Number(form.ticketPrice),
      totalSeats: Number(form.totalSeats),
    };

    try {
      const response = await fetch(
        `${API_URL}/api/events${editingId ? `/${editingId}` : ""}`,
        {
          method: editingId ? "PUT" : "POST",
          headers: {
  "Content-Type": "application/json",
  Authorization: `Bearer ${sessionStorage.getItem("managerToken")}`,
},
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not save event");
      }

      if (editingId) {
  await fetchEvents();
onEventUpdated?.(data);
  setMessage("Event updated successfully!");
  setEditingId(null);
  setForm({ ...emptyForm });
  return;
} else {
        await fetchEvents();
onEventCreated?.(data.event || data);
        setMessage("Event created successfully!");
      }

      setEditingId(null);
      setForm({ ...emptyForm });
    } catch (error) {
      setMessage(error.message || "Could not connect to server.");
    }
  }

  async function deleteEvent(event) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${event.title}"?`
    );

    if (!confirmed) return;

    setMessage("");

    try {
    const response = await fetch(`${API_URL}/api/events/${event._id}`, {
  method: "DELETE",
  headers: {
    Authorization: `Bearer ${sessionStorage.getItem("managerToken")}`,
  },
});

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not delete event");
      }

      await fetchEvents();
onEventDeleted?.(event._id);

      if (editingId === event._id) {
        cancelEdit();
      }

      setMessage("Event deleted successfully!");
    } catch (error) {
      setMessage(error.message || "Could not connect to server.");
    }
  }

  return (
    <section className="event-management" id="event-management">
      <h2>Event Management</h2>
      <h3>{editingId ? "Edit Event" : "Add New Event"}</h3>

      <form onSubmit={handleSubmit}>
        <input
          name="title"
          placeholder="Event Title"
          value={form.title}
          onChange={handleChange}
          required
        />

        <textarea
          name="description"
          placeholder="Event Description"
          value={form.description}
          onChange={handleChange}
          required
        />

        <select
          name="category"
          value={form.category}
          onChange={handleChange}
          required
        >
          <option value="Music">Music</option>
          <option value="Comedy">Comedy</option>
          <option value="Technology">Technology</option>
          <option value="Other">Other</option>
        </select>

        <label>Event Date and Time</label>
        <input
          type="datetime-local"
          name="date"
          value={form.date}
          onChange={handleChange}
          required
        />

        <input
          name="venue"
          placeholder="Venue"
          value={form.venue}
          onChange={handleChange}
          required
        />

        <input
          name="city"
          placeholder="City"
          value={form.city}
          onChange={handleChange}
          required
        />

        <input
          type="number"
          name="ticketPrice"
          placeholder="Ticket Price (₹)"
          min="0"
          value={form.ticketPrice}
          onChange={handleChange}
          required
        />

        <input
          type="number"
          name="totalSeats"
          placeholder="Total Seats"
          min="1"
          step="1"
          value={form.totalSeats}
          onChange={handleChange}
          required
        />

        <button type="submit">
          {editingId ? "Save Changes" : "Create Event"}
        </button>

        {editingId && (
          <button type="button" onClick={cancelEdit}>
            Cancel Edit
          </button>
        )}
      </form>

      {message && <p>{message}</p>}

      <h3>Manage Existing Events</h3>

      {events.length === 0 ? (
        <p>No events available yet.</p>
      ) : (
        events.map((event) => (
          <div
            key={event._id}
            style={{
              padding: "14px",
              marginTop: "12px",
              border: "1px solid #555969",
              borderRadius: "8px",
            }}
          >
            <strong>{event.title}</strong>
            <p>
              {event.city} · ₹{event.price} · {event.totalSeats} seats
            </p>

            <button type="button" onClick={() => startEdit(event)}>
              Edit
            </button>{" "}

            <button type="button" onClick={() => deleteEvent(event)}>
              Delete
            </button>
          </div>
        ))
      )}
    </section>
  );
}

export default EventManagement;
