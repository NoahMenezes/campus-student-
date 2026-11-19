import { useColorScheme as useRNColorScheme } from 'react-native';
import { useEffect, useState } from 'react';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web.
 * Returns 'light' before hydration to match SSR output, then the real scheme after hydration.
 * This avoids React hydration mismatches when the user's system color scheme is dark.
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasHydrated(true);
  }, []);

  const colorScheme = useRNColorScheme();

  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
}
