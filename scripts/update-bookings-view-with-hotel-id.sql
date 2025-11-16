-- Update bookings_with_properties view to include Booking.com hotel_id
-- This allows the app to generate Booking.com links without additional queries

DROP VIEW IF EXISTS bookings_with_properties;

CREATE VIEW bookings_with_properties AS
SELECT 
    b.*,
    p.name as property_name,
    p.address as property_address,
    p.booking_com_hotel_id,
    p.host_id
FROM bookings b
JOIN properties p ON b.property_id = p.id;



