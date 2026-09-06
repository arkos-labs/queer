import { AuthProvider, useAuth } from '@/lib/auth';
import { RouterProvider, useRouter, parseRoute } from '@/lib/router';
import { Layout } from '@/components/Layout';
import { LandingPage } from '@/pages/LandingPage';
import { AuthPage } from '@/pages/AuthPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { DirectoryPage } from '@/pages/DirectoryPage';
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
import { CookieBanner } from '@/components/CookieBanner';
import { InstallPWABanner } from '@/components/InstallPWABanner';

function Routes() {
  const { path, navigate } = useRouter();
  const { user, profile, loading } = useAuth();
  const { name, params } = parseRoute(path);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-hero-radial">
        <img src="/logo.png" alt="Queer Service" className="h-16 w-16 animate-float object-contain" />
        <div className="h-1.5 w-40 overflow-hidden rounded-full bg-gold-hairline">
          <div className="h-full w-1/3 animate-gradient-x rounded-full bg-kinpaku-gold" />
        </div>
        <p className="text-sm font-medium text-text-light-faint">Chargement…</p>
      </div>
    );
  }

  // Protect authenticated routes
  const protectedRoutes = ['events', 'directory', 'missions', 'profile', 'my-profile', 'profile-edit', 'settings', 'admin', 'messages', 'message-thread', 'place-detail'];
  if (protectedRoutes.includes(name) && !user) {
    navigate('/connexion');
    return null;
  }

  // Redirect to onboarding if user has no profile yet
  if (user && !profile && name !== 'onboarding' && name !== 'signin' && name !== 'signup') {
    navigate('/onboarding');
    return null;
  }

  // Redirect to directory if user already has a complete profile
  if (user && profile && profile.display_name && (name === 'onboarding' || name === 'signin' || name === 'signup')) {
    navigate('/annuaire');
    return null;
  }

  switch (name) {
    case 'home':
      return <LandingPage />;
    case 'signin':
      return <AuthPage mode="signin" />;
    case 'signup':
      return <AuthPage mode="signup" />;
    case 'onboarding':
      return <OnboardingPage />;
    case 'directory':
      return <DirectoryPage />;
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
  return (
    <AuthProvider>
      <RouterProvider>
        <Layout>
          <Routes />
        </Layout>
        <InstallPWABanner />
        <CookieBanner />
      </RouterProvider>
    </AuthProvider>
  );
}
