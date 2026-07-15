# Render Deployment Guide

This repo includes a Render configuration for the backend service.

## Backend deployment on Render

1. Create a new Web Service on Render.
2. Connect the service to this GitHub repository.
3. Use `render.yaml` in the repo to configure the service.
4. Set the Render build and start commands:
   - build command: `npm run build`
   - start command: `npm run start`
5. Set environment variables:
   - `PORT=10000`
   - `HOST=0.0.0.0`
   - `NODE_ENV=production`
   - `DATABASE_URL=<your-postgres-url>`
6. Deploy the service.
7. Confirm health:
   - `GET https://<your-render-domain>/health`

## Frontend deployment

For frontend deployment, use Vercel and set `VITE_API_URL` to your Render backend domain.

- `VITE_API_URL=https://<your-render-domain>`

This ensures the frontend sends API requests to the Render backend.
