# Project Setup Guide

This React application is built with Vite, Redux Toolkit, Ant Design, and Axios for API communication.

## 🚀 Features

- **React 19** with Vite for fast development
- **Redux Toolkit** for state management
- **Ant Design** for UI components
- **Axios** with interceptors for API calls
- **React Router** for navigation
- **Protected Routes** with authentication
- **Environment Configuration**
- **Modern Layout** with sidebar and header
- **API Service Layer** for organized API calls

## 📦 Dependencies

```json
{
  "dependencies": {
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "react-router-dom": "^6.x",
    "@reduxjs/toolkit": "^2.x",
    "react-redux": "^9.x",
    "antd": "^5.x",
    "@ant-design/icons": "^5.x",
    "axios": "^1.x"
  }
}
```

## 🛠️ Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Create a `.env.local` file in the root directory:
```bash
# Copy from example
cp env.example .env.local
```

Edit `.env.local` with your API configuration:
```env
VITE_API_BASE_URL=http://localhost:5047/api
VITE_API_TIMEOUT=10000
VITE_APP_NAME=Your App Name
```

### 3. Start Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## 🏗️ Project Structure

```
src/
├── components/          # Reusable components
│   ├── layout/         # Layout components
│   └── ProtectedRoute.jsx
├── config/             # Configuration files
│   ├── env.js         # Environment variables
│   └── axios.js       # Axios configuration & interceptors
├── hooks/              # Custom hooks
│   └── redux.js       # Redux hooks
├── pages/              # Page components
│   ├── LoginPage.jsx
│   └── DashboardPage.jsx
├── services/           # API services
│   ├── authService.js
│   └── apiService.js
├── store/              # Redux store
│   ├── index.js       # Store configuration
│   └── slices/        # Redux slices
│       ├── authSlice.js
│       └── uiSlice.js
├── utils/              # Utility functions
│   └── helpers.js
└── App.jsx            # Main application component
```

## 🔐 Authentication

### Login Credentials (Demo)
- **Admin**: username: `admin`, password: `admin123`
- **User**: username: `user`, password: `user123`

### API Integration
The login endpoint expects:
```json
{
  "role": "admin",
  "username": "admin",
  "password": "admin123"
}
```

Response format:
```json
{
  "statusCode": 200,
  "message": "Login successful",
  "data": {
    "token": "jwt_token_here",
    "role": "admin",
    "userId": "user_id_here",
    "success": true
  }
}
```

## 🌐 API Configuration

### Axios Interceptors
- **Request Interceptor**: Automatically adds JWT token to headers
- **Response Interceptor**: Handles errors globally and displays messages

### Environment Variables
- `VITE_API_BASE_URL`: Base URL for API calls
- `VITE_API_TIMEOUT`: Request timeout in milliseconds

## 📱 Features

### Authentication
- Login/Logout functionality
- Protected routes
- Token management
- Auto-redirect on authentication

### UI/UX
- Modern dashboard layout
- Responsive design
- Collapsible sidebar
- User dropdown menu
- Loading states
- Error handling

### State Management
- Redux Toolkit for global state
- Auth slice for authentication
- UI slice for interface state
- Custom hooks for easy access

## 🔧 Development

### Adding New Pages
1. Create component in `src/pages/`
2. Add route in `src/App.jsx`
3. Add navigation item in `src/components/layout/MainLayout.jsx`

### Adding New API Services
1. Add service methods in `src/services/apiService.js`
2. Create Redux slice if needed
3. Use in components with proper error handling

### Customizing Theme
Modify the theme configuration in `src/App.jsx`:
```jsx
const theme = {
  token: {
    colorPrimary: '#1890ff',
    borderRadius: 6,
  },
};
```

## 🚀 Building for Production

```bash
npm run build
```

## 📋 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🔍 API Endpoints

### Authentication
- `POST /Auth/login` - User login
- `POST /Auth/logout` - User logout
- `GET /Auth/profile` - Get user profile

### Dashboard
- `GET /dashboard/stats` - Get dashboard statistics
- `GET /dashboard/activities` - Get recent activities

### Users
- `GET /users` - Get all users
- `GET /users/:id` - Get user by ID
- `POST /users` - Create new user
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user

## 🐛 Common Issues

### CORS Errors
Ensure your API server has CORS configured for the frontend URL.

### Environment Variables
Make sure environment variables start with `VITE_` prefix for Vite to include them.

### Token Expiration
The app automatically handles token expiration and redirects to login page.

## 🎯 Next Steps

1. **Add More Pages**: Create additional pages as needed
2. **API Integration**: Connect to your actual backend APIs
3. **Testing**: Add unit and integration tests
4. **Deployment**: Configure for your deployment environment
5. **Monitoring**: Add error tracking and analytics 