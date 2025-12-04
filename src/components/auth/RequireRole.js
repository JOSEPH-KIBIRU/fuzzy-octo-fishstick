import { useUserRoles } from '../../hooks/useUserRoles';

const RequireRole = ({ role, children, fallback = null }) => {
  const { hasRole } = useUserRoles();

  if (!hasRole(role)) {
    return fallback;
  }

  return children;
};

export default RequireRole;