import cors from "cors";
import express from "express";
import { config } from './config/config.js';
import routes from './routes/index.js';
import { ApiError } from './utils/apiError.js';
import { ApiResponse } from './utils/ApiResponse.js';

const app = express();

// Middleware
app.use(cors({
  origin: config.frontendUrl || "http://localhost:3001",
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api', routes);

// Global error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Error:', err);

  if (err instanceof ApiError) {
    const response = new ApiResponse(err.statusCode, err.message, null);
    res.status(err.statusCode).json(response.toJSON());
  } else {
    const response = new ApiResponse(500, 'Internal server error', null);
    res.status(500).json(response.toJSON());
  }
});

// 404 handler
app.use((req, res) => {
  const response = new ApiResponse(404, 'Route not found', null);
  res.status(404).json(response.toJSON());
});

// Export the Express app
export { app };

