# SalonBook Server

Salon Appointment Booking Platform - Backend API

## Project Overview

SalonBook is a salon appointment booking platform where customers can explore salon services, view service information, and request appointments online. The salon administrator can create and manage salon services, review appointment requests, confirm or cancel appointments, and monitor customer payments.

## Technology Stack

- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose
- **Authentication**: Better Auth with JWT
- **Payment**: Stripe
- **Image Hosting**: ImgBB
- **Validation**: Zod
- **Security**: Helmet, CORS

## Features

- **Authentication & Authorization**
  - Email/password registration and login
  - Google OAuth authentication
  - JWT-based session management
  - Role-based access control (Customer/Admin)
  - Account blocking/unblocking

- **Service Management**
  - CRUD operations for salon services
  - Service categories and filtering
  - Image upload via ImgBB
  - Active/inactive status toggle

- **Appointment System**
  - Customer appointment booking
  - Time slot management
  - Appointment status tracking (Pending/Confirmed/Cancelled)
  - Duplicate booking prevention

- **Payment Processing**
  - Stripe Checkout integration
  - Webhook-based payment verification
  - Transaction history

- **Admin Dashboard APIs**
  - User management
  - Service management
  - Appointment management
  - Transaction monitoring
  - Statistics and analytics

## Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Update .env with your configuration
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 5000) |
| `NODE_ENV` | Environment (development/production) |
| `MONGODB_URI` | MongoDB connection string |
| `BETTER_AUTH_SECRET` | Better Auth secret key (min 32 chars) |
| `BETTER_AUTH_URL` | Better Auth base URL |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `IMGBB_API_KEY` | ImgBB API key for image uploads |
| `CLIENT_URL` | Frontend URL for CORS |

## Running the Project

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new customer
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/google` - Google OAuth login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout
- `PUT /api/auth/profile` - Update profile

### Services (Public)
- `GET /api/services` - List services with search, filter, sort, pagination
- `GET /api/services/categories` - Get service categories
- `GET /api/services/featured` - Get featured services (home page)
- `GET /api/services/:id` - Get service by ID

### Services (Admin)
- `POST /api/services` - Create service
- `PUT /api/services/:id` - Update service
- `DELETE /api/services/:id` - Delete service
- `PATCH /api/services/:id/toggle` - Toggle active/inactive

### Appointments
- `GET /api/appointments/time-slots` - Get available time slots
- `GET /api/appointments/stats` - Get appointment statistics
- `GET /api/appointments/my` - Get current user's appointments
- `GET /api/appointments/:id` - Get appointment by ID
- `POST /api/appointments` - Create appointment (Customer)
- `DELETE /api/appointments/:id` - Cancel appointment (Customer)

### Appointments (Admin)
- `GET /api/appointments` - List all appointments
- `PATCH /api/appointments/:id/status` - Update appointment status

### Transactions
- `POST /api/transactions/initiate` - Initiate Stripe payment
- `GET /api/transactions/success` - Payment success callback
- `GET /api/transactions/cancel` - Payment cancel callback
- `POST /api/transactions/webhook` - Stripe webhook
- `GET /api/transactions` - List transactions
- `GET /api/transactions/stats` - Get transaction statistics
- `GET /api/transactions/:id` - Get transaction by ID

### Users (Admin)
- `GET /api/users/stats` - Get dashboard statistics
- `GET /api/users` - List users
- `GET /api/users/:id` - Get user by ID
- `PATCH /api/users/:id/block` - Block/unblock user
- `PATCH /api/users/:id/role` - Update user role
- `DELETE /api/users/:id` - Delete user

## Database Schema

### Users (Better Auth managed)
- name, email, password, image
- role (customer/admin)
- isBlocked
- emailVerified

### Services
- serviceName, category, description
- price, duration
- image (ImgBB URL)
- status (active/inactive)

### Appointments
- serviceId (ref), customerId (ref)
- appointmentDate, timeSlot
- message (optional)
- servicePrice
- paymentStatus (unpaid/paid)
- status (pending/confirmed/cancelled)

### Transactions
- appointmentId (ref), customerId (ref)
- amount, currency
- stripeSessionId
- status (paid/failed)

## Deployment

1. Set up MongoDB (MongoDB Atlas recommended)
2. Configure Stripe account and webhooks
3. Set up Google OAuth credentials
4. Get ImgBB API key
5. Set all environment variables
6. Build and deploy

## Security Considerations

- All sensitive data in environment variables
- JWT tokens for authentication
- Role verification on all protected routes
- Server-side validation with Zod
- Helmet for security headers
- CORS configured for frontend only
- Stripe webhook signature verification
- No .env files committed to repository

## Live Website

https://assignmentnine.oxytumzone.com

## Repository Links

- **Client Repository**: https://github.com/Dev-nishi-sheikh/salonbook-client
- **Server Repository**: https://github.com/Dev-nishi-sheikh/salonbook-server

## License

ISC