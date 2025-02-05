# Development Log

## Project: AiMail
## Version: 1.0.0
## Environment: Development

### [2024-02-04] - Initial Setup and Code Audit

#### Current Structure Analysis:
1. Backend Structure:
   - ✅ src/
     - ✅ api/
     - ✅ core/
     - ✅ db/
     - ✅ models/
     - ✅ schemas/
     - ✅ services/
   - ✅ tests/
   - ✅ alembic/
   - ✅ logs/

2. Missing Components:
   - ✅ src/services/auth/auth_service.py
   - ✅ src/schemas/auth.py
   - ✅ src/services/email/
   - [ ] src/services/imap/
   - [ ] src/services/smtp/
   - [ ] src/services/ai/
   - [ ] src/utils/
   - [ ] src/tasks/

3. Configuration Status:
   - ✅ Database configuration
   - ✅ Redis configuration
   - ✅ JWT authentication
   - ✅ Logging setup
   - ✅ Email configuration
   - [ ] Task queue setup
   - [ ] AI integration

4. Testing Coverage:
   - ✅ Basic user tests
   - [ ] Authentication tests
   - [ ] Email service tests
   - [ ] Integration tests
   - [ ] API endpoint tests

### [2024-02-04] - Authentication and Email Service Implementation

#### Completed Tasks:
1. Created Authentication Service:
   - ✅ User authentication
   - ✅ JWT token management
   - ✅ Password reset functionality
   - ✅ Email verification

2. Implemented Email Service:
   - ✅ SMTP integration
   - ✅ Email templates (HTML & Text)
   - ✅ Password reset emails
   - ✅ Verification emails
   - ✅ Welcome emails

3. Added Email Templates:
   - ✅ Password reset templates
   - ✅ Email verification templates
   - ✅ Welcome email templates

### Next Steps:
1. Implement IMAP Service:
   - [ ] IMAP connection management
   - [ ] Email fetching and syncing
   - [ ] Folder management
   - [ ] Search functionality

2. Implement SMTP Service:
   - [ ] SMTP connection management
   - [ ] Email sending
   - [ ] Draft management
   - [ ] Attachment handling

3. Implement AI Service:
   - [ ] OpenAI integration
   - [ ] Email categorization
   - [ ] Spam detection
   - [ ] Smart replies

4. Add Task Queue:
   - [ ] Celery integration
   - [ ] Background tasks
   - [ ] Scheduled tasks
   - [ ] Email processing queue

5. Testing:
   - [ ] Unit tests for all services
   - [ ] Integration tests
   - [ ] API endpoint tests
   - [ ] Performance tests

6. Documentation:
   - [ ] API documentation
   - [ ] Setup guide
   - [ ] Development guide
   - [ ] Deployment guide

## Components Created
1. WorkflowDashboard
   - Animated workflow visualization
   - Real-time agent status monitoring
   - Statistics panel
   - Interactive step cards with tooltips

2. Dashboard
   - Overview statistics
   - Recent activity section
   - Responsive grid layout

3. Layout
   - Main application structure
   - Sidebar integration
   - Responsive design

4. Sidebar
   - Navigation menu
   - Active route highlighting
   - Modern design with hover effects

5. Placeholder Components
   - Login
   - Register
   - Analytics
   - Settings
   - EmailDashboard

## Dependencies Added
- framer-motion: For workflow animations
- @mui/material: UI components
- @mui/icons-material: Icons

## Next Steps
1. Implement authentication flow
   - Complete Login component
   - Complete Register component
   - Add JWT handling

2. Complete EmailDashboard
   - Email list view
   - Email details view
   - AI response generation

3. Complete Settings
   - Email configuration
   - Notification preferences
   - Theme settings

4. Complete Analytics
   - Email statistics
   - Response time metrics
   - AI performance analytics

5. Add Real-time Updates
   - WebSocket integration
   - Live status updates
   - Real-time notifications

## Known Issues
1. Need to implement proper authentication check in ProtectedRoute
2. Need to connect workflow visualization to actual email processing status
3. Need to implement statistics data fetching

## Code Organization and Cleanup

### Duplicate Files Removal
- Removed duplicate config directory (using `src/core/config.py` as the main configuration)
- Consolidated email services under `src/services/email/`
- Removed duplicate auth service files:
  - Removed `login.py`
  - Removed `registration.py`
  - Removed `token_management.py`
  - Using consolidated `auth_service.py`

### Configuration Updates
- Fixed session service configuration:
  - Changed from `SESSION_EXPIRY_DAYS` to `SESSION_EXPIRE_MINUTES`
  - Added proper cookie settings
  - Added secure and same-site flags based on DEBUG mode

### Middleware Improvements
- Created proper middleware classes:
  ```python
  class RateLimitMiddleware(BaseHTTPMiddleware):
      async def dispatch(self, request, call_next):
          return await rate_limit_middleware(request, call_next)

  class SessionMiddleware(BaseHTTPMiddleware):
      async def dispatch(self, request, call_next):
          return await session_middleware(request, call_next)
  ```
- Fixed middleware order:
  1. CORS Middleware
  2. Rate Limiting Middleware
  3. Session Middleware
  4. Logging Middleware
  5. Metrics Middleware (if enabled)

### API Endpoints Organization
- Added missing endpoints:
  - Email endpoints (`src/api/v1/endpoints/email.py`)
  - User endpoints (`src/api/v1/endpoints/users.py`)
- Fixed imports and dependencies
- Proper error handling and validation

## Current Architecture

### Authentication Flow
1. User registration via `/api/v1/auth/register`
2. Login via `/api/v1/auth/login` to get JWT tokens
3. Token refresh via `/api/v1/auth/refresh`
4. Email verification and password reset functionality

### Session Management
- Redis-based session storage
- Secure cookie handling
- Session cleanup for expired sessions
- Session data attached to request state

### Rate Limiting
- Redis-based rate limiting
- Different limits for different endpoints:
  - Auth endpoints: 5 requests/5 minutes
  - Password reset: 3 requests/15 minutes
  - Email verification: 3 requests/15 minutes
  - AI endpoints: 10 requests/minute

### Security Features
- JWT Authentication
- Rate limiting
- Session management
- CORS protection
- Secure cookie handling
- API key support for higher rate limits 

## Dashboard Development

### Dashboard Architecture
- Frontend Framework: React with TypeScript
- State Management: Redux Toolkit
- UI Components: Material-UI (MUI)
- Data Visualization: Recharts
- API Integration: Axios with interceptors

### Core Dashboard Features
1. Authentication Views
   - Login page with JWT handling
   - Registration flow
   - Password reset interface
   - Email verification status

2. Email Management Interface
   - Email list with infinite scrolling
   - Thread view with conversation history
   - Compose email with rich text editor
   - Folder navigation sidebar
   - Search functionality with filters

3. User Settings Panel
   - Profile management
   - Email preferences
   - Signature settings
   - Vacation responder
   - Theme customization

4. AI Features Dashboard
   - Email analysis insights
   - Response suggestions
   - Priority inbox management
   - Thread summarization

5. Analytics & Monitoring
   - Email statistics
   - Response time metrics
   - Storage usage
   - API rate limit status

### Implementation Steps
1. Project Setup
   ```bash
   # Initialize React project with TypeScript
   npx create-react-app dashboard --template typescript
   cd dashboard
   
   # Install core dependencies
   npm install @mui/material @emotion/react @emotion/styled
   npm install @reduxjs/toolkit react-redux
   npm install axios recharts react-router-dom
   ```

2. Project Structure
   ```
   src/
   ├── components/
   │   ├── auth/
   │   ├── email/
   │   ├── settings/
   │   └── analytics/
   ├── features/
   │   ├── auth/
   │   ├── email/
   │   └── settings/
   ├── services/
   │   ├── api/
   │   └── store/
   └── utils/
   ```

### Current Progress
- [x] Project initialization
- [x] Core dependencies setup
- [x] Basic folder structure
- [ ] Authentication views
- [ ] Email management interface
- [ ] Settings panel
- [ ] AI features integration
- [ ] Analytics dashboard 

## Dashboard Development Progress

### Completed Components
1. Layout Component
   - Responsive drawer layout
   - Navigation menu
   - Mobile-friendly design
   - Dark mode support

2. Authentication Views
   - Login form with email/password
   - Registration form with validation
   - Form state management
   - Navigation integration

3. Email Dashboard
   - Email list with mock data
   - Star/unstar functionality
   - Delete functionality
   - Read/unread states
   - Compose button
   - Responsive design

4. Settings Panel
   - Notification preferences
   - Dark mode toggle
   - Email signature editor
   - Vacation responder
   - Form state management

5. Analytics Dashboard
   - Email volume chart
   - Response time metrics
   - Email categories breakdown
   - Storage usage stats
   - AI usage metrics

### Next Steps
1. API Integration
   - Connect authentication forms to backend
   - Implement email CRUD operations
   - Add settings persistence
   - Real-time data for analytics

2. Features to Add
   - Email compose modal
   - Email thread view
   - Search functionality
   - Filters and sorting
   - Attachment handling

3. Enhancements
   - Loading states
   - Error handling
   - Form validation
   - Success notifications
   - Offline support

4. Testing
   - Unit tests for components
   - Integration tests
   - E2E testing
   - Performance testing

### Current Issues
1. Need to implement proper error handling
2. Add loading states for async operations
3. Implement form validation
4. Add proper TypeScript interfaces
5. Set up proper routing guards

### Optimizations Needed
1. Code splitting
2. Lazy loading
3. Memoization
4. Virtual scrolling for email list
5. Image optimization 

## Authentication Implementation

### API Integration
1. Base Setup
   - Configured Axios instance with base URL
   - Added request/response interceptors
   - Implemented token refresh mechanism
   - Added error handling

2. Redux Integration
   - Created auth slice with actions and reducers
   - Implemented login/register thunks
   - Added token management
   - Set up protected routes

3. Components
   - Enhanced Login component with:
     - Form validation
     - Error handling
     - Loading states
     - Redirect logic
   - Enhanced Register component with:
     - Form validation
     - Password confirmation
     - Error handling
     - Loading states
   - Added ProtectedRoute component for route protection

### Security Features
1. Token Management
   - JWT token storage in localStorage
   - Automatic token refresh
   - Token cleanup on logout
   - Secure token handling

2. Route Protection
   - Protected route wrapper
   - Authentication state management
   - Redirect handling
   - Loading states

3. Error Handling
   - Form validation
   - API error handling
   - User feedback
   - Error state management

### Next Steps
1. Session Management
   - Implement session timeout
   - Add session refresh
   - Handle multiple tabs
   - Add session recovery

2. Security Enhancements
   - Add CSRF protection
   - Implement rate limiting
   - Add password strength validation
   - Add 2FA support

3. User Experience
   - Add remember me functionality
   - Implement password reset
   - Add email verification
   - Improve error messages 

## Port Configuration Status [2024-02-03]
- Frontend (Dashboard): 3444
- Backend (Server): 3555
- WebSocket: ws://localhost:3555

### Environment Configuration Status
1. Dashboard (.env)
```env
PORT=3444
REACT_APP_API_URL=http://localhost:3555
REACT_APP_WEBSOCKET_URL=ws://localhost:3555
# Project Info and Feature Flags configured
```

2. Server (.env)
```env
PORT=3555
# Complete configuration with:
- OpenAI settings
- Admin settings
- JWT/Session
- CORS
- SMTP
- IMAP
```

### Current Stack
- Frontend: React Dashboard
- Backend: Node.js Server
- Email: SMTP + IMAP (Hostinger)
- AI: OpenAI GPT-4
- Authentication: JWT + Session

### Configuration Checklist
- [x] Port configuration
- [x] CORS settings
- [x] API endpoints
- [x] WebSocket setup
- [x] Email configuration
- [x] OpenAI integration
- [x] Admin settings
- [x] Security settings

### Pending Tasks
1. Test IMAP connection
2. Verify WebSocket functionality
3. Test OpenAI integration
4. Validate email sending/receiving
5. Security audit of configurations 

# Development Status [2024-02-03]

## Server Status
1. Backend Server (3555)
   ✅ Server Running Successfully
   - API Root: http://localhost:3555/
   - API Docs: http://localhost:3555/docs
   - Health: http://localhost:3555/health
   - Environment: development
   - Version: 1.0.0

2. Frontend Server (3444)
   ✅ Server Starting
   - URL: http://localhost:3444
   - Hot Module Replacement enabled
   - React development mode

## API Endpoints Status
1. Core Endpoints
   - [x] GET / - API Status
   - [x] GET /health - Health Check
   - [x] GET /docs - API Documentation
   - [ ] GET /api/* - API Routes

2. Authentication Endpoints
   - [ ] POST /api/auth/login
   - [ ] POST /api/auth/register
   - [ ] POST /api/auth/refresh
   - [ ] POST /api/auth/logout

3. Email Endpoints
   - [ ] GET /api/emails
   - [ ] POST /api/emails/send
   - [ ] GET /api/emails/{id}
   - [ ] DELETE /api/emails/{id}

## Next Integration Steps
1. Frontend-Backend Connection
   - [ ] Test API connectivity
   - [ ] Implement authentication flow
   - [ ] Set up WebSocket connection
   - [ ] Configure email services

2. Testing Suite
   - [ ] API endpoint tests
   - [ ] Authentication flow tests
   - [ ] Email processing tests
   - [ ] Integration tests

3. Deployment Preparation
   - [ ] Environment configuration
   - [ ] Docker setup
   - [ ] CI/CD pipeline
   - [ ] Monitoring setup

## Monitoring Points
1. Server Health
   - Backend API status
   - Frontend compilation
   - WebSocket connection
   - Database connection

2. Performance Metrics
   - API response times
   - Frontend load time
   - WebSocket latency
   - Resource usage 

# Authentication Information [2024-02-03]

## Default Admin Credentials
```
Email: ai@deployx.in
Password: Pa55w0rd@2025
```

## Authentication Endpoints
1. Login:
   ```
   POST http://localhost:3555/api/auth/login
   Content-Type: application/x-www-form-urlencoded
   
   username=ai@deployx.in
   password=Pa55w0rd@2025
   ```

2. Refresh Token:
   ```
   POST http://localhost:3555/api/auth/refresh
   Authorization: Bearer <access_token>
   ```

3. Logout:
   ```
   POST http://localhost:3555/api/auth/logout
   Authorization: Bearer <access_token>
   ```

## Authentication Flow
1. User submits login credentials
2. Backend validates credentials
3. Returns access_token and refresh_token
4. Frontend stores tokens
5. Uses access_token for API calls
6. Uses refresh_token to get new access_token

## Security Notes
- Access token expires in 30 minutes
- Refresh token expires in 7 days
- Tokens are JWT format
- CORS is configured for frontend origin
- Passwords are hashed with bcrypt

## Testing Authentication
1. Login Request:
   ```bash
   curl -X POST http://localhost:3555/api/auth/login \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "username=ai@deployx.in&password=Pa55w0rd@2025"
   ```

2. Expected Response:
   ```json
   {
     "access_token": "eyJ...",
     "refresh_token": "eyJ...",
     "token_type": "bearer"
   }
   ``` 

# User Registration Process [2024-02-03]

## Admin User Creation
1. Register Admin:
   ```
   POST http://localhost:3555/api/auth/register
   Content-Type: application/json
   
   {
     "email": "ai@deployx.in",
     "password": "Pa55w0rd@2025",
     "full_name": "Admin User",
     "is_superuser": true
   }
   ```

2. Test Registration:
   ```bash
   curl -X POST http://localhost:3555/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "ai@deployx.in",
       "password": "Pa55w0rd@2025",
       "full_name": "Admin User",
       "is_superuser": true
     }'
   ```

## Login Steps
1. Register user (if not exists)
2. Login with credentials:
   ```bash
   curl -X POST http://localhost:3555/api/auth/login \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "username=ai@deployx.in&password=Pa55w0rd@2025"
   ```

3. Store tokens:
   - Save access_token for API calls
   - Save refresh_token for token renewal
   - Set Authorization header: `Bearer <access_token>`

## User Management
1. Create User:
   - Register via /api/auth/register
   - Set is_superuser for admin access
   - Verify email (if enabled)

2. Update User:
   - Update profile via /api/users/me
   - Change password
   - Update settings

3. Delete User:
   - Requires admin access
   - Removes all user data
   - Invalidates tokens 

# Database Setup Status [2024-02-03]

## Database Configuration
✅ PostgreSQL Database
- Host: localhost
- Port: 5432
- Database: aimail
- User: postgres
- Password: postgres

## Tables Created
1. Users
   - Authentication and user profile
   - Email preferences and settings

2. Emails
   - Email messages
   - Linked to users and threads

3. Threads
   - Email conversations
   - Message grouping

4. Labels
   - Custom email categorization
   - User-defined organization

5. Folders
   - System and custom folders
   - Email organization

6. Attachments
   - Email attachments
   - File storage

7. Email Labels
   - Many-to-many relationship
   - Email categorization

## Migration Status
✅ Initial Migration Complete
- All tables created
- Indexes set up
- Foreign keys configured

## Next Steps
1. Create Admin User
   ```bash
   curl -X POST http://localhost:3555/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "ai@deployx.in",
       "password": "Pa55w0rd@2025",
       "full_name": "Admin User",
       "is_superuser": true
     }'
   ```

2. Test Database Connection
   ```python
   await db.execute("SELECT 1")
   ```

3. Create Default Labels
   - Inbox
   - Sent
   - Drafts
   - Trash
   - Important

4. Create Default Folders
   - Inbox
   - Sent
   - Drafts
   - Trash
   - Archive

# Docker Database Setup [2024-02-03]

## Services
1. PostgreSQL:
   - Image: postgres:15-alpine
   - Port: 5432
   - Credentials:
     ```
     User: postgres
     Password: postgres
     Database: aimail
     ```
   - Connection URL:
     ```
     postgresql+asyncpg://postgres:postgres@localhost:5432/aimail
     ```

2. Redis:
   - Image: redis:7-alpine
   - Port: 6379
   - URL: redis://localhost:6379/0
   - Used for:
     - Session management
     - Rate limiting
     - Caching

## Container Management
1. Start Services:
   ```bash
   docker-compose up -d
   ```

2. Check Status:
   ```bash
   docker-compose ps
   ```

3. View Logs:
   ```bash
   docker-compose logs -f
   ```

4. Stop Services:
   ```bash
   docker-compose down
   ```

## Database Access
1. Connect to PostgreSQL:
   ```bash
   docker exec -it aimailcopy2-db-1 psql -U postgres -d aimail
   ```

2. Connect to Redis:
   ```bash
   docker exec -it aimailcopy2-redis-1 redis-cli
   ```

## Health Checks
- PostgreSQL: Checks every 5s using `pg_isready`
- Redis: Checks every 5s using `ping`
- Both services configured with 5 retries

## Data Persistence
- PostgreSQL data: `postgres_data` volume
- Redis data: `redis_data` volume
- Data survives container restarts

## Next Steps
1. Run Database Migrations:
   ```bash
   cd backend
   alembic upgrade head
   ```

2. Verify Connections:
   ```python
   # Test database connection
   await db.execute("SELECT 1")
   
   # Test Redis connection
   await redis.ping()
   ```

3. Create Admin User:
   ```bash
   curl -X POST http://localhost:3555/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "ai@deployx.in",
       "password": "Pa55w0rd@2025",
       "full_name": "Admin User",
       "is_superuser": true
     }'
   ```

### [2024-02-04] - Service Implementation

#### Completed Services:
1. IMAP Service:
   - ✅ Connection management
   - ✅ Provider detection
   - ✅ Folder management
   - ✅ Email syncing
   - ✅ Search functionality

2. SMTP Service:
   - ✅ Connection management
   - ✅ Email sending
   - ✅ Draft management
   - ✅ Attachment handling
   - ✅ Retry logic

3. AI Service:
   - ✅ OpenAI integration
   - ✅ Email categorization
   - ✅ Smart replies
   - ✅ Sentiment analysis
   - ✅ Action item extraction
   - ✅ Thread summarization
   - ✅ Language detection
   - ✅ Spam detection
   - ✅ Redis caching

4. Task Queue:
   - ✅ Celery setup
   - ✅ Email tasks
   - ✅ AI tasks
   - ✅ Sync tasks
   - ✅ Task scheduling
   - ✅ Error handling
   - ✅ Retry logic

### Next Steps:
1. Frontend Development:
   - [ ] Email dashboard
   - [ ] Folder navigation
   - [ ] Email composition
   - [ ] Settings panel
   - [ ] AI features UI

2. Testing:
   - [ ] Unit tests
   - [ ] Integration tests
   - [ ] E2E tests
   - [ ] Performance tests

3. Documentation:
   - [ ] API documentation
   - [ ] Setup guide
   - [ ] Development guide
   - [ ] Deployment guide

### Service Architecture

#### IMAP Service
- Connection pooling with async support
- Provider-specific configurations
- Automatic reconnection
- Folder synchronization
- Email fetching and caching

#### SMTP Service
- Connection pooling
- Retry mechanism
- Attachment handling
- Draft management
- Error handling

#### AI Service
- GPT-4 integration
- Redis caching
- Multiple AI features
- Batch processing
- Error handling

#### Task Queue
- Multiple queues (email, ai, sync)
- Scheduled tasks
- Retry policies
- Error handling
- Monitoring

### Current Status:
- Backend services are implemented
- Task queue is configured
- AI integration is complete
- Basic error handling is in place

### Known Issues:
1. Need to implement proper error handling for IMAP timeouts
2. Need to add rate limiting for AI requests
3. Need to implement connection pooling optimization
4. Need to add monitoring and alerts

### Next Implementation Phase:
1. Frontend Development:
   ```typescript
   // Component structure
   src/
   ├── components/
   │   ├── email/
   │   │   ├── EmailList.tsx
   │   │   ├── EmailView.tsx
   │   │   ├── Compose.tsx
   │   │   └── Folders.tsx
   │   ├── ai/
   │   │   ├── SmartReply.tsx
   │   │   ├── Categories.tsx
   │   │   └── Summary.tsx
   │   └── settings/
   │       ├── Account.tsx
   │       ├── Email.tsx
   │       └── AI.tsx
   ```

2. API Integration:
   ```typescript
   // API client setup
   const api = {
     email: {
       list: () => axios.get('/api/emails'),
       send: (data) => axios.post('/api/emails/send', data),
       sync: () => axios.post('/api/emails/sync')
     },
     ai: {
       analyze: (id) => axios.post(`/api/ai/analyze/${id}`),
       reply: (id) => axios.post(`/api/ai/reply/${id}`)
     }
   }
   ```

3. State Management:
   ```typescript
   // Redux store setup
   const store = configureStore({
     reducer: {
       emails: emailsReducer,
       folders: foldersReducer,
       ai: aiReducer,
       settings: settingsReducer
     }
   })
   ```

### Performance Considerations:
1. Email Syncing:
   - Implement incremental sync
   - Use connection pooling
   - Cache folder listings

2. AI Processing:
   - Implement request batching
   - Use Redis caching
   - Optimize token usage

3. Task Queue:
   - Configure worker pools
   - Set up task priorities
   - Implement dead letter queues

### Security Measures:
1. Authentication:
   - JWT token management
   - Refresh token rotation
   - Rate limiting

2. Data Protection:
   - Email encryption
   - Secure credential storage
   - API key rotation

3. Error Handling:
   - Graceful degradation
   - Retry mechanisms
   - Error logging

### Monitoring Setup:
1. Metrics:
   - Email processing time
   - AI response time
   - Queue lengths
   - Error rates

2. Alerts:
   - Service failures
   - High error rates
   - Queue backlogs
   - API rate limits

3. Logging:
   - Structured logging
   - Log aggregation
   - Error tracking 

# AiMail Development Log

## Current Status
✅ Entities and TypeScript Setup
- User entity with role-based auth
- Email entity with comprehensive fields
- Folder entity with system/custom types
- Settings entity with email/AI configs
- TypeScript and dependencies configured

✅ Database Migrations
- Created initial migration for all entities
- Added indexes for performance
- Set up foreign key constraints
- Added UUID support
- Created seed data script
- Created migration runner script

## Next Steps
1. 🔄 Implement Email Routes
   - Create email controller
   - Set up CRUD operations
   - Add email search and filtering
   - Implement folder management
   - Add email scheduling

2. 🔄 Add Frontend Components
   - Email list view
   - Email detail view
   - Folder navigation
   - Settings panel
   - AI features UI

3. 🔄 Set up Authentication
   - Implement JWT auth
   - Add role-based access control
   - Set up password reset
   - Add email verification
   - Implement OAuth (optional)

4. 🔄 Implement AI Features
   - Smart reply generation
   - Email categorization
   - Sentiment analysis
   - Action item detection
   - Spam detection

5. 🔄 Add Email Syncing
   - IMAP integration
   - SMTP setup
   - Background sync
   - Real-time updates
   - Error handling

6. 🔄 Set up Testing
   - Unit tests
   - Integration tests
   - E2E tests
   - Performance testing
   - Security testing

## Database Schema
```sql
-- Users Table
CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR UNIQUE NOT NULL,
  name VARCHAR NOT NULL,
  password VARCHAR NOT NULL,
  avatar VARCHAR,
  role user_role DEFAULT 'user',
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Folders Table
CREATE TYPE system_folder_type AS ENUM ('inbox', 'sent', 'drafts', 'trash', 'spam', 'archive');
CREATE TABLE folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  system_type system_folder_type,
  icon VARCHAR,
  color VARCHAR,
  is_hidden BOOLEAN DEFAULT false,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Emails Table
CREATE TABLE emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  sender JSONB NOT NULL,
  "to" JSONB NOT NULL,
  cc JSONB,
  bcc JSONB,
  subject VARCHAR NOT NULL,
  content TEXT NOT NULL,
  attachments JSONB,
  is_read BOOLEAN DEFAULT false,
  is_starred BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  is_draft BOOLEAN DEFAULT false,
  analytics JSONB,
  scheduled_for TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Email-Folder Junction Table
CREATE TABLE email_folders (
  email_id UUID REFERENCES emails(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  PRIMARY KEY (email_id, folder_id)
);

-- Settings Table
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email_settings JSONB DEFAULT '{}',
  ai_settings JSONB DEFAULT '{}',
  theme VARCHAR DEFAULT 'light',
  language VARCHAR DEFAULT 'en',
  notifications JSONB,
  shortcuts JSONB,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_folders_user_id ON folders(user_id);
CREATE INDEX idx_emails_user_id ON emails(user_id);
CREATE INDEX idx_emails_scheduled_for ON emails(scheduled_for);
CREATE INDEX idx_settings_user_id ON settings(user_id);
```

## Notes
- Using UUID for all primary keys
- JSONB for flexible data structures
- Proper indexing for performance
- Enum types for role and folder types
- Default values where appropriate
- Timestamps for all tables
- ON DELETE CASCADE for foreign keys
- Extension uuid-ossp for UUID generation 