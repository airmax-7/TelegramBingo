# Telegram Bingo - Multi-Player Game

## Overview

This is a full-stack multiplayer Bingo application designed to work within the Telegram Web App ecosystem. The application allows users to create and join Bingo games, manage virtual wallets, and play real-time multiplayer Bingo with Telegram friends.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with custom configuration for client-side development
- **Routing**: Wouter for lightweight client-side routing
- **UI Framework**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens for Telegram-specific theming
- **State Management**: TanStack React Query for server state management
- **Payment Integration**: Stripe for handling deposits and transactions

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL (configured for Neon serverless)
- **Real-time Communication**: WebSocket (ws library) for live game updates
- **Payment Processing**: Stripe API for secure payment handling

### Database Schema
The application uses PostgreSQL with the following main entities:
- **Users**: Stores Telegram user data, verification status, and wallet balance
- **Games**: Manages game state, prize pools, and game configuration
- **Game Participants**: Links users to games with their Bingo cards and progress
- **Transactions**: Tracks all financial operations (deposits, game entries, winnings)

## Key Components

### Authentication & User Management
- Telegram Web App SDK integration for seamless user authentication
- Phone number verification through Telegram's secure system
- Demo mode support for development and testing outside Telegram

### Game Engine
- Custom Bingo card generation with proper number distribution (B:1-15, I:16-30, N:31-45, G:46-60, O:61-75)
- Real-time number calling system with WebSocket broadcasting
- Win condition checking for standard Bingo patterns
- Support for multiple game types (standard, speed, jackpot)

### Wallet System
- Virtual wallet with decimal precision for financial operations
- Secure Stripe integration for deposits
- Transaction history tracking with status management
- Entry fee collection and prize distribution

### Real-time Features
- WebSocket-based game rooms for live gameplay
- Real-time player updates and game state synchronization
- Live number calling with interval-based automation

## Data Flow

1. **User Authentication**: Users authenticate via Telegram Web App SDK
2. **Wallet Management**: Users can deposit funds using Stripe payment integration
3. **Game Creation**: Users create games with configurable entry fees and player limits
4. **Game Joining**: Players join games, automatically generating unique Bingo cards
5. **Game Execution**: Real-time number calling with WebSocket updates to all participants
6. **Win Detection**: Client-side and server-side validation of winning conditions
7. **Prize Distribution**: Automatic wallet updates for winners

## External Dependencies

### Core Technologies
- **Database**: Neon PostgreSQL serverless database
- **Payment Processing**: Stripe API for secure financial transactions
- **Real-time Communication**: Native WebSocket implementation
- **UI Components**: Radix UI primitives with custom Telegram theming

### Development Tools
- **TypeScript**: Full type safety across frontend and backend
- **Drizzle Kit**: Database migrations and schema management
- **Vite**: Development server with hot reload and build optimization
- **ESBuild**: Production build optimization for server-side code

## Deployment Strategy

### Development Environment
- Vite development server for frontend with hot module replacement
- tsx for TypeScript execution in development
- Automatic database schema pushing via Drizzle Kit

### Production Build
- Frontend: Vite builds optimized static assets
- Backend: ESBuild creates optimized Node.js bundle
- Single deployment artifact with embedded static file serving

### Environment Configuration
- Database connection via `DATABASE_URL` environment variable
- Stripe integration requires both public and secret keys
- Telegram Web App integration for production deployment

## Admin System & Payment Verification

### Admin Authentication
The application includes a secure admin login system with proper authentication for accessing administrative functions.

#### Admin Login Process:
1. Navigate to `/admin` route to access admin panel
2. Enter admin username and password credentials
3. System validates credentials against database
4. Successful login grants access to admin panel
5. Session management with logout functionality

#### Admin Account Setup:
- Database schema includes `admin_username` and `admin_password` fields
- Admins must have both `is_admin = TRUE` and valid credentials
- Default test credentials: username: `admin`, password: `admin123`
- Current test admin user ID: 18

### Payment Verification Workflow

#### For Users:
1. User initiates a deposit and receives a unique 6-digit payment code
2. User makes offline payment (bank transfer, mobile money, etc.) using the payment code as reference
3. User provides admin with both the payment code and transaction ID

#### For Admins:
1. Login to admin panel at `/admin` with valid credentials
2. View paginated list of pending transactions (10 per page)
3. Two verification methods available:
   - **Manual verification**: Enter payment code + transaction ID
   - **Quick verification**: Click "Verify" button directly on transaction
4. Successful verification updates user balance automatically
5. Real-time transaction list updates via cache invalidation

#### Admin Panel Features:
- Secure login with username/password authentication
- Logout functionality with session management
- Pagination for handling large transaction volumes
- Quick action buttons for efficient payment verification
- Real-time transaction count and status updates

## Changelog

```
Changelog:
- July 03, 2025: Initial setup
- July 03, 2025: Removed Stripe integration, implemented offline payment system
- July 03, 2025: Added admin panel for payment verification
- July 03, 2025: Updated all currency displays to ETB (Ethiopian Birr)
- July 04, 2025: Fixed game creation validation to use ETB amounts (10-1000 ETB)
- July 04, 2025: Fixed game entry issues with userJoined property synchronization
- July 04, 2025: Completed currency conversion - all $ displays now show ETB
- July 04, 2025: Implemented comprehensive profile screen with statistics and achievements
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```