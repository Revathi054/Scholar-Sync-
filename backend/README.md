# Backend (SkillSwap)

Quick setup notes for local development:

1. Copy the example environment file and fill in secrets:

   Copy `.env.example` to `.env` and set `MONGO_URI` and `JWT_SECRET`.

2. Install dependencies and run the server (from the `backend/` folder):

   In PowerShell:

   cd backend
   npm install
   npm run dev

3. Common env vars:

- MONGO_URI: MongoDB connection string
- JWT_SECRET: secret for signing JWT tokens
- JWT_EXPIRES_IN: token expiry (default: 7d)
- PORT: server port (default: 5000)

After starting, the server will run and attempt to connect to MongoDB. If MONGO_URI is missing you'll see an explicit error telling you to set it.
