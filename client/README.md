# FreelancePay Client - Frontend

React frontend application for FreelancePay using Vite, React Router, and Tailwind CSS.

## Setup Instructions

1. **Install dependencies:**
   ```bash
   cd client
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

   The app will run on `http://localhost:3000`

3. **Build for production:**
   ```bash
   npm run build
   ```

## Project Structure

```
client/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── ClientList.jsx
│   │   └── ClientForm.jsx
│   ├── pages/            # Page components
│   │   └── Clients.jsx
│   ├── services/         # API service functions
│   │   └── clientService.js
│   ├── App.jsx           # Main app component with routing
│   ├── main.jsx          # Entry point
│   └── index.css         # Global styles with Tailwind
├── index.html
├── package.json
├── vite.config.js        # Vite configuration
└── tailwind.config.js    # Tailwind CSS configuration
```

## Features Implemented

### Client Management
- ✅ List all clients in a table
- ✅ Create new client
- ✅ Edit existing client
- ✅ Delete client (with confirmation)
- ✅ Loading states
- ✅ Error handling
- ✅ Form validation

### Authentication
- Token stored in localStorage
- Automatic token attachment to API requests
- Auto-redirect to login on 401 errors

## API Integration

The frontend communicates with the backend API at `http://localhost:5000/api`. 

**Note:** Make sure the backend server is running before starting the frontend.

## Environment Variables

Currently using proxy configuration in `vite.config.js` to forward `/api` requests to the backend. For production, you may want to use environment variables.

## Next Steps

- Add authentication pages (Login, Register)
- Add protected route wrapper
- Add navigation/header component
- Implement invoice management pages
