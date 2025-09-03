# Database Management & Initialization Scripts

## Overview

This folder contains scripts to help you manage, initialize, migrate, backup, and restore your MongoDB database for the E-Gram Sabha project.  
These scripts are designed to work seamlessly with Dockerized MongoDB and ensure your application is production-ready on any server.

---

## Folder Structure

- **init/**  
  Initialization scripts for creating collections, indexes, roles, and seeding essential data.
- **migrate/**  
  Migration scripts for updating schema, fixing data, or bulk operations.
- **dbOps/backup/**  
  Scripts for backing up data by Panchayat or State.
- **dbOps/delete/**  
  Scripts for deleting data by Panchayat or State.
- **dbOps/import/**  
  Scripts for importing/restoring data from backups.
- **utils/**  
  Utility scripts for schema validation and export.

---

## Key Scripts

- `init/createCollection.js`  
  Ensures all required collections, indexes, and default roles are created.
- `init/seedData.js`  
  Seeds essential data like the default admin user and platform configurations.
- `migrate/*`  
  Scripts for schema and data migrations.
- `dbOps/backup/*`  
  Scripts for backing up data.
- `dbOps/delete/*`  
  Scripts for deleting data.
- `dbOps/import/*`  
  Scripts for importing data from backups.
- `utils/*`  
  Validation and schema export helpers.

---

## Usage

1. **Start MongoDB** (via Docker Compose).
2. **Set environment variables** (especially `MONGODB_URI`).
3. **Set Password for Admin in seedData.js.**
4. **Run initialization scripts**:

   ```sh
   node backend/scripts/init/createCollection.js
   node backend/scripts/init/seedData.js
   ```

5. **Run migration, backup, or restore scripts as needed** (see script comments for usage).

---

## What is Seed Data?

Seed data provides initial records required for the app to function, such as:
- Default admin user for first login.
- Platform configuration (feature toggles, camera settings, etc.).
- Any other essential records for a fresh deployment.

**Important:**  
Change the default admin password after first login for security!

---

## Best Practices & Suggestions

- **Document each script** with usage instructions and expected environment variables.
- **Automate backups** and keep them offsite for disaster recovery.
- **Version your migration scripts** and run them after schema changes.
- **Validate imports** before restoring data using the provided validation utilities.
- **Keep sensitive data out of version control** (use `.env` files for secrets).
- **Regularly update this README** as scripts and processes evolve.

---

## Need Help?

Refer to script comments or ask your team for guidance on specific operations.