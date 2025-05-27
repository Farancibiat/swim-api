# Prisma Express API

A RESTful API built with Express.js, TypeScript, and Prisma ORM connected to a Neon.tech PostgreSQL database with connection pooling.

## Features

- Express.js with TypeScript
- Prisma ORM with PostgreSQL (Neon.tech)
- Connection pooling for optimal database performance
- RESTful API endpoints for users and posts
- Error handling middleware
- Environment variable configuration

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- A Neon.tech PostgreSQL database

### Installation

1. Clone the repository
   ```
   git clone https://github.com/yourusername/prisma-test.git
   cd prisma-test
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Set up environment variables
   - Copy `.env.example` to `.env`
   - Update the `DATABASE_URL` and `DIRECT_URL` with your Neon.tech database credentials

4. Generate Prisma client
   ```
   npm run generate
   ```

5. Run database migrations
   ```
   npm run migrate
   ```

6. Seed the database (optional)
   ```
   npm run seed
   ```

### Development

Run the development server:
```
npm run dev
```

Access the API at `http://localhost:3000`

### Database Management

- Run Prisma Studio: `npm run studio`
- Create a new migration: `npm run migrate`
- Reset the database: `npx prisma migrate reset`

## API Endpoints

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create a new user

### Posts
- `GET /api/posts` - Get all posts
- `GET /api/posts/:id` - Get post by ID
- `POST /api/posts` - Create a new post

## License

MIT 