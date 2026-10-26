
const mongoose = require("mongoose");

const seatLockSchema = new mongoose.Schema(
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
    lockToken: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// Only one active lock record per seat and event.
seatLockSchema.index(
  { event: 1, seatNumber: 1 },
  { unique: true }
);

// MongoDB automatically deletes expired locks.
seatLockSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

module.exports = mongoose.model("SeatLock", seatLockSchema);
