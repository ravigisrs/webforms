# HGC Node.js Phase 1

Requirements: Node.js LTS, PostgreSQL + PostGIS.

1. Create database:
   CREATE DATABASE hgc_db;

2. Copy `.env.example` to `.env` and enter your PostgreSQL password.

3. Run:
   npm install
   npm run dev

4. Website: http://localhost:3000
5. Admin: http://localhost:3000/admin/login

Example admin from `.env`:
admin@hgc.local / Admin@12345

Change the admin password and SESSION_SECRET before production.

Next: Services CMS, Projects CMS, image upload, enquiries, settings, then OpenLayers + GeoServer.
