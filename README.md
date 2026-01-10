# MedFlow

<img width="1470" height="838" alt="Screenshot 2026-01-10 at 5 14 02 PM" src="https://github.com/user-attachments/assets/4941145c-ef9c-421a-8583-ca3eb2bbaef1" />

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Zustand (state management)
- Shadcn/ui

No backend because of time, but with more development time a backend can be added.

## Prerequisites

- Node.js
- pnpm

### How to install pnpm 

```bash
npm install -g pnpm
```

```bash
git clone https://github.com/BrandonwLii/MedFlow.git
cd medflow
```

### Install dependencies

```bash
cd frontend
pnpm install
```

### Start the dev server

```bash
pnpm dev
```

The application will be available at `http://localhost:5173`
                         
## Project Structure

```
MedFlow/
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── stores/        # Zustand state stores
│   │   ├── hooks/         # Custom React hooks
│   │   ├── types/         # TypeScript type definitions
│   │   ├── utils/         # Utility functions
│   │   └── App.tsx        # Main application component
│   ├── package.json
│   └── vite.config.ts
└── backend/               # Backend (placeholder)
```
