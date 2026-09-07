# AccelRestaurants V2

A comprehensive digital signage platform for restaurants, built with React, TypeScript, Vite, Firebase, and Zustand.

The independent source repository is [AccelAnalysis/AccelRestaurants_V2](https://github.com/AccelAnalysis/AccelRestaurants_V2). Work from a clone outside the old Sweet Beans working tree. See [repository recovery notes](docs/REPOSITORY_RECOVERY.md) for provenance, verification, and known check failures.

The checked-in `.env.example` files list variable names with empty values. Supply client configuration locally in `.env.local`; keep server credentials in Firebase Secret Manager or local ignored environment files. Never expose server secret keys through a `VITE_` variable. Building and running unit tests does not require deploying to Firebase.

## Features

- **Multi-Organization Support**: Manage multiple restaurant locations with role-based access control
- **Slide Editor**: Drag-and-drop slide creation with various tile types (text, images, data, interactive)
- **Campaign Management**: Schedule and manage digital signage campaigns
- **Data Connection & QR Surveys**: QR code overlays enabling real-time data collection through surveys (NPS, satisfaction, feedback, engagement questionnaires) with attached promotions; collected data can be used internally for insights or displayed live as charts/graphs on screens
- **User Management**: Invite users, manage roles, and permissions
- **Real-time Player**: Display slides on connected screens via web players
- **Designer Marketplace**: Connect restaurants with professional designers
- **Admin Dashboard**: Platform-wide administration tools

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: Firebase (Firestore, Functions, Storage, Auth)
- **State Management**: Zustand
- **UI Components**: Radix UI, Lucide Icons
- **Charts**: Recharts
- **Drag & Drop**: React DnD

## Getting Started

### Prerequisites

- Node.js 20.19+ (the Firebase Functions runtime is Node.js 20)
- Firebase CLI
- SendGrid account (for email)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/AccelAnalysis/AccelRestaurants_V2.git
   cd AccelRestaurants_V2
   ```

2. Install dependencies:
   ```bash
   npm ci
   npm ci --prefix functions
   ```

3. Configure the existing Firebase project:
   - The preserved `.firebaserc` selects `accelrestaurant-d2c1f`.
   - Copy `.env.example` to `.env.local` and supply the project's client configuration locally.
   - `functions/.env.example` lists backend environment and secret names. Keep private values out of Git; deployed Functions use Firebase Secret Manager for the names declared with `defineSecret`.
   - Client variables prefixed with `VITE_` are included in browser bundles. Use only publishable client configuration there.

4. Verify the source without deploying:
   ```bash
   npm run build
   npm run lint
   npm run build --prefix functions
   npm test --prefix functions -- --runInBand
   ```
   The recovered Functions test suite currently fails on Jest loading the ESM `nanoid` package. See the recovery notes for details.

5. Start the development server:
   ```bash
   npm run dev
   ```

## Deployment

### Frontend (Firebase Hosting)

1. Build the app:
   ```bash
   npm run build
   ```

2. Deploy to Firebase Hosting:
   ```bash
   firebase deploy --only hosting
   ```

### Backend (Firebase Functions)

1. Deploy functions:
   ```bash
   firebase deploy --only functions
   ```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── atoms/          # Basic components
│   ├── molecules/      # Composite components
│   └── organisms/      # Complex components
├── pages/              # Page components
├── services/           # API and business logic
├── store/              # Zustand stores
├── hooks/              # Custom hooks
├── lib/                # Utilities and constants
└── types/              # TypeScript type definitions

functions/
└── src/                # Firebase Cloud Functions
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

### Code Style

- Use TypeScript for all new code
- Follow React best practices
- Use Tailwind CSS for styling
- Commit messages should follow conventional commits

## Security

- All sensitive operations use Firebase Functions (server-side)
- Firestore rules enforce data access controls
- Authentication required for all user actions
- Environment variables used for secrets

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is proprietary software owned by AccelRestaurants.
