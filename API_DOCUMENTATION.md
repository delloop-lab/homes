# ICS Calendar Sync API Documentation

## Overview

The ICS Calendar Sync API enables automatic synchronization of booking data from multiple short-term rental platforms (Airbnb, VRBO, Booking.com) into your Supabase database.

## Endpoints

### POST `/api/sync-ics`

Synchronizes calendar data from ICS feeds into the bookings table.

#### Request Body

```json
{
  "property_id": "uuid-string",
  "sources": [
    {
      "name": "Airbnb Downtown",
      "platform": "airbnb",
      "url": "https://www.airbnb.com/calendar/ical/12345.ics"
    },
    {
      "name": "VRBO Beach House", 
      "platform": "vrbo",
      "url": "https://www.vrbo.com/calendar/12345.ics"
    }
  ]
}
```

#### Parameters

- `property_id` (required): UUID of the property to sync bookings for
- `sources` (optional): Array of calendar sources. If not provided, uses environment variables

#### Response

```json
{
  "success": true,
  "totalProcessed": 15,
  "totalErrors": 0,
  "processingTime": 2341,
  "sources": [
    {
      "name": "Airbnb Downtown",
      "platform": "airbnb", 
      "url": "https://www.airbnb.com/calendar/ical/12345.ics",
      "bookingsProcessed": 8,
      "errors": [],
      "success": true
    },
    {
      "name": "VRBO Beach House",
      "platform": "vrbo",
      "url": "https://www.vrbo.com/calendar/12345.ics", 
      "bookingsProcessed": 7,
      "errors": [],
      "success": true
    }
  ]
}
```

#### Error Response

```json
{
  "error": "Error message",
  "details": "Detailed error information",
  "processingTime": 1250
}
```

### GET `/api/sync-ics?health=true`

Health check endpoint to verify API status and environment configuration.

#### Response

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": {
    "hasAirbnbUrl": true,
    "hasVrboUrl": true, 
    "hasBookingUrl": false,
    "hasSupabaseUrl": true
  }
}
```

### GET `/api/properties-with-calendars`

Returns all properties that have enabled calendar sources.

#### Response

```json
[
  {
    "id": "property-uuid",
    "name": "Downtown Apartment",
    "address": "123 Main St",
    "calendar_sources": [
      {
        "id": "source-uuid",
        "platform": "airbnb", 
        "name": "Airbnb Calendar",
        "ics_url": "https://...",
        "sync_enabled": true,
        "last_sync": "2024-01-15T10:30:00.000Z",
        "sync_status": "success"
      }
    ]
  }
]
```

## Environment Variables

Set these in your Vercel environment or `.env.local`:

```env
# Required for Supabase integration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional default calendar URLs
AIRBNB_ICS_URL=https://www.airbnb.com/calendar/ical/your-calendar.ics
VRBO_ICS_URL=https://www.vrbo.com/calendar/your-calendar.ics  
BOOKING_COM_ICS_URL=https://admin.booking.com/calendar/your-calendar.ics
```

## Platform-Specific Parsing

### Airbnb
- **Event Format**: "Reserved for [Guest Name]" or "Not available"
- **Guest Extraction**: Extracts guest name from summary
- **Status**: Defaults to "confirmed"
- **Filtering**: Skips "Not available" and "Blocked" events

### VRBO  
- **Event Format**: "[Guest Name] - VRBO Booking"
- **Guest Extraction**: Extracts from summary before "VRBO"
- **Status Detection**: Checks description for "pending", "confirmed", "cancelled"
- **Platform**: Tagged as "vrbo"

### Booking.com
- **Event Format**: "[Guest Name] - Booking.com Reservation" 
- **Guest Extraction**: Extracts from summary before "booking.com"
- **Status Detection**: Checks for "cancelled" in summary
- **Platform**: Tagged as "booking"

## Database Operations

### Upsert Logic
- Uses `event_uid` as unique identifier
- Updates existing bookings if `event_uid` matches
- Inserts new bookings if `event_uid` doesn't exist
- Prevents duplicate bookings across syncs

### Data Mapping

ICS fields are mapped to database columns:

```typescript
{
  event_uid: string,           // from ICS UID
  guest_name: string,          // parsed from summary
  contact_email: string,       // optional, platform-specific
  check_in: string,           // from ICS start datetime
  check_out: string,          // from ICS end datetime  
  booking_platform: string,   // airbnb|vrbo|booking|other
  status: string,             // confirmed|pending|cancelled
  notes: string,              // from ICS description
  property_id: string,        // from request
  total_amount: number,       // optional, platform-specific
  updated_at: string         // current timestamp
}
```

## Error Handling

### Common Errors

1. **Invalid ICS URL**
   ```json
   {
     "error": "HTTP 404: Not Found",
     "source": "platform-name"
   }
   ```

2. **ICS Parsing Error**
   ```json
   {
     "error": "Failed to parse ICS data",
     "details": "Invalid calendar format"
   }
   ```

3. **Database Error**
   ```json
   {
     "error": "Failed to upsert booking",
     "details": "duplicate key value violates unique constraint"
   }
   ```

4. **Missing Environment Variables**
   ```json
   {
     "error": "Missing required parameter: property_id"
   }
   ```

### Error Logging

All errors are logged to console with:
- Timestamp
- Error message
- Stack trace (in development)
- Request context

## Usage Examples

### Basic Sync

```javascript
// Sync using environment variables
const response = await fetch('/api/sync-ics', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    property_id: 'your-property-uuid'
  })
})

const result = await response.json()
console.log(`Processed ${result.totalProcessed} bookings`)
```

### Custom Sources

```javascript
// Sync with custom calendar sources
const sources = [
  {
    name: 'My Airbnb',
    platform: 'airbnb', 
    url: 'https://www.airbnb.com/calendar/ical/12345.ics'
  }
]

const response = await fetch('/api/sync-ics', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    property_id: 'your-property-uuid',
    sources
  })
})
```

### Health Check

```javascript
// Check API health
const response = await fetch('/api/sync-ics?health=true')
const health = await response.json()

if (health.status === 'healthy') {
  console.log('API is ready')
} else {
  console.log('API has issues')
}
```

## Performance Considerations

### Optimization Tips

1. **Rate Limiting**: Avoid rapid consecutive calls
2. **Caching**: ICS data is fetched fresh each time
3. **Timeout**: API calls timeout after 30 seconds (Vercel limit)
4. **Batch Size**: Process all sources for a property in one call

### Monitoring

Track these metrics:
- `processingTime`: Total sync duration
- `totalProcessed`: Number of bookings processed  
- `totalErrors`: Number of errors encountered
- `sources[].bookingsProcessed`: Per-source success count

## Security

### Access Control
- API requires valid Supabase authentication
- Row Level Security (RLS) enforced on database operations
- Only property owners can sync their calendars

### Data Protection
- ICS URLs are not logged in production
- Guest information handled according to privacy policies
- All API calls use HTTPS

## Deployment

### Vercel Configuration

1. **Function Settings**:
   - Runtime: Node.js 18.x
   - Max Duration: 30 seconds
   - Memory: 1024 MB

2. **Environment Variables**:
   Set all required environment variables in Vercel dashboard

3. **Domain Configuration**:
   Ensure API endpoints are accessible from your domain

### Monitoring

Set up alerts for:
- High error rates (>10%)
- Slow response times (>10s)
- Failed authentication attempts
- Database connection issues

This API provides a robust foundation for multi-platform calendar synchronization with comprehensive error handling and monitoring capabilities.