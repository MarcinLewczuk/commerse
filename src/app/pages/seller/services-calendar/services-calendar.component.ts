import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { ShopService } from '../../../services/shop.service';
import { ServiceBooking } from '../../../models/booking';

interface CalendarDay {
  date: Date;
  dateString: string;
  bookings: ServiceBooking[];
  isToday: boolean;
  isCurrentMonth: boolean;
}

@Component({
  selector: 'app-services-calendar',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './services-calendar.component.html',
  styleUrl: './services-calendar.component.css'
})
export class ServicesCalendarComponent implements OnInit {
  private shopService = inject(ShopService);
  private http = inject(HttpClient);
  private snackBar = inject(MatSnackBar);
  private readonly apiUrl = 'http://localhost:3000';

  shopId = signal<number | null>(null);
  bookings = signal<ServiceBooking[]>([]);
  calendarDays = signal<CalendarDay[]>([]);
  currentMonth = signal<Date>(new Date());
  selectedBooking = signal<ServiceBooking | null>(null);
  loading = signal<boolean>(true);

  // View mode: 'month' or 'list'
  viewMode = signal<'month' | 'list'>('month');

  // Status filter
  statusFilter = signal<string>('all');

  // Search query
  searchQuery = signal<string>('');

  // Selected date for filtering
  selectedDate = signal<string>('');

  // Edit mode for booking modal
  isEditMode = signal<boolean>(false);
  editedBooking = signal<Partial<ServiceBooking>>({});

  ngOnInit() {
    this.loadShopAndBookings();
  }

  private loadShopAndBookings() {
    this.shopService.getShopInfo().subscribe({
      next: (shop) => {
        if (shop?.id) {
          this.shopId.set(shop.id);
          this.loadBookings(shop.id);
        } else {
          this.loading.set(false);
          this.snackBar.open('Shop not found', 'Close', { duration: 3000 });
        }
      },
      error: (err) => {
        console.error('Failed to load shop info:', err);
        this.loading.set(false);
        this.snackBar.open('Failed to load shop information', 'Close', { duration: 3000 });
      }
    });
  }

  private loadBookings(shopId: number) {
    this.loading.set(true);
    this.http.get<ServiceBooking[]>(`${this.apiUrl}/seller/bookings/${shopId}`).subscribe({
      next: (bookings) => {
        this.bookings.set(bookings);
        this.generateCalendar();
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load bookings:', err);
        this.loading.set(false);
        this.snackBar.open('Failed to load bookings', 'Close', { duration: 3000 });
      }
    });
  }

  private generateCalendar() {
    const current = this.currentMonth();
    const year = current.getFullYear();
    const month = current.getMonth();
    
    // Get first day of month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Get first day of calendar (might be from previous month)
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday
    
    // Generate 42 days (6 weeks)
    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      const dateString = this.formatDateToString(date);
      const dayBookings = this.bookings().filter(b => {
        // Normalize the booking date to YYYY-MM-DD format
        const bookingDate = b.booking_date.split('T')[0];
        return bookingDate === dateString;
      });
      
      days.push({
        date,
        dateString,
        bookings: dayBookings,
        isToday: date.getTime() === today.getTime(),
        isCurrentMonth: date.getMonth() === month
      });
    }
    
    this.calendarDays.set(days);
  }

  previousMonth() {
    const current = this.currentMonth();
    this.currentMonth.set(new Date(current.getFullYear(), current.getMonth() - 1, 1));
    this.generateCalendar();
  }

  nextMonth() {
    const current = this.currentMonth();
    this.currentMonth.set(new Date(current.getFullYear(), current.getMonth() + 1, 1));
    this.generateCalendar();
  }

  goToToday() {
    this.currentMonth.set(new Date());
    this.generateCalendar();
  }

  getMonthYear(): string {
    const current = this.currentMonth();
    return current.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  private formatDateToString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  formatTime(time: string): string {
    // Convert HH:MM:SS to HH:MM AM/PM
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }

  formatDate(dateString: string): string {
    // Convert YYYY-MM-DD or ISO string to readable format
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  selectBooking(booking: ServiceBooking) {
    this.selectedBooking.set(booking);
    this.isEditMode.set(false);
    this.editedBooking.set({});
  }

  closeBookingDetail() {
    this.selectedBooking.set(null);
    this.isEditMode.set(false);
    this.editedBooking.set({});
  }

  startEditMode() {
    const booking = this.selectedBooking();
    if (booking) {
      this.isEditMode.set(true);
      this.editedBooking.set({
        booking_date: booking.booking_date.split('T')[0],
        start_time: booking.start_time,
        end_time: booking.end_time,
        customer_name: booking.customer_name,
        customer_email: booking.customer_email,
        notes: booking.notes,
        status: booking.status
      });
    }
  }

  cancelEdit() {
    this.isEditMode.set(false);
    this.editedBooking.set({});
  }

  saveBooking() {
    const booking = this.selectedBooking();
    const edited = this.editedBooking();
    
    if (!booking) return;

    this.http.put(`${this.apiUrl}/bookings/${booking.id}`, edited).subscribe({
      next: () => {
        this.snackBar.open('Booking updated successfully', 'Close', { duration: 2000 });
        this.isEditMode.set(false);
        this.closeBookingDetail();
        if (this.shopId()) {
          this.loadBookings(this.shopId()!);
        }
      },
      error: (err) => {
        console.error('Failed to update booking:', err);
        this.snackBar.open('Failed to update booking', 'Close', { duration: 3000 });
      }
    });
  }

  updateBookingStatus(booking: ServiceBooking, newStatus: string) {
    this.http.put(`${this.apiUrl}/bookings/${booking.id}/status`, { status: newStatus }).subscribe({
      next: () => {
        booking.status = newStatus as any;
        this.snackBar.open('Booking status updated', 'Close', { duration: 2000 });
        if (this.shopId()) {
          this.loadBookings(this.shopId()!);
        }
      },
      error: (err) => {
        console.error('Failed to update booking status:', err);
        this.snackBar.open('Failed to update booking status', 'Close', { duration: 3000 });
      }
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  setViewMode(mode: 'month' | 'list') {
    this.viewMode.set(mode);
  }

  setStatusFilter(status: string) {
    this.statusFilter.set(status);
  }

  setSearchQuery(query: string) {
    this.searchQuery.set(query.toLowerCase());
  }

  setSelectedDate(date: string) {
    this.selectedDate.set(date);
  }

  getFilteredBookings(): ServiceBooking[] {
    let filtered = this.bookings();
    
    // Apply status filter
    const filter = this.statusFilter();
    if (filter !== 'all') {
      filtered = filtered.filter(b => b.status === filter);
    }
    
    // Apply date filter
    const dateFilter = this.selectedDate();
    if (dateFilter) {
      filtered = filtered.filter(b => {
        const bookingDate = b.booking_date.split('T')[0];
        return bookingDate === dateFilter;
      });
    }
    
    // Apply search filter
    const search = this.searchQuery();
    if (search) {
      filtered = filtered.filter(b => {
        const customerName = (b.customer_name || '').toLowerCase();
        const customerEmail = (b.customer_email || '').toLowerCase();
        const serviceName = (b.service_name || '').toLowerCase();
        const notes = (b.notes || '').toLowerCase();
        const status = b.status.toLowerCase();
        
        return customerName.includes(search) ||
               customerEmail.includes(search) ||
               serviceName.includes(search) ||
               notes.includes(search) ||
               status.includes(search);
      });
    }
    
    return filtered;
  }

  getDayBookingCount(day: CalendarDay): number {
    const filter = this.statusFilter();
    if (filter === 'all') {
      return day.bookings.length;
    }
    return day.bookings.filter(b => b.status === filter).length;
  }

  getFilteredDayBookings(day: CalendarDay): ServiceBooking[] {
    const filter = this.statusFilter();
    if (filter === 'all') {
      return day.bookings;
    }
    return day.bookings.filter(b => b.status === filter);
  }
}
