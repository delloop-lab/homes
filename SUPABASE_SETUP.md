# Supabase Database Setup Guide

This guide will help you set up the complete database schema for your Short-Term Rental Host App.

## 🚀 Quick Start

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose your organization
4. Enter project name: "rental-host-app"
5. Enter database password (save this!)
6. Select region closest to you
7. Click "Create new project"

### 2. Run the Database Schema
1. In your Supabase dashboard, go to **SQL Editor**
2. Copy the entire contents of `supabase/schema.sql`
3. Paste into the SQL Editor
4. Click **Run** to execute the schema

### 3. Configure Environment Variables
Update your `.env.local` file:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 📊 Database Schema Overview

### Core Tables

#### **Properties Table**
Stores rental property information:
- `id` (UUID, Primary Key)
- `name` (Property name/title)
- `address` (Full address)
- `notes` (Additional property notes)
- `host_id` (Foreign Key to auth.users)
- `created_at`, `updated_at` (Timestamps)

#### **Bookings Table**
Comprehensive booking management:
- `id` (UUID, Primary Key)
- `property_id` (Foreign Key to properties)
- `guest_name` (Guest's full name)
- `contact_email` (Guest's email)
- `check_in`, `check_out` (Booking dates with timezone)
- `nights` (Auto-calculated from dates)
- `notes` (Booking-specific notes)
- `passport_image_url` (File storage URL for ID documents)
- `event_uid` (Unique identifier from ICS calendar)
- `booking_platform` (airbnb, vrbo, booking, manual)
- `total_amount` (Booking total cost)
- `status` (confirmed, pending, cancelled, checked_in, checked_out)

#### **Cleanings Table**
Track cleaning schedules:
- `id` (UUID, Primary Key)
- `property_id` (Foreign Key to properties)
- `cleaning_date` (When cleaning is scheduled)
- `status` (scheduled, in_progress, completed, cancelled)
- `notes` (Cleaning notes/instructions)
- `cleaner_name`, `cleaner_contact` (Cleaner information)
- `cost` (Cleaning cost)

#### **Calendar Sources Table**
Manage multiple platform integrations:
- `id` (UUID, Primary Key)
- `property_id` (Foreign Key to properties)
- `platform` (airbnb, vrbo, booking, other)
- `name` (Descriptive name for the source)
- `ics_url` (ICS calendar URL)
- `sync_enabled` (Enable/disable sync)
- `last_sync`, `sync_status` (Sync tracking)

## 🔐 Security Features

### Row Level Security (RLS)
All tables have RLS enabled with policies ensuring:
- Users can only access their own properties
- Users can only manage bookings for their properties
- Users can only view cleanings for their properties
- Users can only configure calendar sources for their properties

### Data Validation
- **Overlap Prevention**: Bookings cannot overlap for the same property
- **Status Constraints**: Only valid status values are allowed
- **Foreign Key Integrity**: All relationships are properly enforced
- **Unique Constraints**: Calendar event UIDs are unique to prevent duplicates

## 📈 Performance Optimizations

### Indexes Created
- Property lookup by host_id
- Booking queries by property and dates
- Calendar sync optimization
- Guest name searches
- Status-based filtering

### Computed Columns
- `nights` field automatically calculated from check-in/check-out dates

### Database Views
Pre-built views for common queries:
- `bookings_with_properties`: Bookings joined with property info
- `upcoming_cleanings`: Future cleanings with property details
- `current_and_upcoming_bookings`: Active and future reservations

## 🛠️ Advanced Features

### Automatic Triggers
- **Auto-update timestamps**: `updated_at` fields automatically updated
- **Booking overlap prevention**: Prevents double-bookings
- **Data integrity checks**: Ensures valid date ranges

### Functions
- `update_updated_at_column()`: Timestamp management
- `check_booking_overlap()`: Prevents booking conflicts

## 📱 Integration Points

### Calendar Sync
- Store multiple ICS URLs per property
- Track sync status and errors
- Platform-specific parsing rules
- Duplicate prevention via `event_uid`

### File Storage
- `passport_image_url` field ready for document uploads
- Integration with Supabase Storage

### Real-time Updates
- All tables support Supabase real-time subscriptions
- Perfect for live dashboard updates

## 🔄 Sample Workflows

### Adding a New Booking
```sql
INSERT INTO bookings (
    property_id, 
    guest_name, 
    contact_email, 
    check_in, 
    check_out, 
    booking_platform, 
    total_amount
) VALUES (
    'property-uuid',
    'John Smith',
    'john@example.com',
    '2024-03-15 15:00:00+00',
    '2024-03-18 11:00:00+00',
    'airbnb',
    450.00
);
```

### Scheduling Cleaning
```sql
INSERT INTO cleanings (
    property_id,
    cleaning_date,
    cleaner_name,
    cost
) VALUES (
    'property-uuid',
    '2024-03-18 13:00:00+00',
    'Maria Garcia',
    80.00
);
```

### Querying Upcoming Bookings
```sql
SELECT * FROM current_and_upcoming_bookings 
WHERE property_name = 'Downtown Apartment'
ORDER BY check_in;
```

## 🚨 Important Notes

1. **Backup First**: Always backup before running schema changes
2. **Test Data**: Uncomment sample data in schema.sql for testing
3. **User IDs**: Replace 'your-user-id' with real auth.users IDs
4. **Permissions**: Ensure your database user has proper permissions
5. **SSL**: Always use SSL connections in production

## 🔧 Maintenance

### Regular Tasks
- Monitor booking overlaps
- Clean up old calendar sync logs
- Archive completed bookings/cleanings
- Update calendar source URLs when they change

### Performance Monitoring
- Watch for slow queries on date ranges
- Monitor RLS policy performance
- Check index usage statistics

## 📞 Troubleshooting

### Common Issues
1. **RLS Blocking Queries**: Ensure user is authenticated
2. **Booking Overlaps**: Check existing reservations before inserting
3. **Calendar Sync Fails**: Verify ICS URLs are accessible
4. **Foreign Key Errors**: Ensure referenced records exist

This schema provides a robust foundation for managing short-term rental properties with comprehensive booking management, cleaning schedules, and multi-platform calendar integration!