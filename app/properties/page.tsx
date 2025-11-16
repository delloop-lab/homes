'use client'

import { HostOnlyRoute } from '@/components/auth/route-guard'
import { DashboardHeader } from '@/components/dashboard/header'
import { useEffect, useState } from 'react'
import { propertiesService, type Property } from '@/lib/properties'
import { calendarSourcesService, type CalendarSource } from '@/lib/calendar-sources'
import { bookingService } from '@/lib/bookings'

export default function PropertiesPage() {
  return (
    <HostOnlyRoute>
      <PropertiesView />
    </HostOnlyRoute>
  )
}

function PropertiesView() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [defaultCleaningCost, setDefaultCleaningCost] = useState('')
  const [cleaningDuration, setCleaningDuration] = useState('')
  const [timezone, setTimezone] = useState('UTC')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editDefaultCleaningCost, setEditDefaultCleaningCost] = useState('')
  const [editCleaningDuration, setEditCleaningDuration] = useState('')
  const [editTimezone, setEditTimezone] = useState('UTC')
  const [showCalendarSources, setShowCalendarSources] = useState<string | null>(null)
  const [calendarSources, setCalendarSources] = useState<{ [propertyId: string]: CalendarSource[] }>({})
  const [showAddCalendar, setShowAddCalendar] = useState<string | null>(null)
  const [calendarName, setCalendarName] = useState('')
  const [calendarPlatform, setCalendarPlatform] = useState('other')
  const [calendarUrl, setCalendarUrl] = useState('')
  const [syncing, setSyncing] = useState<{ propertyId: string; platform: string } | null>(null)
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null)
  const [editSourceName, setEditSourceName] = useState('')
  const [editSourcePlatform, setEditSourcePlatform] = useState('other')
  const [editSourceUrl, setEditSourceUrl] = useState('')
  const [editSourceEnabled, setEditSourceEnabled] = useState(true)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    setError(null)
    const res = await propertiesService.listMyProperties()
    if (res.error) setError(res.error)
    setProperties(res.data)
    setLoading(false)
  }

  async function addProperty() {
    if (!name.trim() || !address.trim()) return
    setSaving(true)
    const res = await propertiesService.createProperty({ 
      name: name.trim(), 
      address: address.trim(), 
      notes: notes.trim() || undefined,
      default_cleaning_cost: defaultCleaningCost ? parseFloat(defaultCleaningCost) : undefined,
      cleaning_duration_minutes: cleaningDuration ? parseInt(cleaningDuration) : undefined,
      timezone: timezone || 'UTC'
    })
    setSaving(false)
    if (res.error) {
      setError(res.error)
      return
    }
    setShowAdd(false)
    setName('')
    setAddress('')
    setNotes('')
    setDefaultCleaningCost('')
    setCleaningDuration('')
    setTimezone('UTC')
    await load()
  }

  async function loadCalendarSources(propertyId: string) {
    const res = await calendarSourcesService.getPropertyCalendarSources(propertyId)
    if (res.error) {
      setError(res.error)
      return
    }
    setCalendarSources(prev => ({ ...prev, [propertyId]: res.data }))
  }

  async function addCalendarSource(propertyId: string) {
    if (!calendarName.trim() || !calendarUrl.trim()) return
    
    try {
      setSaving(true)
      setError(null) // Clear any previous errors
      
      console.log('Adding calendar source:', {
        property_id: propertyId,
        platform: calendarPlatform,
        name: calendarName.trim(),
        ics_url: calendarUrl.trim(),
      })
      
      const res = await calendarSourcesService.createCalendarSource({
        property_id: propertyId,
        platform: calendarPlatform,
        name: calendarName.trim(),
        ics_url: calendarUrl.trim(),
      })
      
      console.log('Calendar source creation result:', res)
      
      if (res.error) {
        console.error('Calendar source creation error:', res.error)
        setError(res.error)
        return
      }
      
      // Reset form and reload
      setShowAddCalendar(null)
      setCalendarName('')
      setCalendarPlatform('other')
      setCalendarUrl('')
      await loadCalendarSources(propertyId)
      
      console.log('Calendar source added successfully!')
      
    } catch (err) {
      console.error('Unexpected error adding calendar source:', err)
      setError(`Failed to add calendar source: ${String(err)}`)
    } finally {
      setSaving(false)
    }
  }

  async function syncCalendar(propertyId: string, platform?: string) {
    try {
      setSyncing({ propertyId, platform: platform || 'all' })
      setError(null) // Clear any previous errors
      
      const sources = calendarSources[propertyId]?.map(source => ({
        name: source.name,
        platform: source.platform,
        url: source.ics_url
      }))
      
      console.log('Syncing calendar for property:', propertyId, 'with sources:', sources, 'platform filter:', platform)
      
      const res = await calendarSourcesService.syncCalendarSource(propertyId, sources, { platform })
      
      console.log('Calendar sync result:', res)
      
      if (res.error) {
        console.error('Calendar sync error:', res.error)
        setError(res.error)
      } else {
        console.log('Calendar sync successful!')
        setError(null)
        await loadCalendarSources(propertyId)
      }
    } catch (err) {
      console.error('Unexpected error during calendar sync:', err)
      setError(`Calendar sync failed: ${String(err)}`)
    } finally {
      setSyncing(null)
    }
  }

  async function syncVrboCalendar(propertyId: string) {
    try {
      setSyncing({ propertyId, platform: 'vrbo' })
      setError(null)
      
      console.log('Syncing VRBO calendar for property:', propertyId)
      
      const res = await calendarSourcesService.syncCalendarSource(propertyId, [], { platform: 'vrbo' })
      
      console.log('VRBO calendar sync result:', res)
      
      if (res.error) {
        console.error('VRBO calendar sync error:', res.error)
        setError(res.error)
      } else {
        console.log('VRBO calendar sync successful!')
        setError(null)
        await loadCalendarSources(propertyId)
      }
    } catch (err) {
      console.error('Unexpected error during VRBO calendar sync:', err)
      setError(`VRBO calendar sync failed: ${String(err)}`)
    } finally {
      setSyncing(null)
    }
  }

  async function syncBookingComCalendar(propertyId: string) {
    try {
      console.log('Starting Booking.com sync for property:', propertyId)
      setSyncing({ propertyId, platform: 'booking' })
      setError(null)
      
      console.log('Syncing Booking.com calendar for property:', propertyId)
      
      const res = await calendarSourcesService.syncCalendarSource(propertyId, [], { platform: 'booking' })
      
      console.log('Booking.com calendar sync result:', res)
      
      if (res.error) {
        console.error('Booking.com calendar sync error:', res.error)
        setError(res.error)
      } else {
        console.log('Booking.com calendar sync successful!')
        setError(null)
        await loadCalendarSources(propertyId)
      }
    } catch (err) {
      console.error('Unexpected error during Booking.com calendar sync:', err)
      setError(`Booking.com calendar sync failed: ${String(err)}`)
    } finally {
      console.log('Booking.com sync completed, clearing syncing state')
      setSyncing(null)
    }
  }

  async function deleteCalendarSourceById(propertyId: string, sourceId: string) {
    try {
      setSaving(true)
      setError(null)
      const res = await calendarSourcesService.deleteCalendarSource(sourceId)
      if (res.error) {
        setError(res.error)
        return
      }
      await loadCalendarSources(propertyId)
    } catch (err) {
      setError(String(err))
    } finally {
      setSaving(false)
    }
  }

  async function deleteAirbnbBookings(propertyId?: string) {
    try {
      setSaving(true)
      setError(null)
      const res = await bookingService.deleteBookingsByPlatform('airbnb', propertyId)
      if (!res.success) {
        setError(res.error || 'Failed to delete Airbnb bookings')
        return
      }
      await load()
      if (propertyId) {
        await loadCalendarSources(propertyId)
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setSaving(false)
    }
  }

  async function deleteVrboBookings(propertyId?: string) {
    try {
      setSaving(true)
      setError(null)
      const res = await bookingService.deleteBookingsByPlatform('vrbo', propertyId)
      if (!res.success) {
        setError(res.error || 'Failed to delete VRBO bookings')
        return
      }
      await load()
      if (propertyId) {
        await loadCalendarSources(propertyId)
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setSaving(false)
    }
  }

  async function deleteBookingComBookings(propertyId?: string) {
    try {
      setSaving(true)
      setError(null)
      const res = await bookingService.deleteBookingsByPlatform('booking', propertyId)
      if (!res.success) {
        setError(res.error || 'Failed to delete Booking.com bookings')
        return
      }
      await load()
      if (propertyId) {
        await loadCalendarSources(propertyId)
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setSaving(false)
    }
  }

  function startEditCalendarSource(source: CalendarSource) {
    setEditingSourceId(source.id)
    setEditSourceName(source.name)
    setEditSourcePlatform(source.platform)
    setEditSourceUrl(source.ics_url)
    setEditSourceEnabled(!!source.sync_enabled)
    // Prefill modal fields
    setCalendarName(source.name)
    setCalendarPlatform(source.platform)
    setCalendarUrl(source.ics_url)
  }

  async function saveEditCalendarSource(propertyId: string, sourceId: string) {
    try {
      setSaving(true)
      setError(null)
      const res = await calendarSourcesService.updateCalendarSource({
        id: sourceId,
        name: editSourceName.trim(),
        platform: editSourcePlatform,
        ics_url: editSourceUrl.trim(),
        sync_enabled: editSourceEnabled,
      })
      if (res.error) {
        setError(res.error)
        return
      }
      setEditingSourceId(null)
      await loadCalendarSources(propertyId)
    } catch (err) {
      setError(String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
            <p className="text-gray-600">Manage your rental properties</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAdd(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Add New Property
            </button>
            <button
              onClick={async()=>{ if (!confirm('Delete ALL Airbnb bookings across all properties? This cannot be undone.')) return; await deleteAirbnbBookings(undefined) }}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
            >
              Delete All Airbnb Bookings
            </button>
            <button
              onClick={async()=>{ if (!confirm('Delete ALL VRBO bookings across all properties? This cannot be undone.')) return; await deleteVrboBookings(undefined) }}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
            >
              Delete All VRBO Bookings
            </button>
            <button
              onClick={async()=>{ if (!confirm('Delete ALL Booking.com bookings across all properties? This cannot be undone.')) return; await deleteBookingComBookings(undefined) }}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
            >
              Delete All Booking.com Bookings
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="text-gray-600">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {properties.map((p) => (
              <div key={p.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* Property Image Header */}
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="w-full h-36 object-cover" />
                ) : (
                  <div className="h-36 bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center">
                    <span className="text-white text-sm opacity-75">No photo uploaded</span>
                  </div>
                )}
                <div className="p-6">
                  {editingId === p.id ? (
                    <div className="space-y-2">
                      <input value={editName} onChange={e=>setEditName(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2"/>
                      <input value={editAddress} onChange={e=>setEditAddress(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2"/>
                      <textarea value={editNotes} onChange={e=>setEditNotes(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" rows={3}/>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Default Cleaning Price</label>
                          <input type="number" step="0.01" value={editDefaultCleaningCost} onChange={e=>setEditDefaultCleaningCost(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2"/>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Cleaning Duration (mins)</label>
                          <input type="number" value={editCleaningDuration} onChange={e=>setEditCleaningDuration(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2"/>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">Timezone</label>
                        <select value={editTimezone} onChange={e=>setEditTimezone(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2">
                          <option value="UTC">UTC</option>
                          <option value="America/New_York">Eastern Time (ET)</option>
                          <option value="America/Chicago">Central Time (CT)</option>
                          <option value="America/Denver">Mountain Time (MT)</option>
                          <option value="America/Los_Angeles">Pacific Time (PT)</option>
                          <option value="Europe/London">London (GMT)</option>
                          <option value="Europe/Paris">Paris (CET)</option>
                          <option value="Europe/Rome">Rome (CET)</option>
                          <option value="Asia/Tokyo">Tokyo (JST)</option>
                          <option value="Australia/Sydney">Sydney (AEST)</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Used for scheduling cleanings after checkout (typically 10 AM checkout = 11 AM cleaning)</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={async()=>{ setSaving(true); const r=await propertiesService.updateProperty({ id:p.id, name:editName, address:editAddress, notes:editNotes||null, default_cleaning_cost: editDefaultCleaningCost!=='' ? parseFloat(editDefaultCleaningCost) : null, cleaning_duration_minutes: editCleaningDuration!=='' ? parseInt(editCleaningDuration) : null, timezone: editTimezone || 'UTC' }); setSaving(false); if(r.error){ setError(r.error) } else { setEditingId(null); await load() } }} className="px-3 py-2 rounded bg-blue-600 text-white">Save</button>
                        <button onClick={()=>{ setEditingId(null) }} className="px-3 py-2 rounded border">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-lg font-semibold text-gray-900">{p.name}</h3>
                      <p className="text-gray-600 mt-1">{p.address}</p>
                      <div className="mt-3 space-y-2">
                        <div className="flex flex-wrap gap-2">
                          <button 
                            onClick={()=>{ setEditingId(p.id); setEditName(p.name); setEditAddress(p.address); setEditNotes(p.notes||''); setEditDefaultCleaningCost((p as any).default_cleaning_cost?.toString() || ''); setEditCleaningDuration((p as any).cleaning_duration_minutes?.toString() || ''); setEditTimezone((p as any).timezone || 'UTC') }} 
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
                          >
                            Edit
                          </button>
                          <label className={`px-3 py-1.5 text-sm rounded-md transition-colors cursor-pointer ${saving ? 'bg-gray-300 text-gray-500' : 'bg-gray-600 hover:bg-gray-700 text-white'}`}>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              disabled={saving}
                              onChange={async(e)=>{ 
                                const f=e.target.files?.[0]; 
                                if(!f) return; 
                                
                                // File validation
                                if (f.size > 5 * 1024 * 1024) {
                                  setError('Image must be less than 5MB');
                                  return;
                                }
                                if (!f.type.startsWith('image/')) {
                                  setError('Please select a valid image file');
                                  return;
                                }
                                
                                console.log('Starting upload for property:', p.id, 'File:', f.name, 'Size:', f.size);
                                setSaving(true); 
                                setError(null);
                                
                                try {
                                  const r = await propertiesService.uploadPropertyImage(p.id, f as any); 
                                  setSaving(false); 
                                  
                                  if(r.error) { 
                                    console.error('Upload failed:', r.error);
                                    setError(`Upload failed: ${r.error}`);
                                  } else { 
                                    console.log('Upload successful, new URL:', r.url);
                                    await load();
                                  }
                                } catch (err) {
                                  setSaving(false);
                                  console.error('Upload error:', err);
                                  setError(`Upload error: ${String(err)}`);
                                }
                              }} 
                            />
                            {saving ? 'Uploading...' : 'Upload Photo'}
                          </label>
                          <a 
                            href={`/properties/${p.id}/referral-sites`}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-md transition-colors inline-block"
                          >
                            Referral Providers
                          </a>
                          <button 
                            onClick={async()=>{ 
                              if (showCalendarSources === p.id) {
                                setShowCalendarSources(null)
                              } else {
                                setShowCalendarSources(p.id)
                                await loadCalendarSources(p.id)
                              }
                            }} 
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md transition-colors"
                          >
                            ICS Calendars
                          </button>
                        </div>
                        
                        {showCalendarSources === p.id && (
                          <div className="mt-4 p-3 border border-gray-200 rounded bg-gray-50">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium text-gray-900">Calendar Sources</h4>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setShowAddCalendar(p.id)}
                                  className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded"
                                >
                                  Add / Edit ICS
                                </button>
                                <button
                                  onClick={() => syncCalendar(p.id)}
                                  disabled={syncing?.propertyId === p.id}
                                  className="text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-2 py-1 rounded"
                                >
                                  {syncing?.propertyId === p.id && syncing?.platform === 'all' ? 'Syncing...' : 'Sync All'}
                                </button>
                                <button
                                  onClick={() => syncVrboCalendar(p.id)}
                                  disabled={syncing?.propertyId === p.id}
                                  className="text-xs bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white px-2 py-1 rounded"
                                >
                                  {syncing?.propertyId === p.id && syncing?.platform === 'vrbo' ? 'Syncing...' : 'Sync VRBO'}
                                </button>
                                <button
                                  onClick={() => syncBookingComCalendar(p.id)}
                                  disabled={syncing?.propertyId === p.id}
                                  className="text-xs bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-2 py-1 rounded"
                                >
                                  {syncing?.propertyId === p.id && syncing?.platform === 'booking' ? 'Syncing...' : 'Sync Booking.com'}
                                </button>
                                <button
                                  onClick={async()=>{ if (!confirm('Delete all Airbnb bookings for this property?')) return; await deleteAirbnbBookings(p.id) }}
                                  className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded"
                                >
                                  Delete Airbnb Bookings
                                </button>
                                <button
                                  onClick={async()=>{ if (!confirm('Delete all VRBO bookings for this property?')) return; await deleteVrboBookings(p.id) }}
                                  className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded"
                                >
                                  Delete VRBO Bookings
                                </button>
                                <button
                                  onClick={async()=>{ if (!confirm('Delete all Booking.com bookings for this property?')) return; await deleteBookingComBookings(p.id) }}
                                  className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded"
                                >
                                  Delete Booking.com Bookings
                                </button>
                              </div>
                            </div>
                            
                            {calendarSources[p.id]?.length > 0 ? (
                              <div className="space-y-2">
                                {calendarSources[p.id].map(source => (
                                  <div key={source.id} className="flex items-center justify-between p-2 bg-white rounded border">
                                    <div className="flex-1">
                                      <div className="text-sm font-medium">{source.name}</div>
                                      <div className="text-xs text-gray-500">{source.platform} • {source.sync_status}</div>
                                      <div className="text-xs text-gray-400 truncate">{source.ics_url}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className={`w-2 h-2 rounded-full ${source.sync_enabled ? (source.sync_status === 'success' ? 'bg-green-500' : source.sync_status === 'error' ? 'bg-red-500' : 'bg-yellow-500') : 'bg-gray-400'}`}></span>
                                      <button
                                        onClick={() => { startEditCalendarSource(source); setShowAddCalendar(p.id) }}
                                        className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1"
                                        title="Edit this ICS URL"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => deleteCalendarSourceById(p.id, source.id)}
                                        className="text-xs text-red-600 hover:text-red-700 px-2 py-1"
                                        title="Delete this ICS URL"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500">No calendar sources configured</p>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
            {properties.length === 0 && (
              <div className="text-gray-600">No properties yet</div>
            )}
          </div>
        )}

        {showAdd && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-lg shadow border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Add Property</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input value={name} onChange={e=>setName(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input value={address} onChange={e=>setAddress(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                  <textarea value={notes} onChange={e=>setNotes(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" rows={3}/>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Default Cleaning Price</label>
                    <input type="number" step="0.01" value={defaultCleaningCost} onChange={e=>setDefaultCleaningCost(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cleaning Duration (mins)</label>
                    <input type="number" value={cleaningDuration} onChange={e=>setCleaningDuration(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2"/>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                  <select value={timezone} onChange={e=>setTimezone(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2">
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="Europe/London">London (GMT)</option>
                    <option value="Europe/Paris">Paris (CET)</option>
                    <option value="Europe/Rome">Rome (CET)</option>
                    <option value="Asia/Tokyo">Tokyo (JST)</option>
                    <option value="Australia/Sydney">Sydney (AEST)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Used for scheduling cleanings after checkout (typically 10 AM checkout = 11 AM cleaning)</p>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button onClick={()=>setShowAdd(false)} className="px-4 py-2 rounded border border-gray-300">Cancel</button>
                <button onClick={addProperty} disabled={saving} className="px-4 py-2 rounded bg-blue-600 text-white disabled:bg-blue-400">{saving?'Saving...':'Save'}</button>
              </div>
            </div>
          </div>
        )}

        {showAddCalendar && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-lg shadow border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{editingSourceId ? 'Edit Calendar Source' : 'Add Calendar Source'}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input 
                    value={calendarName} 
                    onChange={e=>setCalendarName(e.target.value)} 
                    placeholder="e.g. Airbnb Calendar"
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
                  <select 
                    value={calendarPlatform} 
                    onChange={e=>setCalendarPlatform(e.target.value)} 
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="airbnb">Airbnb</option>
                    <option value="vrbo">VRBO</option>
                    <option value="booking">Booking.com</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ICS URL</label>
                  <input 
                    value={calendarUrl} 
                    onChange={e=>setCalendarUrl(e.target.value)} 
                    placeholder="https://..."
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter the iCal (.ics) URL from your booking platform</p>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button onClick={()=>{ setShowAddCalendar(null); setEditingSourceId(null); }} className="px-4 py-2 rounded border border-gray-300">Cancel</button>
                {editingSourceId && (
                  <button
                    onClick={async()=>{ if (!editingSourceId) return; if (!confirm('Delete this ICS URL?')) return; await deleteCalendarSourceById(showAddCalendar as string, editingSourceId); setEditingSourceId(null); setShowAddCalendar(null) }}
                    className="px-4 py-2 rounded bg-red-600 text-white"
                  >
                    Delete
                  </button>
                )}
                <button 
                  onClick={async()=>{
                    if (!calendarName.trim() || !calendarUrl.trim()) return
                    if (editingSourceId) {
                      // Save update
                      await saveEditCalendarSource(showAddCalendar as string, editingSourceId)
                      setEditingSourceId(null)
                      setShowAddCalendar(null)
                    } else {
                      // Create new
                      await addCalendarSource(showAddCalendar as string)
                    }
                  }} 
                  disabled={saving || !calendarName.trim() || !calendarUrl.trim()} 
                  className="px-4 py-2 rounded bg-green-600 text-white disabled:bg-green-400"
                >
                  {saving ? 'Saving...' : (editingSourceId ? 'Save Changes' : 'Save Calendar')}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

 