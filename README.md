# SeatSync — Full-Stack Event Booking Platform

## 1. Project Overview

SeatSync is a full-stack web application designed to make event discovery and ticket booking easier. Users can browse available events, filter events by category, select seats, and book tickets online. The application also provides a manager dashboard to create, update, and delete events.

I developed SeatSync to gain practical experience in full-stack web development and understand how a frontend, backend, and database work together in a real-world application. The project combines event management, booking validation, seat availability management, and booking confirmation in one platform.

## 2. Problem Statement

Managing events and booking tickets requires maintaining event details, tracking available seats, processing customer information, and confirming bookings. If seat availability is not checked properly, multiple users may attempt to book the same remaining seats.

SeatSync addresses these requirements by providing an event listing interface, a seat selection system, backend booking validation, and event management functionality. It also integrates email notifications and QR-code tickets to make the booking experience more convenient.

## 3. Technology Stack

### Frontend — React.js

React.js is used to build the user interface. It allows the application to display event cards, filters, seat layouts, booking forms, and dashboard components.

React state is useful for managing changing information such as the list of events, loading and error messages, selected seats, and search or category filters. When the state changes, React updates the relevant part of the interface.

### Backend — Node.js and Express.js

Node.js runs the backend JavaScript code, while Express.js handles HTTP requests and API endpoints.

The backend acts as the communication layer between the frontend and the database. It receives requests, validates input, executes the required operations, and returns responses to the frontend.

### Database — MongoDB and Mongoose

MongoDB stores application data, including event and booking information. Mongoose provides a structured way to define schemas, create models, validate data, and perform database operations.

For example, the application can retrieve events from MongoDB, create new events, find a particular event by its ID, and update the remaining seat count when a booking is processed.

### Email Notifications — Nodemailer

Nodemailer is used to send booking confirmation emails. The backend uses the configured email account to send a message to the customer's email address.

The sender's credentials are stored in environment variables rather than being written directly into the source code.

### QR-Code Tickets

QR codes are used as part of the ticketing process. They can encode ticket-related information so that a ticket can be identified or verified. The backend should validate the ticket against stored booking data rather than relying only on information displayed inside the QR code.

## 4. Main Features

### Event Listing and Filtering

Users can browse the events stored in the database. The frontend requests event data from the backend and displays it as event cards.

Users can also search for events and filter them by category, making it easier to find relevant events.

### Interactive Seat Selection

SeatSync provides a seating layout containing 100 seats arranged in a 10 × 10 grid. Users can select their preferred seats before proceeding with a booking.

The interface helps users understand their selections and the availability of seats. The backend must still validate availability when processing a booking because frontend state alone cannot guarantee that a seat is available.

### Booking Management

Users provide their booking details and the number of tickets they want to book. The backend validates the event ID, customer name, email address, ticket count, and seat availability before processing the request.

When sufficient seats are available, the backend updates the event's remaining seat count and returns the booking result.

### Temporary Seat Locking

Temporary seat locking is intended to prevent multiple users from selecting the same seats at the same time. A reliable implementation needs server-side lock management, expiration of abandoned locks, and a final availability check before confirming the booking.

### Email Confirmation and QR Tickets

After a successful booking, the application can generate ticket information and send a confirmation email. The email helps the customer keep a record of the booking, while the QR code provides a convenient way to identify the ticket.

### Manager Dashboard

The manager dashboard provides functionality for creating, editing, and deleting events. This allows event information to be managed through the application rather than by manually changing database records.

Access to management operations should be restricted to authorized managers.

## 5. Application Architecture

SeatSync follows a client-server architecture.

The frontend is built using React, the backend uses Node.js and Express, and MongoDB stores the application's persistent data. The frontend communicates with the backend through HTTP requests, and the backend uses Mongoose to interact with MongoDB.

The overall request flow is:

1. The user performs an action in the React frontend.
2. The frontend sends an HTTP request to an Express API endpoint.
3. The backend validates the request and performs the required operation.
4. Mongoose communicates with MongoDB when database access is needed.
5. The backend sends a response to the frontend.
6. React updates the interface based on the response.

This separation makes it easier to maintain the user interface, business logic, and database operations independently.

## 6. Important API Endpoints

The backend includes the following event and booking endpoints:

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/events` | Retrieve the list of events |
| GET | `/api/events/:id` | Retrieve a particular event |
| POST | `/api/events` | Create a new event |
| POST | `/api/bookings` | Process a ticket booking |

The GET endpoints retrieve data, while the POST endpoints create records or initiate operations. The backend returns data and status information that the frontend can use to display results to the user.

## 7. Booking Validation and Seat Availability

Booking validation is important because a client can send invalid or outdated information. Therefore, the backend should not trust the frontend's seat count or assume that a seat remains available just because it appeared available earlier.

The booking endpoint validates required customer details, checks that the event exists, verifies that the ticket count is valid, and checks whether enough seats remain.

The implementation uses a conditional database update to reduce the event's available seat count only when sufficient seats remain. This helps prevent bookings from reducing the available seat count below zero.

For a complete concurrent booking system, the application must also coordinate individual seat locks and booking creation so that simultaneous requests cannot claim the same seats.

## 8. Environment Variables and Security

Environment variables are used to configure sensitive information such as the MongoDB connection string and email credentials.

This approach keeps credentials separate from the application source code and allows different configuration values to be used during local development and deployment.

Environment files containing secrets must not be committed to GitHub. In a deployed environment, the required values should be configured through the hosting platform's environment-variable settings.

## 9. Challenges and Technical Learnings

### Connecting the Frontend and Backend

One important part of the project was connecting the React frontend to the Express backend. I learned how to send HTTP requests, receive JSON responses, and display database records in the interface.

### Working with MongoDB

I learned how to connect the backend to MongoDB, define data models using Mongoose, retrieve event records, and create and update database documents.

### Validating Bookings

Booking operations require more than accepting a request from the frontend. The backend must validate customer information, verify the event, and check available seats before processing the booking.

### Integrating Email Notifications

I learned how to configure Nodemailer and use environment variables for email credentials. This also helped me understand why the backend sends an email from a configured sender account to the customer's supplied email address.

### Understanding Full-Stack Architecture

The project helped me understand how frontend components, REST APIs, backend business logic, database operations, and external services work together to deliver a complete application.

## 10. Local Setup

### Clone the Repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd SeatSync
```

### Install Dependencies

Install dependencies inside the actual frontend and backend folders:

```bash
cd client
npm install
```

In a separate terminal:

```bash
cd server
npm install
```

### Configure Environment Variables

Create the required environment files and configure the MongoDB connection string, email credentials, and any other variables required by the application.

Never upload real passwords, API secrets, or database credentials to GitHub.

### Run the Application

Start the backend and frontend in separate terminals using the scripts defined in their respective `package.json` files.

The frontend must use the backend's correct API URL. During local development, this may be `http://localhost:5000`; after deployment, it must point to the deployed backend.

## 11. Future Improvements

Possible future improvements include online payment integration, stronger concurrent seat-lock handling, booking history, improved ticket verification, and more detailed event analytics.

These improvements can make SeatSync more suitable for handling larger numbers of users and more complex booking scenarios.

## 12. Project Status

The application has been developed locally, and deployment is the next step. The live demo URL can be added here after deployment.

## 13. Author

Developed as a full-stack web development project.
