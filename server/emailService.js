
const nodemailer = require("nodemailer");
const QRCode = require("qrcode");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

async function sendBookingEmail(booking, event) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
    throw new Error("Email credentials are missing from .env");
  }

  const eventDate = new Date(event.date).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });

  const attachments = [];
  let ticketHtml = "";
  let ticketText = "";

  for (const ticket of booking.tickets) {
    const qrBuffer = await QRCode.toBuffer(ticket.ticketId, {
      type: "png",
      width: 300,
      margin: 2,
    });

    const cid = `ticket-${ticket.ticketId}`;

    attachments.push({
      filename: `SeatSync-${ticket.seatNumber}.png`,
      content: qrBuffer,
      contentType: "image/png",
      cid,
    });

    ticketHtml += `
      <h3>Seat ${ticket.seatNumber}</h3>
      <p>Ticket ID: ${ticket.ticketId}</p>
      <img src="cid:${cid}" width="250" alt="Ticket QR code" />
    `;

    ticketText += `Seat: ${ticket.seatNumber}, Ticket ID: ${ticket.ticketId}\n`;
  }

  const info = await transporter.sendMail({
    from: `"SeatSync" <${process.env.EMAIL_USER}>`,
    to: booking.email,
    subject: `Your SeatSync tickets - ${event.title}`,

    text: `
Hi ${booking.customerName},

Your booking is confirmed!

Event: ${event.title}
Date: ${eventDate}
Venue: ${event.venue}, ${event.city}
Tickets: ${booking.ticketCount}
Total amount: Rs. ${booking.totalAmount}
Booking reference: ${booking._id}

Your individual tickets:
${ticketText}

Thank you for booking with SeatSync!
`,

    html: `
      <h2>Your SeatSync booking is confirmed!</h2>
      <p>Hi ${booking.customerName},</p>
      <p><strong>Event:</strong> ${event.title}</p>
      <p><strong>Date:</strong> ${eventDate}</p>
      <p><strong>Venue:</strong> ${event.venue}, ${event.city}</p>
      <p><strong>Tickets:</strong> ${booking.ticketCount}</p>
      <p><strong>Total amount:</strong> Rs. ${booking.totalAmount}</p>
      <p><strong>Booking reference:</strong> ${booking._id}</p>
      <h3>Your individual tickets</h3>
      ${ticketHtml}
      <p>Thank you for booking with SeatSync!</p>
    `,

    attachments,
  });

  console.log("Booking email sent:", info.messageId);
  return info;
}

module.exports = sendBookingEmail;
