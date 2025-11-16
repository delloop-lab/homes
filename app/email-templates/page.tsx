'use client'

import { useEffect, useMemo, useState } from 'react'
import { DashboardHeader } from '@/components/dashboard/header'
import { HostOnlyRoute } from '@/components/auth/route-guard'
import { emailTemplatesService, type EmailTemplateRecord, type UpsertEmailTemplateInput } from '@/lib/email-templates'
import { propertiesService } from '@/lib/properties'

type Mode = 'list' | 'create' | 'edit'

export default function EmailTemplatesPage() {
  const [mode, setMode] = useState<Mode>('list')
  const [templates, setTemplates] = useState<EmailTemplateRecord[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [editing, setEditing] = useState<EmailTemplateRecord | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    console.log('Loading email templates...')
    const { data, error } = await emailTemplatesService.listTemplates()
    if (error) {
      console.error('Error loading templates:', error)
      setError(error)
    } else {
      console.log('Loaded templates:', data.length, data.map(t => ({ id: t.id, name: t.name, updated_at: t.updated_at })))
    }
    setTemplates(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleCreatedOrUpdated = async () => {
    const message = editing ? 'Template updated successfully!' : 'Template created successfully!'
    setSuccess(message)
    setError(null) // Clear any previous errors
    
    // Small delay to ensure database has updated
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Reload templates to show updated data - force a fresh fetch
    console.log('Refreshing template list after save...')
    await load()
    
    // Verify the template was actually updated by checking the list
    const updatedTemplate = templates.find(t => t.id === editing?.id)
    if (updatedTemplate && editing) {
      console.log('Template in list after refresh:', {
        id: updatedTemplate.id,
        name: updatedTemplate.name,
        subject: updatedTemplate.subject,
        updated_at: updatedTemplate.updated_at
      })
    }
    
    setMode('list')
    setEditing(null)
    
    // Clear success message after 5 seconds
    setTimeout(() => setSuccess(null), 5000)
  }

  return (
    <HostOnlyRoute>
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Email Templates</h2>
              <p className="text-gray-600 mt-1 text-sm">Create and manage automated email templates saved in your database</p>
            </div>
            {mode === 'list' && (
              <button
                onClick={() => setMode('create')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                New Template
              </button>
            )}
          </div>

          {mode !== 'list' ? (
            <TemplateForm
              initial={editing || undefined}
              onCancel={() => { setMode('list'); setEditing(null) }}
              onSaved={handleCreatedOrUpdated}
            />
          ) : (
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="font-medium text-gray-900">Saved Templates</div>
                  <button
                    onClick={load}
                    disabled={loading}
                    className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
                  >
                    {loading ? 'Refreshing…' : 'Refresh'}
                  </button>
                </div>

                {error && (
                  <div className="mb-3 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
                )}

                {success && (
                  <div className="mb-3 p-3 rounded bg-green-50 border border-green-200 text-green-700 text-sm">{success}</div>
                )}

                {templates.length === 0 ? (
                  <div className="text-gray-500 text-sm">No templates yet. Click "New Template" to create one.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Key</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Custom Properties</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Default Subject</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
                          <th className="px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {templates.map(t => {
                          const propertyCount = t.property_content ? Object.keys(t.property_content).length : 0
                          return (
                            <tr key={t.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">{t.name}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{t.template_key}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {propertyCount > 0 ? (
                                  <span className="text-blue-600" title={`${propertyCount} property(ies) have custom content`}>
                                    {propertyCount} custom
                                  </span>
                                ) : (
                                  <span className="text-gray-400">Default only</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">{t.subject}</td>
                              <td className="px-4 py-3 text-sm">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full border ${t.is_active ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                                  {t.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {t.updated_at ? new Date(t.updated_at).toLocaleString() : 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-right text-sm">
                                <button
                                  onClick={() => { setEditing(t); setMode('edit') }}
                                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded"
                                >
                                  Edit
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </HostOnlyRoute>
  )
}

function TemplateForm({ initial, onCancel, onSaved }: {
  initial?: EmailTemplateRecord
  onCancel: () => void
  onSaved: () => void
}) {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('')
  const [values, setValues] = useState<UpsertEmailTemplateInput>(() => {
    if (!initial) {
      return {
        template_key: '',
        name: '',
        subject: '',
        html_content: '',
        text_content: '',
        variables: undefined,
        is_active: true,
      }
    }
    
    // Load default content initially
    return {
      id: initial.id,
      template_key: initial.template_key,
      name: initial.name,
      subject: initial.subject,
      html_content: initial.html_content,
      text_content: initial.text_content || undefined,
      variables: initial.variables || undefined,
      is_active: initial.is_active,
    }
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [properties, setProperties] = useState<Array<{ id: string; name: string }>>([])
  const [loadingProperties, setLoadingProperties] = useState(false)

  // Load properties for the dropdown
  useEffect(() => {
    const loadProperties = async () => {
      setLoadingProperties(true)
      try {
        const res = await propertiesService.listMyProperties()
        if (!res.error && res.data) {
          setProperties(res.data.map(p => ({ id: p.id, name: p.name })))
        }
      } catch (err) {
        console.error('Error loading properties:', err)
      } finally {
        setLoadingProperties(false)
      }
    }
    loadProperties()
  }, [])

  // When property selection changes, load property-specific content or default
  useEffect(() => {
    if (!initial) return
    
    if (selectedPropertyId && initial.property_content?.[selectedPropertyId]) {
      // Load property-specific content
      const propContent = initial.property_content[selectedPropertyId]
      setValues(v => ({
        ...v,
        subject: propContent.subject,
        html_content: propContent.html_content,
        text_content: propContent.text_content || ''
      }))
    } else {
      // Load default content
      setValues(v => ({
        ...v,
        subject: initial.subject,
        html_content: initial.html_content,
        text_content: initial.text_content || ''
      }))
    }
  }, [selectedPropertyId, initial])

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    if (type === 'checkbox') {
      setValues(v => ({ ...v, [name]: checked }))
    } else if (name === 'property_id') {
      // Update selected property
      setSelectedPropertyId(value)
    } else {
      setValues(v => ({ ...v, [name]: value }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    
    try {
      // If editing and property is selected, save property-specific content
      const saveData: UpsertEmailTemplateInput = {
        ...values,
        property_id: selectedPropertyId || undefined
      }
      
      console.log('Saving email template:', { 
        id: values.id, 
        template_key: values.template_key,
        name: values.name,
        subject: values.subject?.substring(0, 50),
        property_id: selectedPropertyId || 'default',
        is_property_specific: !!selectedPropertyId
      })
      
      const result = await emailTemplatesService.upsertTemplate(saveData)
      
      if (result.error) {
        console.error('Email template save error:', result.error)
        setError(result.error)
        setSaving(false)
        return
      }
      
      if (!result.data) {
        console.error('Email template save: No data returned')
        setError('Save completed but no data returned. Please refresh the page.')
        setSaving(false)
        return
      }
      
      console.log('Email template saved successfully:', {
        id: result.data.id,
        name: result.data.name,
        updated_at: result.data.updated_at
      })
      
      setSaving(false)
      
      // Call onSaved which will refresh the list
      onSaved()
    } catch (err: any) {
      console.error('Email template save exception:', err)
      setError(err?.message || 'Failed to save template. Please try again.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
      {error && (
        <div className="p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {initial && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-900">
            <strong>Template:</strong> {initial.name} ({initial.template_key})
          </p>
          <p className="text-xs text-blue-700 mt-1">
            Select a property below to edit content for that property. Leave as "Default" to edit the default template.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {!initial && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Template Key</label>
              <input
                name="template_key"
                value={values.template_key}
                onChange={onChange}
                placeholder="e.g. check_in_instructions"
                className="w-full border rounded px-3 py-2 text-sm"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Use keys like `check_in_instructions`, `checkout_reminder`, `thank_you_review`</p>
            </div>
          </>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {initial ? 'Property (for this content)' : 'Default Property'}
          </label>
          <select
            name="property_id"
            value={selectedPropertyId}
            onChange={onChange}
            className="w-full border rounded px-3 py-2 text-sm"
            disabled={loadingProperties}
          >
            <option value="">Default (All Properties)</option>
            {properties.map(prop => (
              <option key={prop.id} value={prop.id}>{prop.name}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            {initial 
              ? 'Select a property to customize content for that property, or leave as "Default" to edit the default template.'
              : 'This will be the default template used for all properties unless property-specific content is created.'}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            name="name"
            value={values.name}
            onChange={onChange}
            placeholder="Display name"
            className="w-full border rounded px-3 py-2 text-sm"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
          <input
            name="subject"
            value={values.subject}
            onChange={onChange}
            placeholder="Email subject"
            className="w-full border rounded px-3 py-2 text-sm"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">HTML Content</label>
          <textarea
            name="html_content"
            value={values.html_content}
            onChange={onChange}
            placeholder="HTML body"
            className="w-full border rounded px-3 py-2 text-sm h-56 font-mono"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Text Content (optional)</label>
          <textarea
            name="text_content"
            value={values.text_content || ''}
            onChange={onChange}
            placeholder="Plain text body"
            className="w-full border rounded px-3 py-2 text-sm h-56 font-mono"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <label className="inline-flex items-center space-x-2 text-sm">
          <input type="checkbox" name="is_active" checked={!!values.is_active} onChange={onChange} />
          <span>Active</span>
        </label>

        <div className="space-x-2">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50">
            {saving ? 'Saving…' : (initial ? 'Save Changes' : 'Create Template')}
          </button>
        </div>
      </div>
    </form>
  )
}





