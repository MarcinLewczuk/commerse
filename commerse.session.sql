-- ============================================
-- SEED 10 BOOKINGS ACROSS LAST MONTH AND NEXT MONTH
-- Using actual IDs from database:
-- Services: id=3 (Repair), id=4 (TEST CORRECTED) - Shop 5 (Shitter)
-- Users: id=5 (shop owner), id=3 (customer), id=4 (customer_seller)
-- ============================================

-- Insert 10 sample bookings with actual IDs
INSERT INTO service_bookings (service_id, shop_id, customer_id, booking_date, start_time, end_time, status, customer_name, customer_email, notes)
VALUES
  -- Last month bookings (4 bookings)
  (3, 5, 3, DATE_SUB(CURDATE(), INTERVAL 25 DAY), '09:00:00', '10:00:00', 'completed', 'Alice Johnson', 'alice@example.com', 'Service completed successfully'),
  (4, 5, 4, DATE_SUB(CURDATE(), INTERVAL 20 DAY), '14:30:00', '16:00:00', 'completed', 'Bob Martinez', 'bob.m@example.com', 'Customer was very satisfied'),
  (3, 5, 3, DATE_SUB(CURDATE(), INTERVAL 15 DAY), '10:00:00', '11:00:00', 'cancelled', 'Carol White', 'carol.w@example.com', 'Customer cancelled due to schedule conflict'),
  (4, 5, 4, DATE_SUB(CURDATE(), INTERVAL 8 DAY), '11:30:00', '13:00:00', 'completed', 'Alice Johnson', 'alice@example.com', 'Repeat customer - excellent service'),
  
  -- Current week bookings (3 bookings)
  (3, 5, 3, DATE_SUB(CURDATE(), INTERVAL 2 DAY), '09:30:00', '10:30:00', 'completed', 'Bob Martinez', 'bob.m@example.com', 'Service delivered on time'),
  (4, 5, 4, CURDATE(), '13:00:00', '14:30:00', 'confirmed', 'Carol White', 'carol.w@example.com', 'Today\'s appointment'),
  (3, 5, 3, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '10:00:00', '11:00:00', 'confirmed', 'Alice Johnson', 'alice@example.com', 'Regular monthly appointment'),
  
  -- Next month bookings (3 bookings)
  (4, 5, 4, DATE_ADD(CURDATE(), INTERVAL 10 DAY), '15:00:00', '16:30:00', 'pending', 'Bob Martinez', 'bob.m@example.com', 'Needs confirmation from customer'),
  (3, 5, 3, DATE_ADD(CURDATE(), INTERVAL 18 DAY), '09:00:00', '10:00:00', 'confirmed', 'Carol White', 'carol.w@example.com', 'Booked well in advance'),
  (4, 5, 4, DATE_ADD(CURDATE(), INTERVAL 25 DAY), '11:00:00', '12:30:00', 'pending', 'Alice Johnson', 'alice@example.com', 'End of month appointment');

-- Verify the insertions
SELECT 
  id,
  service_id,
  booking_date,
  start_time,
  status,
  customer_name
FROM service_bookings
ORDER BY booking_date, start_time;
