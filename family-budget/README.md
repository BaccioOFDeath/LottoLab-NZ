# Our Budget · Family budget PWA

Mobile-first budget planning website. Static hosting under GitHub Pages. **No financial records are committed to this repository.**

## Start using it privately
1. Open the hosted page on your phone.
2. Go to Settings → Import starter / backup.
3. Select the separate `Family_Budget_PRIVATE_Starter.json` provided in ChatGPT.
4. Set budget allowances and log expenses. Data stays in this browser unless you enable shared cloud storage. Export a regular JSON backup.

## Optional real-time family sharing
1. Create your own Supabase project at https://supabase.com.
2. Run the statements in `supabase-setup.sql` using the SQL editor.
3. In Supabase Auth settings, enable email OTP/magic-link and add your GitHub Pages address as an allowed redirect URL.
4. Under Database → Publications → supabase_realtime, enable the `budget_snapshots` table if you want automatic updates, otherwise use Refresh.
5. In the app, enter the project URL and **publishable / anon** key (never a secret/service-role key).
6. Sign in, create the family budget (first phone), and use the invitation link on the second phone to sign in and join.
7. Once connected, transactions and budgets are stored in the Supabase project under authenticated row-level security (RLS).

**Important:** The app starts local-only. Sharing a website URL before cloud setup will not sync devices. Never commit your private starter JSON to public GitHub. The invitation link grants potential membership to anyone who possesses it and signs in; share it privately, and regenerate or revoke through Supabase if compromised.

## iPhone install
Safari → Share → Add to Home Screen.

## Data
Amounts in NZD. Transactions reflect logged outflows only. Savings categories represent planned allocations until a transfer is logged. Mortgage and property projections are hypothetical, based on the source Excel workbook.
