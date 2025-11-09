import jsPDF from 'jspdf'
import { format } from 'date-fns'

export interface BookingReport {
  id: string
  guestName: string
  guestEmail: string
  checkIn: Date
  checkOut: Date
  totalAmount: number
  propertyName: string
  status: string
}

export interface PropertyReport {
  id: string
  name: string
  address: string
  totalBookings: number
  totalRevenue: number
  averageRating: number
}

/**
 * Generate a PDF report for a single booking
 */
export function generateBookingPDF(booking: BookingReport): void {
  const doc = new jsPDF()
  
  // Header
  doc.setFontSize(20)
  doc.text('Booking Report', 20, 20)
  
  // Booking details
  doc.setFontSize(12)
  doc.text(`Booking ID: ${booking.id}`, 20, 40)
  doc.text(`Guest: ${booking.guestName}`, 20, 50)
  doc.text(`Email: ${booking.guestEmail}`, 20, 60)
  doc.text(`Property: ${booking.propertyName}`, 20, 70)
  doc.text(`Check-in: ${format(booking.checkIn, 'MMM dd, yyyy')}`, 20, 80)
  doc.text(`Check-out: ${format(booking.checkOut, 'MMM dd, yyyy')}`, 20, 90)
  doc.text(`Total Amount: $${booking.totalAmount.toFixed(2)}`, 20, 100)
  doc.text(`Status: ${booking.status}`, 20, 110)
  
  // Save the PDF
  doc.save(`booking-${booking.id}.pdf`)
}

/**
 * Generate a PDF report for multiple bookings
 */
export function generateBookingsReportPDF(bookings: BookingReport[]): void {
  const doc = new jsPDF()
  
  // Header
  doc.setFontSize(20)
  doc.text('Bookings Report', 20, 20)
  doc.setFontSize(10)
  doc.text(`Generated on: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, 20, 30)
  
  let yPosition = 50
  let pageNumber = 1
  
  bookings.forEach((booking, index) => {
    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage()
      pageNumber++
      yPosition = 20
    }
    
    // Booking entry
    doc.setFontSize(12)
    doc.setFont(undefined, 'bold')
    doc.text(`Booking ${index + 1}: ${booking.guestName}`, 20, yPosition)
    
    doc.setFont(undefined, 'normal')
    doc.setFontSize(10)
    doc.text(`ID: ${booking.id}`, 30, yPosition + 8)
    doc.text(`Property: ${booking.propertyName}`, 30, yPosition + 16)
    doc.text(`Check-in: ${format(booking.checkIn, 'MMM dd, yyyy')}`, 30, yPosition + 24)
    doc.text(`Check-out: ${format(booking.checkOut, 'MMM dd, yyyy')}`, 30, yPosition + 32)
    doc.text(`Amount: $${booking.totalAmount.toFixed(2)}`, 30, yPosition + 40)
    doc.text(`Status: ${booking.status}`, 30, yPosition + 48)
    
    yPosition += 70
  })
  
  // Footer
  doc.setFontSize(8)
  doc.text(`Page ${pageNumber}`, 20, 280)
  
  // Save the PDF
  doc.save('bookings-report.pdf')
}

/**
 * Generate a PDF report for property performance
 */
export function generatePropertyReportPDF(properties: PropertyReport[]): void {
  const doc = new jsPDF()
  
  // Header
  doc.setFontSize(20)
  doc.text('Property Performance Report', 20, 20)
  doc.setFontSize(10)
  doc.text(`Generated on: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, 20, 30)
  
  let yPosition = 50
  
  properties.forEach((property, index) => {
    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage()
      yPosition = 20
    }
    
    // Property entry
    doc.setFontSize(12)
    doc.setFont(undefined, 'bold')
    doc.text(`${index + 1}. ${property.name}`, 20, yPosition)
    
    doc.setFont(undefined, 'normal')
    doc.setFontSize(10)
    doc.text(`Address: ${property.address}`, 30, yPosition + 8)
    doc.text(`Total Bookings: ${property.totalBookings}`, 30, yPosition + 16)
    doc.text(`Total Revenue: $${property.totalRevenue.toFixed(2)}`, 30, yPosition + 24)
    doc.text(`Average Rating: ${property.averageRating.toFixed(1)}/5`, 30, yPosition + 32)
    
    yPosition += 50
  })
  
  // Summary
  const totalRevenue = properties.reduce((sum, property) => sum + property.totalRevenue, 0)
  const totalBookings = properties.reduce((sum, property) => sum + property.totalBookings, 0)
  
  doc.setFontSize(12)
  doc.setFont(undefined, 'bold')
  doc.text('Summary', 20, yPosition + 10)
  doc.setFont(undefined, 'normal')
  doc.text(`Total Properties: ${properties.length}`, 30, yPosition + 20)
  doc.text(`Total Bookings: ${totalBookings}`, 30, yPosition + 28)
  doc.text(`Total Revenue: $${totalRevenue.toFixed(2)}`, 30, yPosition + 36)
  
  // Save the PDF
  doc.save('property-report.pdf')
}

/**
 * Generate a monthly revenue report
 */
export function generateMonthlyRevenuePDF(
  month: string,
  revenue: number,
  bookings: number,
  properties: number
): void {
  const doc = new jsPDF()
  
  // Header
  doc.setFontSize(20)
  doc.text('Monthly Revenue Report', 20, 20)
  
  // Month and date
  doc.setFontSize(14)
  doc.text(`Month: ${month}`, 20, 40)
  doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy')}`, 20, 50)
  
  // Statistics
  doc.setFontSize(12)
  doc.text(`Total Revenue: $${revenue.toFixed(2)}`, 20, 80)
  doc.text(`Total Bookings: ${bookings}`, 20, 95)
  doc.text(`Active Properties: ${properties}`, 20, 110)
  doc.text(`Average Revenue per Booking: $${(revenue / bookings).toFixed(2)}`, 20, 125)
  
  // Save the PDF
  doc.save(`monthly-revenue-${month.toLowerCase()}.pdf`)
} 