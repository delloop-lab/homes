# 🔐 Role-Based Access Control (RBAC) Setup

This document explains how to set up and use the comprehensive Role-Based Access Control system with Supabase Row Level Security (RLS).

## 🎯 Overview

The RBAC system provides secure, granular access control with three distinct roles:

### **User Roles**

#### **🏠 Host Role**
- **Full access** to all property management features
- **Manage properties**: Create, edit, delete properties
- **Manage bookings**: Full CRUD operations on bookings
- **Manage cleanings**: Create, assign, and monitor cleaning tasks
- **Assign cleaners**: Control who can access each property
- **View reports**: Access to revenue and analytics
- **Email management**: Schedule and send guest communications

#### **🧹 Cleaner Role**
- **Limited access** to assigned properties only
- **View bookings**: Read-only access for assigned properties
- **Manage cleaning tasks**: Update status and notes for assigned tasks
- **Property access**: Only properties they're assigned to
- **Schedule view**: See cleaning schedules and check-in/out dates
- **Cannot**: Create/edit bookings, properties, or user management

#### **👑 Admin Role**
- **Super user** with access to everything
- **User management**: Assign roles, activate/deactivate users
- **System oversight**: Access to all data across all hosts
- **Audit logs**: View security and activity logs
- **Cross-tenant access**: Manage multiple host accounts

## 🏗️ Database Schema

### **Core Tables**

#### **user_profiles**
```sql
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'cleaner' CHECK (role IN ('host', 'cleaner', 'admin')),
    phone VARCHAR(50),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    company_name VARCHAR(255),     -- Host-specific
    hourly_rate DECIMAL(10,2),     -- Cleaner-specific
    preferred_properties UUID[],   -- Cleaner preferences
    availability JSONB,            -- Cleaner schedule
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **property_assignments**
```sql
CREATE TABLE property_assignments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    property_id UUID REFERENCES properties(id),
    cleaner_id UUID REFERENCES user_profiles(id),
    assigned_by UUID REFERENCES user_profiles(id),
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **RLS Policies**

#### **Properties Access**
```sql
-- Hosts can manage their own properties
CREATE POLICY "Hosts can manage own properties" ON properties
    FOR ALL USING (is_host() AND host_id = auth.uid());

-- Cleaners can view assigned properties
CREATE POLICY "Cleaners can view assigned properties" ON properties
    FOR SELECT USING (
        is_cleaner() AND 
        id IN (SELECT property_id FROM get_cleaner_properties())
    );
```

#### **Bookings Access**
```sql
-- Hosts can manage bookings for their properties
CREATE POLICY "Hosts can manage bookings for own properties" ON bookings
    FOR ALL USING (
        is_host() AND 
        property_id IN (SELECT id FROM properties WHERE host_id = auth.uid())
    );

-- Cleaners can view bookings for assigned properties (read-only)
CREATE POLICY "Cleaners can view bookings for assigned properties" ON bookings
    FOR SELECT USING (
        is_cleaner() AND 
        property_id IN (SELECT property_id FROM get_cleaner_properties())
    );
```

#### **Cleanings Access**
```sql
-- Hosts can manage all cleaning tasks for their properties
CREATE POLICY "Hosts can manage cleanings for own properties" ON cleanings
    FOR ALL USING (
        is_host() AND 
        property_id IN (SELECT id FROM properties WHERE host_id = auth.uid())
    );

-- Cleaners can view and update assigned cleaning tasks
CREATE POLICY "Cleaners can manage assigned cleaning tasks" ON cleanings
    FOR SELECT USING (
        is_cleaner() AND (
            assigned_to = auth.uid() OR
            property_id IN (SELECT property_id FROM get_cleaner_properties())
        )
    );
```

## ⚙️ Setup Instructions

### 1. Database Setup

Run the RBAC schema:

```sql
-- Execute in Supabase SQL Editor
-- File: supabase/rbac-schema.sql
```

This creates:
- ✅ User profiles table with role management
- ✅ Property assignment system
- ✅ Comprehensive RLS policies
- ✅ Helper functions for role checking
- ✅ Audit logging system
- ✅ Automatic profile creation triggers

### 2. Authentication Flow

#### **User Registration**
```typescript
// Sign up with role selection
await authService.signUp(
  'user@example.com',
  'password123',
  'John Smith',
  'host' // or 'cleaner'
)

// Profile is automatically created via trigger
```

#### **Profile Management**
```typescript
// Get user profile
const profile = await authService.getUserProfile()

// Update profile
await authService.updateUserProfile({
  full_name: 'Updated Name',
  phone: '(555) 123-4567',
  company_name: 'My Property Co'
})
```

### 3. Property Assignment System

#### **Assign Cleaner to Property (Host Only)**
```typescript
// Host assigns cleaner to property
await authService.assignCleanerToProperty(
  'property-uuid',
  'cleaner-uuid',
  'Special instructions for this property'
)
```

#### **Get Cleaner's Properties**
```typescript
// Get properties cleaner has access to
const propertyIds = await authService.getCleanerProperties()

// Get assigned cleaners for a property
const cleaners = await authService.getPropertyCleaners('property-uuid')
```

## 🔧 Frontend Integration

### **Route Protection**

#### **Role-Based Route Guards**
```typescript
import { HostOnlyRoute, CleanerOnlyRoute, AuthenticatedRoute } from '@/components/auth/route-guard'

// Host-only pages
<HostOnlyRoute>
  <PropertiesPage />
</HostOnlyRoute>

// Cleaner-only pages  
<CleanerOnlyRoute>
  <CleanerSchedulePage />
</CleanerOnlyRoute>

// Any authenticated user
<AuthenticatedRoute>
  <SchedulePage />
</AuthenticatedRoute>
```

#### **Permission Checking**
```typescript
import { useAuth } from '@/components/providers'
import { authService } from '@/lib/auth'

function MyComponent() {
  const { role } = useAuth()
  
  // Check permissions
  const canCreateBookings = authService.canCreateBookings(role)
  const canManageCleanings = authService.canManageCleanings(role)
  const canAssignCleaners = authService.canAssignCleaners(role)
  
  return (
    <div>
      {canCreateBookings && <CreateBookingButton />}
      {canManageCleanings && <CleaningManagement />}
      {canAssignCleaners && <CleanerAssignments />}
    </div>
  )
}
```

### **Conditional UI Components**

#### **Navigation Menu**
```typescript
// components/dashboard/header.tsx
{authService.canAccessProperties(role) && (
  <a href="/properties">Properties</a>
)}

{authService.canAccessBookings(role) && (
  <a href="/bookings">Bookings</a>
)}

{authService.canAccessSchedule(role) && (
  <a href="/schedule">Schedule</a>
)}
```

#### **Feature Access**
```typescript
// Show different views based on role
{authService.isHost(role) && (
  <HostDashboard />
)}

{authService.isCleaner(role) && (
  <CleanerDashboard />
)}

{authService.isAdmin(role) && (
  <AdminPanel />
)}
```

## 📊 Permission Matrix

| Feature | Host | Cleaner | Admin |
|---------|------|---------|-------|
| **Properties** |
| Create/Edit Properties | ✅ | ❌ | ✅ |
| View Own Properties | ✅ | ❌ | ✅ |
| View Assigned Properties | ❌ | ✅ | ✅ |
| **Bookings** |
| Create/Edit Bookings | ✅ | ❌ | ✅ |
| View Own Property Bookings | ✅ | ✅* | ✅ |
| Delete Bookings | ✅ | ❌ | ✅ |
| **Cleanings** |
| Create Cleaning Tasks | ✅ | ❌ | ✅ |
| View Assigned Tasks | ✅ | ✅ | ✅ |
| Update Task Status | ✅ | ✅ | ✅ |
| **User Management** |
| Assign Cleaners | ✅ | ❌ | ✅ |
| Manage User Roles | ❌ | ❌ | ✅ |
| View User Profiles | ✅** | ❌ | ✅ |
| **Reports & Analytics** |
| Revenue Reports | ✅ | ❌ | ✅ |
| Property Analytics | ✅ | ❌ | ✅ |
| Schedule Export | ✅ | ✅*** | ✅ |

*Cleaners can only view bookings for properties they're assigned to  
**Hosts can only view cleaner profiles for assignment purposes  
***Cleaners can only export schedules for their assigned properties

## 🛡️ Security Features

### **Row Level Security (RLS)**

All database access is automatically filtered by RLS policies:

```sql
-- Example: Cleaners can only see their assigned cleanings
SELECT * FROM cleanings; 
-- Automatically filtered to show only:
-- 1. Tasks assigned directly to them
-- 2. Tasks for properties they're assigned to
```

### **Function-Level Security**

Sensitive operations use `SECURITY DEFINER` functions:

```sql
-- Safe cleaner assignment (validates permissions)
SELECT assign_cleaner_to_property(
  'property-uuid',
  'cleaner-uuid', 
  'assignment notes'
);
```

### **Data Isolation**

- **Hosts**: Can only access their own properties and related data
- **Cleaners**: Can only access assigned properties and related tasks
- **Cross-contamination prevented**: RLS ensures users can't access other hosts' data

### **Audit Logging**

All significant actions are logged:

```sql
-- Audit log tracks:
-- - User actions (INSERT, UPDATE, DELETE)
-- - Data changes (old vs new values)
-- - IP addresses and user agents
-- - Timestamps and user IDs
```

## 🔄 Data Flow Examples

### **Host Workflow**
1. **Create Property** → Automatically owned by host
2. **Assign Cleaner** → Creates property_assignments record
3. **Create Booking** → Triggers automatic cleaning task
4. **View Reports** → RLS filters to host's data only

### **Cleaner Workflow**
1. **Login** → Profile loaded with assigned properties
2. **View Schedule** → RLS shows only assigned properties
3. **Update Task Status** → Validated against assignments
4. **Access Denied** → Cannot access unassigned properties

### **Admin Workflow**
1. **System Overview** → Access to all hosts and cleaners
2. **User Management** → Assign roles, activate/deactivate
3. **Cross-Tenant Support** → Assist multiple hosts
4. **Audit Review** → Monitor system activity

## 🚨 Security Considerations

### **Best Practices**

1. **Principle of Least Privilege**
   - Cleaners get minimal access needed for their job
   - Hosts cannot access other hosts' data
   - Admins use separate accounts for daily work

2. **Defense in Depth**
   - Frontend permission checks (UX)
   - API-level validation (business logic)
   - Database RLS policies (data security)
   - Function-level security (operations)

3. **Regular Audits**
   - Review property assignments quarterly
   - Monitor unusual data access patterns
   - Validate user role assignments
   - Check for orphaned cleaners/properties

### **Common Pitfalls**

❌ **Don't rely only on frontend checks**
```typescript
// BAD: Only frontend check
if (role === 'host') {
  showDeleteButton()
}
```

✅ **Always validate on backend**
```typescript
// GOOD: Frontend + backend validation
if (authService.canDeleteBookings(role)) {
  showDeleteButton() // RLS will also prevent unauthorized access
}
```

❌ **Don't bypass RLS**
```sql
-- BAD: Disabling RLS
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
```

✅ **Trust the system**
```sql
-- GOOD: Let RLS handle security
SELECT * FROM bookings; -- Automatically filtered
```

## 📱 Mobile Considerations

### **Cleaner Mobile App**

The RBAC system is designed for mobile-first cleaner experience:

```typescript
// Mobile-optimized cleaner components
<CleanerSchedulePage mobileOptimized={true} />
<CleaningTaskList showOnlyAssigned={true} />
```

### **Offline Capabilities**

Cleaners can work offline with cached data:

```typescript
// Cache assigned properties and tasks
const cleanerData = {
  properties: await getCleanerProperties(),
  tasks: await getAssignedTasks(),
  permissions: ['view_bookings', 'update_cleanings']
}
```

## 🔧 Troubleshooting

### **Common Issues**

#### **User Can't Access Expected Data**
```sql
-- Check user profile and role
SELECT * FROM user_profiles WHERE id = 'user-uuid';

-- Check property assignments (for cleaners)
SELECT * FROM property_assignments 
WHERE cleaner_id = 'user-uuid' AND is_active = true;
```

#### **RLS Policy Not Working**
```sql
-- Test policies directly
SET ROLE authenticated;
SET request.jwt.claims TO '{"sub": "user-uuid"}';
SELECT * FROM properties; -- Should be filtered
```

#### **Permission Denied Errors**
```typescript
// Check role from profile (not just user metadata)
const profile = await authService.getUserProfile()
console.log('Current role:', profile?.role)

// Verify permissions
console.log('Can access properties:', authService.canAccessProperties(profile?.role))
```

### **Debug Tools**

#### **Check User Permissions**
```typescript
// Debug helper
async function debugUserPermissions(userId: string) {
  const profile = await authService.getUserProfile(userId)
  const properties = await authService.getCleanerProperties(userId)
  
  console.log('User Profile:', profile)
  console.log('Accessible Properties:', properties)
  console.log('Permissions:', {
    canAccessProperties: authService.canAccessProperties(profile?.role),
    canCreateBookings: authService.canCreateBookings(profile?.role),
    canManageCleanings: authService.canManageCleanings(profile?.role)
  })
}
```

#### **Audit Query**
```sql
-- Recent user activity
SELECT 
  al.*,
  up.full_name,
  up.role
FROM audit_log al
JOIN user_profiles up ON al.user_id = up.id
WHERE al.created_at > NOW() - INTERVAL '24 hours'
ORDER BY al.created_at DESC;
```

The RBAC system provides enterprise-grade security with granular access control, ensuring that users can only access data and features appropriate to their role while maintaining a smooth user experience for both hosts and cleaners.