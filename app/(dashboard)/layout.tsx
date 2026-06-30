import Sidebar from '@/components/Sidebar'
import NotificationCenter from '@/components/ui/NotificationCenter'
import GlobalSearch from '@/components/ui/GlobalSearch'
import OnboardingTour from '@/components/ui/OnboardingTour'
import UserMenu from '@/components/ui/UserMenu'
import { ToastProvider } from '@/components/ui/Toast'
import { getSession } from '@/lib/session'
import { isAdminRole } from '@/lib/auth'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  const isGuest = session?.isGuest ?? false
  const isAdmin = !!session && isAdminRole(session.role)

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <Sidebar isAdmin={isAdmin} />
        <div className="flex-1 flex flex-col overflow-hidden">
          {isGuest && (
            <div className="flex-shrink-0 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs sm:text-sm px-4 py-2 flex items-center justify-center gap-2 text-center">
              <span>👀</span>
              <span>Modo visitante: puedes ver todo, pero no crear, editar ni eliminar nada.</span>
            </div>
          )}
          {/* Top bar */}
          <header className="flex-shrink-0 h-14 bg-white border-b border-gray-100 flex items-center px-4 lg:px-6 gap-3">
            {/* Mobile: spacer for hamburger button (44px wide) */}
            <div className="w-11 md:hidden flex-shrink-0" />
            <GlobalSearch />
            <div className="flex-1" />
            <a
              href="/ayuda"
              title="Ayuda"
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors text-sm font-bold"
            >
              ?
            </a>
            <NotificationCenter />
            <div className="w-px h-6 bg-gray-200 hidden sm:block" />
            <UserMenu name={session?.name ?? 'Usuario'} role={session?.role ?? ''} isGuest={isGuest} />
          </header>
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
      <OnboardingTour />
    </ToastProvider>
  )
}
