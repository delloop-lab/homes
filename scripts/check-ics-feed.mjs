import ical from 'node-ical'

const icsUrl = 'https://www.airbnb.com.au/calendar/ical/11998176.ics?s=532bdc5f521fa309b4f5fa9576b91a53'

console.log('🔍 Fetching Airbnb ICS feed...\n')
console.log('URL:', icsUrl)
console.log('')

try {
  const events = await ical.async.fromURL(icsUrl)
  
  let count = 0
  const bookings = []
  
  for (const key in events) {
    const event = events[key]
    if (event.type === 'VEVENT') {
      count++
      bookings.push({
        summary: event.summary || 'No summary',
        start: event.start ? new Date(event.start).toISOString().split('T')[0] : 'Unknown',
        end: event.end ? new Date(event.end).toISOString().split('T')[0] : 'Unknown',
        uid: event.uid || 'No UID',
        description: event.description ? event.description.substring(0, 100) : 'No description'
      })
    }
  }
  
  console.log(`Found ${count} events in the ICS feed:\n`)
  
  if (count === 0) {
    console.log('❌ The ICS feed is EMPTY - no bookings found!')
    console.log('\nThis means either:')
    console.log('1. The Paint Shop has no Airbnb bookings')
    console.log('2. The ICS URL is incorrect or expired')
    console.log('3. The listing is not active on Airbnb')
  } else {
    bookings.forEach((booking, index) => {
      console.log(`${index + 1}. ${booking.summary}`)
      console.log(`   Dates: ${booking.start} to ${booking.end}`)
      console.log(`   UID: ${booking.uid}`)
      console.log('')
    })
  }
  
} catch (error) {
  console.error('❌ Error fetching ICS feed:', error.message)
  console.log('\nPossible reasons:')
  console.log('1. Network/firewall blocking the request')
  console.log('2. Invalid or expired ICS URL')
  console.log('3. Airbnb is blocking the request')
}

