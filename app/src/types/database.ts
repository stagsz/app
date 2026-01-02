export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          plan: 'free' | 'starter' | 'pro' | 'business'
          documents_used: number
          documents_limit: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          plan?: 'free' | 'starter' | 'pro' | 'business'
          documents_used?: number
          documents_limit?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          plan?: 'free' | 'starter' | 'pro' | 'business'
          documents_used?: number
          documents_limit?: number
          created_at?: string
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          user_id: string
          title: string
          file_url: string
          status: 'draft' | 'pending' | 'completed' | 'expired' | 'declined'
          created_at: string
          updated_at: string
          expires_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          file_url: string
          status?: 'draft' | 'pending' | 'completed' | 'expired' | 'declined'
          created_at?: string
          updated_at?: string
          expires_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          file_url?: string
          status?: 'draft' | 'pending' | 'completed' | 'expired' | 'declined'
          created_at?: string
          updated_at?: string
          expires_at?: string | null
        }
      }
      signers: {
        Row: {
          id: string
          document_id: string
          email: string
          name: string | null
          status: 'pending' | 'viewed' | 'signed' | 'declined'
          signed_at: string | null
          access_token: string
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          email: string
          name?: string | null
          status?: 'pending' | 'viewed' | 'signed' | 'declined'
          signed_at?: string | null
          access_token?: string
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          email?: string
          name?: string | null
          status?: 'pending' | 'viewed' | 'signed' | 'declined'
          signed_at?: string | null
          access_token?: string
          created_at?: string
        }
      }
      signature_fields: {
        Row: {
          id: string
          document_id: string
          signer_id: string
          type: 'signature' | 'initial' | 'date' | 'text' | 'checkbox'
          page: number
          x: number
          y: number
          width: number
          height: number
          required: boolean
          value: string | null
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          signer_id: string
          type: 'signature' | 'initial' | 'date' | 'text' | 'checkbox'
          page: number
          x: number
          y: number
          width: number
          height: number
          required?: boolean
          value?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          signer_id?: string
          type?: 'signature' | 'initial' | 'date' | 'text' | 'checkbox'
          page?: number
          x?: number
          y?: number
          width?: number
          height?: number
          required?: boolean
          value?: string | null
          created_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          document_id: string
          signer_id: string | null
          action: string
          ip_address: string | null
          user_agent: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          signer_id?: string | null
          action: string
          ip_address?: string | null
          user_agent?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          signer_id?: string | null
          action?: string
          ip_address?: string | null
          user_agent?: string | null
          metadata?: Json | null
          created_at?: string
        }
      }
      waitlist: {
        Row: {
          id: string
          email: string
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
        }
      }
    }
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

// Convenience types
export type User = Tables<'users'>
export type Document = Tables<'documents'>
export type Signer = Tables<'signers'>
export type SignatureField = Tables<'signature_fields'>
export type AuditLog = Tables<'audit_logs'>
export type WaitlistEntry = Tables<'waitlist'>
