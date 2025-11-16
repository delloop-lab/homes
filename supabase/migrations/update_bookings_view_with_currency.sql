-- Update bookings_with_properties view to include currency column
-- This ensures the view includes the new currency column from bookings table

DROP VIEW IF EXISTS bookings_with_properties;

CREATE VIEW bookings_with_properties AS
SELECT 
    b.*,
    p.name as property_name,
    p.address as property_address,
    p.host_id
FROM bookings b
JOIN properties p ON b.property_id = p.id;

-- Grant permissions
GRANT SELECT ON bookings_with_properties TO authenticated;


