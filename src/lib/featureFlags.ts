import { useEffect, useState } from 'react';
import { supabase } from './supabase';

// Launching payment requests to an empty community means no trust signal
// and dead inboxes — hold the feature back until there's a critical mass
// of real members, then it turns itself back on with no code change.
const MIN_ACTIVE_USERS_FOR_PAYMENTS = 500;

export function usePaymentsEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('profile_status', 'active')
      .then(({ count }) => {
        if (!cancelled) setEnabled((count ?? 0) >= MIN_ACTIVE_USERS_FOR_PAYMENTS);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return enabled;
}
