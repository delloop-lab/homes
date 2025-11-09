# Short-Term Rental Host App

A modern React-based dashboard for managing short-term rental properties, built with Next.js, Supabase, and Vercel.

## 🚀 Features

- **Property Management**: Add, edit, and manage your rental properties
- **Booking Calendar**: Visual calendar with Airbnb ICS integration
- **Guest Management**: Track guest information and booking history
- **Revenue Tracking**: Monitor earnings and generate reports
- **PDF Reports**: Generate detailed booking and revenue reports
- **Real-time Updates**: Live data synchronization with Supabase
- **Responsive Design**: Works on desktop, tablet, and mobile

## 🛠️ Tech Stack

- **Frontend**: React 18, Next.js 14, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (Auth, Database, Storage)
- **Deployment**: Vercel
- **Calendar**: node-ical for Airbnb ICS parsing
- **PDF Generation**: jsPDF
- **Date Handling**: date-fns
- **Icons**: Lucide React

## 📁 Project Structure

```
short-term-rental-host-app/
├── app/                          # Next.js app directory
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Dashboard page
│   └── globals.css              # Global styles
├── components/                   # React components
│   ├── providers.tsx            # Context providers
│   └── dashboard/               # Dashboard components
│       ├── header.tsx           # Navigation header
│       ├── stats.tsx            # Statistics cards
│       ├── recent-bookings.tsx  # Recent bookings list
│       └── calendar-view.tsx    # Calendar component
├── lib/                         # Library configurations
│   └── supabase.ts              # Supabase client setup
├── utils/                       # Utility functions
│   ├── calendar.ts              # Calendar utilities
│   └── pdf.ts                   # PDF generation
├── types/                       # TypeScript type definitions
├── public/                      # Static assets
└── config files                 # Various config files
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Vercel account (for deployment)

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/delloop-lab/myguests.git
cd myguests

# Install dependencies
npm install
# or
yarn install
```

### 2. Environment Setup

1. Copy the environment example file:
```bash
cp env.example .env.local
```

2. Update `.env.local` with your configuration:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Airbnb Calendar Integration
AIRBNB_ICS_URL=your_airbnb_calendar_ics_url

# Vercel Configuration (for serverless functions)
VERCEL_URL=your_vercel_deployment_url
```

### 3. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Get your project URL and anon key from Settings > API
3. Create the following tables in your Supabase database:

#### Properties Table
```sql
CREATE TABLE properties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  description TEXT,
  host_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Bookings Table
```sql
CREATE TABLE bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES properties(id),
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('confirmed', 'pending', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

4. Set up Row Level Security (RLS) policies for your tables
5. Configure authentication settings in Supabase

### 4. Multi-Platform Calendar Integration

Set up calendar synchronization with multiple booking platforms:

#### Airbnb
1. Go to your Airbnb account
2. Navigate to Calendar → Export Calendar
3. Copy the ICS URL
4. Add to environment: `AIRBNB_ICS_URL=your_url`

#### VRBO
1. Access your VRBO Property Dashboard
2. Go to Calendar → Calendar Sync
3. Find "Export Calendar" option
4. Copy the ICS URL
5. Add to environment: `VRBO_ICS_URL=your_url`

#### Booking.com
1. Log into Booking.com Extranet
2. Go to Property → Calendar
3. Click "Sync Calendars"
4. Find "Export URL" option
5. Copy the ICS URL
6. Add to environment: `BOOKING_COM_ICS_URL=your_url`

### 5. Development

```bash
# Start development server
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### 6. Deployment

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

## 📦 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## 🔧 Configuration Files

### Tailwind CSS (`tailwind.config.js`)
Custom theme with primary colors and animations for the rental app.

### Next.js (`next.config.js`)
Optimized for images and environment variables.

### TypeScript (`tsconfig.json`)
Configured with path aliases for clean imports.

## 🗄️ Database Schema

### Properties
- `id`: Unique identifier
- `name`: Property name
- `address`: Property address
- `description`: Optional description
- `host_id`: Reference to host user
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

### Bookings
- `id`: Unique identifier
- `property_id`: Reference to property
- `guest_name`: Guest's name
- `guest_email`: Guest's email
- `check_in`: Check-in date
- `check_out`: Check-out date
- `total_amount`: Booking total
- `status`: Booking status (confirmed/pending/cancelled)
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

## 🔐 Authentication

The app uses Supabase Auth with the following features:
- Email/password authentication
- Social login (Google, GitHub)
- Row Level Security (RLS)
- Session management

## 📊 Features in Detail

### Dashboard
- Real-time statistics
- Recent bookings overview
- Quick property management
- Revenue tracking

### Calendar Integration
- Airbnb ICS calendar parsing
- Visual booking calendar
- Date range selection
- Booking status indicators

### PDF Reports
- Individual booking reports
- Monthly revenue reports
- Property performance reports
- Custom date range reports

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, please open an issue on GitHub or contact the development team.

## 🔄 Updates

Stay updated with the latest features and bug fixes by regularly pulling from the main branch. 