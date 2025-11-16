-- Add fields to store Booking.com hotel_id and reservation_id
-- This allows us to generate direct links to Booking.com reservations

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS external_hotel_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS external_reservation_id VARCHAR(50);

-- Add index for external reservation lookups
CREATE INDEX IF NOT EXISTS idx_bookings_external_reservation 
ON bookings(external_hotel_id, external_reservation_id) 
WHERE external_hotel_id IS NOT NULL AND external_reservation_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN bookings.external_hotel_id IS 'External platform hotel/property ID (e.g., Booking.com hotel_id)';
COMMENT ON COLUMN bookings.external_reservation_id IS 'External platform reservation ID (e.g., Booking.com res_id)';



