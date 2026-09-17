import { useAuth, AppRole } from './useAuth';

type Permission = 
  | 'view_dashboard'
  | 'view_courses'
  | 'manage_courses'
  | 'delete_courses'
  | 'view_students'
  | 'manage_students'
  | 'view_instructors'
  | 'manage_instructors'
  | 'view_certificates'
  | 'manage_certificates'
  | 'view_payments'
  | 'manage_payments'
  | 'view_internships'
  | 'manage_internships'
  | 'delete_internships'
  | 'view_events'
  | 'manage_events'
  | 'delete_events'
  | 'view_programs'
  | 'manage_programs'
  | 'delete_programs'
  | 'view_registrations'
  | 'manage_registrations'
  | 'view_contact_messages'
  | 'manage_contact_messages'
  | 'view_blogs'
  | 'manage_blogs'
  | 'delete_blogs';

const rolePermissions: Record<AppRole, Permission[]> = {
  super_admin: [
    'view_dashboard',
    'view_courses',
    'manage_courses',
    'delete_courses',
    'view_students',
    'manage_students',
    'view_instructors',
    'manage_instructors',
    'view_certificates',
    'manage_certificates',
    'view_payments',
    'manage_payments',
    'view_internships',
    'manage_internships',
    'delete_internships',
    'view_events',
    'manage_events',
    'delete_events',
    'view_programs',
    'manage_programs',
    'delete_programs',
    'view_registrations',
    'manage_registrations',
    'view_contact_messages',
    'manage_contact_messages',
    'view_blogs',
    'manage_blogs',
    'delete_blogs',
  ],
  course_admin: [
    'view_dashboard',
    'view_courses',
    'manage_courses',
    'view_students',
    'manage_students',
    'view_instructors',
    'view_certificates',
    'manage_certificates',
    'view_payments',
    'view_internships',
    'manage_internships',
    'view_events',
    'manage_events',
    'view_programs',
    'manage_programs',
    'view_registrations',
    'manage_registrations',
    'view_contact_messages',
    'manage_contact_messages',
    'view_blogs',
    'manage_blogs',
  ],
  support_team: [
    'view_dashboard',
    'view_courses',
    'view_students',
    'view_instructors',
    'view_certificates',
    'view_payments',
    'view_internships',
    'view_events',
    'view_programs',
    'view_registrations',
    'view_contact_messages',
    'view_blogs',
  ],
};

export function useRoleAccess() {
  const { role } = useAuth();

  const hasPermission = (permission: Permission): boolean => {
    if (!role) return false;
    return rolePermissions[role]?.includes(permission) ?? false;
  };

  const canView = (module: string): boolean => {
    if (!role) return false;
    return hasPermission(`view_${module}` as Permission);
  };

  const canManage = (module: string): boolean => {
    if (!role) return false;
    return hasPermission(`manage_${module}` as Permission);
  };

  const canDelete = (module: string): boolean => {
    if (!role) return false;
    return hasPermission(`delete_${module}` as Permission);
  };

  return {
    role,
    hasPermission,
    canView,
    canManage,
    canDelete,
    isSuperAdmin: role === 'super_admin',
    isCourseAdmin: role === 'course_admin',
    isSupportTeam: role === 'support_team',
  };
}
