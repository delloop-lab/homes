import { Resend } from 'resend'
import { createClient } from '@/lib/supabase'

// Initialize Resend client
const RESEND_KEY = process.env.RESEND_API_KEY || process.env.NEXT_PUBLIC_RESEND_API_KEY
const resend = new Resend(RESEND_KEY)

export interface EmailRecipient {
  email: string
  name: string
}

export interface EmailTemplate {
  subject: string
  html: string
  text?: string
}

export interface EmailOptions {
  to: EmailRecipient
  from?: string
  subject: string
  html: string
  text?: string
  tags?: string[]
}

export class EmailService {
  // Use configured sender; allow NEXT_PUBLIC fallback if provided in dev
  private defaultFrom: string | undefined = process.env.FROM_EMAIL || process.env.NEXT_PUBLIC_FROM_EMAIL

  private getSupabaseClient() {
    const client = createClient()
    return client
  }

  private renderTemplateString(template: string, variables: Record<string, string | number | undefined>): string {
    if (!template) return ''
    return template.replace(/\{\{\s*([\w\.]+)\s*\}\}/g, (_match, key) => {
      const value = variables[key]
      return value !== undefined && value !== null ? String(value) : `{{${key}}}`
    })
  }

  private async tryGetDbTemplate(
    templateKey: string,
    variables: Record<string, string | number | undefined>
  ): Promise<EmailTemplate | null> {
    try {
      const client = this.getSupabaseClient()
      if (!client) return null
      const { data, error } = await client
        .from('email_templates')
        .select('subject, html_content, text_content, is_active')
        .eq('template_key', templateKey)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()
      if (error || !data) return null
      const subject = this.renderTemplateString(data.subject, variables)
      const html = this.renderTemplateString(data.html_content, variables)
      const text = data.text_content ? this.renderTemplateString(data.text_content, variables) : undefined
      return { subject, html, text }
    } catch {
      return null
    }
  }

  /**
   * Send a single email
   */
  async sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!RESEND_KEY) {
        console.warn('RESEND_API_KEY not configured, email sending disabled')
        return { success: false, error: 'Email service not configured' }
      }

      const fromAddress = options.from || this.defaultFrom
      if (!fromAddress) {
        return { success: false, error: 'FROM_EMAIL not configured' }
      }

      const emailData = {
        from: fromAddress,
        to: [options.to.email],
        subject: options.subject,
        html: options.html,
        text: options.text,
        tags: options.tags || []
      }

      const result = await resend.emails.send(emailData)

      if (result.error) {
        console.error('Email send error:', result.error)
        return { success: false, error: result.error.message }
      }

      console.log('Email sent successfully:', result.data?.id)
      return { success: true, messageId: result.data?.id }

    } catch (error) {
      console.error('Email service error:', error)
      return { success: false, error: String(error) }
    }
  }

  /**
   * Send check-in instructions email
   */
  async sendCheckInInstructions(
    guest: EmailRecipient,
    booking: {
      id: string
      property_name: string
      property_address: string
      check_in: string
      check_out: string
      notes?: string
    }
  ): Promise<{ success: boolean; error?: string }> {
    const template = await this.generateCheckInTemplate(booking, guest)
    
    const result = await this.sendEmail({
      to: guest,
      subject: template.subject,
      html: template.html,
      text: template.text,
      tags: ['check-in-instructions', 'automated']
    })

    return result
  }

  /**
   * Send checkout reminder email
   */
  async sendCheckoutReminder(
    guest: EmailRecipient,
    booking: {
      id: string
      property_name: string
      property_address: string
      check_out: string
      notes?: string
    }
  ): Promise<{ success: boolean; error?: string }> {
    const template = await this.generateCheckoutTemplate(booking, guest)
    
    const result = await this.sendEmail({
      to: guest,
      subject: template.subject,
      html: template.html,
      text: template.text,
      tags: ['checkout-reminder', 'automated']
    })

    return result
  }

  /**
   * Send thank you and review request email
   */
  async sendThankYouAndReview(
    guest: EmailRecipient,
    booking: {
      id: string
      property_name: string
      property_address: string
      check_in: string
      check_out: string
      booking_platform?: string
    }
  ): Promise<{ success: boolean; error?: string }> {
    const template = await this.generateThankYouTemplate(booking, guest)
    
    const result = await this.sendEmail({
      to: guest,
      subject: template.subject,
      html: template.html,
      text: template.text,
      tags: ['thank-you', 'review-request', 'automated']
    })

    return result
  }

  /**
   * Generate check-in instructions template with guest check-in link
   */
  private async generateCheckInTemplate(booking: any, guest?: EmailRecipient): Promise<EmailTemplate> {
    const checkInDate = new Date(booking.check_in).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    
    const checkInTime = new Date(booking.check_in).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    })

    const variables = {
      property_name: booking.property_name,
      property_address: booking.property_address,
      check_in_date: checkInDate,
      check_in_time: checkInTime,
      check_out_date: new Date(booking.check_out).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      check_out_time: new Date(booking.check_out).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      guest_name: guest?.name,
      guest_checkin_url: booking.guest_checkin_url,
      link_expires: booking.link_expires
    }

    const dbTemplate = await this.tryGetDbTemplate('check_in_instructions', variables)
    if (dbTemplate) return dbTemplate

    const subject = `Check-in Instructions for ${booking.property_name} - ${checkInDate}`

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Check-in Instructions</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .property-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb; }
            .instructions { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .highlight { background: #fef3c7; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #f59e0b; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
            .contact-info { background: #ecfdf5; padding: 15px; border-radius: 6px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Welcome! Your Check-in Instructions</h1>
          </div>
          
          <div class="content">
            <p>Dear Guest,</p>
            
            <p>We're excited to welcome you to <strong>${booking.property_name}</strong>! Your check-in is just around the corner.</p>
            
            <div class="property-info">
              <h3>📍 Property Details</h3>
              <p><strong>Property:</strong> ${booking.property_name}</p>
              <p><strong>Address:</strong> ${booking.property_address}</p>
              <p><strong>Check-in:</strong> ${checkInDate} at ${checkInTime}</p>
              <p><strong>Check-out:</strong> ${new Date(booking.check_out).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })} at ${new Date(booking.check_out).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit'
              })}</p>
            </div>
            
            <div class="instructions">
              <h3>🔑 Check-in Instructions</h3>
              <ol>
                <li><strong>Arrival Time:</strong> Please arrive between ${checkInTime} and 8:00 PM</li>
                <li><strong>Key Access:</strong> You'll find the smart lock on the front door</li>
                <li><strong>Entry Code:</strong> Your unique entry code is <strong>1234#</strong></li>
                <li><strong>WiFi:</strong> Network: "GuestWiFi" | Password: "welcome123"</li>
                <li><strong>Parking:</strong> Free parking available in the driveway</li>
              </ol>
            </div>
            
            <div class="highlight">
              <strong>Complete Check-in Information:</strong> For detailed check-in instructions, WiFi details, house rules, and local recommendations, visit your personalized guest portal:
            </div>
            
            ${booking.guest_checkin_url ? `
              <div style="text-align: center; margin: 20px 0;">
                <a href="${booking.guest_checkin_url}" style="display: inline-block; background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                  🏠 Open Your Guest Portal
                </a>
              </div>
              
              <div style="background: #f0f9ff; border: 1px solid #bae6fd; padding: 15px; border-radius: 6px; margin: 15px 0; text-align: center;">
                <p style="margin: 0; color: #0369a1; font-size: 14px;">
                  <strong>Bookmark this link!</strong> Your guest portal contains everything you need for your stay and will be available until ${booking.link_expires || 'after your checkout'}.
                </p>
              </div>
            ` : ''}
            
            <div class="highlight">
              <strong>Quick Contact:</strong> Please text us at (555) 123-4567 when you arrive safely. We want to ensure everything is perfect for your stay!
            </div>
            
            <div class="contact-info">
              <h4>📞 24/7 Support</h4>
              <p>Need assistance? We're here to help!</p>
              <p><strong>Phone:</strong> (555) 123-4567</p>
              <p><strong>Email:</strong> support@yourdomain.com</p>
              <p><strong>Emergency:</strong> Call the number above</p>
            </div>
            
            ${booking.notes ? `
              <div class="instructions">
                <h3>📝 Special Notes</h3>
                <p>${booking.notes}</p>
              </div>
            ` : ''}
            
            <p>We hope you have a wonderful stay! Please don't hesitate to reach out if you need anything.</p>
            
            <p>Best regards,<br>Your Host Team</p>
          </div>
          
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </body>
      </html>
    `

    const text = `
      Welcome! Your Check-in Instructions
      
      Dear Guest,
      
      We're excited to welcome you to ${booking.property_name}! Your check-in is just around the corner.
      
      PROPERTY DETAILS
      Property: ${booking.property_name}
      Address: ${booking.property_address}
      Check-in: ${checkInDate} at ${checkInTime}
      
      CHECK-IN INSTRUCTIONS
      1. Arrival Time: Please arrive between ${checkInTime} and 8:00 PM
      2. Key Access: You'll find the smart lock on the front door
      3. Entry Code: Your unique entry code is 1234#
      4. WiFi: Network "GuestWiFi" | Password "welcome123"
      5. Parking: Free parking available in the driveway
      
      IMPORTANT: Please text us at (555) 123-4567 when you arrive safely.
      
      24/7 SUPPORT
      Phone: (555) 123-4567
      Email: support@yourdomain.com
      
      ${booking.notes ? `SPECIAL NOTES: ${booking.notes}` : ''}
      
      We hope you have a wonderful stay!
      
      Best regards,
      Your Host Team
    `

    return { subject, html, text }
  }

  /**
   * Generate checkout reminder template
   */
  private async generateCheckoutTemplate(booking: any, guest?: EmailRecipient): Promise<EmailTemplate> {
    const checkoutDate = new Date(booking.check_out).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    
    const checkoutTime = new Date(booking.check_out).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    })

    const variables = {
      property_name: booking.property_name,
      property_address: booking.property_address,
      checkout_date: checkoutDate,
      checkout_time: checkoutTime,
      guest_name: guest?.name,
    }

    const dbTemplate = await this.tryGetDbTemplate('checkout_reminder', variables)
    if (dbTemplate) return dbTemplate

    const subject = `Checkout Reminder - ${booking.property_name} Tomorrow`

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Checkout Reminder</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .checkout-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626; }
            .checklist { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .checklist ul { list-style: none; padding: 0; }
            .checklist li { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .checklist li:before { content: "✓ "; color: #059669; font-weight: bold; }
            .highlight { background: #fef3c7; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #f59e0b; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>⏰ Checkout Reminder</h1>
          </div>
          
          <div class="content">
            <p>Dear Guest,</p>
            
            <p>We hope you've enjoyed your stay at <strong>${booking.property_name}</strong>! This is a friendly reminder that your checkout is tomorrow.</p>
            
            <div class="checkout-info">
              <h3>📍 Checkout Details</h3>
              <p><strong>Property:</strong> ${booking.property_name}</p>
              <p><strong>Address:</strong> ${booking.property_address}</p>
              <p><strong>Checkout Date:</strong> ${checkoutDate}</p>
              <p><strong>Checkout Time:</strong> ${checkoutTime}</p>
            </div>
            
            <div class="checklist">
              <h3>📋 Checkout Checklist</h3>
              <ul>
                <li>Remove all personal belongings</li>
                <li>Check all rooms, closets, and bathrooms</li>
                <li>Turn off all lights and electronics</li>
                <li>Close and lock all windows</li>
                <li>Put used towels in the bathroom</li>
                <li>Place dirty dishes in the dishwasher</li>
                <li>Take out trash if full</li>
                <li>Lock the door and ensure it's secure</li>
              </ul>
            </div>
            
            <div class="highlight">
              <strong>Late Checkout:</strong> If you need a late checkout, please contact us as soon as possible. Additional fees may apply for late departures after ${checkoutTime}.
            </div>
            
            ${booking.notes ? `
              <div class="checklist">
                <h3>📝 Special Instructions</h3>
                <p>${booking.notes}</p>
              </div>
            ` : ''}
            
            <p>Thank you for choosing our property! We hope you had a wonderful stay and look forward to hosting you again soon.</p>
            
            <p>Safe travels!<br>Your Host Team</p>
          </div>
          
          <div class="footer">
            <p>Questions? Contact us at (555) 123-4567 or support@yourdomain.com</p>
          </div>
        </body>
      </html>
    `

    const text = `
      Checkout Reminder
      
      Dear Guest,
      
      We hope you've enjoyed your stay at ${booking.property_name}! This is a friendly reminder that your checkout is tomorrow.
      
      CHECKOUT DETAILS
      Property: ${booking.property_name}
      Address: ${booking.property_address}
      Checkout: ${checkoutDate} at ${checkoutTime}
      
      CHECKOUT CHECKLIST
      ✓ Remove all personal belongings
      ✓ Check all rooms, closets, and bathrooms
      ✓ Turn off all lights and electronics
      ✓ Close and lock all windows
      ✓ Put used towels in the bathroom
      ✓ Place dirty dishes in the dishwasher
      ✓ Take out trash if full
      ✓ Lock the door and ensure it's secure
      
      LATE CHECKOUT: If you need a late checkout, please contact us as soon as possible.
      
      ${booking.notes ? `SPECIAL INSTRUCTIONS: ${booking.notes}` : ''}
      
      Thank you for choosing our property! Safe travels!
      
      Your Host Team
      Phone: (555) 123-4567
      Email: support@yourdomain.com
    `

    return { subject, html, text }
  }

  /**
   * Generate thank you and review request template
   */
  private async generateThankYouTemplate(booking: any, guest?: EmailRecipient): Promise<EmailTemplate> {
    const subject = `Thank you for staying at ${booking.property_name}! 🌟`

    // Generate review links based on platform
    const getReviewLink = (platform: string) => {
      switch (platform?.toLowerCase()) {
        case 'airbnb':
          return 'https://airbnb.com/reviews'
        case 'vrbo':
          return 'https://vrbo.com/reviews'
        case 'booking':
          return 'https://booking.com/reviews'
        default:
          return 'https://google.com/reviews'
      }
    }

    const reviewLink = getReviewLink(booking.booking_platform)

    const variables = {
      property_name: booking.property_name,
      guest_name: guest?.name,
      booking_platform: booking.booking_platform,
      check_in_date: new Date(booking.check_in).toLocaleDateString(),
      check_out_date: new Date(booking.check_out).toLocaleDateString(),
      review_link: reviewLink
    }

    const dbTemplate = await this.tryGetDbTemplate('thank_you_review', variables)
    if (dbTemplate) return dbTemplate

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Thank You!</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .thank-you { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
            .review-section { background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
            .cta-button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px; }
            .cta-button:hover { background: #1d4ed8; }
            .stats { display: flex; justify-content: space-around; margin: 20px 0; }
            .stat { text-align: center; }
            .stat-number { font-size: 24px; font-weight: bold; color: #059669; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
            .social-links { text-align: center; margin: 20px 0; }
            .social-links a { margin: 0 10px; text-decoration: none; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🌟 Thank You for Your Stay! 🌟</h1>
          </div>
          
          <div class="content">
            <div class="thank-you">
              <h2>Dear Valued Guest,</h2>
              
              <p>Thank you so much for choosing <strong>${booking.property_name}</strong> for your recent stay from ${new Date(booking.check_in).toLocaleDateString()} to ${new Date(booking.check_out).toLocaleDateString()}!</p>
              
              <p>We hope you had a wonderful experience and created some amazing memories during your visit.</p>
            </div>
            
            <div class="review-section">
              <h3>🌟 How Was Your Stay?</h3>
              <p>Your feedback means the world to us! Would you mind taking a moment to share your experience?</p>
              
              <a href="${reviewLink}" class="cta-button">Leave a Review</a>
              
              <p style="font-size: 14px; margin-top: 15px;">
                Reviews help us improve and assist future guests in making their decision. Thank you for your time!
              </p>
            </div>
            
            <div class="stats">
              <div class="stat">
                <div class="stat-number">${Math.ceil((new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) / (1000 * 60 * 60 * 24))}</div>
                <div>Nights Stayed</div>
              </div>
              <div class="stat">
                <div class="stat-number">⭐⭐⭐⭐⭐</div>
                <div>Our Goal Rating</div>
              </div>
            </div>
            
            <div class="thank-you">
              <h3>🎉 Special Offers for Return Guests</h3>
              <p>We'd love to welcome you back! As a returning guest, you'll receive:</p>
              <ul style="text-align: left; max-width: 300px; margin: 0 auto;">
                <li>10% discount on your next stay</li>
                <li>Priority booking for popular dates</li>
                <li>Complimentary late checkout (when available)</li>
                <li>Free upgrade (subject to availability)</li>
              </ul>
              
              <p>Simply mention this email when booking your next stay!</p>
            </div>
            
            <div class="thank-you">
              <h3>📧 Stay Connected</h3>
              <p>Follow us for updates, special offers, and travel tips:</p>
              
              <div class="social-links">
                <a href="#" style="color: #2563eb;">📘 Facebook</a>
                <a href="#" style="color: #2563eb;">📷 Instagram</a>
                <a href="#" style="color: #2563eb;">🐦 Twitter</a>
              </div>
            </div>
            
            <p>Once again, thank you for choosing our property. We truly appreciate your business and hope to host you again soon!</p>
            
            <p>Warm regards,<br>Your Host Team</p>
          </div>
          
          <div class="footer">
            <p>Questions or concerns? Contact us at support@yourdomain.com or (555) 123-4567</p>
            <p>© 2024 Your Property Management Company. All rights reserved.</p>
          </div>
        </body>
      </html>
    `

    const text = `
      Thank You for Your Stay!
      
      Dear Valued Guest,
      
      Thank you so much for choosing ${booking.property_name} for your recent stay!
      
      We hope you had a wonderful experience and created some amazing memories during your visit.
      
      HOW WAS YOUR STAY?
      Your feedback means the world to us! Would you mind taking a moment to share your experience?
      
      Leave a Review: ${reviewLink}
      
      SPECIAL OFFERS FOR RETURN GUESTS
      As a returning guest, you'll receive:
      • 10% discount on your next stay
      • Priority booking for popular dates
      • Complimentary late checkout (when available)
      • Free upgrade (subject to availability)
      
      Simply mention this email when booking your next stay!
      
      Thank you for choosing our property. We hope to host you again soon!
      
      Warm regards,
      Your Host Team
      
      Contact: support@yourdomain.com | (555) 123-4567
    `

    return { subject, html, text }
  }
}

// Export singleton instance
export const emailService = new EmailService()