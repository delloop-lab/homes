-- Optimize booking overlap trigger to skip checks when dates don't change
-- This fixes the timeout issue when updating non-date fields like guest_name

-- Drop the existing trigger
DROP TRIGGER IF EXISTS check_booking_overlap_trigger ON bookings;

-- Create optimized trigger function that only checks overlaps when dates change
CREATE OR REPLACE FUNCTION check_booking_overlap()
RETURNS TRIGGER AS $$
BEGIN
    -- For UPDATE operations, only check overlaps if dates are actually changing
    IF (TG_OP = 'UPDATE') THEN
        -- Skip overlap check if check_in and check_out dates haven't changed
        IF (OLD.check_in = NEW.check_in AND OLD.check_out = NEW.check_out) THEN
            RETURN NEW;
        END IF;
    END IF;

    -- Check for overlapping bookings (for INSERT or when dates changed in UPDATE)
    IF EXISTS (
        SELECT 1 FROM bookings 
        WHERE property_id = NEW.property_id
        AND id != COALESCE(NEW.id, uuid_generate_v4())
        AND status NOT IN ('cancelled')
        AND (
            (NEW.check_in >= check_in AND NEW.check_in < check_out) OR
            (NEW.check_out > check_in AND NEW.check_out <= check_out) OR
            (NEW.check_in <= check_in AND NEW.check_out >= check_out)
        )
    ) THEN
        RAISE EXCEPTION 'Booking overlaps with existing reservation';
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Recreate the trigger with the optimized function
CREATE TRIGGER check_booking_overlap_trigger
    BEFORE INSERT OR UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION check_booking_overlap();

-- Add comment to document the optimization
COMMENT ON FUNCTION check_booking_overlap() IS 'Checks for overlapping bookings. Optimized to skip overlap checks when updating non-date fields to prevent timeouts.';

