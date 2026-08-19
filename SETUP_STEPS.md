# CodeQuest — Google Sign-In, Forgot Password, Login Redesign

Everything in this zip goes into your project at the **exact same paths** —
just extract it directly into your `codequest_game` folder and let it
overwrite the matching files.

## What's included

**Google Sign-In**
- `client/src/main.jsx` — wraps the app in `GoogleOAuthProvider`
- `client/src/context/AuthContext.jsx` — `loginWithGoogle()` function
- `server/controllers/authController.js` — `googleAuth` handler (verify token, create/link account)
- `server/routes/index.js` — `POST /api/auth/google`
- `server/config/google-auth-migration.sql` — adds `google_id` column, makes `password` nullable

**Forgot / reset password**
- `client/src/pages/ForgotPasswordPage.jsx` — new page
- `client/src/pages/ResetPasswordPage.jsx` — new page
- `client/src/App.jsx` — routes for both pages
- `server/controllers/authController.js` — `forgotPassword` / `resetPassword` handlers
- `server/routes/index.js` — `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`
- `server/config/password-reset-migration.sql` — adds `reset_token`, `reset_token_expires` columns

**Login page redesign (medieval theme, matches HomePage)**
- `client/src/pages/LoginPage.jsx` — rebuilt with castle background, parchment card, gold button
- `client/src/index.css` — `.login-*` styles

**Password show/hide eye toggle**
- `client/src/components/UI.jsx` — `eye` / `eyeOff` icons added
- (styles included in `index.css` above)
- Applied in `LoginPage.jsx` and `ResetPasswordPage.jsx`

**Config**
- `client/package.json`, `client/.env.example` — `@react-oauth/google` dependency
- `server/package.json`, `server/.env.example` — `google-auth-library` dependency
- `server/config/schema.sql` — updated for fresh installs (all new columns included)

---

## Setup steps

### 1. Extract this zip into your project
Drop it directly into `codequest_game/` so paths line up and overwrite the
matching files.

### 2. Install the new packages
```bash
cd client && npm install
cd ../server && npm install
```

### 3. Set up your `.env` files
**`client/.env`** (create from `client/.env.example` if it doesn't exist):
```
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id_here
```

**`server/.env`** — add this line to your existing file:
```
GOOGLE_CLIENT_ID=your_google_oauth_client_id_here
```
Use the **same client ID** in both. Get it from
[Google Cloud Console](https://console.cloud.google.com/apis/credentials) →
create an OAuth Client ID (Web application) → add `http://localhost:5173`
as an authorized JavaScript origin.

### 4. Run the database migrations
```bash
cd server
mysql -u root -p codequest < config/google-auth-migration.sql
mysql -u root -p codequest < config/password-reset-migration.sql
```
(Skip these two if you're setting up the database fresh from `schema.sql` —
it already includes both changes.)

### 5. Restart both dev servers
Vite and Node only read `.env` at startup — stop and restart both:
```bash
# terminal 1
cd server && npm run dev

# terminal 2
cd client && npm run dev
```

### 6. Test it
Open `http://localhost:5173/login` and check:
- Google button appears and signs you in
- "Forgot password?" link → enter email → reset link shown on screen → set new password → log in with it
- Eye icon toggles password visibility on both the login and reset-password forms
- Page matches the castle/parchment theme from your homepage

---

## For your teammates
`node_modules` isn't included (too large, and shouldn't be committed to git).
After pulling these changes, teammates need to run `npm install` in both
`client/` and `server/`, and create their own `.env` files with the same
variable names shown above.
