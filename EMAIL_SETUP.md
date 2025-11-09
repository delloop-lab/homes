# 📧 Scheduled Email System Setup

This document explains how to set up and use the automated email system for guest communication.

## 🎯 Email Types

The system automatically sends 3 types of emails:

### 1. Check-in Instructions
- **Timing**: 2 days before check-in
- **Content**: Property details, entry codes, WiFi, parking, contact info
- **Purpose**: Prepare guests for arrival

### 2. Checkout Reminder  
- **Timing**: 1 day before checkout
- **Content**: Checkout checklist, time reminder, special instructions
- **Purpose**: Ensure smooth departure

### 3. Thank You & Review Request
- **Timing**: 2 days after checkout
- **Content**: Thank you message, review request, return guest offers
- **Purpose**: Build relationships and gather feedback

## ⚙️ Setup Instructions

### 1. Resend API Setup

1. **Create Resend Account**
   ```
   Go to: https://resend.com
   Sign up for a free account (100 emails/day)
   ```

2. **Get API Key**
   ```
   Dashboard → API Keys → Create API Key
   Copy the key starting with "re_"
   ```

3. **Verify Domain (Recommended)**
   ```
   Dashboard → Domains → Add Domain
   Follow DNS setup instructions
   ```

### 2. Environment Variables

Add these to your `.env.local` file:

```bash
# Email Configuration
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxx
FROM_EMAIL=noreply@yourdomain.com

# Cron Job Security  
CRON_SECRET=your-secure-random-string
```

### 3. Database Setup

Run the email schema SQL:

```sql
-- Run this in your Supabase SQL editor
-- File: supabase/email-schema.sql
```

### 4. Vercel Configuration

The system uses Vercel cron jobs to process emails every 15 minutes:

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/process-emails",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

## 🔧 Usage

### Automatic Email Scheduling

Emails are automatically scheduled when:

1. **New booking created** with `status: 'confirmed'` and guest email
2. **Booking status changed** to 'confirmed' 
3. **Booking cancelled** → pending emails are cancelled

```typescript
// Example: Creating a booking automatically schedules emails
const booking = await bookingService.createBooking({
  property_id: 'uuid',
  guest_name: 'John Smith', 
  contact_email: 'john@example.com', // Required for emails
  check_in: new Date('2024-02-15'),
  check_out: new Date('2024-02-18'),
  status: 'confirmed' // Triggers email scheduling
})
```

### Manual Email Management

```typescript
import { useEmailActions } from '@/hooks/use-email-scheduler'

const { 
  scheduleBookingEmails,
  sendEmailNow,
  cancelBookingEmails 
} = useEmailActions()

// Schedule emails manually
await scheduleBookingEmails(booking)

// Send specific email immediately  
await sendEmailNow('check_in_instructions', booking)

// Cancel pending emails
await cancelBookingEmails(booking.id)
```

### Email Status Component

Display email status in booking details:

```typescript
import { EmailStatus } from '@/components/bookings/email-status'

<EmailStatus 
  booking={booking}
  showActions={true} 
/>
```

## 📊 Email Processing

### Automated Processing

- **Frequency**: Every 15 minutes via Vercel cron
- **Endpoint**: `/api/process-emails`
- **Batch Size**: 50 emails per run
- **Retry Logic**: Up to 3 attempts for failed emails

### Manual Processing

```typescript
// Trigger immediate email processing
const response = await fetch('/api/process-emails', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'process_pending' })
})
```

### Monitoring

Check email stats and status:

```typescript
const { emails, stats } = useScheduledEmails({ 
  booking_id: 'uuid' 
})

// Stats include: total, pending, sent, failed, cancelled
console.log('Email stats:', stats)
```

## 🎨 Email Templates

### Template Customization

Templates are coded in TypeScript with:

- **Professional HTML design**
- **Mobile-responsive layout**
- **Brand colors and styling**
- **Dynamic content injection**

### Template Variables

Available variables for customization:

```typescript
// Check-in Instructions
{
  property_name: string,
  property_address: string,
  check_in_date: string,
  check_in_time: string,
  guest_name: string,
  notes?: string
}

// Checkout Reminder  
{
  property_name: string,
  checkout_date: string,
  checkout_time: string,
  guest_name: string,
  notes?: string
}

// Thank You & Review
{
  property_name: string,
  guest_name: string,
  booking_platform: string,
  check_in_date: string,
  check_out_date: string
}
```

### Template Features

- **Responsive design** for mobile and desktop
- **Professional branding** with consistent colors
- **Action buttons** for key guest actions
- **Contact information** prominently displayed
- **Platform-specific** review links (Airbnb, VRBO, Booking.com)

## 🔒 Security & Privacy

### Data Protection

- **No sensitive data** in email content
- **Secure API keys** via environment variables
- **Guest consent** implied through booking process
- **Unsubscribe handling** (if required)

### Access Control

- **Row Level Security** on email tables
- **Host-only access** to guest emails
- **API authentication** for cron jobs
- **Audit trail** in email logs

## 🚨 Error Handling

### Common Issues

1. **Invalid API Key**
   ```
   Error: "Invalid API key"
   Fix: Check RESEND_API_KEY in environment
   ```

2. **Domain Not Verified**
   ```
   Error: "Domain not verified"  
   Fix: Verify domain in Resend dashboard
   ```

3. **Rate Limits**
   ```
   Error: "Rate limit exceeded"
   Fix: Upgrade Resend plan or reduce frequency
   ```

4. **Template Errors**
   ```
   Error: "Template rendering failed"
   Fix: Check booking data completeness
   ```

### Retry Logic

- **Automatic retries** up to 3 times
- **Exponential backoff** (retry next day)
- **Error logging** with detailed messages
- **Manual retry** option in UI

## 📈 Analytics & Insights

### Email Metrics

Track key performance indicators:

- **Delivery rate**: Emails successfully sent
- **Error rate**: Failed email percentage  
- **Timing accuracy**: Emails sent on schedule
- **Guest engagement**: (if webhooks configured)

### Reporting

```typescript
const stats = await emailScheduler.getEmailStats()

// Example output:
{
  total: 150,
  sent: 142, 
  pending: 5,
  failed: 3,
  cancelled: 0
}
```

## 🔄 Maintenance

### Regular Tasks

1. **Monitor email queue** for stuck messages
2. **Check error logs** for delivery issues  
3. **Update templates** based on guest feedback
4. **Review performance** metrics monthly

### Scaling Considerations

- **Rate limits**: Resend free tier = 100 emails/day
- **Volume planning**: Upgrade plan for higher volumes
- **Performance**: Cron frequency vs. server load
- **Storage**: Email logs grow over time

## 🆘 Troubleshooting

### Debug Mode

Enable detailed logging:

```typescript
// Add to .env.local
DEBUG_EMAILS=true
```

### Manual Testing

Test individual email types:

```typescript
// Test check-in instructions
await emailService.sendCheckInInstructions(
  { email: 'test@example.com', name: 'Test Guest' },
  {
    id: 'test',
    property_name: 'Test Property',
    property_address: '123 Test St',
    check_in: '2024-02-15T15:00:00Z',
    check_out: '2024-02-18T11:00:00Z'
  }
)
```

### Database Queries

Check scheduled emails:

```sql
-- View pending emails
SELECT * FROM scheduled_emails 
WHERE status = 'pending' 
ORDER BY scheduled_for;

-- Check email stats
SELECT 
  email_type,
  status,
  COUNT(*) as count
FROM scheduled_emails 
GROUP BY email_type, status;
```

## 📚 Further Reading

- [Resend Documentation](https://resend.com/docs)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Email Best Practices](https://resend.com/docs/send-with-nodejs)
- [Template Design Guide](https://resend.com/docs/templates)