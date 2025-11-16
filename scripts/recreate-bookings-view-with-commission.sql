-- Recreate bookings_with_properties view to include commission_and_charges
-- Run this after adding the commission_and_charges column to bookings table

DROP VIEW IF EXISTS bookings_with_properties CASCADE;

CREATE VIEW bookings_with_properties AS
SELECT 
    b.id,
    b.property_id,
    b.guest_name,
    b.contact_email,
    b.contact_phone,
    b.guest_first_name,
    b.guest_last_initial,
    b.check_in,
    b.check_out,
    b.nights,
    b.notes,
    b.passport_image_url,
    b.event_uid,
    b.booking_platform,
    b.reservation_url,
    b.guest_phone_last4,
    b.listing_name,
    b.total_amount,
    b.commission_and_charges,
    b.external_reservation_id,
    b.external_hotel_id,
    b.status,
    b.created_at,
    b.updated_at,
    p.name as property_name,
    p.address as property_address,
    p.booking_com_hotel_id,
    p.host_id
FROM bookings b
JOIN properties p ON b.property_id = p.id;



