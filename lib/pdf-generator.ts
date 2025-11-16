import jsPDF from 'jspdf'
import { format, parseISO } from 'date-fns'
import { BookingWithProperty } from '@/lib/bookings'

interface GroupedSchedule {
  property_id: string
  property_name: string
  property_address?: string
  checkins: BookingWithProperty[]
  checkouts: BookingWithProperty[]
}

interface DailySchedulePDFOptions {
  date: Date
  schedule: GroupedSchedule[]
  includeNotes?: boolean
  includeContactInfo?: boolean
  companyName?: string
  companyLogo?: string
}

interface MonthlyReportPDFOptions {
  month: string
  year: number
  bookings: BookingWithProperty[]
  revenue: {
    total: number
    byProperty: { property_name: string; amount: number }[]
    byPlatform: { platform: string; amount: number }[]
  }
  occupancy: {
    totalNights: number
    bookedNights: number
    occupancyRate: number
    byProperty: { property_name: string; rate: number }[]
  }
}

export class PDFGenerator {
  private doc: jsPDF
  private pageWidth: number
  private pageHeight: number
  private margin: number
  private currentY: number
  private lineHeight: number

  constructor() {
    this.doc = new jsPDF('p', 'mm', 'a4')
    this.pageWidth = this.doc.internal.pageSize.getWidth()
    this.pageHeight = this.doc.internal.pageSize.getHeight()
    this.margin = 15
    this.currentY = this.margin
    this.lineHeight = 5
  }

  private addHeader(title: string, subtitle?: string, companyName: string = 'Property Management') {
    // Company name/logo area
    this.doc.setFontSize(10)
    this.doc.setTextColor(100, 100, 100)
    this.doc.text(companyName, this.margin, this.currentY)
    
    // Main title
    this.doc.setFontSize(20)
    this.doc.setTextColor(0, 0, 0)
    this.doc.setFont(undefined, 'bold')
    this.currentY += 8
    this.doc.text(title, this.margin, this.currentY)
    
    // Subtitle
    if (subtitle) {
      this.doc.setFontSize(12)
      this.doc.setFont(undefined, 'normal')
      this.doc.setTextColor(80, 80, 80)
      this.currentY += 6
      this.doc.text(subtitle, this.margin, this.currentY)
    }
    
    // Generated timestamp
    this.doc.setFontSize(8)
    this.doc.setTextColor(120, 120, 120)
    const timestamp = `Generated: ${format(new Date(), 'MM/dd/yyyy h:mm a')}`
    this.doc.text(timestamp, this.pageWidth - this.margin - this.doc.getTextWidth(timestamp), this.currentY)
    
    // Add separator line
    this.currentY += 5
    this.doc.setDrawColor(200, 200, 200)
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY)
    this.currentY += 8
  }

  private addFooter() {
    const footerY = this.pageHeight - 10
    this.doc.setFontSize(8)
    this.doc.setTextColor(120, 120, 120)
    
    // Page number
    const pageText = `Page ${this.doc.getCurrentPageInfo().pageNumber}`
    this.doc.text(pageText, this.pageWidth - this.margin - this.doc.getTextWidth(pageText), footerY)
    
    // Company info
    this.doc.text('Daily Schedule Report', this.margin, footerY)
  }

  private checkPageBreak(requiredSpace: number = 20) {
    if (this.currentY + requiredSpace > this.pageHeight - 20) {
      this.addFooter()
      this.doc.addPage()
      this.currentY = this.margin + 10
    }
  }

  private addPropertySection(property: GroupedSchedule, includeNotes: boolean, includeContactInfo: boolean) {
    this.checkPageBreak(30)
    
    // Property header
    this.doc.setFontSize(14)
    this.doc.setFont(undefined, 'bold')
    this.doc.setTextColor(0, 0, 0)
    this.doc.text(property.property_name, this.margin, this.currentY)
    
    if (property.property_address) {
      this.doc.setFontSize(9)
      this.doc.setFont(undefined, 'normal')
      this.doc.setTextColor(100, 100, 100)
      this.currentY += 4
      this.doc.text(property.property_address, this.margin, this.currentY)
    }
    
    this.currentY += 8

    // Summary counts
    const checkinCount = property.checkins.length
    const checkoutCount = property.checkouts.length
    const totalCount = checkinCount + checkoutCount
    
    this.doc.setFontSize(10)
    this.doc.setTextColor(80, 80, 80)
    this.doc.text(`Activities: ${totalCount} (${checkinCount} check-ins, ${checkoutCount} check-outs)`, this.margin, this.currentY)
    this.currentY += 8

    // Check-ins section
    if (property.checkins.length > 0) {
      this.addActivitySection('CHECK-INS', property.checkins, 'checkin', includeNotes, includeContactInfo)
    }

    // Check-outs section  
    if (property.checkouts.length > 0) {
      this.addActivitySection('CHECK-OUTS', property.checkouts, 'checkout', includeNotes, includeContactInfo)
    }

    // Property separator
    this.currentY += 5
    this.doc.setDrawColor(230, 230, 230)
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY)
    this.currentY += 10
  }

  private addActivitySection(
    title: string, 
    bookings: BookingWithProperty[], 
    type: 'checkin' | 'checkout',
    includeNotes: boolean,
    includeContactInfo: boolean
  ) {
    this.checkPageBreak(15 + (bookings.length * 10))
    
    // Section header
    this.doc.setFontSize(11)
    this.doc.setFont(undefined, 'bold')
    
    if (type === 'checkin') {
      this.doc.setTextColor(0, 120, 0) // Green for check-ins
    } else {
      this.doc.setTextColor(180, 0, 0) // Red for check-outs
    }
    
    this.doc.text(`${title} (${bookings.length})`, this.margin, this.currentY)
    this.currentY += 6

    // Bookings
    bookings.forEach(booking => {
      this.checkPageBreak(15)
      
      // Guest name and time
      this.doc.setFontSize(10)
      this.doc.setFont(undefined, 'bold')
      this.doc.setTextColor(0, 0, 0)
      
      const timeField = type === 'checkin' ? booking.check_in : booking.check_out
      const timeStr = format(parseISO(timeField), 'h:mm a')
      const guestLine = `${booking.guest_name} - ${timeStr}`
      
      this.doc.text(guestLine, this.margin + 5, this.currentY)
      this.currentY += 4

      // Booking details
      this.doc.setFontSize(9)
      this.doc.setFont(undefined, 'normal')
      this.doc.setTextColor(80, 80, 80)
      
      const stayDates = `Stay: ${format(parseISO(booking.check_in), 'MMM dd')} - ${format(parseISO(booking.check_out), 'MMM dd')}`
      this.doc.text(stayDates, this.margin + 10, this.currentY)
      this.currentY += 3

      if (booking.booking_platform) {
        const { formatPlatformName } = require('./booking-platforms')
        this.doc.text(`Platform: ${formatPlatformName(booking.booking_platform)}`, this.margin + 10, this.currentY)
        this.currentY += 3
      }

      if (booking.status) {
        this.doc.text(`Status: ${booking.status.toUpperCase()}`, this.margin + 10, this.currentY)
        this.currentY += 3
      }

      // Contact information
      if (includeContactInfo) {
        if (booking.contact_email) {
          this.doc.text(`Email: ${booking.contact_email}`, this.margin + 10, this.currentY)
          this.currentY += 3
        }
        
        if (booking.contact_phone) {
          this.doc.text(`Phone: ${booking.contact_phone}`, this.margin + 10, this.currentY)
          this.currentY += 3
        }
      }

      // Notes
      if (includeNotes && booking.notes) {
        this.doc.setFont(undefined, 'italic')
        this.doc.setTextColor(100, 100, 100)
        
        // Word wrap for long notes
        const noteLines = this.doc.splitTextToSize(`Notes: ${booking.notes}`, this.pageWidth - this.margin - 20)
        noteLines.forEach((line: string) => {
          this.checkPageBreak(5)
          this.doc.text(line, this.margin + 10, this.currentY)
          this.currentY += 3
        })
      }

      this.currentY += 3 // Space between bookings
    })

    this.currentY += 3 // Space after section
  }

  /**
   * Generate daily schedule PDF
   */
  async generateDailySchedulePDF(options: DailySchedulePDFOptions): Promise<void> {
    const {
      date,
      schedule,
      includeNotes = true,
      includeContactInfo = true,
      companyName = 'Property Management'
    } = options

    // Header
    const title = 'Daily Schedule'
    const subtitle = format(date, 'EEEE, MMMM dd, yyyy')
    this.addHeader(title, subtitle, companyName)

    // Summary
    const totalCheckins = schedule.reduce((sum, p) => sum + p.checkins.length, 0)
    const totalCheckouts = schedule.reduce((sum, p) => sum + p.checkouts.length, 0)
    const totalActivities = totalCheckins + totalCheckouts
    
    this.doc.setFontSize(11)
    this.doc.setTextColor(60, 60, 60)
    this.doc.text(`Total Activities: ${totalActivities} (${totalCheckins} check-ins, ${totalCheckouts} check-outs)`, this.margin, this.currentY)
    this.currentY += 8

    if (schedule.length === 0) {
      // No activities
      this.doc.setFontSize(12)
      this.doc.setTextColor(150, 150, 150)
      this.doc.text('No check-ins or check-outs scheduled for this date.', this.margin, this.currentY + 20)
    } else {
      // Property sections
      schedule.forEach(property => {
        this.addPropertySection(property, includeNotes, includeContactInfo)
      })
    }

    // Footer
    this.addFooter()

    // Download
    const filename = `daily-schedule-${format(date, 'yyyy-MM-dd')}.pdf`
    this.doc.save(filename)
  }

  /**
   * Generate monthly report PDF
   */
  async generateMonthlyReportPDF(options: MonthlyReportPDFOptions): Promise<void> {
    const { month, year, bookings, revenue, occupancy } = options

    // Header
    const title = 'Monthly Report'
    const subtitle = `${month} ${year}`
    this.addHeader(title, subtitle)

    // Executive Summary
    this.doc.setFontSize(14)
    this.doc.setFont(undefined, 'bold')
    this.doc.setTextColor(0, 0, 0)
    this.doc.text('Executive Summary', this.margin, this.currentY)
    this.currentY += 8

    this.doc.setFontSize(10)
    this.doc.setFont(undefined, 'normal')
    this.doc.setTextColor(80, 80, 80)

    const summaryData = [
      `Total Bookings: ${bookings.length}`,
      `Total Revenue: $${revenue.total.toLocaleString()}`,
      `Occupancy Rate: ${(occupancy.occupancyRate * 100).toFixed(1)}%`,
      `Booked Nights: ${occupancy.bookedNights} of ${occupancy.totalNights}`
    ]

    summaryData.forEach(line => {
      this.doc.text(line, this.margin, this.currentY)
      this.currentY += 5
    })

    this.currentY += 8

    // Revenue by Property
    if (revenue.byProperty.length > 0) {
      this.checkPageBreak(30)
      
      this.doc.setFontSize(12)
      this.doc.setFont(undefined, 'bold')
      this.doc.text('Revenue by Property', this.margin, this.currentY)
      this.currentY += 6

      this.doc.setFontSize(9)
      this.doc.setFont(undefined, 'normal')
      
      revenue.byProperty.forEach(prop => {
        this.doc.text(`${prop.property_name}: $${prop.amount.toLocaleString()}`, this.margin + 5, this.currentY)
        this.currentY += 4
      })

      this.currentY += 6
    }

    // Revenue by Platform
    if (revenue.byPlatform.length > 0) {
      this.checkPageBreak(30)
      
      this.doc.setFontSize(12)
      this.doc.setFont(undefined, 'bold')
      this.doc.text('Revenue by Platform', this.margin, this.currentY)
      this.currentY += 6

      this.doc.setFontSize(9)
      this.doc.setFont(undefined, 'normal')
      
      revenue.byPlatform.forEach(platform => {
        this.doc.text(`${platform.platform}: $${platform.amount.toLocaleString()}`, this.margin + 5, this.currentY)
        this.currentY += 4
      })

      this.currentY += 6
    }

    // Occupancy by Property
    if (occupancy.byProperty.length > 0) {
      this.checkPageBreak(30)
      
      this.doc.setFontSize(12)
      this.doc.setFont(undefined, 'bold')
      this.doc.text('Occupancy by Property', this.margin, this.currentY)
      this.currentY += 6

      this.doc.setFontSize(9)
      this.doc.setFont(undefined, 'normal')
      
      occupancy.byProperty.forEach(prop => {
        this.doc.text(`${prop.property_name}: ${(prop.rate * 100).toFixed(1)}%`, this.margin + 5, this.currentY)
        this.currentY += 4
      })
    }

    // Footer
    this.addFooter()

    // Download
    const filename = `monthly-report-${year}-${month.toLowerCase()}.pdf`
    this.doc.save(filename)
  }

  /**
   * Generate booking confirmation PDF
   */
  async generateBookingConfirmationPDF(booking: BookingWithProperty): Promise<void> {
    // Header
    const title = 'Booking Confirmation'
    const subtitle = `Confirmation #${booking.id.slice(-8).toUpperCase()}`
    this.addHeader(title, subtitle)

    // Guest Information
    this.doc.setFontSize(14)
    this.doc.setFont(undefined, 'bold')
    this.doc.setTextColor(0, 0, 0)
    this.doc.text('Guest Information', this.margin, this.currentY)
    this.currentY += 8

    this.doc.setFontSize(10)
    this.doc.setFont(undefined, 'normal')
    this.doc.setTextColor(80, 80, 80)

    const guestInfo = [
      `Name: ${booking.guest_name}`,
      ...(booking.contact_email ? [`Email: ${booking.contact_email}`] : []),
      ...(booking.contact_phone ? [`Phone: ${booking.contact_phone}`] : [])
    ]

    guestInfo.forEach(line => {
      this.doc.text(line, this.margin, this.currentY)
      this.currentY += 5
    })

    this.currentY += 8

    // Property Information
    this.doc.setFontSize(14)
    this.doc.setFont(undefined, 'bold')
    this.doc.setTextColor(0, 0, 0)
    this.doc.text('Property Information', this.margin, this.currentY)
    this.currentY += 8

    this.doc.setFontSize(10)
    this.doc.setFont(undefined, 'normal')
    this.doc.setTextColor(80, 80, 80)

    const propertyInfo = [
      `Property: ${booking.property_name || 'N/A'}`,
      ...(booking.property_address ? [`Address: ${booking.property_address}`] : [])
    ]

    propertyInfo.forEach(line => {
      this.doc.text(line, this.margin, this.currentY)
      this.currentY += 5
    })

    this.currentY += 8

    // Booking Details
    this.doc.setFontSize(14)
    this.doc.setFont(undefined, 'bold')
    this.doc.setTextColor(0, 0, 0)
    this.doc.text('Booking Details', this.margin, this.currentY)
    this.currentY += 8

    this.doc.setFontSize(10)
    this.doc.setFont(undefined, 'normal')
    this.doc.setTextColor(80, 80, 80)

    const checkInDate = parseISO(booking.check_in)
    const checkOutDate = parseISO(booking.check_out)
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))

    const bookingInfo = [
      `Check-in: ${format(checkInDate, 'EEEE, MMMM dd, yyyy \'at\' h:mm a')}`,
      `Check-out: ${format(checkOutDate, 'EEEE, MMMM dd, yyyy \'at\' h:mm a')}`,
      `Duration: ${nights} night${nights !== 1 ? 's' : ''}`,
      `Status: ${booking.status?.toUpperCase() || 'CONFIRMED'}`,
      ...(booking.booking_platform ? (() => {
        const { formatPlatformName } = require('./booking-platforms')
        return [`Platform: ${formatPlatformName(booking.booking_platform)}`]
      })() : []),
      ...(booking.total_amount ? [`Total Amount: $${booking.total_amount.toLocaleString()}`] : [])
    ]

    bookingInfo.forEach(line => {
      this.doc.text(line, this.margin, this.currentY)
      this.currentY += 5
    })

    // Notes
    if (booking.notes) {
      this.currentY += 8
      this.doc.setFontSize(14)
      this.doc.setFont(undefined, 'bold')
      this.doc.setTextColor(0, 0, 0)
      this.doc.text('Special Notes', this.margin, this.currentY)
      this.currentY += 8

      this.doc.setFontSize(10)
      this.doc.setFont(undefined, 'normal')
      this.doc.setTextColor(80, 80, 80)

      const noteLines = this.doc.splitTextToSize(booking.notes, this.pageWidth - this.margin * 2)
      noteLines.forEach((line: string) => {
        this.doc.text(line, this.margin, this.currentY)
        this.currentY += 5
      })
    }

    // Footer
    this.addFooter()

    // Download
    const filename = `booking-confirmation-${booking.id.slice(-8)}.pdf`
    this.doc.save(filename)
  }
}

// Export singleton service
export const pdfService = new PDFGenerator()