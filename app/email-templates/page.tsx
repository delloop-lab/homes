'use client'

import { useEffect, useMemo, useState } from 'react'
import { DashboardHeader } from '@/components/dashboard/header'
import { HostOnlyRoute } from '@/components/auth/route-guard'
import { emailTemplatesService, type EmailTemplateRecord, type UpsertEmailTemplateInput } from '@/lib/email-templates'

type Mode = 'list' | 'create' | 'edit'

export default function EmailTemplatesPage() {
  const [mode, setMode] = useState<Mode>('list')
  const [templates, setTemplates] = useState<EmailTemplateRecord[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<EmailTemplateRecord | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await emailTemplatesService.listTemplates()
    if (error) setError(error)
    setTemplates(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleCreatedOrUpdated = async () => {
    await load()
    setMode('list')
    setEditing(null)
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

                {templates.length === 0 ? (
                  <div className="text-gray-500 text-sm">No templates yet. Click "New Template" to create one.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Key</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
                          <th className="px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {templates.map(t => (
                          <tr key={t.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">{t.name}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{t.template_key}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{t.subject}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full border ${t.is_active ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                                {t.is_active ? 'Active' : 'Inactive'}
                              </span>
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
                        ))}
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
  const [values, setValues] = useState<UpsertEmailTemplateInput>(() => initial ? {
    id: initial.id,
    template_key: initial.template_key,
    name: initial.name,
    subject: initial.subject,
    html_content: initial.html_content,
    text_content: initial.text_content || undefined,
    variables: initial.variables || undefined,
    is_active: initial.is_active,
  } : {
    template_key: '',
    name: '',
    subject: '',
    html_content: '',
    text_content: '',
    variables: undefined,
    is_active: true,
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = e.target
    setValues(v => ({ ...v, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const { error } = await emailTemplatesService.upsertTemplate(values)
    setSaving(false)
    if (error) {
      setError(error)
      return
    }
    onSaved()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
      {error && (
        <div className="p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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





