# FreelancePay

FreelancePay is a full-stack invoicing and payment platform for freelancers and small businesses.  
It helps you manage clients, create invoices, generate professional PDFs, and collect payments online through Razorpay.

## Features

- Secure user authentication with JWT
- Client CRUD with freelancer-level data isolation
- Invoice management (create, update, send, track)
- Invoice status tracking: `draft`, `sent`, `paid`, `overdue`, `cancelled`, `declined`, `expired`
- Auto-generated invoice numbers per freelancer
- Public invoice payment page (no login required for clients)
- Razorpay payment integration
- PDF invoice generation and AWS S3 upload with signed URLs
- Dashboard analytics (stats, monthly revenue, yearly revenue, recent invoices)

## Tech Stack

**Frontend:** React, Vite, React Router, Tailwind CSS, Axios, Recharts  
**Backend:** Node.js, Express.js, Express Validator, JWT, CORS, dotenv  
**Database:** MongoDB, Mongoose  
**Integrations:** Razorpay, AWS S3, pdf-lib, Nodemailer

## Project Structure

```text
pr/
├── client/          # React frontend
└── server/          # Express + MongoDB backend
```

## Prerequisites

- Node.js v18+
- npm
- MongoDB (local or Atlas)
- Razorpay test keys (for payments)
- AWS S3 credentials (for PDF storage)

## Setup

### 1) Clone and install dependencies

```bash
git clone <your-repo-url>
cd pr

cd server && npm install
cd ../client && npm install
```

### 2) Configure environment variables

Create `server/.env` and add:

```env
MONGO_URI=mongodb://localhost:27017/freelancepay
JWT_SECRET=your_jwt_secret

RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret
PAYMENT_LINK_MAX_INR=29000

AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your_bucket_name

CLIENT_URL=http://localhost:3000
PORT=5001
```

### 3) Run the app

```bash
# Terminal 1
cd server
npm run dev

# Terminal 2
cd client
npm run dev
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5001`

## Available Scripts

### Server (`server/`)

- `npm run dev` - start backend with nodemon
- `npm start` - start backend in production mode
- `npm run seed` - seed sample data

### Client (`client/`)

- `npm run dev` - start Vite dev server
- `npm run build` - production build
- `npm run preview` - preview production build

## Core API Endpoints

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`

### Clients (Protected)
- `POST /api/clients`
- `GET /api/clients`
- `GET /api/clients/:id`
- `PUT /api/clients/:id`
- `DELETE /api/clients/:id`

### Invoices (Protected)
- `POST /api/invoices`
- `GET /api/invoices`
- `GET /api/invoices/:id`
- `PUT /api/invoices/:id`
- `POST /api/invoices/:id/send`
- `POST /api/invoices/:id/mark-overdue`
- `POST /api/invoices/:id/send-reminder`

### Public
- `GET /api/public/invoice/:invoiceId`
- `POST /api/public/invoice/:invoiceId/confirm-payment`

### Dashboard (Protected)
- `GET /api/dashboard/stats`
- `GET /api/dashboard/revenue`
- `GET /api/dashboard/yearly-revenue`
- `GET /api/dashboard/recent-invoices`

## Testing Flow

1. Register and log in  
2. Create clients  
3. Create draft invoice  
4. Send invoice (creates payment link + PDF)  
5. Pay from public payment page  
6. Verify status updates in dashboard/invoices

## Notes

- Use Razorpay test mode while developing.
- Configure S3 correctly for PDF generation/storage.
- Set a strong `JWT_SECRET` in production.
- Keep sensitive credentials out of source control.

## License

MIT
