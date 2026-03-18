'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import {
  LayoutDashboard,
  FolderKanban,
  Settings,
  Palette,
  FileText,
  ShoppingCart,
  Scissors,
  Zap,
  CalendarDays,
  CreditCard,
  Box,
  BarChart3,
  Map,
  Store,
  ClipboardList,
  Bell,
  Truck,
  ShieldCheck,
  Glasses,
  TrendingUp,
  PiggyBank,
  Leaf,
  Cpu,
  Wrench,
  Shield,
  Briefcase,
  Code2,
  CheckSquare,
  Package,
  MessageSquare,
  TruckIcon,
  DollarSign,
  Users,
  Sparkles,
  FileEdit,
  Camera,
  // New feature icons
  PenTool,
  Home,
  ChefHat,
  Lightbulb,
  SwatchBook,
  Image,
  Building2,
  Mountain,
  Thermometer,
  AudioLines,
  HelpCircle,
  Stamp,
  FileBarChart,
  HardHat,
  ClipboardCheck,
  FileClock,
  UserCircle,
  ListChecks,
  Heart,
  StickyNote,
  FileSignature,
  Contact,
  Clock,
  ShieldAlert,
  UsersRound,
  Move3d,
  MessageCircleQuestion,
  Plane,
  ScanLine,
  Wifi,
  ShirtIcon,
  Theater,
  TreePine,
  Accessibility,
  Building,
  Ruler,
  BookOpen,
  PenLine,
  Link2,
  HomeIcon,
  CalendarCheck,
  Beaker,
  LineChart,
  ClipboardPen,
  GraduationCap,
} from 'lucide-react';
import { cn } from '@openlintel/ui';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Projects', href: '/dashboard', icon: FolderKanban },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Portfolios', href: '/portfolios', icon: Briefcase },
  { name: 'Marketplace', href: '/marketplace', icon: Store },
  { name: 'API Portal', href: '/developer', icon: Code2 },
  { name: 'Notifications', href: '/notifications', icon: Bell },
];

const projectNavigation = [
  // Core Design
  { name: 'Rooms', href: 'rooms', icon: LayoutDashboard },
  { name: 'Designs', href: 'designs', icon: Palette },
  { name: 'Floor Plan', href: 'floor-plan', icon: Map },
  { name: 'Floor Plan Editor', href: 'floor-plan-editor', icon: PenTool },
  { name: '3D Editor', href: 'editor', icon: Box },
  { name: 'Parametric Design', href: 'parametric', icon: Move3d },
  { name: 'Exterior Design', href: 'exterior', icon: Home },
  { name: 'Kitchen & Bath', href: 'kitchen-bath', icon: ChefHat },
  { name: 'Lighting Design', href: 'lighting', icon: Lightbulb },
  { name: 'Material Boards', href: 'material-boards', icon: SwatchBook },
  { name: 'Renders', href: 'renders', icon: Image },
  { name: 'Space Planning', href: 'space-planning', icon: Move3d },
  // Technical
  { name: 'Drawings', href: 'drawings', icon: FileText },
  { name: 'Drawing Sets', href: 'drawing-sets', icon: Ruler },
  { name: 'BOM', href: 'bom', icon: ShoppingCart },
  { name: 'Cut List', href: 'cutlist', icon: Scissors },
  { name: 'MEP', href: 'mep', icon: Zap },
  { name: 'Structural', href: 'structural', icon: Building2 },
  { name: 'Site Analysis', href: 'site-analysis', icon: Mountain },
  { name: 'Energy Model', href: 'energy', icon: Thermometer },
  { name: 'Acoustics', href: 'acoustics', icon: AudioLines },
  { name: 'Spec Writer', href: 'spec-writer', icon: BookOpen },
  { name: 'Compliance', href: 'compliance', icon: ShieldCheck },
  { name: 'Compliance Chat', href: 'compliance-chat', icon: MessageCircleQuestion },
  // Project Management
  { name: 'Timeline', href: 'timeline', icon: CalendarDays },
  { name: 'Site Logs', href: 'site-logs', icon: ClipboardList },
  { name: 'Change Orders', href: 'change-orders', icon: FileEdit },
  { name: 'RFIs', href: 'rfis', icon: HelpCircle },
  { name: 'Submittals', href: 'submittals', icon: Stamp },
  { name: 'Progress Reports', href: 'progress-reports', icon: FileBarChart },
  { name: 'Safety', href: 'safety', icon: HardHat },
  { name: 'Permits', href: 'permits', icon: ClipboardCheck },
  { name: 'Document Versions', href: 'document-versions', icon: FileClock },
  { name: 'As-Built Docs', href: 'as-built', icon: PenLine },
  // Financial
  { name: 'Payments', href: 'payments', icon: CreditCard },
  { name: 'Procurement', href: 'procurement', icon: Truck },
  { name: 'Financial Reports', href: 'financial-reports', icon: DollarSign },
  { name: 'Proposals', href: 'proposals', icon: FileSignature },
  { name: 'Time Tracking', href: 'time-tracking', icon: Clock },
  { name: 'Benchmarks', href: 'benchmarks', icon: LineChart },
  { name: 'Property Value', href: 'property-value', icon: HomeIcon },
  // Client & Collaboration
  { name: 'Client Portal', href: 'client-portal', icon: UserCircle },
  { name: 'Selections', href: 'selections', icon: ListChecks },
  { name: 'Inspiration', href: 'inspiration', icon: Heart },
  { name: 'Annotations', href: 'annotations', icon: StickyNote },
  { name: 'Collaboration', href: 'collaboration', icon: MessageSquare },
  // Specialized Design
  { name: 'Closet Design', href: 'closet-design', icon: ShirtIcon },
  { name: 'Theater Design', href: 'theater', icon: Theater },
  { name: 'Outdoor Design', href: 'outdoor', icon: TreePine },
  { name: 'Universal Design', href: 'universal-design', icon: Accessibility },
  { name: 'Multi-Unit / ADU', href: 'multi-unit', icon: Building },
  { name: 'Smart Home', href: 'smart-home', icon: Wifi },
  // Advanced Tech
  { name: 'Reconstruction', href: 'reconstruction', icon: Camera },
  { name: 'AR/VR', href: 'ar', icon: Glasses },
  { name: 'Drone', href: 'drone', icon: Plane },
  { name: 'LiDAR', href: 'lidar', icon: ScanLine },
  // Intelligence & Analytics
  { name: 'Analytics', href: 'analytics', icon: BarChart3 },
  { name: 'Predictions', href: 'predictions', icon: TrendingUp },
  { name: 'Budget Optimizer', href: 'budget-optimizer', icon: PiggyBank },
  { name: 'Sustainability', href: 'sustainability', icon: Leaf },
  { name: 'Design Feedback', href: 'design-feedback', icon: GraduationCap },
  { name: 'Post-Occupancy', href: 'post-occupancy', icon: ClipboardPen },
  // Ecosystem
  { name: 'Digital Twin', href: 'digital-twin', icon: Cpu },
  { name: 'Maintenance', href: 'maintenance', icon: Wrench },
  { name: 'Warranties', href: 'warranties', icon: Shield },
  { name: 'Quality & Punch List', href: 'quality', icon: CheckSquare },
  { name: 'Handover', href: 'handover', icon: Package },
  { name: 'Deliveries', href: 'deliveries', icon: TruckIcon },
  { name: 'Vendors', href: 'vendors', icon: Users },
  { name: 'Style Quiz', href: 'style-quiz', icon: Sparkles },
  // Business
  { name: 'CRM', href: 'crm', icon: Contact },
  { name: 'Team', href: 'team', icon: UsersRound },
  { name: 'Insurance', href: 'insurance', icon: ShieldAlert },
  { name: 'Integrations', href: 'integrations', icon: Link2 },
  { name: 'Bookings', href: 'bookings', icon: CalendarCheck },
  { name: 'Samples', href: 'samples', icon: Beaker },
];

export function Sidebar({ projectId: propProjectId }: { projectId?: string }) {
  const pathname = usePathname();
  const params = useParams();
  // Auto-detect projectId from URL when on /project/[id]/* routes
  const projectId = propProjectId ?? (params?.id as string | undefined);

  return (
    <aside className="flex h-full w-60 flex-col border-r bg-gray-50/50">
      <div className="p-4">
        <Link href="/dashboard" className="flex items-center gap-2 text-lg font-bold text-primary">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white text-sm font-bold">
            OL
          </div>
          OpenLintel
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2 overflow-y-auto">
        <div className="mb-4">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Main
          </p>
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-gray-100 hover:text-foreground',
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </div>

        {projectId && (
          <div>
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Project
            </p>
            {projectNavigation.map((item) => {
              const href = `/project/${projectId}/${item.href}`;
              const isActive = pathname === href || pathname.startsWith(href + '/');
              return (
                <Link
                  key={item.name}
                  href={href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-gray-100 hover:text-foreground',
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      <div className="border-t p-3">
        <Link
          href="/dashboard/settings"
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-gray-100 hover:text-foreground',
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
