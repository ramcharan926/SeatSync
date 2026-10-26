
const mongoose = require("mongoose");
const crypto = require("crypto");

const ticketSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      default: () => crypto.randomUUID(),
      unique: true,
    },
    seatNumber: {
      type: String,
      required: true,
    },
    checkedIn: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    ticketCount: {
      type: Number,
      required: true,
      min: 1,
    },
    selectedSeats: {
      type: [String],
      required: true,
      validate: {
        validator: function (seats) {
          return seats.length === this.ticketCount;
        },
        message: "Selected seats must match the ticket count.",
      },
    },
    tickets: {
      type: [ticketSchema],
      default: [],
      validate: {
        validator: function (tickets) {
          return tickets.length === this.ticketCount;
        },
        message: "Each seat must have one ticket.",
      },
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
