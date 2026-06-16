import { Request, Response, NextFunction } from 'express';

// Assuming roles are 1: Super Admin, 2: Admin, 3: Operator, 4: Viewer
export const ROLES = {
  SUPER_ADMIN: 1,
  ADMIN: 2,
  OPERATOR: 3,
  VIEWER: 4
};

export const authorize = (allowedRoles: number[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = req.user?.roleId;

    if (!userRole) {
      res.status(403).json({ error: 'Forbidden: Role not assigned' });
      return;
    }

    if (!allowedRoles.includes(userRole) && userRole !== ROLES.SUPER_ADMIN) {
      res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      return;
    }

    next();
  };
};
