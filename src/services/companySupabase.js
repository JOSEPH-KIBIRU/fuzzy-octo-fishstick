// services/companySupabase.js
import { supabase } from './supabaseClient';

class CompanySupabase {
  constructor(companyId) {
    this.companyId = companyId;
  }

  // All queries automatically filter by company_id
  async getTasks(filters = {}) {
    const query = supabase
      .from('tasks')
      .select('*')
      .eq('company_id', this.companyId);

    // Apply additional filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        query.eq(key, value);
      }
    });

    return query.order('created_at', { ascending: false });
  }

  async createTask(taskData) {
    return supabase
      .from('tasks')
      .insert([{ ...taskData, company_id: this.companyId }])
      .select()
      .single();
  }

  async getDocuments() {
    return supabase
      .from('documents')
      .select('*')
      .eq('company_id', this.companyId)
      .order('created_at', { ascending: false });
  }

  async uploadDocument(file, folderId = null) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `${this.companyId}/${fileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('company-documents')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Create database record
    return this.createDocument({
      name: file.name,
      file_path: filePath,
      file_type: file.type,
      file_size: file.size,
      folder_id: folderId
    });
  }

  async getCompanyMembers() {
    return supabase
      .from('company_members')
      .select(`
        *,
        user:users (
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .eq('company_id', this.companyId)
      .eq('status', 'active');
  }

  async inviteMember(email, role = 'member') {
    // First check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      // Add existing user to company
      return supabase
        .from('company_members')
        .insert([{
          company_id: this.companyId,
          user_id: existingUser.id,
          role,
          status: 'pending'
        }]);
    } else {
      // Create invitation
      return supabase
        .from('company_invitations')
        .insert([{
          company_id: this.companyId,
          email,
          role,
          token: Math.random().toString(36).substring(2),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }]);
    }
  }
}

export default CompanySupabase;