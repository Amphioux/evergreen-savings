'use server';

import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// Server-side Supabase client for Auth & Cookie Management
async function getSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
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

// 1. User Login Action
export async function loginUser(formData: FormData) {
  const email = (formData.get('email') as string)?.trim();
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Please enter both email and password.' };
  }

  const supabaseServer = await getSupabaseServerClient();

  const { error } = await supabaseServer.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Returns exact error message from Supabase (e.g. "Invalid login credentials" or "Email not confirmed")
    return { error: error.message };
  }

  redirect('/');
}

// 2. User Logout Action
export async function logoutUser() {
  const supabaseServer = await getSupabaseServerClient();
  await supabaseServer.auth.signOut();
  redirect('/login');
}

// 3. Register Member (with login) or External Non-Member Borrower (no login)
export async function registerUserByAdmin(formData: FormData) {
  const full_name = (formData.get('full_name') as string)?.trim();
  const phone = (formData.get('phone') as string)?.trim();
  const email = (formData.get('email') as string)?.trim();
  const password = formData.get('password') as string;
  const user_type = formData.get('user_type') as string;
  const role = (formData.get('role') as string) || 'MEMBER';
  const joined_date = formData.get('joined_date') as string;

  if (!full_name || !joined_date) {
    return { error: 'Full name and joined date are required.' };
  }

  if (user_type === 'MEMBER') {
    if (!email || !password) {
      return { error: 'Email and password are required for members.' };
    }

    if (password.length < 6) {
      return { error: 'Password must be at least 6 characters long.' };
    }

    // Create user in Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role },
    });

    if (authError) {
      return { error: authError.message };
    }

    // Create linked profile
    const { error: profileError } = await supabase.from('profiles').insert([{
      id: authUser.user.id,
      full_name,
      phone: phone || null,
      email,
      user_type: 'MEMBER',
      role,
      joined_date,
    }]);

    if (profileError) {
      return { error: profileError.message };
    }
  } else {
    // Non-member borrower record
    const { error: profileError } = await supabase.from('profiles').insert([{
      full_name,
      phone: phone || null,
      user_type: 'NON_MEMBER',
      role: 'MEMBER',
      joined_date,
    }]);

    if (profileError) {
      return { error: profileError.message };
    }
  }

  revalidatePath('/members');
  revalidatePath('/loans');
  revalidatePath('/');
  return { success: 'Account created successfully!' };
}

// 4. Monthly Savings Deposit
export async function recordDeposit(formData: FormData) {
  const member_id = formData.get('member_id') as string;
  const for_month = formData.get('for_month') as string;
  const amount_paid = Number(formData.get('amount_paid')) || 500;

  if (!member_id || !for_month) return;

  await supabase.from('deposits').insert([{
    member_id,
    for_month: `${for_month}-01`,
    amount_paid
  }]);

  revalidatePath('/members');
  revalidatePath('/');
}

// 5. Issue Loan
export async function issueLoan(formData: FormData) {
  const borrower_id = formData.get('borrower_id') as string;
  const principal_amount = Number(formData.get('principal_amount'));
  const current_rate = Number(formData.get('current_rate')) || 12.0;
  const issue_date = formData.get('issue_date') as string;

  if (!borrower_id || !principal_amount || !issue_date) return;

  const { data: loan, error } = await supabase.from('loans').insert([{
    borrower_id,
    principal_amount,
    current_rate,
    issue_date,
    status: 'ACTIVE'
  }]).select().single();

  if (!error && loan) {
    await supabase.from('rate_history').insert([{
      loan_id: loan.id,
      interest_rate: current_rate,
      effective_date: issue_date
    }]);
  }

  revalidatePath('/loans');
  revalidatePath('/');
}

// 6. Record Loan Repayment
export async function recordLoanRepayment(formData: FormData) {
  const loan_id = Number(formData.get('loan_id'));
  const principal_paid = Number(formData.get('principal_paid')) || 0;
  const interest_paid = Number(formData.get('interest_paid')) || 0;
  const payment_date = formData.get('payment_date') as string;

  if (!loan_id || !payment_date) return;

  await supabase.from('loan_payments').insert([{
    loan_id,
    principal_paid,
    interest_paid,
    payment_date
  }]);

  revalidatePath('/loans');
  revalidatePath('/');
}

// 7. Record Bank Interest Credit
export async function recordBankInterest(formData: FormData) {
  const amount = Number(formData.get('amount'));
  const credit_date = formData.get('credit_date') as string;
  const notes = formData.get('notes') as string;

  if (!amount || !credit_date) return;

  await supabase.from('bank_interest').insert([{
    amount,
    credit_date,
    notes: notes || null
  }]);

  revalidatePath('/treasury');
  revalidatePath('/');
}

// 8. Record Property & Asset Purchases
export async function recordAsset(formData: FormData) {
  const asset_name = formData.get('asset_name') as string;
  const asset_type = formData.get('asset_type') as string;
  const purchase_price = Number(formData.get('purchase_price'));
  const current_value = Number(formData.get('current_value')) || purchase_price;
  const purchase_date = formData.get('purchase_date') as string;
  const notes = formData.get('notes') as string;

  if (!asset_name || !purchase_price || !purchase_date) return;

  await supabase.from('assets').insert([{
    asset_name,
    asset_type,
    purchase_price,
    current_value,
    purchase_date,
    notes: notes || null
  }]);

  revalidatePath('/treasury');
  revalidatePath('/');
}