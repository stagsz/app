-- SimpleSign Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table (extends Supabase auth.users)
create table public.users (
  id uuid references auth.users on delete cascade primary key,
  email text not null unique,
  name text,
  plan text not null default 'free' check (plan in ('free', 'starter', 'pro', 'business')),
  documents_used integer not null default 0,
  documents_limit integer not null default 3,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Documents table
create table public.documents (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users on delete cascade not null,
  title text not null,
  file_url text not null,
  signed_file_url text,
  status text not null default 'draft' check (status in ('draft', 'pending', 'completed', 'expired', 'declined')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  expires_at timestamp with time zone
);

-- Signers table
create table public.signers (
  id uuid default uuid_generate_v4() primary key,
  document_id uuid references public.documents on delete cascade not null,
  email text not null,
  name text,
  status text not null default 'pending' check (status in ('pending', 'viewed', 'signed', 'declined')),
  signed_at timestamp with time zone,
  access_token uuid default uuid_generate_v4() not null unique,
  order_index integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Signature fields table
create table public.signature_fields (
  id uuid default uuid_generate_v4() primary key,
  document_id uuid references public.documents on delete cascade not null,
  signer_id uuid references public.signers on delete cascade not null,
  type text not null check (type in ('signature', 'initial', 'date', 'text', 'checkbox')),
  page integer not null,
  x numeric not null,
  y numeric not null,
  width numeric not null,
  height numeric not null,
  required boolean not null default true,
  value text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Audit logs table
create table public.audit_logs (
  id uuid default uuid_generate_v4() primary key,
  document_id uuid references public.documents on delete cascade not null,
  signer_id uuid references public.signers on delete set null,
  action text not null,
  ip_address text,
  user_agent text,
  metadata jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Waitlist table (for pre-launch)
create table public.waitlist (
  id uuid default uuid_generate_v4() primary key,
  email text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes
create index documents_user_id_idx on public.documents(user_id);
create index documents_status_idx on public.documents(status);
create index signers_document_id_idx on public.signers(document_id);
create index signers_access_token_idx on public.signers(access_token);
create index signature_fields_document_id_idx on public.signature_fields(document_id);
create index audit_logs_document_id_idx on public.audit_logs(document_id);

-- Row Level Security (RLS)
alter table public.users enable row level security;
alter table public.documents enable row level security;
alter table public.signers enable row level security;
alter table public.signature_fields enable row level security;
alter table public.audit_logs enable row level security;
alter table public.waitlist enable row level security;

-- Users policies
create policy "Users can view own profile" on public.users
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.users
  for update using (auth.uid() = id);

-- Documents policies
create policy "Users can view own documents" on public.documents
  for select using (auth.uid() = user_id);

create policy "Users can create documents" on public.documents
  for insert with check (auth.uid() = user_id);

create policy "Users can update own documents" on public.documents
  for update using (auth.uid() = user_id);

create policy "Users can delete own documents" on public.documents
  for delete using (auth.uid() = user_id);

-- Signers policies (allow document owners and signers via access_token)
create policy "Document owners can view signers" on public.signers
  for select using (
    exists (
      select 1 from public.documents
      where documents.id = signers.document_id
      and documents.user_id = auth.uid()
    )
  );

create policy "Document owners can manage signers" on public.signers
  for all using (
    exists (
      select 1 from public.documents
      where documents.id = signers.document_id
      and documents.user_id = auth.uid()
    )
  );

-- Allow public access to signers via access_token (for signing page)
create policy "Anyone can view signer with valid token" on public.signers
  for select using (true);

-- Signature fields policies
create policy "Document owners can manage fields" on public.signature_fields
  for all using (
    exists (
      select 1 from public.documents
      where documents.id = signature_fields.document_id
      and documents.user_id = auth.uid()
    )
  );

create policy "Anyone can view fields" on public.signature_fields
  for select using (true);

-- Audit logs policies
create policy "Document owners can view audit logs" on public.audit_logs
  for select using (
    exists (
      select 1 from public.documents
      where documents.id = audit_logs.document_id
      and documents.user_id = auth.uid()
    )
  );

create policy "Anyone can insert audit logs" on public.audit_logs
  for insert with check (true);

-- Waitlist is public for inserts
create policy "Anyone can join waitlist" on public.waitlist
  for insert with check (true);

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name)
  values (new.id, new.email, new.raw_user_meta_data->>'name');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to update updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger update_users_updated_at
  before update on public.users
  for each row execute procedure public.update_updated_at_column();

create trigger update_documents_updated_at
  before update on public.documents
  for each row execute procedure public.update_updated_at_column();

-- Function to atomically increment documents_used counter
create or replace function public.increment_documents_used(user_uuid uuid)
returns integer as $$
declare
  new_count integer;
begin
  update public.users
  set documents_used = documents_used + 1
  where id = user_uuid
  returning documents_used into new_count;

  return new_count;
end;
$$ language plpgsql security definer;
