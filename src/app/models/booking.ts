export interface ServiceBooking {
  id: number;
  service_id: number;
  shop_id?: number;
  customer_id?: number;
  booking_date: string;  // YYYY-MM-DD format
  start_time: string;    // HH:MM:SS format
  end_time?: string;     // HH:MM:SS format
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  customer_name?: string;
  customer_email?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  // Joined fields from service
  service_name?: string;
  duration_minutes?: number;
  price?: number;
}
