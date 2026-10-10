import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const appOrigin = Deno.env.get('APP_ORIGIN');
const corsHeaders = { 'Access-Control-Allow-Origin': appOrigin ?? 'null', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin' };
const reply = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return reply({ error: 'Método não permitido.' }, 405);
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return reply({ error: 'Sessão obrigatória.' }, 401);
  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!appOrigin || !url || !anonKey || !serviceKey) return reply({ error: 'Configuração segura do servidor incompleta.' }, 500);
  const caller = createClient(url, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authError } = await caller.auth.getUser();
  if (authError || !authData.user) return reply({ error: 'Sessão inválida.' }, 401);
  const { data: profiles, error: profileError } = await caller.rpc('get_my_profile');
  const profile = Array.isArray(profiles) ? profiles[0] : profiles;
  if (profileError || profile?.role !== 'gestor') return reply({ error: 'Somente a coordenação pode criar acessos.' }, 403);
  let input: { name?: string; base?: string; email?: string; role?: string };
  try { input = await request.json(); } catch { return reply({ error: 'Requisição inválida.' }, 400); }
  const name = input.name?.trim() ?? ''; const email = input.email?.trim().toLowerCase() ?? ''; const base = input.base; const role = input.role;
  if (name.length < 2 || name.length > 120 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !['GRU','VCP'].includes(base ?? '') || !['financeiro','campo'].includes(role ?? '')) return reply({ error: 'Confira nome, email, base e perfil.' }, 400);
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: memberId, error: memberError } = await caller.rpc('create_team_member', { _name: name, _base: base, _job_title: 'Agente de atendimento', _languages: [], _accessible: false });
  if (memberError || !memberId) return reply({ error: memberError?.message ?? 'Não foi possível criar o cadastro.' }, 400);
  const { data: created, error: createError } = await admin.auth.admin.createUser({ email, password: `Cmm!${crypto.randomUUID()}`, email_confirm: true });
  if (createError || !created.user) { await admin.from('team_members').delete().eq('id', memberId); return reply({ error: createError?.message ?? 'Não foi possível criar a conta.' }, 400); }
  const { error: linkError } = await caller.rpc('grant_member_access', { _member_id: memberId, _auth_user_id: created.user.id, _email: email, _role: role });
  if (linkError) { await admin.auth.admin.deleteUser(created.user.id); await admin.from('team_members').delete().eq('id', memberId); return reply({ error: linkError.message }, 400); }
  const { data: recovery, error: recoveryError } = await admin.auth.admin.generateLink({ type: 'recovery', email, options: { redirectTo: `${Deno.env.get('APP_ORIGIN') ?? url}/` } });
  if (recoveryError || !recovery.properties?.action_link) {
    await caller.rpc('change_member_role', { _member_id: memberId, _role: role });
    await admin.auth.admin.deleteUser(created.user.id); await admin.from('team_members').delete().eq('id', memberId);
    return reply({ error: 'Acesso desfeito: não foi possível gerar o link inicial. Revise a URL permitida do Auth.' }, 500);
  }
  return reply({ member_id: memberId, role, action_link: recovery.properties.action_link, message: 'Conta criada. Entregue o link inicial ao colaborador por um canal privado para definir a senha.' }, 201);
});
