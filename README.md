# FSPro - Employee Management System

A comprehensive employee management system built with React and Firebase.

## Features

- **Employee Dashboard**: Personal dashboard with attendance tracking
- **Check-in/Check-out**: Time tracking with validation rules
- **Timetable Management**: Weekly schedule management
- **Progress Reports**: Employee progress tracking and reporting
- **Holiday Requests**: Holiday request submission and management
- **Task Management**: Task assignment and tracking
- **Compensation Management**: Employee compensation tracking
- **Admin Panel**: Complete administrative control

## Tech Stack

- **Frontend**: React 18, Vite
- **Backend**: Firebase (Firestore, Authentication)
- **Styling**: CSS3 with responsive design
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Notifications**: React Hot Toast

## Deployment

This project is configured for Netlify deployment with proper SPA routing support.

### Build Commands

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Preview production build
npm run preview
```

### Netlify Configuration

The project includes:
- `netlify.toml` - Netlify configuration
- `public/_redirects` - SPA routing support
- Optimized build settings in `vite.config.js`

### Environment

- Node.js 18+
- Firebase project configured
- All Firebase credentials included in config

## Development

```bash
# Start development server
npm run dev
```

The application will be available at `http://localhost:3000`

## Project Structure

```
src/
├── components/          # React components
├── config/             # Firebase configuration
├── context/            # React context providers
├── services/           # Business logic and API services
├── styles/             # Global styles
└── utils/              # Utility functions
```

## Features Overview

### Employee Features
- Personal dashboard with statistics
- Check-in/check-out with time validation
- Timetable viewing and management
- Progress report submission
- Holiday request submission
- Task viewing and updates
- Compensation tracking

### Admin Features
- Employee management
- Attendance monitoring
- Timetable administration
- Progress report review
- Holiday request approval
- Task assignment and management
- Compensation management
- Comprehensive reporting

## Mobile Responsive

The application is fully responsive and optimized for:
- Mobile phones (≤480px)
- Tablets (481px-768px)
- Desktop (>768px)

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
