# Custom Employee Portal — Setup & Installation

## 1. Prerequisites

Install the following before running the project:

* Node.js
* npm
* PostgreSQL
* Git
* VS Code

Check the installed versions:

```bash
node -v
npm -v
git --version
```

## 2. Clone the Repository

```bash
git clone https://github.com/harikabandi23/custom-employee-portal.git
cd custom-employee-portal
```

## 3. Backend Setup

Open a terminal:

```bash
cd backend
npm install
```

Create a `.env` file inside the `backend` folder.

Add the required database, JWT, and Zoho configuration values.

**Do not upload the `.env` file to GitHub.**

Start the backend:

```bash
npm start
```

## 4. Database Setup

Make sure PostgreSQL is running.

Create/configure the project database and update the PostgreSQL connection details in the backend `.env` file.

The database configuration must match the PostgreSQL installation being used locally.

## 5. Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
```

Start the frontend:

```bash
npm run dev
```

Vite will display the local development URL in the terminal.

Open that URL in your browser.

## 6. Run the Complete Application

### Backend

```bash
cd backend
npm start
```

### Frontend

```bash
cd frontend
npm run dev
```

Both services should be running for the complete portal to work.

## 7. Authentication

The portal uses JWT-based authentication.

After successful login, the authenticated user receives a JWT token that is used when accessing protected backend routes.

## 8. Role-Based Access Control

The portal implements Role-Based Access Control (RBAC).

Access to protected features is determined by the permissions assigned to the user's role.

The portal includes functionality for:

* Users
* Roles
* Permissions
* Audit Logs
* Zoho People

## 9. Zoho People Integration

The application integrates with Zoho People to retrieve employee records.

Zoho configuration and credentials must be stored in environment variables.

Never place API credentials directly in source code.

## 10. Production Deployment

For production deployment:

1. Configure production environment variables.
2. Configure the production PostgreSQL database.
3. Install backend dependencies.
4. Install frontend dependencies.
5. Build the frontend:

```bash
npm run build
```

6. Deploy the frontend and backend using the selected hosting platform.
7. Configure the production API URL.
8. Configure Zoho integration credentials.
9. Test authentication, RBAC, database access, and Zoho People integration.

## 11. Security

Never commit the following to GitHub:

* `.env`
* Database passwords
* JWT secrets
* Zoho API credentials
* Access tokens

The repository `.gitignore` excludes environment files and other generated files.

## 12. Troubleshooting

### Backend does not start

Run:

```bash
npm install
```

Then verify that the required `.env` configuration is present.

### Frontend does not start

Run:

```bash
npm install
npm run dev
```

### Database connection error

Check:

* PostgreSQL is running.
* Database name is correct.
* PostgreSQL username is correct.
* PostgreSQL password is correct.
* Host and port are correct.
* Backend `.env` values are correct.

### Access denied

Check that:

1. The user is authenticated.
2. The user has the expected role.
3. The required permission is assigned to that role.
4. The backend permission middleware is configured correctly.

## 13. Git Workflow

After making project changes:

```bash
git status
git add .
git commit -m "Describe your changes"
git push
```

This updates the GitHub repository with the latest changes.
