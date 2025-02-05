# Development Guide

## Project Structure
```
dashboard/
├── src/
│   ├── components/
│   │   └── dashboard/
│   │       ├── Dashboard.tsx
│   │       ├── ServiceHealth.tsx
│   │       ├── PerformanceMetrics.tsx
│   │       └── WorkflowVisualization.tsx
│   ├── features/
│   │   ├── auth/
│   │   │   └── authSlice.ts
│   │   └── settings/
│   │       └── settingsSlice.ts
│   ├── services/
│   │   └── store/
│   │       └── index.ts
│   ├── App.tsx
│   ├── index.tsx
│   └── index.css
```

## Architecture

### Frontend Components
1. **Dashboard**: Main container component with tabbed navigation
2. **ServiceHealth**: Real-time service status monitoring
3. **PerformanceMetrics**: System performance visualization with charts
4. **WorkflowVisualization**: Email processing workflow visualization

### State Management
- Redux Toolkit for state management
- Features:
  - Auth: User authentication state
  - Settings: Application settings and preferences

### API Integration
- RESTful API endpoints at `http://localhost:3001/api/`
- Real-time updates using polling (5-10 second intervals)

## Setup Instructions

1. Install Dependencies:
```bash
npm install
```

2. Required Dependencies:
- @mui/material
- @mui/icons-material
- @emotion/react
- @emotion/styled
- @reduxjs/toolkit
- react-redux
- recharts
- web-vitals

3. Development Server:
```bash
npm start
```

## Code Style
- TypeScript for type safety
- Material-UI for consistent design
- ESLint for code quality
- Prettier for code formatting

## Testing
```bash
npm test
```

## Building for Production
```bash
npm run build
``` 