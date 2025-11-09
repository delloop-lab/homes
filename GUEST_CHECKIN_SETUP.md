# 🏠 Guest Self Check-in System

This document explains the comprehensive guest self check-in system that provides guests with secure, temporary pages containing all the information they need for their stay.

## 🎯 Overview

The guest check-in system creates unique, time-limited pages for each booking that contain:

- **Check-in instructions** with access codes and entry details
- **Property information** including WiFi, amenities, and house rules
- **Local recommendations** for restaurants, attractions, and transportation
- **Emergency contacts** and important phone numbers
- **Checkout instructions** and departure requirements

### **Key Features**

✅ **Secure Token-Based Access** - Unique URLs that can't be guessed  
✅ **Automatic Expiration** - Pages expire 3 days after checkout  
✅ **Mobile-Optimized Design** - Perfect for guests on their phones  
✅ **Copy-to-Clipboard** - Easy copying of WiFi passwords and access codes  
✅ **Access Logging** - Track when and how guests access their pages  
✅ **Email Integration** - Automatic links in check-in instruction emails  
✅ **Host Management** - Full control over property information and guest access  

## 🏗️ System Architecture

### **Database Schema**

#### **guest_checkin_tokens**
```sql
CREATE TABLE guest_checkin_tokens (
    id UUID PRIMARY KEY,
    booking_id UUID REFERENCES bookings(id),
    token VARCHAR(255) UNIQUE NOT NULL,
    guest_name VARCHAR(255) NOT NULL,
    guest_email VARCHAR(255) NOT NULL,
    property_id UUID REFERENCES properties(id),
    
    -- Token validity
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    accessed_at TIMESTAMP,
    access_count INTEGER DEFAULT 0,
    
    -- Security tracking
    is_active BOOLEAN DEFAULT true,
    revoked_at TIMESTAMP,
    ip_addresses INET[],
    user_agents TEXT[]
);
```

#### **property_information**
```sql
CREATE TABLE property_information (
    id UUID PRIMARY KEY,
    property_id UUID UNIQUE REFERENCES properties(id),
    
    -- Check-in/out instructions
    checkin_instructions TEXT,
    checkout_instructions TEXT,
    
    -- Access information
    entry_method VARCHAR(50), -- keypad, lockbox, smart_lock, etc.
    access_code VARCHAR(50),
    access_instructions TEXT,
    
    -- WiFi details
    wifi_network VARCHAR(255),
    wifi_password VARCHAR(255),
    
    -- House rules and policies
    house_rules TEXT[],
    quiet_hours VARCHAR(100),
    smoking_allowed BOOLEAN DEFAULT false,
    pets_allowed BOOLEAN DEFAULT false,
    parties_allowed BOOLEAN DEFAULT false,
    
    -- Local information
    local_tips TEXT,
    nearby_restaurants JSONB,
    nearby_attractions JSONB,
    transportation_info TEXT,
    emergency_contacts JSONB,
    
    -- Practical details
    parking_instructions TEXT,
    trash_pickup_day VARCHAR(20),
    appliance_instructions JSONB,
    special_notes TEXT
);
```

#### **guest_access_logs**
```sql
CREATE TABLE guest_access_logs (
    id UUID PRIMARY KEY,
    token_id UUID REFERENCES guest_checkin_tokens(id),
    booking_id UUID REFERENCES bookings(id),
    accessed_at TIMESTAMP DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    pages_viewed TEXT[],
    time_spent_seconds INTEGER
);
```

### **Security Functions**

#### **Token Generation**
```sql
-- Generate secure, unique tokens
CREATE FUNCTION generate_guest_token() RETURNS TEXT;

-- Create token with automatic expiration
CREATE FUNCTION create_guest_checkin_token(
    p_booking_id UUID,
    p_expires_days INTEGER DEFAULT 30
) RETURNS TABLE(token TEXT, expires_at TIMESTAMP);
```

#### **Token Validation**
```sql
-- Validate token and log access
CREATE FUNCTION validate_guest_token(
    p_token TEXT,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS TABLE(
    is_valid BOOLEAN,
    token_id UUID,
    booking_id UUID,
    error_message TEXT
);
```

#### **Token Management**
```sql
-- Revoke tokens manually
CREATE FUNCTION revoke_guest_token(
    p_token TEXT,
    p_revoked_by UUID,
    p_reason TEXT
) RETURNS BOOLEAN;

-- Cleanup expired tokens (cron job)
CREATE FUNCTION cleanup_expired_tokens() RETURNS INTEGER;
```

## 🔧 API Endpoints

### **Token Management (Host-Only)**

#### **Generate Guest Token**
```typescript
POST /api/guest-checkin/generate
{
  "booking_id": "uuid",
  "expires_days": 30
}

Response:
{
  "success": true,
  "data": {
    "token": "secure-random-token",
    "checkin_url": "https://yoursite.com/guest-checkin/token",
    "expires_at": "2024-03-15T10:00:00Z",
    "booking": {
      "guest_name": "John Smith",
      "property_name": "Downtown Apartment"
    }
  }
}
```

#### **Get Existing Token**
```typescript
GET /api/guest-checkin/generate?booking_id=uuid

Response:
{
  "success": true,
  "data": {
    "token": "existing-token",
    "checkin_url": "https://yoursite.com/guest-checkin/token",
    "is_active": true,
    "access_count": 3,
    "last_accessed": "2024-02-15T14:30:00Z"
  }
}
```

#### **Revoke Token**
```typescript
POST /api/guest-checkin/revoke
{
  "token": "token-to-revoke",
  "reason": "Guest requested cancellation"
}
```

### **Guest Access (Public)**

#### **Validate Token & Get Check-in Info**
```typescript
GET /api/guest-checkin/validate?token=guest-token

Response:
{
  "success": true,
  "data": {
    "valid_until": "2024-03-15T10:00:00Z",
    "booking": {
      "guest_name": "John Smith",
      "check_in": "2024-02-15T15:00:00Z",
      "check_out": "2024-02-18T11:00:00Z",
      "nights": 3
    },
    "property": {
      "name": "Downtown Apartment",
      "address": "123 Main St",
      "bedrooms": 2,
      "bathrooms": 1
    },
    "checkin": {
      "checkin_instructions": "Welcome message...",
      "access_code": "1234#",
      "wifi": {
        "network": "GuestWiFi",
        "password": "welcome123"
      },
      "house_rules": ["No smoking", "Quiet hours: 10 PM - 8 AM"],
      "local_info": {
        "tips": "Best coffee shop is around the corner...",
        "restaurants": [...],
        "attractions": [...]
      }
    }
  }
}
```

## 🎨 Guest Experience

### **Landing Page Features**

The guest check-in page (`/guest-checkin/[token]`) includes:

#### **🏡 Welcome Section**
- Property name and guest personalization
- Stay dates and duration
- Property details (bedrooms, bathrooms, max guests)
- Special booking notes

#### **🔑 Check-in Instructions**
- Welcome message from host
- Entry method (keypad, lockbox, smart lock)
- Access code with copy-to-clipboard
- Step-by-step entry instructions

#### **📶 WiFi Information**
- Network name with copy button
- Password with copy button
- Additional WiFi instructions

#### **🛡️ House Rules & Policies**
- Comprehensive house rules list
- Quiet hours display
- Policy indicators (smoking, pets, parties)
- Visual policy status (allowed/not allowed)

#### **🏠 Property Amenities**
- Available amenities list
- Appliance instructions
- Special property features

#### **🗺️ Local Area Guide**
- Host's local tips and recommendations
- Nearby restaurants with descriptions
- Local attractions and activities
- Transportation information

#### **📞 Emergency Information**
- Emergency contact details
- Host contact information
- Local emergency services

#### **🚗 Practical Information**
- Parking instructions
- Trash pickup schedules
- Recycling information
- Special property notes

#### **🏁 Checkout Instructions**
- Checkout time and procedures
- Departure checklist
- Key return instructions

### **Mobile-First Design**

- **Responsive layout** optimized for phones
- **Large touch targets** for easy interaction
- **Copy buttons** for codes and passwords
- **Collapsible sections** for better organization
- **Readable typography** with proper contrast
- **Offline-friendly** content caching

## 📧 Email Integration

### **Automatic Link Generation**

Guest check-in links are automatically generated and included in check-in instruction emails:

```typescript
// Email template integration
const emailTemplate = `
  <div style="text-align: center; margin: 20px 0;">
    <a href="${booking.guest_checkin_url}" 
       style="background: #2563eb; color: white; padding: 15px 30px; 
              text-decoration: none; border-radius: 8px; font-weight: bold;">
      🏠 Open Your Guest Portal
    </a>
  </div>
  
  <div style="background: #f0f9ff; padding: 15px; border-radius: 6px;">
    <p>Your guest portal contains everything you need for your stay 
       and will be available until ${booking.link_expires}.</p>
  </div>
`
```

### **Email Service Integration**

```typescript
// Automatic token generation for email
const tokenResult = await guestCheckinService.generateTokenForEmail(booking.id, 30)

const bookingData = {
  ...booking,
  guest_checkin_url: tokenResult.checkin_url,
  link_expires: format(new Date(tokenResult.link_expires), 'MMMM dd, yyyy')
}

await emailService.sendCheckInInstructions(guest, bookingData)
```

## 🎛️ Host Management

### **Property Information Manager**

Hosts can manage all guest-facing information through a comprehensive interface:

```typescript
<PropertyInformationManager 
  propertyId="property-uuid"
  propertyName="Downtown Apartment"
/>
```

#### **Management Features:**
- **Check-in instructions** editor with rich text
- **Access method** selection (keypad, lockbox, etc.)
- **WiFi credentials** management
- **House rules** builder with add/remove functionality
- **Local recommendations** editor
- **Emergency contacts** management
- **Amenities** checklist
- **Policy toggles** (smoking, pets, parties)

### **Token Management**

```typescript
// Generate token for new booking
const result = await guestCheckinService.generateGuestToken({
  booking_id: 'uuid',
  expires_days: 30
})

// Get existing token status
const existing = await guestCheckinService.getGuestToken('booking-uuid')

// Revoke token if needed
await guestCheckinService.revokeGuestToken('token', 'Booking cancelled')
```

### **Access Analytics**

Hosts can view guest access patterns:

```typescript
// View access logs
const logs = await guestCheckinService.getGuestAccessLogs('booking-uuid')

// Access information includes:
{
  accessed_at: "2024-02-15T14:30:00Z",
  ip_address: "192.168.1.100",
  time_spent_seconds: 180,
  pages_viewed: ["checkin", "local-info"],
  device_info: "iPhone Safari"
}
```

## 🔒 Security Features

### **Token Security**

- **Cryptographically secure** random tokens (256-bit)
- **URL-safe encoding** with base64url
- **Unique constraint** prevents token collisions
- **Automatic expiration** after checkout + 3 days
- **Manual revocation** capability for hosts

### **Access Control**

- **IP address logging** for security monitoring
- **User agent tracking** for device identification
- **Access count** monitoring
- **Time-based restrictions** with automatic expiration
- **Host-only management** with RBAC integration

### **Data Protection**

- **Sensitive information** masked in logs
- **No permanent storage** of guest personal data
- **Automatic cleanup** of expired tokens
- **Audit trail** for all token operations

### **RLS Policies**

```sql
-- Hosts can only manage tokens for their properties
CREATE POLICY "Hosts can manage tokens for their properties" ON guest_checkin_tokens
    FOR ALL USING (
        property_id IN (
            SELECT id FROM properties WHERE host_id = auth.uid()
        )
    );

-- Public validation for guest access
CREATE POLICY "Public can validate tokens" ON guest_checkin_tokens
    FOR SELECT USING (true);
```

## ⚙️ Setup Instructions

### **1. Database Setup**

Run the guest check-in schema:

```sql
-- Execute in Supabase SQL Editor
-- File: supabase/guest-checkin-schema.sql
```

This creates:
- ✅ Guest token management tables
- ✅ Property information storage
- ✅ Access logging system
- ✅ Security functions and triggers
- ✅ RLS policies for data protection

### **2. Environment Configuration**

```bash
# Base URL for guest check-in links
NEXT_PUBLIC_BASE_URL=https://your-domain.com
NEXT_PUBLIC_VERCEL_URL=your-app.vercel.app
```

### **3. API Integration**

The system automatically integrates with:
- **Booking creation** → Token generation
- **Email sending** → Link inclusion
- **Property management** → Information updates

### **4. Host Onboarding**

For each property, hosts should:

1. **Set up property information** via the management interface
2. **Configure check-in instructions** with access codes
3. **Add local recommendations** for guest experience
4. **Test the guest flow** with a sample token

## 🔄 Workflow Examples

### **New Booking Flow**

1. **Booking Created** → Host receives booking notification
2. **Email Scheduled** → Check-in instructions email queued
3. **Token Generated** → Secure guest page created automatically
4. **Email Sent** → Guest receives check-in instructions with portal link
5. **Guest Access** → Guest visits portal, views all information
6. **Automatic Expiration** → Portal expires 3 days after checkout

### **Host Management Flow**

1. **Property Setup** → Host configures property information
2. **Information Updates** → Host updates WiFi, rules, local tips
3. **Token Monitoring** → Host views guest access analytics
4. **Manual Revocation** → Host can revoke access if needed

### **Guest Experience Flow**

1. **Email Received** → Guest gets check-in instructions
2. **Portal Access** → Guest clicks link to open portal
3. **Information Browse** → Guest reviews all stay information
4. **Code Copying** → Guest copies WiFi password, access code
5. **Arrival** → Guest uses portal info for smooth check-in
6. **Reference** → Guest can revisit portal during stay

## 🚨 Troubleshooting

### **Common Issues**

#### **Token Not Working**
```typescript
// Check token status
const validation = await fetch(`/api/guest-checkin/validate?token=${token}`)
const result = await validation.json()

if (!result.success) {
  console.log('Token issue:', result.error)
  // Possible issues: expired, revoked, invalid
}
```

#### **Missing Property Information**
```typescript
// Ensure property information is set up
const propertyInfo = await guestCheckinService.getPropertyInformation(propertyId)

if (!propertyInfo.data) {
  // Property information needs to be configured
  // Guide host to property management interface
}
```

#### **Email Links Not Working**
```typescript
// Verify environment configuration
console.log('Base URL:', process.env.NEXT_PUBLIC_BASE_URL)
console.log('Vercel URL:', process.env.NEXT_PUBLIC_VERCEL_URL)

// Check token generation in email service
const tokenResult = await guestCheckinService.generateTokenForEmail(bookingId)
console.log('Token result:', tokenResult)
```

### **Maintenance Tasks**

#### **Cleanup Expired Tokens**
```typescript
// Run periodically (daily cron job)
const cleaned = await guestCheckinService.cleanupExpiredTokens()
console.log(`Cleaned up ${cleaned.cleaned} expired tokens`)
```

#### **Monitor Access Patterns**
```sql
-- Check recent guest access
SELECT 
  gct.guest_name,
  gct.access_count,
  gct.accessed_at,
  p.name as property_name
FROM guest_checkin_tokens gct
JOIN properties p ON gct.property_id = p.id
WHERE gct.accessed_at > NOW() - INTERVAL '7 days'
ORDER BY gct.accessed_at DESC;
```

## 📈 Analytics & Insights

### **Guest Engagement Metrics**

Track how guests interact with their check-in portals:

- **Access rate**: % of guests who visit their portal
- **Time spent**: Average time on portal pages
- **Feature usage**: Most viewed sections (WiFi, rules, local info)
- **Device types**: Mobile vs desktop usage patterns

### **Host Performance**

Measure host preparation and guest satisfaction:

- **Information completeness**: Properties with full details
- **Update frequency**: How often hosts update information
- **Guest feedback**: Indirect measure through access patterns

### **System Health**

Monitor technical performance:

- **Token generation** success rates
- **Page load times** for guest portals
- **Error rates** and failure points
- **Security incidents** and access anomalies

The guest self check-in system provides a comprehensive, secure, and user-friendly solution that enhances the guest experience while giving hosts complete control over the information their guests receive. The automatic expiration ensures security while the rich feature set covers all aspects of a successful stay!

## 🎯 Future Enhancements

Potential system improvements:

- **Multi-language support** for international guests
- **SMS integration** for check-in code delivery
- **QR code generation** for easy mobile access
- **Guest feedback** collection after checkout
- **Integration with smart locks** for automated access
- **Photo galleries** of property amenities
- **Real-time updates** push notifications for hosts
- **Chatbot integration** for guest questions