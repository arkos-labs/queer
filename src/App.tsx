import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { RouterProvider, useRouter, parseRoute } from '@/lib/router';
import { useSEO } from '@/lib/useSEO';
import { Layout } from '@/components/Layout';
import { SplashScreen } from '@/components/SplashScreen';
import { RealtimeProvider } from '@/lib/realtime';
import { LandingPage } from '@/pages/LandingPage';
import { AuthPage } from '@/pages/AuthPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { DirectoryPage } from '@/pages/DirectoryPage';
import { PublicDirectoryPreview } from '@/pages/PublicDirectoryPreview';
import { MissionsPage } from '@/pages/MissionsPage';
import { ProfileDetailPage } from '@/pages/ProfileDetailPage';
import { ProfileEditPage } from '@/pages/ProfileEditPage';
import { MyProfilePage } from '@/pages/MyProfilePage';
import { SettingsPage } from '@/pages/SettingsPage';
import { AdminPage } from '@/pages/AdminPage';
import { MessagesPage } from '@/pages/MessagesPage';
import { MessageThreadPage } from '@/pages/MessageThreadPage';
import { ResourcesPage } from '@/pages/ResourcesPage';
import { PlaceDetailPage } from '@/pages/PlaceDetailPage';
import { EventsPage } from '@/pages/EventsPage';
import { LegalPage, type LegalSlug } from '@/pages/LegalPage';
import { InstallGuidePage } from '@/pages/InstallGuidePage';
import { InstallPWABanner } from '@/components/InstallPWABanner';
import { Capacitor } from '@capacitor/core';

function Routes() {
  const { path, navigate } = useRouter();
  const { user, profile, loading, isPasswordRecovery } = useAuth();
  const { name, params } = parseRoute(path);

  // Belt and braces: a signed-in user must never stay on the presentation page.
  useEffect(() => {
    if (isPasswordRecovery || name === 'reset-password') return;
    if (!loading && user && name === 'home') {
      navigate(profile && profile.display_name ? '/annuaire' : '/onboarding');
    }
  }, [loading, user, profile, name, isPasswordRecovery]);

  useSEO(name, { skip: name === 'directory' && !!params.category });

  if (loading) return <SplashScreen />;

  if (isPasswordRecovery || name === 'reset-password') return <ResetPasswordPage />;

  // Protect authenticated routes — 'directory' is deliberately not here: it
  // renders an anonymized public preview when logged out (see the
  // 'directory' case below) so search engines can actually crawl it.
  const protectedRoutes = ['events', 'missions', 'profile', 'my-profile', 'profile-edit', 'settings', 'admin', 'messages', 'message-thread', 'place-detail'];
  if (protectedRoutes.includes(name) && !user) {
    navigate('/connexion');
    return null;
  }

  // Redirect to onboarding if user has no profile yet
  if (user && !profile && name !== 'onboarding' && name !== 'signin' && name !== 'signup') {
    navigate('/onboarding');
    return null;
  }

  // Already signed in: never show the presentation page.
  if (user && name === 'home') {
    navigate(profile && profile.display_name ? '/annuaire' : '/onboarding');
    return null;
  }

  // Redirect to directory if user already has a complete profile
  if (user && profile && profile.display_name && (name === 'onboarding' || name === 'signin' || name === 'signup')) {
    navigate('/annuaire');
    return null;
  }

  switch (name) {
    case 'home':
      return user
        ? <DirectoryPage categorySlug={undefined} citySlug={undefined} />
        : <LandingPage />;
    case 'signin':
      return <AuthPage mode="signin" />;
    case 'forgot-password':
      return <ForgotPasswordPage />;
    case 'signup':
      return <AuthPage mode="signup" />;
    case 'onboarding':
      return <OnboardingPage />;
    case 'directory':
      return user
        ? <DirectoryPage categorySlug={params.category} citySlug={params.city} />
        : <PublicDirectoryPreview categorySlug={params.category} citySlug={params.city} />;
    case 'missions':
      return <MissionsPage />;
    case 'profile':
      return <ProfileDetailPage id={params.id} />;
    case 'my-profile':
      return <MyProfilePage />;
    case 'profile-edit':
      return <ProfileEditPage />;
    case 'settings':
      return <SettingsPage />;
    case 'admin':
      return <AdminPage />;
    case 'messages':
      return <MessagesPage />;
    case 'message-thread':
      return <MessageThreadPage id={params.id} />;
    case 'events':
      return <EventsPage />;
    case 'resources':
      return <ResourcesPage />;
    case 'place-detail':
      return <PlaceDetailPage id={params.id} />;
    case 'install-guide':
      return <InstallGuidePage />;
    case 'legal':
      return <LegalPage slug={params.slug as LegalSlug} />;
    default:
      return <LandingPage />;
  }
}

export default function App() {
  const isNativeApp = Capacitor.isNativePlatform();

  return (
    <AuthProvider>
      <RouterProvider>
        <RealtimeProvider>
          <Layout>
            <Routes />
          </Layout>
        </RealtimeProvider>
        {!isNativeApp && <InstallPWABanner />}
      </RouterProvider>
    </AuthProvider>
  );
}
