import { useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  Award, 
  CreditCard,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Calendar,
  ClipboardList,
  PenTool,
  MessageSquare,
  BookOpen,
  Briefcase,
  Layers
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/hooks/useAuth';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { useNotificationCounts } from '@/hooks/useNotificationCounts';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

type NavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  permission: string;
  badgeKey?: 'registrations' | 'contact-messages';
};

const mainNavItems: NavItem[] = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard, permission: 'view_dashboard' },
  { title: 'Registrations', url: '/registrations', icon: ClipboardList, permission: 'view_registrations', badgeKey: 'registrations' },
  { title: 'Contact Messages', url: '/contact-messages', icon: MessageSquare, permission: 'view_contact_messages', badgeKey: 'contact-messages' },
];

const contentNavItems: NavItem[] = [
  { title: 'Courses', url: '/courses', icon: BookOpen, permission: 'view_courses' },
  { title: 'Internships', url: '/internships', icon: Briefcase, permission: 'view_internships' },
  { title: 'Seminars', url: '/seminars', icon: Layers, permission: 'view_programs' },
  { title: 'Workshops', url: '/workshops', icon: Layers, permission: 'view_programs' },
  { title: 'VAC Programs', url: '/vac-programs', icon: Layers, permission: 'view_programs' },
  { title: 'Events & Hackathons', url: '/events', icon: Calendar, permission: 'view_events' },
  { title: 'Blogs', url: '/blogs', icon: PenTool, permission: 'view_blogs' },
  { title: 'Instructors', url: '/instructors', icon: GraduationCap, permission: 'view_instructors' },
];

const managementNavItems: NavItem[] = [
  { title: 'Students', url: '/students', icon: Users, permission: 'view_students' },
  { title: 'Certificates', url: '/certificates', icon: Award, permission: 'view_certificates' },
  { title: 'Payments', url: '/payments', icon: CreditCard, permission: 'view_payments' },
];

export function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { role, hasPermission } = useRoleAccess();
  const { state, toggleSidebar } = useSidebar();
  const { newContactMessagesCount, pendingRegistrationsCount } = useNotificationCounts();

  const isCollapsed = state === 'collapsed';

  const getBadgeCount = (badgeKey?: 'registrations' | 'contact-messages') => {
    if (!badgeKey) return 0;
    if (badgeKey === 'registrations') return pendingRegistrationsCount;
    if (badgeKey === 'contact-messages') return newContactMessagesCount;
    return 0;
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const getRoleBadge = () => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'course_admin': return 'Course Admin';
      case 'support_team': return 'Support';
      default: return 'User';
    }
  };

  const filterItems = (items: NavItem[]) => 
    items.filter(item => hasPermission(item.permission as any));

  const filteredMainItems = filterItems(mainNavItems);
  const filteredContentItems = filterItems(contentNavItems);
  const filteredManagementItems = filterItems(managementNavItems);

  const renderNavItems = (items: NavItem[]) => (
    <SidebarMenu>
      {items.map((item) => {
        const isActive = location.pathname === item.url || 
          (item.url !== '/dashboard' && location.pathname.startsWith(item.url));
        const badgeCount = getBadgeCount(item.badgeKey);
        
        return (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton
              asChild
              isActive={isActive}
              tooltip={isCollapsed ? `${item.title}${badgeCount > 0 ? ` (${badgeCount})` : ''}` : undefined}
            >
              <NavLink
                to={item.url}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!isCollapsed && (
                  <span className="flex flex-1 items-center justify-between">
                    <span>{item.title}</span>
                    {badgeCount > 0 && (
                      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-medium text-destructive-foreground">
                        {badgeCount > 99 ? '99+' : badgeCount}
                      </span>
                    )}
                  </span>
                )}
                {isCollapsed && badgeCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-sidebar-foreground">Nipix Admin</span>
              <span className="text-xs text-sidebar-foreground/70">Management Portal</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {!isCollapsed && <SidebarGroupLabel>Main</SidebarGroupLabel>}
          <SidebarGroupContent>{renderNavItems(filteredMainItems)}</SidebarGroupContent>
        </SidebarGroup>

        {filteredContentItems.length > 0 && (
          <SidebarGroup>
            {!isCollapsed && <SidebarGroupLabel>Content</SidebarGroupLabel>}
            <SidebarGroupContent>{renderNavItems(filteredContentItems)}</SidebarGroupContent>
          </SidebarGroup>
        )}

        {filteredManagementItems.length > 0 && (
          <SidebarGroup>
            {!isCollapsed && <SidebarGroupLabel>Management</SidebarGroupLabel>}
            <SidebarGroupContent>{renderNavItems(filteredManagementItems)}</SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        {!isCollapsed && (
          <div className="mb-3 flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden">
              <span className="truncate text-sm font-medium text-sidebar-foreground">
                {user?.email?.split('@')[0] || 'User'}
              </span>
              <span className="text-xs text-sidebar-foreground/70">{getRoleBadge()}</span>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size={isCollapsed ? "icon" : "sm"}
            onClick={handleSignOut}
            className="flex-1 justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span className="ml-2">Sign Out</span>}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="hidden text-sidebar-foreground bg-sidebar-accent text-sidebar-accent-foreground md:flex"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
