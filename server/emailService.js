
const { Resend } = require("resend");
const QRCode = require("qrcode");

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendBookingEmail(booking, event) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is missing");
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

    attachments.push({
      filename: `SeatSync-${ticket.seatNumber}.png`,
      content: qrBuffer.toString("base64"),
      contentType: "image/png",
      contentId: `ticket-${ticket.ticketId}`,
    });

    ticketHtml += `
      <h3>Seat ${ticket.seatNumber}</h3>
      <p>Ticket ID: ${ticket.ticketId}</p>
      <img src="cid:ticket-${ticket.ticketId}" width="250" alt="Ticket QR code" />
    `;

    ticketText += `Seat: ${ticket.seatNumber}, Ticket ID: ${ticket.ticketId}\n`;
  }

  const { data, error } = await resend.emails.send({
    // Replace this with a sender address authorized by Resend.
    from: "SeatSync <onboarding@resend.dev>",
    to: [booking.email],
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

  if (error) {
    throw new Error(error.message || "Resend failed to send the email");
  }

  console.log("Booking email sent:", data?.id);
  return data;
}
async function testEmail() {
  const { data, error } = await resend.emails.send({
    from: "SeatSync <onboarding@resend.dev>",
    to: ["YOUR_VERIFIED_EMAIL@example.com"],
    subject: "SeatSync email test",
    text: "Bro, your SeatSync email service is working!",
  });

  if (error) {
    throw new Error(error.message || "Resend email test failed");
  }

  console.log("Test email sent:", data?.id);
  return data;
}

module.exports = { sendBookingEmail, testEmail };
