import { createClient } from '@/lib/supabase'

export interface PropertyTemplateContent {
  subject: string
  html_content: string
  text_content?: string
}

export interface EmailTemplateRecord {
  id: string
  template_key: string
  name: string
  subject: string  // Default subject (fallback)
  html_content: string  // Default html_content (fallback)
  text_content?: string | null  // Default text_content (fallback)
  variables?: any
  is_active: boolean
  property_content?: Record<string, PropertyTemplateContent>  // Property-specific content: { "property-id": { subject, html_content, text_content } }
  created_at: string
  updated_at: string
}

export interface UpsertEmailTemplateInput {
  id?: string
  template_key: string
  name: string
  subject: string  // Default subject
  html_content: string  // Default html_content
  text_content?: string  // Default text_content
  variables?: any
  is_active?: boolean
  property_id?: string | null  // When editing, this is the property we're editing content for
  property_content?: Record<string, PropertyTemplateContent>  // Full property_content object
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
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<{ data: EmailTemplateRecord[]; error: string }>((resolve) => {
        setTimeout(() => resolve({ data: [], error: 'Request timed out after 10 seconds' }), 10000)
      })

      const queryPromise = client
        .from('email_templates')
        .select('*')
        .order('updated_at', { ascending: false })

      const result = await Promise.race([queryPromise, timeoutPromise]) as any

      if (result.error) {
        console.error('Email templates list error:', result.error)
        return { data: [], error: result.error.message || result.error }
      }
      
      return { data: (result.data || []) as EmailTemplateRecord[], error: null }
    } catch (e: any) {
      console.error('Email templates list exception:', e)
      return { data: [], error: e?.message || String(e) }
    }
  }

  async upsertTemplate(input: UpsertEmailTemplateInput): Promise<{ data: EmailTemplateRecord | null; error: string | null }> {
    try {
      const client = this.getClient()
      
      // If property_id is provided, we're updating property-specific content
      // Otherwise, we're updating the default template
      if (input.id && input.property_id) {
        // Get current template to merge property_content
        const { data: currentTemplate } = await client
          .from('email_templates')
          .select('property_content')
          .eq('id', input.id)
          .single()
        
        const currentPropertyContent = (currentTemplate?.property_content as Record<string, PropertyTemplateContent>) || {}
        
        // Update property-specific content
        const updatedPropertyContent = {
          ...currentPropertyContent,
          [input.property_id]: {
            subject: input.subject,
            html_content: input.html_content,
            text_content: input.text_content || ''
          }
        }
        
        // Update only the property_content field
        const { data: updated, error } = await client
          .from('email_templates')
          .update({ property_content: updatedPropertyContent })
          .eq('id', input.id)
          .select()
          .single()
        
        if (error) {
          console.error('Error updating property-specific content:', error)
          return { data: null, error: error.message || String(error) }
        }
        
        return { data: updated as EmailTemplateRecord, error: null }
      }
      
      // Default: update/create the main template (default content)
      const payload: any = {
        template_key: input.template_key,
        name: input.name,
        subject: input.subject,
        html_content: input.html_content,
        text_content: input.text_content ?? null,
        variables: input.variables ?? null,
        is_active: input.is_active ?? true,
        property_content: input.property_content || {}
      }
      if (input.id) payload.id = input.id

      console.log('Upserting email template:', { 
        id: input.id, 
        template_key: input.template_key,
        property_id: input.property_id,
        has_property_content: !!input.property_content
      })

      // For updates, use update with select to get the updated row
      let result: any
      if (input.id) {
        // Update: remove id from payload (it's used in the where clause)
        const { id, ...updatePayload } = payload
        
        console.log('Updating email template:', { 
          id: input.id, 
          template_key: input.template_key,
          property_id: input.property_id,
          updatePayload: {
            ...updatePayload,
            property_id: updatePayload.property_id // Explicitly log property_id
          }
        })
        
        // Create timeouts
        const updateTimeout = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Update timed out after 10 seconds')), 10000)
        })
        
        const fetchTimeout = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Fetch timed out after 5 seconds')), 5000)
        })
        
        // First, verify the template exists and get its current state
        // This helps ensure we're updating the correct template
        const verifyPromise = client
          .from('email_templates')
          .select('id, template_key, property_id')
          .eq('id', input.id)
          .single()
        
        const verifyResult = await verifyPromise as any
        if (verifyResult.error || !verifyResult.data) {
          console.error('Template not found for update:', input.id)
          return { data: null, error: 'Template not found. It may have been deleted.' }
        }
        
        console.log('Verifying template before update:', {
          id: verifyResult.data.id,
          current_template_key: verifyResult.data.template_key,
          current_property_id: verifyResult.data.property_id,
          new_template_key: input.template_key,
          new_property_id: input.property_id
        })
        
        // Check if property_id is being changed and if it would create a conflict
        // Handle null comparisons properly
        const currentPropertyId = verifyResult.data.property_id ?? null
        const newPropertyId = input.property_id ?? null
        const propertyIdChanged = currentPropertyId !== newPropertyId
        
        if (propertyIdChanged) {
          // Check if there's already a template with this template_key and new property_id
          let conflictCheck: any
          if (newPropertyId === null) {
            // Checking for default template (property_id IS NULL)
            conflictCheck = await client
              .from('email_templates')
              .select('id, name, property_id')
              .eq('template_key', input.template_key)
              .is('property_id', null)
              .neq('id', input.id) // Exclude the current template
              .maybeSingle()
          } else {
            // Checking for property-specific template
            conflictCheck = await client
              .from('email_templates')
              .select('id, name, property_id')
              .eq('template_key', input.template_key)
              .eq('property_id', newPropertyId)
              .neq('id', input.id) // Exclude the current template
              .maybeSingle()
          }
          
          if (conflictCheck.error) {
            console.error('Error checking for template conflict:', conflictCheck.error)
            // Don't fail the update if we can't check for conflicts - let the database constraint handle it
          } else if (conflictCheck.data) {
            console.error('Template conflict detected:', {
              existingTemplateId: conflictCheck.data.id,
              existingTemplateName: conflictCheck.data.name,
              templateKey: input.template_key,
              propertyId: input.property_id,
              isDefault: newPropertyId === null
            })
            const propertyName = newPropertyId === null 
              ? 'Default (All Properties)' 
              : `property ${newPropertyId}`
            return {
              data: null,
              error: `A template with key "${input.template_key}" already exists for ${propertyName}. Please edit or delete that template first, or choose a different property.`
            }
          } else {
            console.log('No template conflict found - safe to update property_id')
          }
        }
        
        // Now do the update - by ID only to ensure we update the exact template
        // Do NOT filter by property_id in the update query, as the user might be changing it
        const updatePromise = client
          .from('email_templates')
          .update(updatePayload)
          .eq('id', input.id)

        try {
          const updateResult = await Promise.race([updatePromise, updateTimeout]) as any
          
          console.log('Update result:', { 
            hasError: !!updateResult.error, 
            error: updateResult.error,
            data: updateResult.data,
            dataType: typeof updateResult.data,
            isArray: Array.isArray(updateResult.data),
            dataLength: Array.isArray(updateResult.data) ? updateResult.data.length : 'N/A'
          })
          
          if (updateResult.error) {
            console.error('Email template update error:', updateResult.error)
            
            // Check for unique constraint violation
            if (updateResult.error.code === '23505' || updateResult.error.message?.includes('unique') || updateResult.error.message?.includes('duplicate')) {
              return {
                data: null,
                error: `Cannot update template: A template with key "${input.template_key}" already exists for this property. Please edit or delete that template first.`
              }
            }
            
            return { data: null, error: updateResult.error.message || String(updateResult.error) }
          }
          
          // Supabase update without select returns { data: null, error: null } on success
          // OR { data: [...], error: null } if rows were updated (when using .select())
          // Since we're not using .select(), we can't tell from data if rows were updated
          // We'll proceed to fetch and check if the record exists and was updated
          
          console.log('Update query completed, fetching updated record to verify...')
          
          // Then fetch the updated record
          const fetchPromise = client
            .from('email_templates')
            .select('*')
            .eq('id', input.id)
            .single()

          try {
            result = await Promise.race([fetchPromise, fetchTimeout]) as any
            
            console.log('Fetch result:', {
              hasError: !!result.error,
              error: result.error,
              hasData: !!result.data,
              dataId: result.data?.id,
              dataName: result.data?.name
            })
            
            if (result.error) {
              console.error('Email template fetch error:', result.error)
              
              // If fetch fails with "not found" or permission error, the update likely didn't work
              if (result.error.code === 'PGRST116' || result.error.message?.includes('No rows')) {
                return { 
                  data: null, 
                  error: 'Template not found or you do not have permission to update it. Please check your RLS policies.' 
                }
              }
              
              // Other fetch errors - update may have succeeded
              return {
                data: {
                  id: input.id!,
                  template_key: input.template_key,
                  name: input.name,
                  subject: input.subject,
                  html_content: input.html_content,
                  text_content: input.text_content || null,
                  variables: input.variables || null,
                  is_active: input.is_active ?? true,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                } as EmailTemplateRecord,
                error: null
              }
            }
            
            if (!result.data) {
              console.error('Email template fetch: No data returned - template may not exist or RLS blocked access')
              return { 
                data: null, 
                error: 'Template not found or you do not have permission to view it. Please check your RLS policies.' 
              }
            }
            
            // Verify the updated template matches what we intended to update
            if (result.data.id !== input.id) {
              console.error('CRITICAL: Updated template ID does not match input ID!', {
                expectedId: input.id,
                actualId: result.data.id
              })
              return {
                data: null,
                error: 'Update verification failed: Template ID mismatch. This should not happen.'
              }
            }
            
            // Verify property_id was set correctly (critical for property isolation)
            // Handle null comparisons properly
            const expectedPropertyId = input.property_id ?? null
            const actualPropertyId = result.data.property_id ?? null
            if (expectedPropertyId !== actualPropertyId) {
              console.error('CRITICAL: Updated template property_id does not match!', {
                expectedPropertyId: input.property_id,
                actualPropertyId: result.data.property_id,
                templateId: result.data.id,
                templateKey: result.data.template_key
              })
              return {
                data: null,
                error: `Update verification failed: Property ID mismatch. Expected ${input.property_id ?? 'null'}, got ${result.data.property_id ?? 'null'}. This may indicate a database constraint issue.`
              }
            }
            
            // Verify the data actually changed (compare a field)
            const dataChanged = result.data.name !== input.name || 
                               result.data.subject !== input.subject ||
                               result.data.html_content !== input.html_content ||
                               result.data.property_id !== verifyResult.data.property_id
            
            if (!dataChanged && result.data.updated_at) {
              // Check if updated_at is recent (within last minute)
              const updatedAt = new Date(result.data.updated_at)
              const now = new Date()
              const diffSeconds = (now.getTime() - updatedAt.getTime()) / 1000
              
              if (diffSeconds > 60) {
                console.warn('Template data unchanged and updated_at is old - update may not have worked')
                return {
                  data: null,
                  error: 'Update may not have succeeded. The template data appears unchanged. Please check your RLS policies.'
                }
              }
            }
            
            console.log('Email template updated successfully:', {
              id: result.data.id,
              name: result.data.name,
              property_id: result.data.property_id,
              template_key: result.data.template_key,
              updated_at: result.data.updated_at,
              dataChanged
            })
          } catch (fetchTimeoutError: any) {
            console.error('Email template fetch timeout:', fetchTimeoutError)
            // Update succeeded but fetch timed out - construct response from input
            return {
              data: {
                id: input.id!,
                template_key: input.template_key,
                name: input.name,
                subject: input.subject,
                html_content: input.html_content,
                text_content: input.text_content || null,
                variables: input.variables || null,
                is_active: input.is_active ?? true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              } as EmailTemplateRecord,
              error: null
            }
          }
        } catch (timeoutError: any) {
          console.error('Email template update timeout:', timeoutError)
          return { 
            data: null, 
            error: timeoutError?.message || 'Update timed out after 10 seconds. The update may have succeeded - please refresh the page to verify.' 
          }
        }
      } else {
        // Insert: use insert (not upsert) to avoid conflicts with unique constraints
        // If there's a unique constraint on template_key, upsert would update existing instead of creating new
        const insertTimeout = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Insert timed out after 15 seconds')), 15000)
        })
        
        const insertPromise = client
          .from('email_templates')
          .insert(payload)
          .select('*')
          .single()

        try {
          result = await Promise.race([insertPromise, insertTimeout]) as any
        } catch (timeoutError: any) {
          console.error('Email template insert timeout:', timeoutError)
          return { 
            data: null, 
            error: timeoutError?.message || 'Insert timed out after 15 seconds' 
          }
        }

        if (result.error) {
          console.error('Email template insert error:', result.error)
          return { data: null, error: result.error.message || result.error }
        }
        
        if (!result.data) {
          return { data: null, error: 'No data returned from insert' }
        }
      }

      console.log('Email template saved successfully')
      return { data: result.data as EmailTemplateRecord, error: null }
    } catch (e: any) {
      console.error('Email template upsert exception:', e)
      return { data: null, error: e?.message || String(e) }
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





