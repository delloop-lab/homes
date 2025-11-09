import { createClient } from '@/lib/supabase'

export interface EmailTemplateRecord {
  id: string
  template_key: string
  name: string
  subject: string
  html_content: string
  text_content?: string | null
  variables?: any
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UpsertEmailTemplateInput {
  id?: string
  template_key: string
  name: string
  subject: string
  html_content: string
  text_content?: string
  variables?: any
  is_active?: boolean
}

class EmailTemplatesService {
  private getClient() {
    const client = createClient()
    if (!client) throw new Error('Supabase client not available')
    return client
  }

  async listTemplates(): Promise<{ data: EmailTemplateRecord[]; error: string | null }> {
    try {
      const client = this.getClient()
      const { data, error } = await client
        .from('email_templates')
        .select('*')
        .order('updated_at', { ascending: false })
      if (error) return { data: [], error: error.message }
      return { data: (data || []) as EmailTemplateRecord[], error: null }
    } catch (e) {
      return { data: [], error: String(e) }
    }
  }

  async upsertTemplate(input: UpsertEmailTemplateInput): Promise<{ data: EmailTemplateRecord | null; error: string | null }> {
    try {
      const client = this.getClient()
      const payload: any = {
        template_key: input.template_key,
        name: input.name,
        subject: input.subject,
        html_content: input.html_content,
        text_content: input.text_content ?? null,
        variables: input.variables ?? null,
        is_active: input.is_active ?? true
      }
      if (input.id) payload.id = input.id

      const { data, error } = await client
        .from('email_templates')
        .upsert(payload)
        .select('*')
        .single()

      if (error) return { data: null, error: error.message }
      return { data: data as EmailTemplateRecord, error: null }
    } catch (e) {
      return { data: null, error: String(e) }
    }
  }

  async deleteTemplate(id: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const client = this.getClient()
      const { error } = await client
        .from('email_templates')
        .delete()
        .eq('id', id)
      if (error) return { success: false, error: error.message }
      return { success: true, error: null }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  }
}

export const emailTemplatesService = new EmailTemplatesService()





