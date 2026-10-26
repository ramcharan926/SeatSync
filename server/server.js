
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();
const SeatLock = require("./models/SeatLock");
const SeatReservation = require("./models/SeatReservation");
const { v4: uuidv4 } = require("uuid");//uuid that generates unique ids ,v4 the function that generates a random UUID

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

console.log("RUNNING SEATSYNC SERVER FILE");
console.log("ANALYTICS ROUTE VERSION LOADED");

const Event = require("./models/Event");
const Booking = require("./models/Booking");
const sendBookingEmail = require("./emailService");

const app = express();

app.use(cors());
app.use(express.json());

// Organizer API-key middleware
function requireOrganizer(req, res, next) {
  const apiKey = req.headers["x-organizer-key"];

  if (
    !process.env.ORGANIZER_API_KEY ||
    apiKey !== process.env.ORGANIZER_API_KEY
  ) {
    return res.status(401).json({
      valid: false,
      message: "Unauthorized. Organizer access required.",
    });
  }

  next();
}

function requireManager(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Manager login required",
    });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (
      decoded.role !== "manager" ||
      decoded.email !== process.env.MANAGER_EMAIL
    ) {
      return res.status(403).json({
        message: "Manager access denied",
      });
    }

    req.manager = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
}

// Manager login

app.get("/api/manager/test", (req, res) => {
  res.json({ message: "Manager route is working!" });
});

app.post("/api/manager/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      !email ||
      !password ||
      email !== process.env.MANAGER_EMAIL ||
      password !== process.env.MANAGER_PASSWORD
    ) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      { role: "manager", email },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    return res.json({
      message: "Login successful",
      token,
    });
  } catch (error) {
    console.error("Manager login error:", error);
    return res.status(500).json({
      message: "Login failed",
    });
  }
});

// Test routes
app.get("/test", (req, res) => {
  res.send("SeatSync test route works!");
});

app.get("/", (req, res) => {
  res.json({ message: "Welcome to SeatSync API!" });
});

// Get all events
app.get("/api/events", async (req, res) => {
  try {
    const events = await Event.find().sort({ date: 1 });
    return res.status(200).json(events);
  } catch (error) {
    console.error("Fetch events error:", error);
    return res.status(500).json({
      message: "Failed to fetch events",
    });
  }
});

// Get one event
app.get("/api/events/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    return res.status(200).json(event);
  } catch (error) {
    console.error("Fetch event error:", error);
    return res.status(500).json({ message: "Failed to fetch event" });
  }
});

// Create event
app.post("/api/events", requireManager, async (req, res) => {
  try {
    const event = await Event.create(req.body);
    return res.status(201).json(event);
  } catch (error) {
    console.error("Create event error:", error);
    return res.status(400).json({
      message: "Could not create event",
      error: error.message,
    });
  }
});


/* EDIT EVENT */
app.put("/api/events/:id", requireManager, async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json(event);
  } catch (error) {
    res.status(400).json({
      message: "Could not update event",
      error: error.message,
    });
  }
});

/* DELETE EVENT */
app.delete("/api/events/:id", requireManager, async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json({ message: "Event deleted successfully" });
  } catch (error) {
    res.status(400).json({
      message: "Could not delete event",
      error: error.message,
    });
  }
});


const SEAT_LOCK_MINUTES = 5;

// Get booked and temporarily locked seats for an event
app.get("/api/seat-locks/:eventId", async (req, res) => {
  try {
    const { eventId } = req.params;

    if (!mongoose.isValidObjectId(eventId)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const now = new Date();

    const [reservations, locks] = await Promise.all([
      SeatReservation.find({ event: eventId })
        .select("seatNumber -_id")
        .lean(),
      SeatLock.find({
        event: eventId,
        expiresAt: { $gt: now },
      })
        .select("seatNumber -_id")
        .lean(),
    ]);

    return res.json({
      bookedSeats: reservations.map((seat) => seat.seatNumber),
      lockedSeats: locks.map((seat) => seat.seatNumber),
    });
  } catch (error) {
    console.error("Fetch seat status error:", error);
    return res.status(500).json({
      message: "Failed to fetch seat status",
    });
  }
});

// Temporarily lock selected seats for five minutes
app.post("/api/seat-locks", async (req, res) => {
  const createdLocks = [];

  try {
    const { eventId, selectedSeats } = req.body;

    if (
      !mongoose.isValidObjectId(eventId) ||
      !Array.isArray(selectedSeats) ||
      selectedSeats.length === 0 ||
      selectedSeats.some(
        (seat) => typeof seat !== "string" || !/^[A-Z]\d+$/.test(seat)
      ) ||
      new Set(selectedSeats).size !== selectedSeats.length
    ) {
      return res.status(400).json({
        message: "Provide a valid event ID and unique seat numbers.",
      });
    }

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const now = new Date();

    const booked = await SeatReservation.find({
      event: eventId,
      seatNumber: { $in: selectedSeats },
    }).select("seatNumber");

    if (booked.length > 0) {
      return res.status(409).json({
        message: "One or more seats are already booked.",
        seats: booked.map((seat) => seat.seatNumber),
      });
    }

    // Remove expired locks for these seats.
    // MongoDB TTL deletion is asynchronous, so do not rely on TTL alone.
    await SeatLock.deleteMany({
      event: eventId,
      seatNumber: { $in: selectedSeats },
      expiresAt: { $lte: now },
    });

    const expiresAt = new Date(
      now.getTime() + SEAT_LOCK_MINUTES * 60 * 1000
    );

    for (const seatNumber of selectedSeats) {
      const lock = await SeatLock.create({
        event: eventId,
        seatNumber,
        lockToken: uuidv4(),
        expiresAt,
      });

      createdLocks.push(lock);
    }

    return res.status(201).json({
      message: "Seats locked for five minutes.",
      locks: createdLocks.map((lock) => ({
        seatNumber: lock.seatNumber,
        lockToken: lock.lockToken,
        expiresAt: lock.expiresAt,
      })),
    });
  } catch (error) {
    // If any seat fails, roll back locks created by this request.
    if (createdLocks.length > 0) {
      await SeatLock.deleteMany({
        _id: { $in: createdLocks.map((lock) => lock._id) },
      }).catch((rollbackError) => {
        console.error("Seat lock rollback error:", rollbackError);
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        message: "One or more seats are currently locked. Please refresh.",
      });
    }

    console.error("Create seat lock error:", error);
    return res.status(500).json({
      message: "Could not lock seats. Please try again.",
    });
  }
});


// Book tickets and send confirmation email
app.post("/api/bookings", async (req, res) => {
  let reservedEvent = null;
  let createdBooking = null;
  let bookingCommitted = false;
  let ticketCount = 0;

  try {
    const {
      eventId,
      customerName,
      email,
      ticketCount: count,
      selectedSeats,
      locks,
    } = req.body;

    ticketCount = count;

    if (
      !mongoose.isValidObjectId(eventId) ||
      typeof customerName !== "string" ||
      !customerName.trim() ||
      typeof email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      !Number.isSafeInteger(ticketCount) ||
      ticketCount < 1 ||
      !Array.isArray(selectedSeats) ||
      selectedSeats.length !== ticketCount ||
      selectedSeats.some(
        (seat) => typeof seat !== "string" || !/^[A-Z]\d+$/.test(seat)
      ) ||
      new Set(selectedSeats).size !== selectedSeats.length ||
      !Array.isArray(locks) ||
      locks.length !== selectedSeats.length
    ) {
      return res.status(400).json({
        message: "Please provide valid booking details and seat locks.",
      });
    }

    // Each selected seat must have its own lock token.
    const lockMap = new Map();

    for (const lock of locks) {
      if (
        !lock ||
        typeof lock.seatNumber !== "string" ||
        typeof lock.lockToken !== "string" ||
        lockMap.has(lock.seatNumber)
      ) {
        return res.status(400).json({
          message: "Invalid seat lock details.",
        });
      }

      lockMap.set(lock.seatNumber, lock.lockToken);
    }

    if (selectedSeats.some((seat) => !lockMap.has(seat))) {
      return res.status(400).json({
        message: "A lock token is missing for a selected seat.",
      });
    }

    const now = new Date();

    // Verify that every lock belongs to this request.
    const validLocks = await SeatLock.find({
      event: eventId,
      expiresAt: { $gt: now },
      $or: selectedSeats.map((seatNumber) => ({
        seatNumber,
        lockToken: lockMap.get(seatNumber),
      })),
    });

    if (
      validLocks.length !== selectedSeats.length ||
      new Set(validLocks.map((lock) => lock.seatNumber)).size !==
        selectedSeats.length
    ) {
      return res.status(409).json({
        message: "Your seat lock expired or is invalid. Please select seats again.",
      });
    }

    // Reduce remaining capacity, preserving the existing capacity check.
    reservedEvent = await Event.findOneAndUpdate(
      {
        _id: eventId,
        totalSeats: { $gte: ticketCount },
      },
      {
        $inc: { totalSeats: -ticketCount },
      },
      { new: true }
    );

    if (!reservedEvent) {
      const exists = await Event.exists({ _id: eventId });

      return res.status(exists ? 409 : 404).json({
        message: exists ? "Not enough seats available." : "Event not found.",
      });
    }

    // Create the booking with its selected seats.
   createdBooking = await Booking.create({
  event: reservedEvent._id,
  customerName: customerName.trim(),
  email: email.trim().toLowerCase(),
  ticketCount,
  selectedSeats,
  tickets: selectedSeats.map((seatNumber) => ({
    ticketId: require("crypto").randomUUID(),
    seatNumber,
    checkedIn: false,
  })),
  totalAmount: reservedEvent.price * ticketCount,
});

    // The unique event + seat index prevents duplicate permanent reservations.
    await SeatReservation.insertMany(
      selectedSeats.map((seatNumber) => ({
        event: reservedEvent._id,
        seatNumber,
        booking: createdBooking._id,
      }))
    );

    // Delete only the locks belonging to this booking.
    const lockDeletes = await SeatLock.deleteMany({
      event: eventId,
      $or: selectedSeats.map((seatNumber) => ({
        seatNumber,
        lockToken: lockMap.get(seatNumber),
      })),
    });

    if (lockDeletes.deletedCount !== selectedSeats.length) {
      throw new Error("Seat locks changed before booking could be completed.");
    }

    bookingCommitted = true;

    // Email failure must not undo a successful booking.
    let emailSent = false;

    try {
      await sendBookingEmail(createdBooking, reservedEvent);
      emailSent = true;
    } catch (emailError) {
      console.error("Booking email failed:", emailError);
    }

    return res.status(201).json({
      message: emailSent
        ? "Booking successful! Confirmation email sent."
        : "Booking successful, but confirmation email could not be sent.",
      booking: createdBooking,
      remainingSeats: reservedEvent.totalSeats,
      emailSent,
    });
  } catch (error) {
    console.error("Booking error:", error);

    // Roll back database changes if the booking did not complete.
    if (!bookingCommitted) {
      if (createdBooking) {
        await SeatReservation.deleteMany({
          booking: createdBooking._id,
        }).catch((e) => console.error("Reservation rollback error:", e));

        await Booking.deleteOne({
          _id: createdBooking._id,
        }).catch((e) => console.error("Booking rollback error:", e));
      }

      if (reservedEvent) {
        await Event.updateOne(
          { _id: reservedEvent._id },
          { $inc: { totalSeats: ticketCount } }
        ).catch((e) => console.error("Capacity rollback error:", e));
      }
    }

    if (error.code === 11000) {
      return res.status(409).json({
        message: "A selected seat has already been booked. Please refresh.",
      });
    }

    return res.status(500).json({
      message: "Booking failed. Please try again.",
    });
  }
});


//
// Organizer dashboard statistics
app.get(
  "/api/organizer/dashboard",
  requireManager,
  async (req, res) => {
    try {
        console.log("ORGANIZER DASHBOARD ROUTE HIT");

      const totalEvents = await Event.countDocuments();
      const totalBookings = await Booking.countDocuments();

      const bookingStats = await Booking.aggregate([
        {
          $group: {
            _id: null,
            totalTicketsSold: { $sum: "$ticketCount" },
            totalRevenue: { $sum: "$totalAmount" },
          },
        },
      ]);

     const checkedInStats = await Booking.aggregate([
  { $unwind: "$tickets" },
  { $match: { "tickets.checkedIn": true } },
  { $count: "checkedInTickets" },
]);
      return res.status(200).json({
        totalEvents,
        totalBookings,
        totalTicketsSold:
          bookingStats[0]?.totalTicketsSold || 0,
        totalRevenue:
          bookingStats[0]?.totalRevenue || 0,
        checkedInTickets:
          checkedInStats[0]?.checkedInTickets || 0,
      });
    } catch (error) {
      console.error("Dashboard error:", error);

      return res.status(500).json({
        message: "Failed to load organizer dashboard.",
      });
    }
  }
);

console.log("REGISTERING MANAGER ANALYTICS ROUTE");


app.get("/api/manager/analytics", requireManager, async (req, res) => {
  try {
    const analytics = await Booking.aggregate([
      {
        $group: {
          _id: "$event",
          ticketsSold: { $sum: "$ticketCount" },
          revenue: { $sum: "$totalAmount" },
          totalBookings: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "events",
          localField: "_id",
          foreignField: "_id",
          as: "event",
        },
      },
      {
        $unwind: {
          path: "$event",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 0,
          eventName: {
            $ifNull: ["$event.title", "Event unavailable"],
          },
          ticketsSold: 1,
          revenue: 1,
          totalBookings: 1,
        },
      },
      { $sort: { revenue: -1 } },
    ]);

    return res.json(analytics);
  } catch (error) {
    console.error("Manager analytics error:", error);
    return res.status(500).json({
      message: "Failed to load analytics.",
    });
  }
});

 // Get recent bookings for the manager dashboard
app.get("/api/manager/bookings", requireManager, async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("event", "title date venue city")
      .sort({ _id: -1 })
      .limit(10)
      .lean();

    return res.json(
      bookings.map((booking) => ({
        _id: booking._id,
        customerName: booking.customerName,
        email: booking.email,
        eventTitle: booking.event?.title || "Event unavailable",
        ticketCount: booking.ticketCount,
        totalAmount: booking.totalAmount,
        checkedIn:
  Array.isArray(booking.tickets) &&
  booking.tickets.length > 0 &&
  booking.tickets.every((ticket) => ticket.checkedIn),

checkedInTickets: Array.isArray(booking.tickets)
  ? booking.tickets.filter((ticket) => ticket.checkedIn).length
  : 0,
      }))
    );
  } catch (error) {
    console.error("Fetch manager bookings error:", error);
    return res.status(500).json({
      message: "Failed to load bookings.",
    });
  }
});


 // Analytics: ticket sales and revenue by event


app.get("/api/manager/booking-trends", requireManager, async (req, res) => {
  try {
    const trends = await Booking.aggregate([
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },
          bookings: { $sum: 1 },
          tickets: { $sum: "$ticketCount" },
          revenue: { $sum: "$totalAmount" },
        },
      },
      {
        $sort: { _id: 1 },
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          bookings: 1,
          tickets: 1,
          revenue: 1,
        },
      },
    ]);

    res.status(200).json(trends);
  } catch (error) {
    console.error("Booking trends error:", error);
    res.status(500).json({
      message: "Failed to load booking trends.",
    });
  }
});

//
console.log(
  "ALL ROUTES:",
  app.router.stack
    .filter((layer) => layer.route)
    .map((layer) => layer.route.path)
);


// Verify and check in a ticket
app.post(
  "/api/tickets/:ticketId",
   requireManager,
  async (req, res) => {
    try {
      const { ticketId } = req.params;

      const booking = await Booking.findOne({
        "tickets.ticketId": ticketId,
      }).populate("event", "title date venue city");

      if (!booking) {
        return res.status(404).json({
          valid: false,
          message: "Invalid ticket. Booking not found.",
        });
      }

      const ticket = booking.tickets.find(
        (item) => item.ticketId === ticketId
      );

      if (ticket.checkedIn) {
        return res.status(409).json({
          valid: false,
          checkedIn: true,
          message: "Ticket already checked in. Entry rejected.",
        });
      }

      ticket.checkedIn = true;
      await booking.save();

      return res.status(200).json({
        valid: true,
        checkedIn: true,
        message: "Ticket verified! Entry allowed.",
        ticket: {
          ticketId: ticket.ticketId,
          seatNumber: ticket.seatNumber,
          customerName: booking.customerName,
          event: booking.event.title,
          date: booking.event.date,
          venue: booking.event.venue,
          city: booking.event.city,
        },
      });
    } catch (error) {
      console.error("Ticket check-in error:", error);
      return res.status(500).json({
        valid: false,
        message: "Unable to verify ticket.",
      });
    }
  }
);

// Temporary test route
app.get("/api/bookings-test", (req, res) => {
  res.send("Booking route file is running!");
});

// Unknown routes — keep this last

app.use((req, res) => {
  console.log("404 HIT:", req.method, req.originalUrl);
  res.status(404).json({
    message: `Route not found: ${req.method} ${req.path}`,
  });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing from your .env file");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected successfully");

    app.listen(PORT, () => {
      console.log(`SeatSync server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Startup failed:", error);
    process.exit(1);
  }
}

startServer();
