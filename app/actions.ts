'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getCurrentUserRole } from '@/lib/getUserRole';
import { formatMonthLabel } from '@/lib/formatters';
import { getMonthsBetween, getSavingsRateForMonth } from '@/lib/savingsUtils';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// Password Complexity Validator
function checkPasswordStrength(password: string): string | null {
  if (password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter (A-Z).';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one numeric digit (0-9).';
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
    return 'Password must contain at least one special character (!@#$%...).';
  }
  return null;
}

// Helper: Server-side Supabase client for Session & Auth management
async function getSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/+$/, ''),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Handled when called from Server Action context
          }
        },
      },
    }
  );
}

// Helper: Get active editor details for audit trail tracking
async function getActiveEditorDetails() {
  const { email } = await getCurrentUserRole();
  const supabaseServer = await getSupabaseServerClient();
  const { data: { user } } = await supabaseServer.auth.getUser();

  if (!user) {
    return { editorId: null, editorName: 'System Admin', editorDesignation: 'Executive Officer', auditUser: 'System Admin' };
  }

  // 1. Primary Lookup: Get profile by user auth ID
  let { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, committee_position, role, account_id, email')
    .eq('id', user.id)
    .maybeSingle();

  // 2. Secondary Fallback: Lookup by Email if Auth ID wasn't matched directly
  if (!profile && user.email) {
    const { data: profileByEmail } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, committee_position, role, account_id, email')
      .ilike('email', user.email)
      .maybeSingle();
    profile = profileByEmail;
  }

  // Determine Name
  const rawName = profile?.full_name || user.user_metadata?.full_name || 'System Admin';
  const editorName = rawName.replace(/\s*\((Admin|Superadmin)\)/gi, '').trim();

  // Determine Designation
  let editorDesignation = profile?.committee_position;
  if (!editorDesignation) {
    if (profile?.role === 'SUPER_ADMIN' || user.user_metadata?.role === 'SUPER_ADMIN') {
      editorDesignation = 'Chairperson / President';
    } else if (profile?.role === 'ADMIN' || user.user_metadata?.role === 'ADMIN') {
      editorDesignation = 'Committee Secretary';
    } else {
      editorDesignation = 'Executive Officer';
    }
  }

  // Determine Audit Identifier
  const accountId = profile?.account_id || user.user_metadata?.account_id;
  let auditUser = 'System Admin';
  
  if (accountId) {
    auditUser = `${accountId} - ${editorName}`;
  } else if (profile?.email || user.email || email) {
    auditUser = (profile?.email || user.email || email || '').replace('@evergreen.local', '');
  }

  return { 
    editorId: profile?.id || user.id, 
    editorName, 
    editorDesignation, 
    auditUser 
  };
}

// =========================================================================
// CONTRIBUTION RULES & SAVINGS RATE TIER ACTIONS
// =========================================================================

// Async Server Action Wrapper: Generate all YYYY-MM months between two dates inclusive
export async function getMonthsBetweenAction(startYYYYMM: string, endYYYYMM: string): Promise<string[]> {
  return getMonthsBetween(startYYYYMM, endYYYYMM);
}

// Async Server Action Wrapper: Get required monthly rate for a specific YYYY-MM month based on contribution_rules
export async function getSavingsRateForMonthAction(targetYYYYMM: string, rules: any[] = []): Promise<number> {
  return getSavingsRateForMonth(targetYYYYMM, rules);
}

// Action: Fetch all contribution rules
export async function getContributionRules() {
  const { data } = await supabaseAdmin
    .from('contribution_rules')
    .select('*')
    .order('effective_from_month', { ascending: false });

  return data || [];
}

// Action: Create or Schedule a New Savings Contribution Rule (Superadmin Only)
export async function createContributionRule(formData: FormData) {
  try {
    const effective_from_month = (formData.get('effective_from_month') as string)?.trim(); // 'YYYY-MM'
    const monthly_amount = Number(formData.get('monthly_amount'));
    const notes = (formData.get('notes') as string)?.trim();

    if (!effective_from_month || !monthly_amount || monthly_amount <= 0) {
      return { error: 'Effective starting month and a valid positive amount are required.' };
    }

    if (!notes || notes.length < 5) {
      return { error: 'A valid audit note / General Assembly resolution reason is required (min 5 characters).' };
    }

    const { isSuperAdmin } = await getCurrentUserRole();
    if (!isSuperAdmin) {
      return { error: 'Unauthorized: Only Superadmins can reconfigure cooperative contribution rules.' };
    }

    const { editorId, editorName, editorDesignation, auditUser } = await getActiveEditorDetails();

    // Calculate previous month to close out current active rule
    const [y, m] = effective_from_month.split('-').map(Number);
    let prevY = y;
    let prevM = m - 1;
    if (prevM < 1) {
      prevM = 12;
      prevY--;
    }
    const prevMonthStr = `${prevY}-${prevM.toString().padStart(2, '0')}`;

    // Close out currently active rule (where effective_to_month IS NULL)
    await supabaseAdmin
      .from('contribution_rules')
      .update({ effective_to_month: prevMonthStr })
      .is('effective_to_month', null);

    // Insert new rule with full author metadata
    const { data: newRule, error } = await supabaseAdmin
      .from('contribution_rules')
      .insert([{
        effective_from_month,
        effective_to_month: null,
        monthly_amount,
        notes,
        recorded_by_id: editorId,
        recorded_by_name: editorName,
        recorded_by_designation: editorDesignation,
        recorded_by_email: auditUser,
      }])
      .select()
      .single();

    if (error) return { error: error.message };

    // Record audit log
    await supabaseAdmin.from('audit_logs').insert([{
      entity_type: 'CONTRIBUTION_RULE',
      entity_id: String(newRule.id),
      action: 'CONTRIBUTION_RULE_CREATED',
      new_value: { 
        effective_from_month, 
        monthly_amount, 
        notes, 
        author: `${editorName} (${editorDesignation})` 
      },
      reason: `Savings rule created: NPR ${monthly_amount} starting ${effective_from_month}. Notes: ${notes}`,
      changed_by_email: auditUser
    }]);

    revalidatePath('/dashboard');
    revalidatePath('/deposits');
    revalidatePath('/treasury');
    revalidatePath('/');

    return { success: `New contribution rule (NPR ${monthly_amount.toLocaleString('en-IN')} starting ${effective_from_month}) saved successfully!` };
  } catch (err: any) {
    return { error: err.message || 'Failed to create contribution rule.' };
  }
}

// Action: Update an Existing Contribution Rule's Effective Dates, Amount, or Notes (Superadmin Only)
export async function updateContributionRule(formData: FormData) {
  try {
    const rule_id = Number(formData.get('rule_id'));
    const effective_from_month = (formData.get('effective_from_month') as string)?.trim(); // 'YYYY-MM'
    const effective_to_month = (formData.get('effective_to_month') as string)?.trim() || null; // 'YYYY-MM' or null
    const monthly_amount = Number(formData.get('monthly_amount'));
    const notes = (formData.get('notes') as string)?.trim();

    if (!rule_id || !effective_from_month || !monthly_amount || monthly_amount <= 0) {
      return { error: 'Rule ID, effective starting month, and a valid positive amount are required.' };
    }

    if (!notes || notes.length < 5) {
      return { error: 'A valid audit note / resolution reason is required (min 5 characters).' };
    }

    const { isSuperAdmin } = await getCurrentUserRole();
    if (!isSuperAdmin) {
      return { error: 'Unauthorized: Only Superadmins can update contribution rules.' };
    }

    const { editorName, editorDesignation, auditUser } = await getActiveEditorDetails();

    const { data: oldRule } = await supabaseAdmin
      .from('contribution_rules')
      .select('*')
      .eq('id', rule_id)
      .single();

    if (!oldRule) return { error: 'Contribution rule record not found.' };

    const updateData: any = {
      effective_from_month,
      effective_to_month,
      monthly_amount,
      notes,
    };

    const { error } = await supabaseAdmin
      .from('contribution_rules')
      .update(updateData)
      .eq('id', rule_id);

    if (error) return { error: error.message };

    // Record immutable audit log
    await supabaseAdmin.from('audit_logs').insert([{
      entity_type: 'CONTRIBUTION_RULE',
      entity_id: String(rule_id),
      action: 'CONTRIBUTION_RULE_EDITED',
      old_value: {
        effective_from_month: oldRule.effective_from_month,
        effective_to_month: oldRule.effective_to_month,
        monthly_amount: oldRule.monthly_amount,
        notes: oldRule.notes,
      },
      new_value: { 
        effective_from_month, 
        effective_to_month, 
        monthly_amount, 
        notes, 
        last_changed_by: `${editorName} (${editorDesignation})` 
      },
      reason: `Contribution rule #${rule_id} updated: NPR ${monthly_amount} (${effective_from_month} to ${effective_to_month || 'Present'}). Notes: ${notes}`,
      changed_by_email: auditUser
    }]);

    revalidatePath('/dashboard');
    revalidatePath('/deposits');
    revalidatePath('/treasury');
    revalidatePath('/');

    return { success: `Contribution rule #${rule_id} updated successfully!` };
  } catch (err: any) {
    return { error: err.message || 'Failed to update contribution rule.' };
  }
}

// Helper: Auto-generate sequential Deposit ID (Format: DPYYMM-XXX)
async function generateDepositCode(offset: number = 0): Promise<string> {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const mm = (now.getMonth() + 1).toString().padStart(2, '0');
  const prefix = `DP${yy}${mm}`;

  const { data: matches } = await supabaseAdmin
    .from('deposits')
    .select('deposit_code')
    .like('deposit_code', `${prefix}-%`);

  let maxSeq = 0;
  if (matches) {
    for (const d of matches) {
      if (d.deposit_code) {
        const parts = d.deposit_code.split('-');
        if (parts.length === 2) {
          const seqNum = parseInt(parts[1], 10);
          if (!isNaN(seqNum) && seqNum > maxSeq) {
            maxSeq = seqNum;
          }
        }
      }
    }
  }

  const nextSeq = (maxSeq + 1 + offset).toString().padStart(3, '0');
  return `${prefix}-${nextSeq}`;
}

// Helper: Auto-generate sequential Expense ID (Format: EXPYYMM-XXX)
async function generateExpenseCode(): Promise<string> {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const mm = (now.getMonth() + 1).toString().padStart(2, '0');
  const prefix = `EXP${yy}${mm}`;

  const { data: matches } = await supabaseAdmin
    .from('expenses')
    .select('expense_code')
    .like('expense_code', `${prefix}-%`);

  let maxSeq = 0;
  if (matches) {
    for (const e of matches) {
      if (e.expense_code) {
        const parts = e.expense_code.split('-');
        if (parts.length === 2) {
          const seqNum = parseInt(parts[1], 10);
          if (!isNaN(seqNum) && seqNum > maxSeq) {
            maxSeq = seqNum;
          }
        }
      }
    }
  }

  const nextSeq = (maxSeq + 1).toString().padStart(3, '0');
  return `${prefix}-${nextSeq}`;
}

// Helper: Auto-generate sequential Dividend Distribution ID (Format: DIVYYMM-XXX)
async function generateDividendCode(): Promise<string> {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const mm = (now.getMonth() + 1).toString().padStart(2, '0');
  const prefix = `DIV${yy}${mm}`;

  const { data: matches } = await supabaseAdmin
    .from('dividend_distributions')
    .select('distribution_code');

  let maxSeq = 0;
  if (matches) {
    for (const d of matches) {
      if (d.distribution_code) {
        const match = d.distribution_code.match(/(\d+)$/);
        if (match) {
          const seqNum = parseInt(match[1], 10);
          if (!isNaN(seqNum) && seqNum > maxSeq) {
            maxSeq = seqNum;
          }
        }
      }
    }
  }

  const nextSeq = (maxSeq + 1).toString().padStart(3, '0');
  return `${prefix}-${nextSeq}`;
}

// Helper: Auto-generate sequential Member Account ID
async function generateAccountId(): Promise<string> {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const mm = (now.getMonth() + 1).toString().padStart(2, '0');
  const prefix = `${yy}${mm}`;

  const { data: matches } = await supabaseAdmin
    .from('profiles')
    .select('account_id')
    .like('account_id', `${prefix}-%`);

  let maxSeq = 0;
  if (matches) {
    for (const p of matches) {
      if (p.account_id) {
        const parts = p.account_id.split('-');
        if (parts.length === 2) {
          const seqNum = parseInt(parts[1], 10);
          if (!isNaN(seqNum) && seqNum > maxSeq) {
            maxSeq = seqNum;
          }
        }
      }
    }
  }

  const nextSeq = (maxSeq + 1).toString().padStart(3, '0');
  return `${prefix}-${nextSeq}`;
}

// Helper: Auto-generate sequential External Member Account ID
async function generateExternalAccountId(): Promise<string> {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const mm = (now.getMonth() + 1).toString().padStart(2, '0');
  const prefix = `EM${yy}${mm}`;

  const { data: matches } = await supabaseAdmin
    .from('profiles')
    .select('account_id')
    .like('account_id', `${prefix}-%`);

  let maxSeq = 0;
  if (matches) {
    for (const p of matches) {
      if (p.account_id) {
        const parts = p.account_id.split('-');
        if (parts.length === 2) {
          const seqNum = parseInt(parts[1], 10);
          if (!isNaN(seqNum) && seqNum > maxSeq) {
            maxSeq = seqNum;
          }
        }
      }
    }
  }

  const nextSeq = (maxSeq + 1).toString().padStart(3, '0');
  return `${prefix}-${nextSeq}`;
}

// Helper: Auto-generate sequential Admin Account ID
async function generateAdminAccountId(): Promise<string> {
  const prefix = 'ADMIN';

  const { data: matches } = await supabaseAdmin
    .from('profiles')
    .select('account_id')
    .like('account_id', `${prefix}-%`);

  let maxSeq = 0;
  if (matches) {
    for (const p of matches) {
      if (p.account_id) {
        const parts = p.account_id.split('-');
        if (parts.length === 2) {
          const seqNum = parseInt(parts[1], 10);
          if (!isNaN(seqNum) && seqNum > maxSeq) {
            maxSeq = seqNum;
          }
        }
      }
    }
  }

  const nextSeq = (maxSeq + 1).toString().padStart(3, '0');
  return `${prefix}-${nextSeq}`;
}

// Helper: Auto-generate sequential Superadmin Account ID
async function generateSuperAdminAccountId(): Promise<string> {
  const prefix = 'SA';

  const { data: matches } = await supabaseAdmin
    .from('profiles')
    .select('account_id')
    .like('account_id', `${prefix}-%`);

  let maxSeq = 0;
  if (matches) {
    for (const p of matches) {
      if (p.account_id) {
        const parts = p.account_id.split('-');
        if (parts.length === 2) {
          const seqNum = parseInt(parts[1], 10);
          if (!isNaN(seqNum) && seqNum > maxSeq) {
            maxSeq = seqNum;
          }
        }
      }
    }
  }

  const nextSeq = (maxSeq + 1).toString().padStart(3, '0');
  return `${prefix}-${nextSeq}`;
}

// Helper: Auto-generate sequential Loan ID
async function generateLoanCode(): Promise<string> {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const mm = (now.getMonth() + 1).toString().padStart(2, '0');
  const prefix = `LN${yy}${mm}`;

  const { data: matches } = await supabaseAdmin
    .from('loans')
    .select('loan_code')
    .like('loan_code', `${prefix}-%`);

  let maxSeq = 0;
  if (matches) {
    for (const l of matches) {
      if (l.loan_code) {
        const parts = l.loan_code.split('-');
        if (parts.length === 2) {
          const seqNum = parseInt(parts[1], 10);
          if (!isNaN(seqNum) && seqNum > maxSeq) {
            maxSeq = seqNum;
          }
        }
      }
    }
  }

  const nextSeq = (maxSeq + 1).toString().padStart(3, '0');
  return `${prefix}-${nextSeq}`;
}

// Helper: Auto-generate sequential Payment ID
async function generatePaymentCode(): Promise<string> {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const mm = (now.getMonth() + 1).toString().padStart(2, '0');
  const prefix = `PY${yy}${mm}`;

  const { data: matches } = await supabaseAdmin
    .from('loan_payments')
    .select('payment_code')
    .like('payment_code', `${prefix}-%`);

  let maxSeq = 0;
  if (matches) {
    for (const p of matches) {
      if (p.payment_code) {
        const parts = p.payment_code.split('-');
        if (parts.length === 2) {
          const seqNum = parseInt(parts[1], 10);
          if (!isNaN(seqNum) && seqNum > maxSeq) {
            maxSeq = seqNum;
          }
        }
      }
    }
  }

  const nextSeq = (maxSeq + 1).toString().padStart(3, '0');
  return `${prefix}-${nextSeq}`;
}

// Public Helper Actions
export async function getNextDepositCode(): Promise<string> {
  return await generateDepositCode();
}

export async function getNextDividendCode(): Promise<string> {
  return await generateDividendCode();
}

export async function getNextAccountId(): Promise<string> {
  return await generateAccountId();
}

export async function getNextExternalAccountId(): Promise<string> {
  return await generateExternalAccountId();
}

export async function getNextAdminAccountId(): Promise<string> {
  return await generateAdminAccountId();
}

export async function getNextSuperAdminAccountId(): Promise<string> {
  return await generateSuperAdminAccountId();
}

export async function getNextLoanCode(): Promise<string> {
  return await generateLoanCode();
}

export async function getNextPaymentCode(): Promise<string> {
  return await generatePaymentCode();
}

// 1. Dual Login Action
export async function loginUser(formData: FormData) {
  const loginIdentifier = (formData.get('login_identifier') as string || formData.get('email') as string)?.trim();
  const password = formData.get('password') as string;

  if (!loginIdentifier || !password) {
    return { error: 'Please enter your Account ID or Email and password.' };
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('email, account_id, status')
    .or(`email.ilike.${loginIdentifier},account_id.ilike.${loginIdentifier}`)
    .maybeSingle();

  if (profile && profile.status && profile.status !== 'ACTIVE') {
    return { 
      error: 'Account is INACTIVE or SETTLED. Portal access is disabled. Please contact committee administrators.' 
    };
  }

  const targetEmail = profile?.email || loginIdentifier;
  const supabaseServer = await getSupabaseServerClient();

  const { error } = await supabaseServer.auth.signInWithPassword({
    email: targetEmail,
    password,
  });

  if (error) {
    return { error: 'Invalid Account ID/Email or Password.' };
  }

  redirect('/');
}

// 2. User Logout Action
export async function logoutUser() {
  const supabaseServer = await getSupabaseServerClient();
  await supabaseServer.auth.signOut();
  redirect('/login');
}

// 3. PASSWORD MANAGEMENT ACTIONS

// 3a. Self-Service: Change Own Password with Current Password Verification
export async function changeOwnPasswordWithOld(formData: FormData) {
  try {
    const currentPassword = (formData.get('current_password') as string)?.trim();
    const newPassword = (formData.get('new_password') as string)?.trim();
    const confirmPassword = (formData.get('confirm_password') as string)?.trim();

    if (!currentPassword) {
      return { error: 'Please enter your current password.' };
    }

    const passwordError = checkPasswordStrength(newPassword);
    if (passwordError) {
      return { error: passwordError };
    }

    if (newPassword !== confirmPassword) {
      return { error: 'New passwords do not match. Please try again.' };
    }

    const supabaseServer = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser();

    if (authError || !user || !user.email) {
      return { error: 'Unauthorized session. Please log in again.' };
    }

    const { error: signInErr } = await supabaseServer.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (signInErr) {
      return { error: 'Incorrect current password. Please verify and try again.' };
    }

    const { error: updateErr } = await supabaseServer.auth.updateUser({ password: newPassword });

    if (updateErr) return { error: updateErr.message };

    return { success: 'Your password has been changed successfully!' };
  } catch (err: any) {
    return { error: err.message || 'Failed to change password.' };
  }
}

// 3b. Self-Service: Change Own Password (Legacy/Direct)
export async function changeOwnPassword(formData: FormData) {
  try {
    const newPassword = (formData.get('new_password') as string)?.trim();
    const confirmPassword = (formData.get('confirm_password') as string)?.trim();

    const passwordError = checkPasswordStrength(newPassword);
    if (passwordError) {
      return { error: passwordError };
    }

    if (newPassword !== confirmPassword) {
      return { error: 'Passwords do not match. Please try again.' };
    }

    const supabaseServer = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser();

    if (authError || !user) {
      return { error: 'Unauthorized: Session expired. Please log in again.' };
    }

    const { error } = await supabaseServer.auth.updateUser({ password: newPassword });

    if (error) return { error: error.message };

    return { success: 'Your password has been updated successfully!' };
  } catch (err: any) {
    return { error: err.message || 'Failed to update password.' };
  }
}

// 3c. Self-Service: Request Reset Link via Email from Login Page
export async function requestPasswordReset(formData: FormData) {
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  if (!email) return { error: 'Please enter a valid email address.' };

  const supabaseServer = await getSupabaseServerClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const { error } = await supabaseServer.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
  });

  if (error) return { error: error.message };

  return { success: 'Password reset link sent! Check your email inbox.' };
}

// 3d. Self-Service: Update Password with Reset Token
export async function updatePasswordWithToken(formData: FormData) {
  const password = (formData.get('password') as string)?.trim();
  
  const passwordError = checkPasswordStrength(password);
  if (passwordError) {
    return { error: passwordError };
  }

  const supabaseServer = await getSupabaseServerClient();
  const { error } = await supabaseServer.auth.updateUser({ password });

  if (error) return { error: error.message };

  redirect('/login?reset=success');
}

// 3e. Superadmin Direct Password Override
export async function resetUserPasswordBySuperAdmin(formData: FormData) {
  try {
    const { isSuperAdmin } = await getCurrentUserRole();
    if (!isSuperAdmin) return { error: 'Unauthorized: Superadmin access required.' };

    const userId = formData.get('user_id') as string;
    const newPassword = (formData.get('new_password') as string)?.trim();

    if (!userId || !newPassword) return { error: 'User ID and new password are required.' };

    const passwordError = checkPasswordStrength(newPassword);
    if (passwordError) {
      return { error: passwordError };
    }

    const { auditUser } = await getActiveEditorDetails();

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, account_id')
      .eq('id', userId)
      .single();

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) return { error: error.message };

    await supabaseAdmin.from('audit_logs').insert([{
      entity_type: 'USER_AUTHENTICATION',
      entity_id: userId,
      action: 'PASSWORD_RESET_BY_SUPERADMIN',
      old_value: { account_id: profile?.account_id },
      new_value: { password_changed: true },
      reason: 'Manual password override by Superadmin',
      changed_by_email: auditUser,
    }]);

    revalidatePath('/users');
    revalidatePath('/members');
    return { success: `Password for ${profile?.full_name || 'user'} (${profile?.account_id}) updated successfully!` };
  } catch (err: any) {
    return { error: err.message || 'Failed to update password.' };
  }
}

// 4. Register General Member / External Borrower
export async function registerUserByAdmin(formData: FormData) {
  const full_name = (formData.get('full_name') as string)?.trim();
  const phone = (formData.get('phone') as string)?.trim();
  const user_email = (formData.get('email') as string)?.trim()?.toLowerCase();
  const password = formData.get('password') as string;
  const user_type = (formData.get('user_type') as string) || 'MEMBER';
  const joined_date = formData.get('joined_date') as string;
  const committee_position = (formData.get('committee_position') as string)?.trim() || null;

  const dob = (formData.get('dob') as string) || null;
  const gender = (formData.get('gender') as string) || 'MALE';
  const marital_status = (formData.get('marital_status') as string) || 'SINGLE';
  const father_name = (formData.get('father_name') as string)?.trim() || null;
  const grandfather_name = (formData.get('grandfather_name') as string)?.trim() || null;
  const spouse_name = (formData.get('spouse_name') as string)?.trim() || null;
  const occupation = (formData.get('occupation') as string)?.trim() || null;

  const citizenship_no = (formData.get('citizenship_no') as string)?.trim();
  const nid_no = (formData.get('nid_no') as string)?.trim();
  const citizenship_issue_date = (formData.get('citizenship_issue_date') as string);
  const citizenship_issue_district = (formData.get('citizenship_issue_district') as string)?.trim();

  const municipality_vdc = (formData.get('municipality_vdc') as string)?.trim();
  const ward_no = formData.get('ward_no') ? Number(formData.get('ward_no')) : null;
  const village_name = (formData.get('village_name') as string)?.trim();

  const photo_file = (formData.get('photo') || formData.get('profile_photo')) as File | null;
  const kyc_file = formData.get('kyc_document') as File | null;

  if (!full_name || !joined_date || !phone) {
    return { error: 'Full name, joined date, and phone number are required.' };
  }

  if (!citizenship_no || !nid_no || !citizenship_issue_date || !citizenship_issue_district) {
    return { error: 'All National Identification details (Citizenship No, NID, Issue Date & District) are mandatory.' };
  }

  if (!municipality_vdc || !ward_no || !village_name) {
    return { error: 'All Address details (Municipality/VDC, Ward No, and Village/Tole) are mandatory.' };
  }

  const account_id = user_type === 'MEMBER' 
    ? await generateAccountId() 
    : await generateExternalAccountId();

  const timestamp = Date.now();
  let photo_path: string | null = null;
  let kyc_document_path: string | null = null;

  if (photo_file && photo_file.size > 0) {
    if (photo_file.size > 1048576) {
      return { error: 'Profile Photo Error: Uploaded image exceeds the strict 1 MB size limit.' };
    }
    const rawExt = photo_file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const ext = ['jpg', 'jpeg', 'png'].includes(rawExt) ? rawExt : 'jpg';
    const photoFileName = `photos/${account_id}_photo_${timestamp}.${ext}`;

    const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
      .from('member-docs')
      .upload(photoFileName, photo_file, { contentType: photo_file.type, upsert: true });

    if (uploadErr) {
      const { data: fbData, error: fbErr } = await supabaseAdmin.storage
        .from('kyc_documents')
        .upload(photoFileName, photo_file, { contentType: photo_file.type, upsert: true });

      if (fbErr) return { error: `Profile Photo Upload Error: ${uploadErr.message}` };
      photo_path = fbData.path;
    } else {
      photo_path = uploadData.path;
    }
  } else {
    return { error: 'Passport Photo is required (JPG or PNG, Max 1 MB).' };
  }

  if (kyc_file && kyc_file.size > 0) {
    if (kyc_file.size > 1048576) {
      return { error: 'KYC Document Error: Uploaded document exceeds the strict 1 MB size limit.' };
    }
    if (kyc_file.type !== 'application/pdf') {
      return { error: 'KYC Document Error: File must be in PDF format.' };
    }

    const kycFileName = `kyc/${account_id}_kyc_${timestamp}.pdf`;

    const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
      .from('member-docs')
      .upload(kycFileName, kyc_file, { contentType: 'application/pdf', upsert: true });

    if (uploadErr) {
      const { data: fbData, error: fbErr } = await supabaseAdmin.storage
        .from('kyc_documents')
        .upload(kycFileName, kyc_file, { contentType: 'application/pdf', upsert: true });

      if (fbErr) return { error: `KYC Document Upload Error: ${uploadErr.message}` };
      kyc_document_path = fbData.path;
    } else {
      kyc_document_path = uploadData.path;
    }
  } else {
    return { error: 'KYC Document Scan is required (PDF format, Max 1 MB).' };
  }

  const identityData = {
    dob,
    gender,
    marital_status,
    father_name,
    grandfather_name,
    spouse_name,
    occupation,
    citizenship_no,
    nid_no,
    citizenship_issue_date,
    citizenship_issue_district,
    municipality_vdc,
    ward_no,
    village_name,
    committee_position,
    photo_path,
    kyc_document_path,
  };

  if (user_type === 'MEMBER') {
    if (!user_email) return { error: 'A valid personal email address is required for group members.' };
    if (!password) return { error: 'Password is required for member accounts.' };
    
    const passwordError = checkPasswordStrength(password);
    if (passwordError) return { error: passwordError };

    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: user_email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role: 'MEMBER', account_id },
    });

    if (authError) return { error: `Authentication Error: ${authError.message}` };

    const { error: profileError } = await supabaseAdmin.from('profiles').insert([{
      id: authUser.user.id,
      full_name,
      phone: phone || null,
      email: user_email,
      account_id,
      user_type: 'MEMBER',
      role: 'MEMBER',
      joined_date,
      status: 'ACTIVE',
      ...identityData,
    }]);

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return { error: profileError.message };
    }

    revalidatePath('/members');
    revalidatePath('/users');
    revalidatePath('/loans');
    revalidatePath('/admin/user-lookup');
    revalidatePath('/');
    return { success: `Member registered successfully! Assigned Account ID: ${account_id}` };
  } else {
    const { error: profileError } = await supabaseAdmin.from('profiles').insert([{
      full_name,
      phone: phone || null,
      email: user_email || null,
      account_id,
      user_type: 'NON_MEMBER',
      role: 'MEMBER',
      joined_date,
      status: 'ACTIVE',
      ...identityData,
    }]);

    if (profileError) return { error: profileError.message };

    revalidatePath('/members');
    revalidatePath('/users');
    revalidatePath('/loans');
    revalidatePath('/admin/user-lookup');
    revalidatePath('/');
    return { success: `External borrower registered successfully! Assigned ID: ${account_id}` };
  }
}

// 5. Register Dedicated Committee Admin
export async function registerAdminBySuperAdmin(formData: FormData) {
  const full_name = (formData.get('full_name') as string)?.trim();
  const phone = (formData.get('phone') as string)?.trim();
  const user_email = (formData.get('email') as string)?.trim();
  const password = formData.get('password') as string;
  const joined_date = (formData.get('joined_date') as string) || new Date().toISOString().split('T')[0];
  const committee_position = (formData.get('committee_position') as string)?.trim() || 'Secretary';

  if (!full_name || !password) {
    return { error: 'Full name and password are required.' };
  }

  const passwordError = checkPasswordStrength(password);
  if (passwordError) return { error: passwordError };

  const { isSuperAdmin } = await getCurrentUserRole();
  if (!isSuperAdmin) {
    return { error: 'Unauthorized: Only Superadmins can register Committee Admin accounts.' };
  }

  const account_id = await generateAdminAccountId();
  const authEmail = user_email || `${account_id.toLowerCase()}@evergreen.local`;

  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: authEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name, role: 'ADMIN', account_id },
  });

  if (authError) return { error: authError.message };

  const { error: profileError } = await supabaseAdmin.from('profiles').insert([{
    id: authUser.user.id,
    full_name,
    phone: phone || null,
    email: authEmail,
    account_id,
    user_type: 'MEMBER',
    role: 'ADMIN',
    committee_position,
    joined_date,
    status: 'ACTIVE'
  }]);

  if (profileError) return { error: profileError.message };

  revalidatePath('/users');
  revalidatePath('/members');
  revalidatePath('/');
  return { success: `Committee Admin account created! Assigned Admin ID: ${account_id}` };
}

// 6. Register Dedicated Superadmin
export async function registerSuperAdminBySuperAdmin(formData: FormData) {
  const full_name = (formData.get('full_name') as string)?.trim();
  const phone = (formData.get('phone') as string)?.trim();
  const user_email = (formData.get('email') as string)?.trim();
  const password = formData.get('password') as string;
  const joined_date = (formData.get('joined_date') as string) || new Date().toISOString().split('T')[0];
  const committee_position = (formData.get('committee_position') as string)?.trim() || 'Chairperson / President';

  if (!full_name || !password) {
    return { error: 'Full name and password are required.' };
  }

  const passwordError = checkPasswordStrength(password);
  if (passwordError) return { error: passwordError };

  const { isSuperAdmin } = await getCurrentUserRole();
  if (!isSuperAdmin) {
    return { error: 'Unauthorized: Only Superadmins can register Superadmin accounts.' };
  }

  const account_id = await generateSuperAdminAccountId();
  const authEmail = user_email || `${account_id.toLowerCase()}@evergreen.local`;

  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: authEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name, role: 'SUPER_ADMIN', account_id },
  });

  if (authError) return { error: authError.message };

  const { error: profileError } = await supabaseAdmin.from('profiles').insert([{
    id: authUser.user.id,
    full_name,
    phone: phone || null,
    email: authEmail,
    account_id,
    user_type: 'MEMBER',
    role: 'SUPER_ADMIN',
    committee_position,
    joined_date,
    status: 'ACTIVE'
  }]);

  if (profileError) return { error: profileError.message };

  revalidatePath('/users');
  revalidatePath('/members');
  revalidatePath('/');
  return { success: `Superadmin account created! Assigned SA ID: ${account_id}` };
}

// 7. Update Admin Committee Position
export async function updateAdminPosition(formData: FormData) {
  try {
    const { isSuperAdmin } = await getCurrentUserRole();
    if (!isSuperAdmin) return { error: 'Unauthorized: Only Superadmins can reassign committee positions.' };

    const userId = formData.get('user_id') as string;
    const newPosition = (formData.get('committee_position') as string)?.trim();
    const effectiveDate = (formData.get('effective_date') as string) || new Date().toISOString().split('T')[0];
    const reason = (formData.get('reason') as string)?.trim() || 'Executive Committee re-election';

    if (!userId || !newPosition) return { error: 'Admin User ID and New Position are required.' };

    const { auditUser } = await getActiveEditorDetails();

    const { data: currentProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, account_id, committee_position')
      .eq('id', userId)
      .single();

    if (!currentProfile) return { error: 'Admin profile not found.' };

    const oldPosition = currentProfile.committee_position || 'UNASSIGNED';

    if (oldPosition === newPosition) {
      return { error: `Admin is already assigned to the position "${newPosition}".` };
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ committee_position: newPosition })
      .eq('id', userId);

    if (updateError) return { error: updateError.message };

    await supabaseAdmin.from('audit_logs').insert([{
      entity_type: 'ADMIN_POSITION',
      entity_id: userId,
      action: 'POSITION_PROMOTION_SHIFT',
      old_value: { position: oldPosition, name: currentProfile.full_name, account_id: currentProfile.account_id },
      new_value: { 
        position: newPosition, 
        effective_date: effectiveDate, 
        name: currentProfile.full_name, 
        account_id: currentProfile.account_id 
      },
      reason,
      changed_by_email: auditUser
    }]);

    revalidatePath('/users');
    revalidatePath('/members');
    return { success: `Position for ${currentProfile.full_name} updated to "${newPosition}" (Effective: ${effectiveDate})!` };
  } catch (err: any) {
    return { error: err.message || 'Failed to update position.' };
  }
}

// 8. Update Admin Profile Details
export async function updateAdminProfileDetails(formData: FormData) {
  try {
    const { isSuperAdmin } = await getCurrentUserRole();
    if (!isSuperAdmin) return { error: 'Unauthorized: Superadmin access required.' };

    const userId = formData.get('user_id') as string;
    const full_name = (formData.get('full_name') as string)?.trim();
    const phone = (formData.get('phone') as string)?.trim();
    const email = (formData.get('email') as string)?.trim()?.toLowerCase();
    const committee_position = (formData.get('committee_position') as string)?.trim();
    const joined_date = (formData.get('joined_date') as string) || null;

    if (!userId || !full_name) return { error: 'User ID and Full Name are required.' };

    const { editorName, editorDesignation, auditUser } = await getActiveEditorDetails();

    const { data: oldProfile } = await supabaseAdmin.from('profiles').select('*').eq('id', userId).single();
    if (!oldProfile) return { error: 'Admin profile record not found.' };

    const updateFields: any = {
      full_name,
      phone: phone || null,
      email: email || oldProfile?.email,
      committee_position: committee_position || oldProfile?.committee_position,
      updated_at: new Date().toISOString(),
    };

    if (joined_date) {
      updateFields.joined_date = joined_date;
    }

    const { error } = await supabaseAdmin
      .from('profiles')
      .update(updateFields)
      .eq('id', userId);

    if (error) return { error: error.message };

    await supabaseAdmin.from('audit_logs').insert([{
      entity_type: 'ADMIN_PROFILE',
      entity_id: userId,
      action: 'PROFILE_EDITED',
      old_value: { 
        full_name: oldProfile?.full_name, 
        phone: oldProfile?.phone, 
        email: oldProfile?.email,
        committee_position: oldProfile?.committee_position,
        joined_date: oldProfile?.joined_date 
      },
      new_value: { 
        full_name, 
        phone, 
        email, 
        committee_position, 
        joined_date,
        last_changed_by: `${editorName} (${editorDesignation})`
      },
      reason: `Admin details updated by ${editorName} (${editorDesignation})`,
      changed_by_email: auditUser
    }]);

    revalidatePath('/users');
    revalidatePath('/members');
    revalidatePath('/admin/user-lookup');
    revalidatePath('/');
    return { success: 'Admin profile and appointment details updated successfully!' };
  } catch (err: any) {
    return { error: err.message || 'Failed to update profile.' };
  }
}

// 9. Deactivate/Offboard Admin Account
export async function deactivateAdminAccount(formData: FormData) {
  try {
    const { isSuperAdmin } = await getCurrentUserRole();
    if (!isSuperAdmin) return { error: 'Unauthorized: Superadmin access required.' };

    const userId = formData.get('user_id') as string;
    const deactivation_reason = (formData.get('reason') as string)?.trim() || 'Board tenure completed / Retired';

    if (!userId) return { error: 'User ID is required.' };

    const { auditUser } = await getActiveEditorDetails();
    const { data: admin } = await supabaseAdmin.from('profiles').select('full_name, account_id').eq('id', userId).single();

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        status: 'INACTIVE',
        settled_at: new Date().toISOString().split('T')[0],
        settlement_notes: `Admin Account Deactivated: ${deactivation_reason}`,
      })
      .eq('id', userId);

    if (error) return { error: error.message };

    await supabaseAdmin.from('audit_logs').insert([{
      entity_type: 'ADMIN_ACCOUNT',
      entity_id: userId,
      action: 'ADMIN_DEACTIVATED',
      old_value: { status: 'ACTIVE', account_id: admin?.account_id },
      new_value: { status: 'INACTIVE', deactivation_reason },
      reason: deactivation_reason,
      changed_by_email: auditUser
    }]);

    revalidatePath('/users');
    return { success: `Admin account (${admin?.account_id}) deactivated successfully.` };
  } catch (err: any) {
    return { error: err.message || 'Failed to deactivate account.' };
  }
}

// 10. Reactivate Admin Account
export async function reactivateAdminAccount(formData: FormData) {
  try {
    const { isSuperAdmin } = await getCurrentUserRole();
    if (!isSuperAdmin) return { error: 'Unauthorized: Superadmin access required.' };

    const userId = formData.get('user_id') as string;
    const reason = (formData.get('reason') as string)?.trim() || 'Reappointed to Executive Board';

    if (!userId) return { error: 'User ID is required.' };

    const { auditUser } = await getActiveEditorDetails();

    const { data: admin } = await supabaseAdmin
      .from('profiles')
      .select('full_name, account_id')
      .eq('id', userId)
      .single();

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        status: 'ACTIVE',
        settled_at: null,
        settlement_notes: null,
      })
      .eq('id', userId);

    if (error) return { error: error.message };

    await supabaseAdmin.from('audit_logs').insert([{
      entity_type: 'ADMIN_ACCOUNT',
      entity_id: userId,
      action: 'ADMIN_REACTIVATED',
      old_value: { status: 'INACTIVE', account_id: admin?.account_id },
      new_value: { status: 'ACTIVE', reason },
      reason,
      changed_by_email: auditUser
    }]);

    revalidatePath('/users');
    return { success: `Admin account (${admin?.account_id}) reactivated successfully!` };
  } catch (err: any) {
    return { error: err.message || 'Failed to reactivate account.' };
  }
}

// 11. Comprehensive Member Profile Update Action
export async function updateUserProfile(formData: FormData) {
  try {
    const userId = formData.get('user_id') as string;
    const full_name = (formData.get('full_name') as string)?.trim();
    const phone = (formData.get('phone') as string)?.trim();
    const email = (formData.get('email') as string)?.trim()?.toLowerCase();
    const role = formData.get('role') as string;
    const committee_position = (formData.get('committee_position') as string)?.trim() || null;
    const joined_date = formData.get('joined_date') as string;

    const dob = (formData.get('dob') as string) || null;
    const gender = (formData.get('gender') as string) || null;
    const marital_status = (formData.get('marital_status') as string) || null;
    const father_name = (formData.get('father_name') as string)?.trim() || null;
    const grandfather_name = (formData.get('grandfather_name') as string)?.trim() || null;
    const spouse_name = (formData.get('spouse_name') as string)?.trim() || null;
    const occupation = (formData.get('occupation') as string)?.trim() || null;

    const citizenship_no = (formData.get('citizenship_no') as string)?.trim() || null;
    const nid_no = (formData.get('nid_no') as string)?.trim() || null;
    const citizenship_issue_date = (formData.get('citizenship_issue_date') as string) || null;
    const citizenship_issue_district = (formData.get('citizenship_issue_district') as string)?.trim() || null;

    const municipality_vdc = (formData.get('municipality_vdc') as string)?.trim() || null;
    const ward_no = formData.get('ward_no') ? Number(formData.get('ward_no')) : null;
    const village_name = (formData.get('village_name') as string)?.trim() || null;

    const photo_file = (formData.get('photo') || formData.get('profile_photo')) as File | null;
    const kyc_file = formData.get('kyc_document') as File | null;

    if (!userId || !full_name) {
      return { error: 'User ID and Full Name are required.' };
    }

    const { isAdmin, isSuperAdmin } = await getCurrentUserRole();
    if (!isAdmin) {
      return { error: 'Unauthorized: Only Committee Admins can update member profiles.' };
    }

    const { editorName, editorDesignation, auditUser } = await getActiveEditorDetails();

    const { data: oldProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!oldProfile) return { error: 'Member profile record not found.' };

    const accountId = oldProfile.account_id || 'ACC';
    const timestamp = Date.now();

    let photo_path = oldProfile.photo_path || null;
    let kyc_document_path = oldProfile.kyc_document_path || null;

    if (photo_file && photo_file.size > 0) {
      if (photo_file.size > 1048576) {
        return { error: 'Profile Photo Error: Image exceeds 1 MB size limit.' };
      }
      const rawExt = photo_file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const ext = ['jpg', 'jpeg', 'png'].includes(rawExt) ? rawExt : 'jpg';
      const photoFileName = `photos/${accountId}_photo_${timestamp}.${ext}`;

      const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
        .from('member-docs')
        .upload(photoFileName, photo_file, { contentType: photo_file.type, upsert: true });

      if (!uploadErr && uploadData) {
        photo_path = uploadData.path;
      }
    }

    if (kyc_file && kyc_file.size > 0) {
      if (kyc_file.size > 1048576) {
        return { error: 'KYC Document Error: File exceeds 1 MB size limit.' };
      }
      if (kyc_file.type !== 'application/pdf') {
        return { error: 'KYC Document Error: File must be in PDF format.' };
      }
      const kycFileName = `kyc/${accountId}_kyc_${timestamp}.pdf`;

      const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
        .from('member-docs')
        .upload(kycFileName, kyc_file, { contentType: 'application/pdf', upsert: true });

      if (!uploadErr && uploadData) {
        kyc_document_path = uploadData.path;
      }
    }

    const updateData: any = {
      full_name,
      phone: phone || null,
      committee_position,
      dob,
      gender,
      marital_status,
      father_name,
      grandfather_name,
      spouse_name,
      occupation,
      citizenship_no,
      nid_no,
      citizenship_issue_date,
      citizenship_issue_district,
      municipality_vdc,
      ward_no,
      village_name,
      photo_path,
      kyc_document_path,
      updated_at: new Date().toISOString(),
    };

    if (joined_date) updateData.joined_date = joined_date;
    if (email) updateData.email = email;

    if (isSuperAdmin && role) {
      updateData.role = role;
    }

    const { error } = await supabaseAdmin.from('profiles').update(updateData).eq('id', userId);

    if (error) return { error: error.message };

    await supabaseAdmin.from('audit_logs').insert([{
      entity_type: 'MEMBER_PROFILE',
      entity_id: userId,
      action: 'MEMBER_PROFILE_EDITED',
      old_value: {
        full_name: oldProfile.full_name,
        phone: oldProfile.phone,
        email: oldProfile.email,
        citizenship_no: oldProfile.citizenship_no,
        nid_no: oldProfile.nid_no,
        joined_date: oldProfile.joined_date,
      },
      new_value: { 
        full_name, 
        phone, 
        email, 
        citizenship_no, 
        nid_no, 
        joined_date,
        last_changed_by: `${editorName} (${editorDesignation})`
      },
      reason: `Member profile dossier corrected by ${editorName} (${editorDesignation})`,
      changed_by_email: auditUser,
    }]);

    revalidatePath('/members');
    revalidatePath('/users');
    revalidatePath('/loans');
    revalidatePath('/admin/user-lookup');
    revalidatePath('/');
    return { success: `Profile for ${full_name} (${accountId}) updated successfully!` };
  } catch (err: any) {
    return { error: err.message || 'Failed to update member profile.' };
  }
}

// 12. Settlement & Deactivation Action
export async function settleAndDeactivateMember(formData: FormData) {
  const userId = formData.get('user_id') as string;
  const settlement_notes = (formData.get('notes') as string)?.trim();
  const settled_at = (formData.get('settled_at') as string) || new Date().toISOString().split('T')[0];
  const exit_charge = Number(formData.get('exit_charge')) || 0;
  const waive_exit_charge = formData.get('waive_exit_charge') === 'true';

  if (!userId) {
    return { error: 'User ID is required.' };
  }

  const { isAdmin } = await getCurrentUserRole();
  if (!isAdmin) {
    return { error: 'Unauthorized: Only Committee Admins can deactivate accounts.' };
  }

  const { auditUser } = await getActiveEditorDetails();

  const { data: member } = await supabaseAdmin
    .from('profiles')
    .select('full_name, account_id')
    .eq('id', userId)
    .single();

  if (!member) return { error: 'Member profile not found.' };

  const { data: deposits } = await supabaseAdmin
    .from('deposits')
    .select('amount_paid')
    .eq('member_id', userId);

  const totalSavings = (deposits || []).reduce((sum, d) => sum + Number(d.amount_paid), 0);
  const appliedExitCharge = waive_exit_charge ? 0 : exit_charge;
  const netRefundPaid = Math.max(0, totalSavings - appliedExitCharge);

  const fullNotes = `Financial Settlement: Accumulated Savings = NPR ${totalSavings.toLocaleString('en-IN')}, Exit Deduction = NPR ${appliedExitCharge.toLocaleString('en-IN')}${waive_exit_charge ? ' (Waived/Relieved)' : ''}, Net Refund Paid = NPR ${netRefundPaid.toLocaleString('en-IN')}. Notes: ${settlement_notes || 'Settlement finalized.'}`;

  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({
      status: 'SETTLED',
      settled_at,
      settlement_notes: fullNotes,
    })
    .eq('id', userId);

  if (updateError) return { error: updateError.message };

  await supabaseAdmin.from('audit_logs').insert([{
    entity_type: 'MEMBER_PROFILE',
    entity_id: userId,
    action: 'ACCOUNT_SETTLED_DEACTIVATED',
    old_value: { status: 'ACTIVE' },
    new_value: { 
      status: 'SETTLED', 
      settled_at, 
      total_savings: totalSavings, 
      exit_charge: appliedExitCharge, 
      net_refund: netRefundPaid 
    },
    reason: fullNotes,
    changed_by_email: auditUser
  }]);

  revalidatePath('/members');
  revalidatePath('/users');
  revalidatePath('/deposits');
  revalidatePath('/loans');
  revalidatePath('/admin/user-lookup');
  revalidatePath('/');
  return { success: `Account settled! Total Refund Paid: NPR ${netRefundPaid.toLocaleString('en-IN')}` };
}

// 13. Single Monthly Savings Deposit Action
export async function recordDeposit(formData: FormData) {
  const member_id = formData.get('member_id') as string;
  const for_month = formData.get('for_month') as string;
  const amount_paid = Number(formData.get('amount_paid')) || 500;
  const deposited_by_name = (formData.get('deposited_by_name') as string)?.trim() || null;
  const deposit_note = (formData.get('deposit_note') as string)?.trim() || null;
  const fine_amount = Number(formData.get('fine_amount')) || 0;
  const fine_discount_amount = Number(formData.get('fine_discount_amount')) || 0;
  const fine_waived = formData.get('fine_waived') === 'true';
  const fine_override_reason = (formData.get('fine_override_reason') as string)?.trim() || null;

  if (!member_id || !for_month) return { error: 'Member and month required.' };

  const { isAdmin } = await getCurrentUserRole();
  if (!isAdmin) return { error: 'Unauthorized.' };

  const formattedMonth = `${for_month}-01`;

  const { data: existingDeposit } = await supabaseAdmin
    .from('deposits')
    .select('id')
    .eq('member_id', member_id)
    .eq('for_month', formattedMonth)
    .maybeSingle();

  if (existingDeposit) {
    return { error: `Duplicate Entry: Deposit already exists for ${formatMonthLabel(for_month)}.` };
  }

  const { editorId, editorName, editorDesignation } = await getActiveEditorDetails();

  const deposit_code = await generateDepositCode(0);

  const insertData: any = {
    deposit_code,
    member_id,
    for_month: formattedMonth,
    amount_paid,
    deposited_by_name,
    recorded_by_id: editorId,
    recorded_by_name: editorName,
    recorded_by_designation: editorDesignation,
    deposit_note,
    fine_amount,
    fine_discount_amount,
    fine_waived,
    fine_override_reason
  };

  const { data: newDep, error } = await supabaseAdmin
    .from('deposits')
    .insert([insertData])
    .select('*, profiles!member_id(full_name, account_id)')
    .single();

  if (error) return { error: error.message };

  revalidatePath('/deposits');
  revalidatePath('/members');
  revalidatePath('/');

  return {
    success: `Deposit recorded! Voucher ID: ${deposit_code}`,
    receipt: {
      deposit_code,
      for_month,
      amount_paid,
      fine_amount,
      fine_discount_amount,
      fine_waived,
      fine_override_reason,
      deposit_note,
      created_at: newDep.created_at,
      member_name: newDep.profiles?.full_name || 'Member',
      member_account_id: newDep.profiles?.account_id || 'N/A',
      deposited_by_name,
      recorded_by_name: editorName,
      recorded_by_designation: editorDesignation,
    }
  };
}

// 14. BULK MEETING DEPOSITS
export async function recordBulkDeposits(payload: { 
  for_month: string; 
  deposits: { member_id: string; amount_paid: number; deposited_by_name?: string | null; deposit_note?: string | null }[] 
}) {
  const { for_month, deposits: depositList } = payload;
  if (!for_month || !depositList || depositList.length === 0) return { error: 'Target month required.' };

  const { isAdmin } = await getCurrentUserRole();
  if (!isAdmin) return { error: 'Unauthorized.' };

  const monthFormatted = `${for_month}-01`;
  const selectedMemberIds = depositList.map((d) => d.member_id);

  const { data: existingDeposits } = await supabaseAdmin
    .from('deposits')
    .select('member_id')
    .eq('for_month', monthFormatted)
    .in('member_id', selectedMemberIds);

  if (existingDeposits && existingDeposits.length > 0) {
    return { error: 'Bulk Deposit Error: One or more selected members have already paid for this month.' };
  }

  const { editorId, editorName, editorDesignation } = await getActiveEditorDetails();

  const { data: memberProfiles } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, account_id')
    .in('id', selectedMemberIds);

  const memberMap = new Map((memberProfiles || []).map((m) => [String(m.id), m]));

  const insertRows = [];
  const generatedReceipts = [];

  for (let i = 0; i < depositList.length; i++) {
    const d = depositList[i];
    const deposit_code = await generateDepositCode(i);
    const member = memberMap.get(String(d.member_id));

    insertRows.push({
      deposit_code,
      member_id: d.member_id,
      for_month: monthFormatted,
      amount_paid: d.amount_paid || 500,
      deposited_by_name: d.deposited_by_name || null,
      deposit_note: d.deposit_note || null,
      recorded_by_id: editorId,
      recorded_by_name: editorName,
      recorded_by_designation: editorDesignation
    });

    generatedReceipts.push({
      deposit_code,
      for_month,
      amount_paid: d.amount_paid || 500,
      deposit_note: d.deposit_note || null,
      member_name: member?.full_name || 'Member',
      member_account_id: member?.account_id || 'N/A',
      deposited_by_name: d.deposited_by_name || null,
      recorded_by_name: editorName,
      recorded_by_designation: editorDesignation,
    });
  }

  const { error } = await supabaseAdmin.from('deposits').insert(insertRows);
  if (error) return { error: `Bulk Deposit Failed: ${error.message}` };

  revalidatePath('/deposits');
  revalidatePath('/members');

  return { 
    success: `Bulk Deposits Recorded (${insertRows.length} Vouchers Generated)!`,
    receipts: generatedReceipts 
  };
}

// 15. ADVANCE FUTURE-MONTH DEPOSITS
export async function recordAdvanceDeposits(formData: FormData) {
  const member_id = formData.get('member_id') as string;
  const start_month = formData.get('start_month') as string;
  const num_months = Number(formData.get('num_months')) || 1;
  const monthly_amount = Number(formData.get('monthly_amount')) || 500;
  const deposited_by_name = (formData.get('deposited_by_name') as string)?.trim() || null;
  const deposit_note = (formData.get('deposit_note') as string)?.trim() || null;

  if (!member_id || !start_month || num_months <= 0) return { error: 'Invalid parameters.' };

  const { isAdmin } = await getCurrentUserRole();
  if (!isAdmin) return { error: 'Unauthorized.' };

  const [yearStr, monthStr] = start_month.split('-');
  let currentYear = parseInt(yearStr, 10);
  let currentMonth = parseInt(monthStr, 10);
  const targetMonths: string[] = [];

  for (let i = 0; i < num_months; i++) {
    targetMonths.push(`${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`);
    currentMonth++;
    if (currentMonth > 12) { currentMonth = 1; currentYear++; }
  }

  const { editorId, editorName, editorDesignation } = await getActiveEditorDetails();

  const insertRows = [];
  for (let i = 0; i < targetMonths.length; i++) {
    const m = targetMonths[i];
    const deposit_code = await generateDepositCode(i);
    insertRows.push({
      deposit_code,
      member_id,
      for_month: m,
      amount_paid: monthly_amount,
      deposited_by_name,
      deposit_note,
      recorded_by_id: editorId,
      recorded_by_name: editorName,
      recorded_by_designation: editorDesignation
    });
  }

  const { error } = await supabaseAdmin.from('deposits').insert(insertRows);
  if (error) return { error: `Advance Payment Failed: ${error.message}` };

  revalidatePath('/deposits');
  revalidatePath('/members');
  return { success: `Advance Payment Recorded!` };
}

// 16. Issue Loan
export async function issueLoan(formData: FormData) {
  try {
    const { isAdmin } = await getCurrentUserRole();
    if (!isAdmin) return { error: 'Unauthorized: Admins only.' };

    const { editorId, editorName, editorDesignation } = await getActiveEditorDetails();

    const borrower_id = formData.get('borrower_id') as string;
    const guarantor_id = (formData.get('guarantor_id') as string) || null;
    const principal_amount = Number(formData.get('principal_amount'));
    const current_rate = Number(formData.get('current_rate'));
    const tenure_months = Number(formData.get('tenure_months'));
    const issue_date = formData.get('issue_date') as string;
    const applicationFile = formData.get('loan_application_file') as File | null;

    if (!borrower_id || !principal_amount || !current_rate || !tenure_months || !issue_date) {
      return { error: 'Please fill in all required fields.' };
    }

    if (!applicationFile || applicationFile.size === 0) {
      return { error: 'Loan application scanned copy (PDF) is required.' };
    }

    if (applicationFile.type !== 'application/pdf') {
      return { error: 'File must be in PDF format.' };
    }

    if (applicationFile.size > 500 * 1024) {
      return { error: 'PDF file size exceeds 500 KB limit.' };
    }

    const { data: borrower } = await supabaseAdmin
      .from('profiles')
      .select('full_name, account_id, user_type')
      .eq('id', borrower_id)
      .single();

    if (!borrower) return { error: 'Selected borrower profile not found.' };

    if (borrower.user_type === 'NON_MEMBER' && !guarantor_id) {
      return { error: 'External borrowers require a valid member guarantor.' };
    }

    const { data: existingLoans } = await supabaseAdmin
      .from('loans')
      .select('id, loan_code, principal_amount')
      .eq('borrower_id', borrower_id)
      .eq('status', 'ACTIVE');

    if (existingLoans && existingLoans.length > 0) {
      for (const exLoan of existingLoans) {
        const { data: exPayments } = await supabaseAdmin
          .from('loan_payments')
          .select('principal_paid')
          .eq('loan_id', exLoan.id);

        const totalRepaid = (exPayments || []).reduce((sum, p) => sum + Number(p.principal_paid || 0), 0);
        const remainingBal = Math.max(0, Number(exLoan.principal_amount || 0) - totalRepaid);

        if (remainingBal > 0) {
          return { 
            error: `Loan Rejected: "${borrower?.full_name}" already has an active loan (${exLoan.loan_code}) with an outstanding balance of NPR ${remainingBal.toLocaleString('en-IN')}. Backlog must be fully cleared before issuing a new loan.` 
          };
        }
      }
    }

    const loan_code = await generateLoanCode();
    const sanitizedBorrowerName = borrower.full_name.replace(/[^a-zA-Z0-9]/g, '-');
    const memberAccId = borrower.account_id || 'EXT';
    const storageFileName = `${loan_code}_${memberAccId}_${sanitizedBorrowerName}.pdf`;

    const fileBuffer = await applicationFile.arrayBuffer();
    const { error: uploadError } = await supabaseAdmin.storage
      .from('loan_documents')
      .upload(storageFileName, fileBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) return { error: `Failed to upload PDF: ${uploadError.message}` };

    const R = current_rate / 12 / 100;
    const N = tenure_months;
    const monthly_emi = R === 0 ? Math.round(principal_amount / N) : Math.round((principal_amount * R * Math.pow(1 + R, N)) / (Math.pow(1 + R, N) - 1));

    const { data: loan, error: insertError } = await supabaseAdmin.from('loans').insert([
      {
        loan_code,
        borrower_id,
        guarantor_id: borrower.user_type === 'NON_MEMBER' ? guarantor_id : null,
        principal_amount,
        current_rate,
        tenure_months,
        monthly_emi,
        issue_date,
        status: 'ACTIVE',
        application_doc_path: storageFileName,
        approved_by_id: editorId,
        approved_by_name: editorName,
        approved_by_designation: editorDesignation,
      },
    ]).select().single();

    if (insertError) return { error: insertError.message };

    await supabaseAdmin.from('rate_history').insert([{
      loan_id: loan.id,
      interest_rate: current_rate,
      effective_date: issue_date
    }]);

    revalidatePath('/loans');
    revalidatePath('/members');
    revalidatePath('/admin/user-lookup');
    revalidatePath('/');
    return { success: `Loan ${loan_code} disbursed and application PDF archived successfully! Monthly EMI: NPR ${monthly_emi.toLocaleString('en-IN')}` };
  } catch (err: any) {
    return { error: err.message || 'An unexpected error occurred.' };
  }
}

// 17. Record Loan Repayment Action
export async function recordLoanRepayment(formData: FormData) {
  const loan_id = Number(formData.get('loan_id'));
  const principal_paid = Number(formData.get('principal_paid')) || 0;
  const interest_paid = Number(formData.get('interest_paid')) || 0;
  const payment_date = formData.get('payment_date') as string;

  if (!loan_id || !payment_date) return { error: 'Loan and date required.' };
  if (principal_paid <= 0 && interest_paid <= 0) return { error: 'Invalid amounts.' };

  const { isAdmin } = await getCurrentUserRole();
  if (!isAdmin) return { error: 'Unauthorized.' };

  const { editorId, editorName, editorDesignation, auditUser } = await getActiveEditorDetails();

  const payment_code = await generatePaymentCode();

  const { data: newPayment, error } = await supabaseAdmin
    .from('loan_payments')
    .insert([{
      loan_id,
      payment_code,
      principal_paid,
      interest_paid,
      payment_date,
      recorded_by_id: editorId,
      recorded_by_name: editorName,
      recorded_by_designation: editorDesignation,
      recorded_by_email: auditUser || null,
    }])
    .select()
    .single();

  if (error) return { error: error.message };

  const { data: loan } = await supabaseAdmin.from('loans').select('loan_code, principal_amount, current_rate, borrower_id').eq('id', loan_id).single();
  const { data: borrower } = await supabaseAdmin.from('profiles').select('full_name, account_id').eq('id', loan?.borrower_id).single();

  revalidatePath('/loans');
  revalidatePath('/members');

  return {
    success: `Repayment recorded under Payment ID: ${payment_code}`,
    receipt: {
      id: newPayment.id,
      payment_code,
      payment_date,
      loan_code: loan?.loan_code || `LN-${loan_id}`,
      current_rate: Number(loan?.current_rate || 12.0),
      borrower_name: borrower?.full_name || 'Borrower',
      borrower_account_id: borrower?.account_id || 'N/A',
      principal_paid,
      interest_paid,
      total_paid: principal_paid + interest_paid,
      recorded_by_name: editorName,
      recorded_by_designation: editorDesignation,
    },
  };
}

// 18. Generate Signed URLs for Storage Files
export async function getKycSignedUrl(filePath: string) {
  if (!filePath) return null;

  const { data } = await supabaseAdmin.storage.from('member-docs').createSignedUrl(filePath, 3600);
  if (data?.signedUrl) return data.signedUrl;

  const { data: fbData } = await supabaseAdmin.storage.from('kyc_documents').createSignedUrl(filePath, 3600);
  return fbData?.signedUrl || null;
}

export async function getPhotoSignedUrl(filePath: string) {
  if (!filePath) return null;

  const { data } = await supabaseAdmin.storage.from('member-docs').createSignedUrl(filePath, 3600);
  if (data?.signedUrl) return data.signedUrl;

  const { data: fbData } = await supabaseAdmin.storage.from('kyc_documents').createSignedUrl(filePath, 3600);
  return fbData?.signedUrl || null;
}

export async function getLoanDocSignedUrl(filePath: string) {
  if (!filePath) return null;
  const { data } = await supabaseAdmin.storage.from('loan_documents').createSignedUrl(filePath, 3600);
  return data?.signedUrl || null;
}

// 19. Record Bank Interest Credit
export async function recordBankInterest(formData: FormData) {
  try {
    const amount = Number(formData.get('amount'));
    const credit_date = formData.get('credit_date') as string;
    const notes = (formData.get('notes') as string)?.trim() || null;

    if (!amount || amount <= 0 || !credit_date) {
      return { error: 'Valid positive amount and credit date are required.' };
    }

    const { isAdmin } = await getCurrentUserRole();
    if (!isAdmin) return { error: 'Unauthorized: Admins only.' };

    const { editorId, editorName, editorDesignation, auditUser } = await getActiveEditorDetails();

    const { data: record, error } = await supabaseAdmin
      .from('bank_interest')
      .insert([{
        amount,
        credit_date,
        notes,
        recorded_by_id: editorId,
        recorded_by_name: editorName,
        recorded_by_designation: editorDesignation
      }])
      .select()
      .single();

    if (error) {
      console.error('Supabase Bank Interest Insert Error:', error);
      return { error: `Database Error: ${error.message}` };
    }

    await supabaseAdmin.from('audit_logs').insert([{
      entity_type: 'BANK_INTEREST',
      entity_id: String(record.id),
      action: 'BANK_INTEREST_RECORDED',
      new_value: { amount, credit_date, notes, recorded_by: `${editorName} (${editorDesignation})` },
      reason: notes || 'Bank Interest Credited',
      changed_by_email: auditUser
    }]);

    revalidatePath('/treasury');
    revalidatePath('/');
    return { success: `Bank interest credit of NPR ${amount.toLocaleString('en-IN')} recorded successfully!` };
  } catch (err: any) {
    console.error('Record Bank Interest Exception:', err);
    return { error: err.message || 'Failed to record bank interest.' };
  }
}

// 19b. UPDATE BANK INTEREST RECORD
export async function updateBankInterest(formData: FormData) {
  try {
    const interest_id = Number(formData.get('interest_id'));
    const amount = Number(formData.get('amount'));
    const credit_date = formData.get('credit_date') as string;
    const notes = (formData.get('notes') as string)?.trim() || null;

    if (!interest_id || !amount || amount <= 0 || !credit_date) {
      return { error: 'ID, valid positive amount, and credit date are required.' };
    }

    const { isAdmin } = await getCurrentUserRole();
    if (!isAdmin) return { error: 'Unauthorized: Admins only.' };

    const { editorName, editorDesignation, auditUser } = await getActiveEditorDetails();

    const { data: oldRecord } = await supabaseAdmin.from('bank_interest').select('*').eq('id', interest_id).single();
    if (!oldRecord) return { error: 'Record not found.' };

    const { error } = await supabaseAdmin.from('bank_interest').update({
      amount, credit_date, notes
    }).eq('id', interest_id);

    if (error) return { error: error.message };

    await supabaseAdmin.from('audit_logs').insert([{
      entity_type: 'BANK_INTEREST',
      entity_id: String(interest_id),
      action: 'BANK_INTEREST_EDITED',
      old_value: { amount: oldRecord.amount, credit_date: oldRecord.credit_date, notes: oldRecord.notes },
      new_value: { amount, credit_date, notes, last_changed_by: `${editorName} (${editorDesignation})` },
      reason: `Bank interest entry modified by ${editorName} (${editorDesignation})`,
      changed_by_email: auditUser
    }]);

    revalidatePath('/treasury');
    revalidatePath('/');
    return { success: 'Bank interest record updated successfully!' };
  } catch (err: any) {
    return { error: err.message || 'Failed to update record.' };
  }
}

// 20. Record Property / Treasury Asset
export async function recordAsset(formData: FormData) {
  try {
    const asset_name = (formData.get('asset_name') as string)?.trim();
    const asset_type = (formData.get('asset_type') as string)?.toUpperCase() || 'LAND';
    const purchase_price = Number(formData.get('purchase_price')) || 0;
    
    const rawCurrentVal = formData.get('current_value');
    const current_value = rawCurrentVal && Number(rawCurrentVal) > 0 
      ? Number(rawCurrentVal) 
      : purchase_price;

    const purchase_date = formData.get('purchase_date') as string;
    const notes = (formData.get('notes') as string)?.trim() || null;

    if (!asset_name || purchase_price <= 0 || !purchase_date) {
      return { error: 'Asset name, valid purchase price, and purchase date are required.' };
    }

    const { isAdmin } = await getCurrentUserRole();
    if (!isAdmin) return { error: 'Unauthorized: Admins only.' };

    const { editorId, editorName, editorDesignation, auditUser } = await getActiveEditorDetails();

    const { data: asset, error } = await supabaseAdmin
      .from('assets')
      .insert([{
        asset_name,
        asset_type,
        purchase_price,
        current_value,
        purchase_date,
        notes,
        recorded_by_id: editorId,
        recorded_by_name: editorName,
        recorded_by_designation: editorDesignation
      }])
      .select()
      .single();

    if (error) {
      console.error('Supabase Asset Insert Error:', error);
      return { error: `Database Error: ${error.message}` };
    }

    await supabaseAdmin.from('audit_logs').insert([{
      entity_type: 'ASSET',
      entity_id: String(asset.id),
      action: 'ASSET_RECORDED',
      new_value: { asset_name, asset_type, purchase_price, current_value, purchase_date, recorded_by: `${editorName} (${editorDesignation})` },
      reason: notes || 'New Property Asset Registered',
      changed_by_email: auditUser
    }]);

    revalidatePath('/treasury');
    revalidatePath('/');
    return { success: `Property asset "${asset_name}" registered successfully with valuation NPR ${current_value.toLocaleString('en-IN')}!` };
  } catch (err: any) {
    console.error('Record Asset Exception:', err);
    return { error: err.message || 'Failed to record asset.' };
  }
}

// 20b. UPDATE PROPERTY ASSET DETAILS
export async function updateAsset(formData: FormData) {
  try {
    const asset_id = Number(formData.get('asset_id'));
    const asset_name = (formData.get('asset_name') as string)?.trim();
    const asset_type = formData.get('asset_type') as string;
    const purchase_price = Number(formData.get('purchase_price'));
    const purchase_date = formData.get('purchase_date') as string;
    const notes = (formData.get('notes') as string)?.trim() || null;

    if (!asset_id || !asset_name || purchase_price <= 0 || !purchase_date) {
      return { error: 'Asset ID, name, valid purchase price, and date are required.' };
    }

    const { isAdmin } = await getCurrentUserRole();
    if (!isAdmin) return { error: 'Unauthorized: Admins only.' };

    const { editorName, editorDesignation, auditUser } = await getActiveEditorDetails();

    const { data: oldAsset } = await supabaseAdmin.from('assets').select('*').eq('id', asset_id).single();
    if (!oldAsset) return { error: 'Asset not found.' };

    const { error } = await supabaseAdmin.from('assets').update({
      asset_name, asset_type, purchase_price, purchase_date, notes, updated_at: new Date().toISOString()
    }).eq('id', asset_id);

    if (error) return { error: error.message };

    await supabaseAdmin.from('audit_logs').insert([{
      entity_type: 'ASSET',
      entity_id: String(asset_id),
      action: 'ASSET_EDITED',
      old_value: { asset_name: oldAsset.asset_name, asset_type: oldAsset.asset_type, purchase_price: oldAsset.purchase_price, purchase_date: oldAsset.purchase_date, notes: oldAsset.notes },
      new_value: { asset_name, asset_type, purchase_price, purchase_date, notes, last_changed_by: `${editorName} (${editorDesignation})` },
      reason: `Asset details modified by ${editorName} (${editorDesignation})`,
      changed_by_email: auditUser
    }]);

    revalidatePath('/treasury');
    revalidatePath('/');
    return { success: 'Asset details updated successfully!' };
  } catch (err: any) {
    return { error: err.message || 'Failed to update asset.' };
  }
}

// 21a. Record Committee Expense
export async function recordExpense(formData: FormData) {
  try {
    const title = (formData.get('title') as string)?.trim();
    const category = formData.get('category') as string;
    const amount = Number(formData.get('amount'));
    const expense_date = formData.get('expense_date') as string;
    const notes = (formData.get('notes') as string)?.trim() || null;

    if (!title || !amount || !expense_date) {
      return { error: 'Title, amount, and expense date are required.' };
    }

    const { isAdmin } = await getCurrentUserRole();
    if (!isAdmin) return { error: 'Unauthorized: Admins only.' };

    const { editorId, editorName, editorDesignation, auditUser } = await getActiveEditorDetails();

    const expense_code = await generateExpenseCode();

    const { data: expense, error } = await supabaseAdmin.from('expenses').insert([{
      expense_code,
      title,
      category,
      amount,
      expense_date,
      notes,
      recorded_by_id: editorId,
      recorded_by_name: editorName,
      recorded_by_designation: editorDesignation,
    }]).select().single();

    if (error) return { error: error.message };

    await supabaseAdmin.from('audit_logs').insert([{
      entity_type: 'EXPENSE',
      entity_id: String(expense.id),
      action: 'EXPENSE_RECORDED',
      new_value: { 
        expense_code, 
        title, 
        amount, 
        category, 
        expense_date,
        recorded_by: `${editorName} (${editorDesignation})`
      },
      reason: notes || 'Official Committee Expense Logged',
      changed_by_email: auditUser
    }]);

    revalidatePath('/expenses');
    revalidatePath('/treasury');
    revalidatePath('/');

    return { 
      success: `Expense recorded successfully! Voucher ID: ${expense_code}`,
      expense_code,
      recorded_by_name: editorName,
      recorded_by_designation: editorDesignation,
    };
  } catch (err: any) {
    return { error: err.message || 'Failed to record expense.' };
  }
}

// 21b. UPDATE EXPENSE
export async function updateExpense(formData: FormData) {
  try {
    const expense_id = Number(formData.get('expense_id'));
    const title = (formData.get('title') as string)?.trim();
    const category = formData.get('category') as string;
    const amount = Number(formData.get('amount'));
    const expense_date = formData.get('expense_date') as string;
    const notes = (formData.get('notes') as string)?.trim() || null;

    if (!expense_id || !title || !amount || !expense_date) {
      return { error: 'Expense ID, title, amount, and expense date are required.' };
    }

    const { isAdmin } = await getCurrentUserRole();
    if (!isAdmin) return { error: 'Unauthorized: Admins only.' };

    const { editorName, editorDesignation, auditUser } = await getActiveEditorDetails();

    const { data: oldExpense } = await supabaseAdmin
      .from('expenses')
      .select('*')
      .eq('id', expense_id)
      .single();

    if (!oldExpense) return { error: 'Expense record not found.' };

    const { error } = await supabaseAdmin
      .from('expenses')
      .update({
        title,
        category,
        amount,
        expense_date,
        notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', expense_id);

    if (error) return { error: error.message };

    await supabaseAdmin.from('audit_logs').insert([{
      entity_type: 'EXPENSE',
      entity_id: String(expense_id),
      action: 'EXPENSE_EDITED',
      old_value: {
        expense_code: oldExpense.expense_code,
        title: oldExpense.title,
        amount: oldExpense.amount,
        category: oldExpense.category,
        expense_date: oldExpense.expense_date,
        notes: oldExpense.notes,
        original_recorded_by: `${oldExpense.recorded_by_name || 'Admin'} (${oldExpense.recorded_by_designation || 'Officer'})`,
      },
      new_value: { 
        title, 
        amount, 
        category, 
        expense_date, 
        notes,
        last_changed_by: `${editorName} (${editorDesignation})`,
      },
      reason: `Expense entry modified by ${editorName} (${editorDesignation})`,
      changed_by_email: auditUser,
    }]);

    revalidatePath('/expenses');
    revalidatePath('/treasury');
    revalidatePath('/');

    return { success: `Expense voucher (${oldExpense.expense_code || expense_id}) updated successfully!` };
  } catch (err: any) {
    return { error: err.message || 'Failed to update expense.' };
  }
}

// 22. UPDATE ASSET VALUATION
export async function updateAssetValuation(formData: FormData) {
  try {
    const assetId = Number(formData.get('asset_id'));
    const new_value = Number(formData.get('current_value'));
    const reason = (formData.get('reason') as string)?.trim();

    if (!assetId || !new_value || new_value < 0 || !reason) {
      return { error: 'Asset ID, new valuation, and audit reason are required.' };
    }

    const { isAdmin } = await getCurrentUserRole();
    if (!isAdmin) return { error: 'Unauthorized: Admins only.' };

    const { editorName, editorDesignation, auditUser } = await getActiveEditorDetails();

    const { data: oldAsset } = await supabaseAdmin.from('assets').select('*').eq('id', assetId).single();
    if (!oldAsset) return { error: 'Property asset record not found.' };

    const { error } = await supabaseAdmin.from('assets').update({
      current_value: new_value,
      updated_at: new Date().toISOString()
    }).eq('id', assetId);

    if (error) return { error: error.message };

    await supabaseAdmin.from('audit_logs').insert([{
      entity_type: 'ASSET',
      entity_id: String(assetId),
      action: 'VALUATION_UPDATE',
      old_value: { asset_name: oldAsset.asset_name, valuation: oldAsset.current_value },
      new_value: { 
        asset_name: oldAsset.asset_name, 
        valuation: new_value, 
        last_changed_by: `${editorName} (${editorDesignation})` 
      },
      reason,
      changed_by_email: auditUser
    }]);

    revalidatePath('/treasury');
    revalidatePath('/');
    return { success: `Valuation for "${oldAsset.asset_name}" updated to NPR ${new_value.toLocaleString('en-IN')}!` };
  } catch (err: any) {
    return { error: err.message || 'Failed to update asset valuation.' };
  }
}

// 23. UPDATE DEPOSIT RECORD
export async function updateDeposit(formData: FormData) {
  try {
    const deposit_id = formData.get('deposit_id') as string;
    const for_month = formData.get('for_month') as string;
    const amount_paid = Number(formData.get('amount_paid'));
    const deposited_by_name = (formData.get('deposited_by_name') as string)?.trim() || null;
    const deposit_note = (formData.get('deposit_note') as string)?.trim() || null;
    const fine_amount = Number(formData.get('fine_amount')) || 0;
    const fine_discount_amount = Number(formData.get('fine_discount_amount')) || 0;
    const fine_waived = formData.get('fine_waived') === 'true';
    const fine_override_reason = (formData.get('fine_override_reason') as string)?.trim() || null;

    if (!deposit_id || !for_month || !amount_paid) {
      return { error: 'Deposit ID, month, and amount are required.' };
    }

    const { isAdmin } = await getCurrentUserRole();
    if (!isAdmin) return { error: 'Unauthorized: Committee Admins only.' };

    const { editorName, editorDesignation, auditUser } = await getActiveEditorDetails();

    const formattedMonth = for_month.length === 7 ? `${for_month}-01` : for_month;

    const { data: oldDeposit } = await supabaseAdmin
      .from('deposits')
      .select('*')
      .eq('id', deposit_id)
      .single();

    if (!oldDeposit) return { error: 'Deposit record not found.' };

    const updateFields: any = {
      for_month: formattedMonth,
      amount_paid,
      deposited_by_name,
      deposit_note,
      fine_amount,
      fine_discount_amount,
      fine_waived,
      fine_override_reason,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin
      .from('deposits')
      .update(updateFields)
      .eq('id', deposit_id);

    if (error) return { error: error.message };

    await supabaseAdmin.from('audit_logs').insert([{
      entity_type: 'SAVINGS_DEPOSIT',
      entity_id: String(deposit_id),
      action: 'DEPOSIT_RECORD_EDITED',
      old_value: {
        deposit_code: oldDeposit.deposit_code,
        for_month: oldDeposit.for_month,
        amount_paid: oldDeposit.amount_paid,
        fine_amount: oldDeposit.fine_amount,
        member_id: oldDeposit.member_id,
        original_recorded_by: `${oldDeposit.recorded_by_name || 'Admin'} (${oldDeposit.recorded_by_designation || 'Officer'})`,
      },
      new_value: { 
        for_month: formattedMonth, 
        amount_paid,
        fine_amount,
        fine_discount_amount,
        fine_waived,
        deposit_note,
        last_changed_by: `${editorName} (${editorDesignation})`
      },
      reason: `Savings deposit ledger entry corrected by ${editorName} (${editorDesignation})`,
      changed_by_email: auditUser,
    }]);

    revalidatePath('/deposits');
    revalidatePath('/members');
    revalidatePath('/admin/user-lookup');
    revalidatePath('/');

    return { success: `Deposit voucher (${oldDeposit.deposit_code || deposit_id}) updated successfully!` };
  } catch (err: any) {
    return { error: err.message || 'Failed to update deposit record.' };
  }
}

// 24. Distribute Dividends
export async function distributeDividends(formData: FormData) {
  try {
    const title = formData.get('title') as string;
    const total_profit_pool = Number(formData.get('total_profit_pool'));
    const distributed_at = formData.get('distributed_at') as string;
    const cutoff_month = formData.get('cutoff_month') as string;

    if (!title || !total_profit_pool || total_profit_pool <= 0 || !cutoff_month) {
      return { error: 'Please provide title, profit pool amount, and cutoff month.' };
    }

    const { isAdmin } = await getCurrentUserRole();
    if (!isAdmin) return { error: 'Unauthorized: Committee Admins only.' };

    const { editorId, editorName, editorDesignation, auditUser } = await getActiveEditorDetails();

    const { data: profiles, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, account_id, user_type, role, status')
      .or('status.eq.ACTIVE,status.is.null');

    if (profileErr) throw profileErr;

    const internalMembers = (profiles || []).filter(
      (p) => p.user_type === 'MEMBER' && p.role !== 'ADMIN' && p.role !== 'SUPER_ADMIN' && p.role !== 'SUPERADMIN'
    );

    if (internalMembers.length === 0) {
      return { error: 'No active internal group members found for dividend distribution.' };
    }

    const cutoffDateMax = `${cutoff_month}-31`;

    const { data: deposits, error: depErr } = await supabaseAdmin
      .from('deposits')
      .select('member_id, amount_paid')
      .lte('for_month', cutoffDateMax);

    if (depErr) throw depErr;

    const totalGroupSavings = (deposits || []).reduce((sum, d) => sum + Number(d.amount_paid || 0), 0);

    const savingsByMember: Record<string, number> = {};
    (deposits || []).forEach((d) => {
      const mId = String(d.member_id);
      savingsByMember[mId] = (savingsByMember[mId] || 0) + Number(d.amount_paid || 0);
    });

    let totalEligibleSavings = 0;
    const eligibleMembers = internalMembers.map((m) => {
      const savings = savingsByMember[m.id] || 0;
      totalEligibleSavings += savings;
      return { ...m, savings };
    });

    if (totalEligibleSavings <= 0) {
      return { error: 'Total accumulated savings for internal members up to this cutoff month is zero.' };
    }

    const distCode = await generateDividendCode();

    let actualAllocatedTotal = 0;
    
    const payoutRecords = eligibleMembers.map((m) => {
      const customAmountStr = formData.get(`dividend_amount_${m.id}`);
      const autoAmount = (m.savings / totalEligibleSavings) * total_profit_pool;
      
      const finalAmount = customAmountStr !== null && customAmountStr !== '' 
        ? Number(customAmountStr) 
        : autoAmount;

      const roundedFinalAmount = Math.round(finalAmount * 100) / 100;
      actualAllocatedTotal += roundedFinalAmount;

      const method = (formData.get(`payment_method_${m.id}`) as string) || 'CASH';
      const note = (formData.get(`deposit_note_${m.id}`) as string) || '';

      return {
        member_id: m.id,
        member_savings_snapshot: m.savings,
        share_percentage: Number(((m.savings / totalEligibleSavings) * 100).toFixed(2)),
        dividend_amount: roundedFinalAmount,
        payment_method: method,
        deposit_note: note,
        payout_status: 'PAID',
        recorded_by_id: editorId,
        recorded_by_name: editorName,
        recorded_by_designation: editorDesignation
      };
    });

    const roundedAllocated = Math.round(actualAllocatedTotal * 100) / 100;
    const roundedPool = Math.round(total_profit_pool * 100) / 100;
    
    if (Math.abs(roundedAllocated - roundedPool) > 0.05) {
      return { 
        error: `Ledger Mismatch! The sum of all individual payouts (NPR ${roundedAllocated}) does not equal the declared Total Profit Pool (NPR ${roundedPool}). Please adjust individual amounts to balance exactly.` 
      };
    }

    const { data: distEvent, error: distErr } = await supabaseAdmin
      .from('dividend_distributions')
      .insert({
        distribution_code: distCode,
        title,
        total_profit_pool: roundedPool,
        total_group_savings: totalGroupSavings,
        total_eligible_savings: totalEligibleSavings,
        eligible_member_count: eligibleMembers.length,
        distributed_at,
        cutoff_month,
        recorded_by_id: editorId,
        recorded_by_name: editorName,
        recorded_by_designation: editorDesignation
      })
      .select('id')
      .single();

    if (distErr) throw distErr;

    const finalPayouts = payoutRecords.map(p => ({ ...p, distribution_id: distEvent.id }));

    const { error: payoutErr } = await supabaseAdmin.from('dividend_payouts').insert(finalPayouts);
    if (payoutErr) throw payoutErr;

    await supabaseAdmin.from('audit_logs').insert([{
      entity_type: 'DIVIDEND_DISTRIBUTION',
      entity_id: String(distEvent.id),
      action: 'DIVIDEND_DISTRIBUTED',
      new_value: {
        distribution_code: distCode,
        title,
        cutoff_month,
        total_profit_pool: roundedPool,
        total_group_savings: totalGroupSavings,
        total_eligible_savings: totalEligibleSavings,
        recorded_by: `${editorName} (${editorDesignation})`
      },
      reason: `Distributed NPR ${roundedPool.toLocaleString('en-IN')} (Cutoff: ${cutoff_month})`,
      changed_by_email: auditUser
    }]);

    revalidatePath('/treasury');
    revalidatePath('/dashboard');
    return { 
      success: `Successfully distributed NPR ${roundedPool.toLocaleString('en-IN')}! Voucher: ${distCode}`,
      distCode
    };
  } catch (err: any) {
    return { error: err.message || 'Failed to execute dividend distribution.' };
  }
}

// 25. UPDATE LOAN
export async function updateLoan(formData: FormData) {
  try {
    const loan_id = Number(formData.get('loan_id'));
    const principal_amount = Number(formData.get('principal_amount'));
    const current_rate = Number(formData.get('current_rate'));
    const tenure_months = Number(formData.get('tenure_months'));
    const issue_date = formData.get('issue_date') as string;
    const status = formData.get('status') as string;

    if (!loan_id || !principal_amount || !issue_date) {
      return { error: 'Loan ID, principal amount, and issue date are required.' };
    }

    const { isSuperAdmin } = await getCurrentUserRole();
    if (!isSuperAdmin) return { error: 'Unauthorized: Only Superadmins can modify loan details.' };

    const { editorName, editorDesignation, auditUser } = await getActiveEditorDetails();

    const { data: oldLoan } = await supabaseAdmin
      .from('loans')
      .select('*')
      .eq('id', loan_id)
      .single();

    if (!oldLoan) return { error: 'Loan record not found.' };

    const monthlyRate = (current_rate || 12.0) / 12 / 100;
    let monthly_emi = 0;
    if (monthlyRate > 0) {
      monthly_emi = (principal_amount * monthlyRate * Math.pow(1 + monthlyRate, tenure_months)) /
                    (Math.pow(1 + monthlyRate, tenure_months) - 1);
    } else {
      monthly_emi = principal_amount / tenure_months;
    }

    const { error } = await supabaseAdmin
      .from('loans')
      .update({
        principal_amount,
        current_rate,
        tenure_months,
        monthly_emi: Math.round(monthly_emi),
        issue_date,
        status: status || 'ACTIVE',
        updated_at: new Date().toISOString(),
      })
      .eq('id', loan_id);

    if (error) return { error: error.message };

    await supabaseAdmin.from('audit_logs').insert([{
      entity_type: 'LOAN_RECORD',
      entity_id: String(loan_id),
      action: 'LOAN_RECORD_EDITED',
      old_value: {
        loan_code: oldLoan.loan_code,
        principal_amount: oldLoan.principal_amount,
        current_rate: oldLoan.current_rate,
        tenure_months: oldLoan.tenure_months,
        status: oldLoan.status,
      },
      new_value: { 
        principal_amount, 
        current_rate, 
        tenure_months, 
        status,
        last_changed_by: `${editorName} (${editorDesignation})`
      },
      reason: `Disbursed loan record modified by ${editorName} (${editorDesignation})`,
      changed_by_email: auditUser,
    }]);

    revalidatePath('/loans');
    revalidatePath('/members');
    revalidatePath('/admin/user-lookup');
    revalidatePath('/');

    return { success: `Loan record (${oldLoan.loan_code || loan_id}) updated successfully!` };
  } catch (err: any) {
    return { error: err.message || 'Failed to update loan record.' };
  }
}

// 26. UPDATE LOAN REPAYMENT
export async function updateLoanPayment(formData: FormData) {
  try {
    const payment_id = Number(formData.get('payment_id'));
    const principal_paid = Number(formData.get('principal_paid')) || 0;
    const interest_paid = Number(formData.get('interest_paid')) || 0;
    const payment_date = formData.get('payment_date') as string;

    if (!payment_id || !payment_date) return { error: 'Payment ID and date are required.' };
    if (principal_paid <= 0 && interest_paid <= 0) return { error: 'Please enter valid repayment amounts.' };

    const { isSuperAdmin } = await getCurrentUserRole();
    if (!isSuperAdmin) return { error: 'Unauthorized: Superadmins only.' };

    const { editorName, editorDesignation, auditUser } = await getActiveEditorDetails();

    const { data: oldPayment } = await supabaseAdmin
      .from('loan_payments')
      .select('*')
      .eq('id', payment_id)
      .single();

    if (!oldPayment) return { error: 'Repayment record not found.' };

    const { error } = await supabaseAdmin
      .from('loan_payments')
      .update({
        principal_paid,
        interest_paid,
        payment_date,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment_id);

    if (error) return { error: error.message };

    await supabaseAdmin.from('audit_logs').insert([{
      entity_type: 'LOAN_REPAYMENT',
      entity_id: String(payment_id),
      action: 'REPAYMENT_LOG_EDITED',
      old_value: {
        payment_code: oldPayment.payment_code,
        loan_id: oldPayment.loan_id,
        principal_paid: oldPayment.principal_paid,
        interest_paid: oldPayment.interest_paid,
        payment_date: oldPayment.payment_date,
        original_recorded_by: `${oldPayment.recorded_by_name || 'Admin'} (${oldPayment.recorded_by_designation || 'Officer'})`,
      },
      new_value: { 
        principal_paid, 
        interest_paid, 
        payment_date,
        last_changed_by: `${editorName} (${editorDesignation})`
      },
      reason: `Repayment ledger entry modified by ${editorName} (${editorDesignation})`,
      changed_by_email: auditUser,
    }]);

    revalidatePath('/loans');
    revalidatePath('/members');
    revalidatePath('/admin/user-lookup');
    revalidatePath('/');

    return { success: `Repayment entry (${oldPayment.payment_code || payment_id}) corrected successfully!` };
  } catch (err: any) {
    return { error: err.message || 'Failed to update repayment record.' };
  }
}

// 27. Fetch Organogram Structure
export async function getOrganogramData() {
  const { data } = await supabaseAdmin
    .from('organogram_positions')
    .select('*, profiles!member_id(id, full_name, account_id, photo_path, phone)')
    .order('tier', { ascending: true })
    .order('display_order', { ascending: true });

  return data || [];
}

// 28. Add a New Organogram Position Slot
export async function addOrganogramPosition(formData: FormData) {
  const title = (formData.get('title') as string)?.trim();
  const tier = Number(formData.get('tier')) || 2;
  const display_order = Number(formData.get('display_order')) || 0;

  if (!title) return { error: 'Position title is required.' };

  const { isAdmin } = await getCurrentUserRole();
  if (!isAdmin) return { error: 'Unauthorized: Admins only.' };

  const { error } = await supabaseAdmin
    .from('organogram_positions')
    .insert([{ title, tier, display_order }]);

  if (error) return { error: error.message };

  revalidatePath('/members');
  return { success: `Organogram slot "${title}" added.` };
}

// 29. Assign or Change Member in an Organogram Slot
export async function assignOrganogramMember(positionId: string, memberId: string | null) {
  const { isAdmin } = await getCurrentUserRole();
  if (!isAdmin) return { error: 'Unauthorized: Admins only.' };

  const { error } = await supabaseAdmin
    .from('organogram_positions')
    .update({ member_id: memberId || null })
    .eq('id', positionId);

  if (error) return { error: error.message };

  revalidatePath('/members');
  return { success: 'Position assignment updated.' };
}

// 30. Delete an Organogram Position Slot
export async function deleteOrganogramPosition(positionId: string) {
  const { isAdmin } = await getCurrentUserRole();
  if (!isAdmin) return { error: 'Unauthorized: Admins only.' };

  const { error } = await supabaseAdmin
    .from('organogram_positions')
    .delete()
    .eq('id', positionId);

  if (error) return { error: error.message };

  revalidatePath('/members');
  return { success: 'Position slot deleted.' };
}

// 31. DELETE BANK INTEREST (Superadmin Only)
export async function deleteBankInterest(formData: FormData) {
  try {
    const id = Number(formData.get('id'));
    if (!id) return { error: 'Record ID is required.' };

    const { isSuperAdmin } = await getCurrentUserRole();
    if (!isSuperAdmin) return { error: 'Unauthorized: Only Superadmins can delete records.' };

    const { editorName, editorDesignation, auditUser } = await getActiveEditorDetails();

    const { data: oldRecord } = await supabaseAdmin.from('bank_interest').select('*').eq('id', id).single();
    if (!oldRecord) return { error: 'Record not found.' };

    const { error } = await supabaseAdmin.from('bank_interest').delete().eq('id', id);
    if (error) return { error: error.message };

    await supabaseAdmin.from('audit_logs').insert([{
      entity_type: 'BANK_INTEREST',
      entity_id: String(id),
      action: 'RECORD_DELETED',
      old_value: oldRecord,
      reason: `Bank interest record deleted by ${editorName} (${editorDesignation})`,
      changed_by_email: auditUser
    }]);

    revalidatePath('/treasury');
    return { success: 'Bank interest record deleted permanently.' };
  } catch (err: any) {
    return { error: err.message || 'Failed to delete record.' };
  }
}

// 32. DELETE PROPERTY ASSET (Superadmin Only)
export async function deleteAsset(formData: FormData) {
  try {
    const id = Number(formData.get('id'));
    if (!id) return { error: 'Asset ID is required.' };

    const { isSuperAdmin } = await getCurrentUserRole();
    if (!isSuperAdmin) return { error: 'Unauthorized: Only Superadmins can delete assets.' };

    const { editorName, editorDesignation, auditUser } = await getActiveEditorDetails();

    const { data: oldAsset } = await supabaseAdmin.from('assets').select('*').eq('id', id).single();
    if (!oldAsset) return { error: 'Asset not found.' };

    const { error } = await supabaseAdmin.from('assets').delete().eq('id', id);
    if (error) return { error: error.message };

    await supabaseAdmin.from('audit_logs').insert([{
      entity_type: 'ASSET',
      entity_id: String(id),
      action: 'ASSET_DELETED',
      old_value: oldAsset,
      reason: `Property Asset deleted by ${editorName} (${editorDesignation})`,
      changed_by_email: auditUser
    }]);

    revalidatePath('/treasury');
    return { success: 'Property asset deleted permanently.' };
  } catch (err: any) {
    return { error: err.message || 'Failed to delete record.' };
  }
}

// 33. DELETE ENTIRE DIVIDEND DISTRIBUTION BATCH (Superadmin Only)
export async function deleteDividendDistribution(formData: FormData) {
  try {
    const id = Number(formData.get('id'));
    if (!id) return { error: 'Distribution ID is required.' };

    const { isSuperAdmin } = await getCurrentUserRole();
    if (!isSuperAdmin) return { error: 'Unauthorized: Only Superadmins can rollback dividend distributions.' };

    const { editorName, editorDesignation, auditUser } = await getActiveEditorDetails();

    const { data: oldDist } = await supabaseAdmin.from('dividend_distributions').select('*').eq('id', id).single();
    if (!oldDist) return { error: 'Dividend distribution event not found.' };

    const { error } = await supabaseAdmin.from('dividend_distributions').delete().eq('id', id);
    if (error) return { error: error.message };

    await supabaseAdmin.from('audit_logs').insert([{
      entity_type: 'DIVIDEND_DISTRIBUTION',
      entity_id: String(id),
      action: 'DISTRIBUTION_BATCH_DELETED',
      old_value: oldDist,
      reason: `Entire Dividend Batch Rollback executed by ${editorName} (${editorDesignation})`,
      changed_by_email: auditUser
    }]);

    revalidatePath('/treasury');
    return { success: 'Dividend distribution and all associated payouts deleted permanently.' };
  } catch (err: any) {
    return { error: err.message || 'Failed to rollback dividend distribution.' };
  }
}

// 34. FINE CALCULATION RULES
// Fetch fine configuration rules
export async function getFineRules() {
  const { data } = await supabaseAdmin
    .from('fine_rules')
    .select('*')
    .order('created_at', { ascending: false });

  return data || [];
}

// Create or update a fine rule (Superadmin / Admin)
export async function createOrUpdateFineRule(formData: FormData) {
  try {
    const rule_id = formData.get('rule_id') ? Number(formData.get('rule_id')) : null;
    const rule_type = (formData.get('rule_type') as string)?.trim(); // 'SAVINGS' | 'LOAN'
    const fine_type = (formData.get('fine_type') as string)?.trim(); // 'PERCENTAGE' | 'FLAT_MONTHLY' | 'FLAT_DAILY'
    const rate_value = Number(formData.get('rate_value'));
    const grace_period_days = Number(formData.get('grace_period_days')) || 0;
    const effective_from_month = (formData.get('effective_from_month') as string)?.trim();
    const notes = (formData.get('notes') as string)?.trim();

    if (!rule_type || !fine_type || rate_value === undefined || isNaN(rate_value) || rate_value < 0 || !effective_from_month) {
      return { error: 'Rule type, fine type, positive rate value, and starting month are required.' };
    }

    if (!notes || notes.length < 5) {
      return { error: 'Please provide an audit note / Assembly resolution reason (min 5 characters).' };
    }

    const { isAdmin } = await getCurrentUserRole();
    if (!isAdmin) return { error: 'Unauthorized: Admins only.' };

    const { editorId, editorName, editorDesignation, auditUser } = await getActiveEditorDetails();

    if (rule_id) {
      // Update existing rule
      const { error } = await supabaseAdmin
        .from('fine_rules')
        .update({
          rule_type,
          fine_type,
          rate_value,
          grace_period_days,
          effective_from_month,
          notes,
        })
        .eq('id', rule_id);

      if (error) return { error: error.message };
    } else {
      // Close active rules of same type
      const [y, m] = effective_from_month.split('-').map(Number);
      let prevY = y;
      let prevM = m - 1;
      if (prevM < 1) { prevM = 12; prevY--; }
      const prevMonthStr = `${prevY}-${prevM.toString().padStart(2, '0')}`;

      await supabaseAdmin
        .from('fine_rules')
        .update({ effective_to_month: prevMonthStr })
        .eq('rule_type', rule_type)
        .is('effective_to_month', null);

      const { error } = await supabaseAdmin
        .from('fine_rules')
        .insert([{
          rule_type,
          fine_type,
          rate_value,
          grace_period_days,
          effective_from_month,
          effective_to_month: null,
          notes,
          recorded_by_id: editorId,
          recorded_by_name: editorName,
          recorded_by_designation: editorDesignation,
          recorded_by_email: auditUser,
        }]);

      if (error) return { error: error.message };
    }

    await supabaseAdmin.from('audit_logs').insert([{
      entity_type: 'FINE_RULE',
      entity_id: String(rule_id || 'NEW'),
      action: rule_id ? 'FINE_RULE_UPDATED' : 'FINE_RULE_CREATED',
      new_value: { rule_type, fine_type, rate_value, grace_period_days, effective_from_month, notes },
      reason: `Fine rule configured: ${rule_type} fine set to ${rate_value} (${fine_type}). Notes: ${notes}`,
      changed_by_email: auditUser,
    }]);

    revalidatePath('/dashboard');
    revalidatePath('/deposits');
    revalidatePath('/loans');
    revalidatePath('/');

    const actionText = rule_id ? 'updated' : 'created';
    return { success: `${rule_type} Fine rule ${actionText} successfully!` };
  } catch (err: any) {
    return { error: err.message || 'Failed to configure fine rule.' };
  }
}

// 35. DELETE SAVINGS DEPOSIT VOUCHER (Superadmin / Admin Only)
export async function deleteDeposit(formData: FormData) {
  try {
    const deposit_id = formData.get('deposit_id') as string;
    const reason = (formData.get('reason') as string)?.trim() || 'Accidental deposit voucher removed by Admin';

    if (!deposit_id) return { error: 'Deposit ID is required.' };

    const { isAdmin } = await getCurrentUserRole();
    if (!isAdmin) return { error: 'Unauthorized: Only Committee Admins can delete deposit slips.' };

    const { editorName, editorDesignation, auditUser } = await getActiveEditorDetails();

    const { data: oldDeposit } = await supabaseAdmin
      .from('deposits')
      .select('*')
      .eq('id', deposit_id)
      .single();

    if (!oldDeposit) return { error: 'Deposit record not found.' };

    const { error } = await supabaseAdmin
      .from('deposits')
      .delete()
      .eq('id', deposit_id);

    if (error) return { error: error.message };

    // Record immutable audit log
    await supabaseAdmin.from('audit_logs').insert([{
      entity_type: 'SAVINGS_DEPOSIT',
      entity_id: String(deposit_id),
      action: 'DEPOSIT_RECORD_DELETED',
      old_value: {
        deposit_code: oldDeposit.deposit_code,
        for_month: oldDeposit.for_month,
        amount_paid: oldDeposit.amount_paid,
        fine_amount: oldDeposit.fine_amount,
        member_id: oldDeposit.member_id,
        deposited_by_name: oldDeposit.deposited_by_name,
        original_recorded_by: `${oldDeposit.recorded_by_name || 'Admin'} (${oldDeposit.recorded_by_designation || 'Officer'})`,
      },
      reason: `Deposit voucher (${oldDeposit.deposit_code || deposit_id}) deleted by ${editorName} (${editorDesignation}): ${reason}`,
      changed_by_email: auditUser,
    }]);

    revalidatePath('/deposits');
    revalidatePath('/members');
    revalidatePath('/admin/user-lookup');
    revalidatePath('/');

    return { success: `Deposit voucher (${oldDeposit.deposit_code || deposit_id}) deleted permanently and audited!` };
  } catch (err: any) {
    return { error: err.message || 'Failed to delete deposit record.' };
  }
}


// 36. DELETE CONTRIBUTION RULE (Superadmin Only)
export async function deleteContributionRule(formData: FormData) {
  try {
    const rule_id = Number(formData.get('rule_id'));
    const reason = (formData.get('reason') as string)?.trim() || 'Accidental rule entry deleted by Superadmin';

    if (!rule_id) return { error: 'Rule ID is required.' };

    const { isSuperAdmin } = await getCurrentUserRole();
    if (!isSuperAdmin) return { error: 'Unauthorized: Only Superadmins can delete contribution rules.' };

    const { editorName, editorDesignation, auditUser } = await getActiveEditorDetails();

    const { data: oldRule } = await supabaseAdmin
      .from('contribution_rules')
      .select('*')
      .eq('id', rule_id)
      .single();

    if (!oldRule) return { error: 'Contribution rule record not found.' };

    const { error } = await supabaseAdmin
      .from('contribution_rules')
      .delete()
      .eq('id', rule_id);

    if (error) return { error: error.message };

    // Record immutable audit log
    await supabaseAdmin.from('audit_logs').insert([{
      entity_type: 'CONTRIBUTION_RULE',
      entity_id: String(rule_id),
      action: 'CONTRIBUTION_RULE_DELETED',
      old_value: {
        effective_from_month: oldRule.effective_from_month,
        effective_to_month: oldRule.effective_to_month,
        monthly_amount: oldRule.monthly_amount,
        notes: oldRule.notes,
        original_author: `${oldRule.recorded_by_name || 'Admin'} (${oldRule.recorded_by_designation || 'Officer'})`,
      },
      reason: `Contribution rule #${rule_id} deleted by ${editorName} (${editorDesignation}): ${reason}`,
      changed_by_email: auditUser,
    }]);

    revalidatePath('/dashboard');
    revalidatePath('/deposits');
    revalidatePath('/treasury');
    revalidatePath('/');

    return { success: `Contribution rule #${rule_id} deleted permanently and audited!` };
  } catch (err: any) {
    return { error: err.message || 'Failed to delete contribution rule.' };
  }
}

// 37. DELETE FINE RULE (Admin / Superadmin)
export async function deleteFineRule(formData: FormData) {
  try {
    const rule_id = Number(formData.get('rule_id'));
    const reason = (formData.get('reason') as string)?.trim() || 'Accidental fine rule deleted by Admin';

    if (!rule_id) return { error: 'Rule ID is required.' };

    const { isAdmin } = await getCurrentUserRole();
    if (!isAdmin) return { error: 'Unauthorized: Only Committee Admins can delete fine rules.' };

    const { editorName, editorDesignation, auditUser } = await getActiveEditorDetails();

    const { data: oldRule } = await supabaseAdmin
      .from('fine_rules')
      .select('*')
      .eq('id', rule_id)
      .single();

    if (!oldRule) return { error: 'Fine rule record not found.' };

    const { error } = await supabaseAdmin
      .from('fine_rules')
      .delete()
      .eq('id', rule_id);

    if (error) return { error: error.message };

    // Record immutable audit log
    await supabaseAdmin.from('audit_logs').insert([{
      entity_type: 'FINE_RULE',
      entity_id: String(rule_id),
      action: 'FINE_RULE_DELETED',
      old_value: {
        rule_type: oldRule.rule_type,
        fine_type: oldRule.fine_type,
        rate_value: oldRule.rate_value,
        grace_period_days: oldRule.grace_period_days,
        effective_from_month: oldRule.effective_from_month,
        notes: oldRule.notes,
        original_author: `${oldRule.recorded_by_name || 'Admin'} (${oldRule.recorded_by_designation || 'Officer'})`,
      },
      reason: `Fine rule #${rule_id} (${oldRule.rule_type}) deleted by ${editorName} (${editorDesignation}): ${reason}`,
      changed_by_email: auditUser,
    }]);

    revalidatePath('/dashboard');
    revalidatePath('/deposits');
    revalidatePath('/loans');
    revalidatePath('/');

    return { success: `${oldRule.rule_type} fine rule #${rule_id} deleted permanently and audited!` };
  } catch (err: any) {
    return { error: err.message || 'Failed to delete fine rule.' };
  }
}

