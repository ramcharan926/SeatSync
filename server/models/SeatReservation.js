
const mongoose = require("mongoose");

const seatReservationSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    seatNumber: {
      type: String,
      required: true,
      trim: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
  },
  { timestamps: true }
);

// A seat can be reserved only once per event.
seatReservationSchema.index(
  { event: 1, seatNumber: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "SeatReservation",
  seatReservationSchema
);
