/**
 * Root index — redirects to login.
 * The actual entry screen is /login (glassmorphism).
 */
import { Redirect } from 'expo-router';

export default function Root() {
  return <Redirect href="/login" />;
}
