-- Add Booking.com hotel_id to properties table
-- This is set once per property and used for all Booking.com bookings

ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS booking_com_hotel_id VARCHAR(50);

-- Add comment
COMMENT ON COLUMN properties.booking_com_hotel_id IS 'Booking.com hotel ID for this property (used to generate reservation links)';

-- Set the hotel ID for "Views of Lagos" property
-- Update this with the correct property_id UUID
-- UPDATE properties 
-- SET booking_com_hotel_id = '4127707' 
-- WHERE name = 'Views of Lagos';



