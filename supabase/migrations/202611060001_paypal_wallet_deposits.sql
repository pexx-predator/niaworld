create unique index if not exists wallet_transactions_paypal_order_uidx
on public.wallet_transactions (provider_reference)
where payment_provider = 'paypal'
  and type = 'deposit'
  and provider_reference is not null;

create or replace function public.complete_paypal_wallet_deposit(
  p_order_id text,
  p_user_id uuid,
  p_capture_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_transaction record;
begin
  if nullif(trim(p_order_id), '') is null
     or nullif(trim(p_capture_id), '') is null
     or p_user_id is null then
    raise exception 'Invalid PayPal deposit confirmation.';
  end if;

  select
    wt.id,
    wt.wallet_id,
    wt.amount,
    wt.currency,
    wt.status,
    wt.metadata
  into v_transaction
  from public.wallet_transactions wt
  join public.wallet_accounts wa
    on wa.id = wt.wallet_id
  where wt.provider_reference = p_order_id
    and wt.payment_provider = 'paypal'
    and wt.type = 'deposit'
    and wt.direction = 'credit'
    and wa.user_id = p_user_id
    and wa.currency = 'USD'
    and wt.currency = 'USD'
  for update of wt;

  if not found then
    raise exception 'Pending PayPal deposit not found for this account.';
  end if;

  if v_transaction.status = 'posted' then
    if v_transaction.metadata ->> 'paypal_capture_id' = p_capture_id then
      return jsonb_build_object(
        'success', true,
        'already_processed', true,
        'transaction_id', v_transaction.id,
        'status', 'posted'
      );
    end if;

    raise exception 'This deposit has already been processed.';
  end if;

  if v_transaction.status <> 'pending' then
    raise exception 'This deposit is not pending.';
  end if;

  update public.wallet_transactions
  set
    status = 'posted',
    posted_at = now(),
    metadata = coalesce(metadata, '{}'::jsonb)
      || jsonb_build_object('paypal_capture_id', p_capture_id)
  where id = v_transaction.id;

  return jsonb_build_object(
    'success', true,
    'already_processed', false,
    'transaction_id', v_transaction.id,
    'status', 'posted'
  );
end;
$$;

revoke all on function public.complete_paypal_wallet_deposit(text, uuid, text)
from public, anon, authenticated;

grant execute on function public.complete_paypal_wallet_deposit(text, uuid, text)
to service_role;
