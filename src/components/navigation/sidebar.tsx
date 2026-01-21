'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Camera, Map, LayoutDashboard, Menu, Settings, ShieldCheck, Sparkles, MapPin, Compass, FlaskConical, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ModeToggle } from '@/components/mode-toggle';
import UserMenu from '@/components/auth/UserMenu';
import { useState, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';

// Easter egg: Triple-click version number to play a special video
const EASTER_EGG_VIDEO_URL = 'https://www.youtube.com/embed/KaV97EOkGqE?autoplay=1';
const CLICK_THRESHOLD = 3;
const CLICK_RESET_DELAY = 1000; // Reset click count after 1 second of inactivity

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  items: NavItem[];
  requiresAuth?: boolean;
  adminOnly?: boolean;
}

const navSections: NavSection[] = [
  {
    title: 'Samples',
    icon: FlaskConical,
    items: [
      { title: 'Trail Analysis', href: '/sample-analysis', icon: Sparkles },
      { title: 'Route Planner', href: '/sample-route', icon: MapPin },
      { title: 'Trail Finder', href: '/sample-trail-finder', icon: Compass },
      { title: 'Trail Recorder', href: '/sample-trail-recorder', icon: BookOpen },
    ],
  },
  {
    title: 'Features',
    requiresAuth: true,
    items: [
      { title: 'Analyze Trail', href: '/analyze', icon: Camera },
      { title: 'Find Trails', href: '/trail-finder', icon: Compass },
      { title: 'Trail Recorder', href: '/trail-recorder', icon: BookOpen },
      { title: 'Plan Routes', href: '/plan', icon: Map },
      { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { title: 'Settings', href: '/settings', icon: Settings },
    ],
  },
  {
    title: 'Admin',
    adminOnly: true,
    items: [
      { title: 'Admin Panel', href: '/admin', icon: ShieldCheck },
    ],
  },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';
  const isAuthenticated = !!session?.user;

  // Filter sections based on user role and auth status
  const visibleSections = navSections.filter((section) => {
    if (section.adminOnly) return isAdmin;
    return true;
  });

  return (
    <nav className="flex flex-col gap-4">
      {visibleSections.map((section, sectionIndex) => (
        <div key={section.title}>
          {/* Section Header */}
          <div className="flex items-center gap-2 px-3 py-1 mb-1">
            {section.icon && <section.icon className="h-4 w-4 text-muted-foreground" />}
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {section.title}
            </span>
          </div>

          {/* Section Items */}
          <div className="flex flex-col gap-1">
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              const isDisabled = section.requiresAuth && !isAuthenticated;

              if (isDisabled) {
                return (
                  <div
                    key={item.href}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground/50 cursor-not-allowed"
                    title="Sign in to access"
                  >
                    <Icon className="h-5 w-5" />
                    {item.title}
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.title}
                </Link>
              );
            })}
          </div>

          {/* Add separator between sections (except last) */}
          {sectionIndex < visibleSections.length - 1 && (
            <Separator className="mt-3" />
          )}
        </div>
      ))}
    </nav>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const clickCountRef = useRef(0);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleVersionClick = useCallback(() => {
    // Clear existing timeout
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    // Increment click count
    clickCountRef.current += 1;

    // Check if we've reached the threshold
    if (clickCountRef.current >= CLICK_THRESHOLD) {
      setShowEasterEgg(true);
      clickCountRef.current = 0;
    } else {
      // Reset click count after delay
      clickTimeoutRef.current = setTimeout(() => {
        clickCountRef.current = 0;
      }, CLICK_RESET_DELAY);
    }
  }, []);

  return (
    <>
      {/* Easter Egg Video Dialog */}
      <Dialog open={showEasterEgg} onOpenChange={setShowEasterEgg}>
        <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden bg-black">
          <div className="aspect-video w-full">
            {showEasterEgg && (
              <iframe
                width="100%"
                height="100%"
                src={EASTER_EGG_VIDEO_URL}
                title="Easter Egg"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Mobile Navigation */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild className="md:hidden">
          <Button variant="ghost" size="icon" className="fixed left-4 top-4 z-50">
            <Menu className="h-6 w-6" />
            <span className="sr-only">Toggle navigation</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between px-6 py-4">
              <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
                <span className="text-2xl">🏔️</span>
                <span className="text-lg font-bold">TrailBlazer AI</span>
              </Link>
              <ModeToggle />
            </div>
            <Separator />
            <div className="flex-1 px-4 py-4">
              <NavLinks onNavigate={() => setOpen(false)} />
            </div>
            <div className="px-4 py-4">
              <Separator className="mb-4" />
              <div className="flex items-center justify-between">
                <p
                  className="text-xs text-muted-foreground cursor-default select-none"
                  onClick={handleVersionClick}
                >
                  v0.69.420
                </p>
                <UserMenu />
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r bg-card">
        <div className="flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🏔️</span>
            <span className="text-lg font-bold">TrailBlazer AI</span>
          </Link>
          <ModeToggle />
        </div>
        <Separator />
        <div className="flex-1 px-4 py-4">
          <NavLinks />
        </div>
        <div className="px-4 py-4">
          <Separator className="mb-4" />
          <div className="flex items-center justify-between">
            <p
              className="text-xs text-muted-foreground cursor-default select-none"
              onClick={handleVersionClick}
            >
              v0.69.420
            </p>
            <UserMenu />
          </div>
        </div>
      </aside>
    </>
  );
}
