import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

// One shared realtime connection for the whole app (instead of one per
// screen). Screens ask "tell me when these tables change" with
// useRealtimeTick(); the connection stays open while navigating.
// `profiles` is deliberately NOT listed: realtime payloads carry every
// column of the row (e-mail, phone…), so it must never be broadcast.
const TABLES = [
  'messages',
  'connections',
  'notifications',
  'events',
  'mission_requests',
  'mission_applications',
  'profile_subcategories',
  'reviews',
  'event_attendees',
];

type Listener = () => void;
interface RealtimeApi {
  subscribe: (tables: string[], cb: Listener) => () => void;
}

const RealtimeContext = createContext<RealtimeApi | null>(null);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const registry = useRef(new Map<string, Set<Listener>>());

  useEffect(() => {
    if (!user) return;

    let channel = supabase.channel('app-realtime');
    for (const table of TABLES) {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        registry.current.get(table)?.forEach((cb) => cb());
      });
    }
    channel.subscribe();

    // iOS suspends sockets in the background: resync everything on return.
    const resync = () => {
      if (document.visibilityState === 'visible') {
        registry.current.forEach((set) => set.forEach((cb) => cb()));
      }
    };
    document.addEventListener('visibilitychange', resync);
    window.addEventListener('online', resync);

    return () => {
      document.removeEventListener('visibilitychange', resync);
      window.removeEventListener('online', resync);
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const api = useMemo<RealtimeApi>(
    () => ({
      subscribe: (tables, cb) => {
        for (const t of tables) {
          if (!registry.current.has(t)) registry.current.set(t, new Set());
          registry.current.get(t)!.add(cb);
        }
        return () => {
          for (const t of tables) registry.current.get(t)?.delete(cb);
        };
      },
    }),
    [],
  );

  return <RealtimeContext.Provider value={api}>{children}</RealtimeContext.Provider>;
}

/** Returns a number that increases (debounced) whenever one of the tables changes. */
export function useRealtimeTick(tables: string[]): number {
  const api = useContext(RealtimeContext);
  const [tick, setTick] = useState(0);
  const key = tables.join(',');

  useEffect(() => {
    if (!api) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cb = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setTick((n) => n + 1), 250);
    };
    const off = api.subscribe(key.split(','), cb);
    return () => {
      if (timer) clearTimeout(timer);
      off();
    };
  }, [api, key]);

  return tick;
}

/** Same as useRealtimeTick, but takes the table names directly as arguments
 *  instead of an array (used by components watching a fixed, short list of
 *  tables). */
export function useRealtimeRevision(...tables: string[]): number {
  return useRealtimeTick(tables);
}
