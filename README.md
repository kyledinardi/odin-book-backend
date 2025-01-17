# Odin-Book Backend

Backend API for Odin-Book.

## Live

https://odin-book-frontend.pages.dev/

## Frontend

https://github.com/kyledinardi/odin-book-frontend

## Features

- Handle HTTP requests from the frontend
- Authenticate and authorize users with JSON Web Token
- Allow for either username and password or OAuth logins
- Use socket.io to maintain a persistant connection with the frontend for new posts, notifications, and messages

## Installation

1. Open the terminal and clone the repository to your computer: `git clone git@github.com:kyledinardi/odin-book-backend.git`
2. Change to the project directory: `cd odin-book-backend`
3. Install packages: `npm install`
4. Create a .env file in the current directory and add these lines. 
```
CLOUDINARY_URL=<cloudinary-api-url>
DATABASE_URL=<postgres-url>
FRONTEND_URL="http://localhost:5173"
GITHUB_CLIENT_ID=<GitHub-OAuth-client-id>
GITHUB_CLIENT_SECRET=<GitHub-OAuth-client-secret>
JWT_SECRET=<any-string-you-want>
```
5. Start the server: `npm start`