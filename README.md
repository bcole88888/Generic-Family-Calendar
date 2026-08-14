# Family Calendar Application

A touchscreen-optimized family calendar and chore tracking application that integrates Google Calendar and Apple Calendar (via CalDAV) with a custom chore management system for kids.

## Features

- **Unified Calendar View**: Displays events from both Google Calendar and Apple Calendar in a single, easy-to-read interface
- **Touchscreen Optimized**: Large buttons and touch-friendly interface designed for tablet/touchscreen displays
- **Chore Tracking**: Individual chore tracking for each child with points system and progress tracking
- **Real-time Updates**: Live clock and automatic event refresh
- **Family-Friendly**: Designed specifically for families with motivating achievement system for kids

## Quick Start

### Prerequisites
- Node.js 18+
- Docker (optional, for containerized deployment)

### Installation

1. Clone/copy this application to your server
2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables in a `.env` file:
   ```
   # Google Calendar Configuration (needed once, for the whole deployment)
   GOOGLE_CLIENT_ID=your_google_client_id_here
   GOOGLE_CLIENT_SECRET=your_google_client_secret_here
   # For local development
   GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback
   # For LAN deployment behind Caddy (see "SSL/HTTPS Setup" below)
   # GOOGLE_REDIRECT_URI=https://familycalendar.your-domain.com/oauth2callback

   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # Only needed if you're running the optional Caddy reverse proxy
   # (docker-compose --profile production). See "SSL/HTTPS Setup" below.
   # DOMAIN=familycalendar.your-domain.com
   # CF_API_TOKEN=your_cloudflare_dns_edit_token
   ```

4. Start the application:
   ```bash
   npm start
   ```

5. Access the calendar at `http://localhost:3000`

6. Open the **Settings** page (gear icon in the top-right nav) to set your family
   name and logo, add your kids, add birthdays, connect Google Calendar, and add
   your Apple Calendar (CalDAV) account. Nothing personal ships in the repo —
   every family's data lives only in their own `data/settings.json` and
   `data/chores.json` (both gitignored).

### Docker Deployment

For production deployment on Proxmox VM:

```bash
# Build and start with Docker Compose
docker-compose up -d

# Or build manually
docker build -t familycalendar .
docker run -d -p 3000:3000 --env-file .env familycalendar
```

## Google Calendar Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one.
3. Enable the **Google Calendar API**.
4. Create OAuth 2.0 credentials:
   - **Application type**: Web application
   - **Authorized redirect URIs**:
     - For local development, add `http://localhost:3000/oauth2callback`
     - For a LAN deployment, add `https://familycalendar.your-domain.com/oauth2callback`
       (Google rejects bare IP addresses and plain `http://`, so a real domain name
       is required here even if it only ever resolves to a private LAN address —
       see "SSL/HTTPS Setup" below)
5. Copy the **Client ID** and **Client Secret** and add them to your `.env` file.

## Apple Calendar Setup

Apple Calendar (CalDAV) is connected from the **Settings** page in the app, not the
`.env` file: enter your Apple ID and an app-specific password, then use "Test
Connection" to verify it.

**Note**: Apple Calendar integration via CalDAV can be complex. The current implementation includes a basic CalDAV client, but you may need to:
1. Ensure two-factor authentication is enabled on the Apple ID
2. Generate an app-specific password if not already done
3. The CalDAV URL for iCloud is typically `https://caldav.icloud.com/`

## Usage

### Settings
Open the gear icon in the top-right nav to configure this instance for your
family:
- **Branding**: app/family name and header icon
- **Kids**: add or remove kids, each gets their own chore tracker
- **Birthdays**: shown as a countdown banner within 22 days of the date
- **Google Calendar**: connect/disconnect, choose the calendar ID, set a display label
- **Apple Calendar**: Apple ID + app-specific password, test connection, set a display label

### Calendar Features
- View unified calendar with events from both Google and Apple calendars
- Navigate between weeks using arrow buttons
- See today's events in a dedicated section
- Authorize Google Calendar access via the "Connect Google" button

### Chore Management
- Each child has their own chore page with daily and weekly tasks
- Tap chores to mark them complete and earn points
- Progress tracking with visual progress bars
- Achievement system with encouraging messages
- Automatic point calculation

### Touchscreen Optimization
- Large, touch-friendly buttons (minimum 50px height)
- Responsive design for different screen sizes
- Hover effects that work well with touch interfaces
- Clear visual feedback for all interactions

## File Structure

```
familycalendar/
├── app.js                 # Express server: middleware, routes, auth, error handling
├── main.js                # Electron desktop wrapper
├── package.json           # Dependencies and scripts
├── .env                   # Environment configuration (gitignored)
├── Dockerfile             # Docker container configuration
├── docker-compose.yml     # Docker Compose setup
├── Caddyfile              # Reverse proxy + Let's Encrypt config (production profile)
├── caddy/
│   └── Dockerfile          # Builds Caddy with the Cloudflare DNS-01 module
├── routes/
│   ├── calendar.js        # Google/Apple calendar + tasks API
│   ├── chores.js          # Chore management routes
│   ├── meals.js           # Weekly meal planning
│   ├── weather.js         # Open-Meteo weather forecast
│   ├── photos.js          # Slideshow photo upload/serve
│   └── lunch-menu.js      # School lunch menu upload/parse
├── config/
│   ├── google-setup.js    # Google OAuth configuration
│   └── apple-calendar.js  # Apple CalDAV client
├── parsers/
│   └── lunch-menu-parser.js # PDF/Word lunch-menu parsing
├── services/
│   ├── json-store.js      # Atomic JSON file persistence
│   └── chore-scheduler.js # node-cron daily/weekly chore resets
├── views/                 # EJS templates (index, chores, error, ...)
├── public/
│   ├── css/               # Stylesheets
│   ├── js/                # Frontend logic (app, calendar, meals, ...)
│   └── uploads/           # Uploaded photos & lunch menus (gitignored)
└── data/                  # JSON data storage (gitignored)
```

### Optional: HTTP Basic Auth

The app has no built-in login. If it is reachable beyond a trusted LAN, set both
`BASIC_AUTH_USER` and `BASIC_AUTH_PASS` in `.env` to require a username/password
for every request. Leave them unset to keep the kiosk open (default).

## Deployment on Proxmox

### VM Setup
1. Create a new Ubuntu/Debian VM in Proxmox
2. Allocate at least 2GB RAM and 20GB storage
3. Install Docker and Docker Compose
4. Copy the application files to the VM
5. Point a DNS name at the VM's LAN IP (see "SSL/HTTPS Setup" below) — this can
   be a router-level DNS override / hosts-file entry, it does not need to be
   reachable from the internet

### SSL/HTTPS Setup

Google's OAuth redirect URI rules reject bare IP addresses and require `https`
(with a narrow exception for `http://localhost`), so a LAN-only deployment still
needs a real domain name and a valid certificate for it — just not public internet
exposure. The included `caddy` service (Docker Compose `production` profile)
handles both automatically using a **DNS-01** challenge against Cloudflare,
which proves domain ownership via a DNS TXT record instead of an inbound HTTP
request. Nothing needs to be reachable from the internet, and Caddy renews the
certificate on its own indefinitely — no cron job, no manual renewal step.

1. In the Cloudflare dashboard, create an API token scoped to just
   **Zone → DNS → Edit** for the zone your domain lives in (not the global API key).
2. Pick a subdomain (e.g. `familycalendar.your-domain.com`) and point it at your
   server's LAN IP via a **local-only** DNS override — a Pi-hole/router DNS entry,
   or a hosts-file entry on the devices that will use it. It does not need (and
   should not have) a public DNS record pointing anywhere internet-reachable.
3. Add to `.env`:
   ```
   DOMAIN=familycalendar.your-domain.com
   CF_API_TOKEN=your_cloudflare_dns_edit_token
   GOOGLE_REDIRECT_URI=https://familycalendar.your-domain.com/oauth2callback
   ```
4. Register `https://familycalendar.your-domain.com/oauth2callback` as an
   authorized redirect URI for the OAuth client in Google Cloud Console.
5. Start the stack with the `production` profile so the `caddy` service runs
   alongside the app:
   ```bash
   docker-compose --profile production up -d
   ```

Caddy issues the certificate on first start and keeps it renewed for as long as
the container keeps running — there's nothing further to maintain.

### Firewall Configuration
Ports 80 and 443 only need to be reachable from your LAN (Caddy uses them to
serve the app and redirect HTTP → HTTPS locally) — with the DNS-01 challenge
above, neither port needs to be forwarded or opened to the internet.

## Troubleshooting

### Google Calendar Not Working
- Verify the Google Client ID and Secret are correct
- Ensure the redirect URI in Google Cloud Console matches exactly
- Check that the Google Calendar API is enabled

### Apple Calendar Not Connecting
- Verify the Apple ID credentials are correct
- Ensure the app-specific password is valid
- Check that two-factor authentication is enabled on the Apple ID

### Chores Not Saving
- Verify the `data` directory exists and is writable
- Check file permissions in the application directory

## Contributing

This is a family-specific application, but feel free to adapt it for your own family's needs by:
- Setting your family name, logo, kids, and birthdays from the in-app Settings page
- Modifying the default chore list in `services/chores-data.js`
- Customizing the styling in `public/css/styles.css`

## License

ISC License - feel free to use and modify for your family's needs.
