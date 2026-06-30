import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/db';

export function auditLog(action: string, resource: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    res.json = function (body) {
      if (req.user && res.statusCode < 400) {
        prisma.auditLog.create({
          data: {
            userId: req.user!.userId,
            action,
            resource,
            resourceId: String(req.params.id) ?? undefined,
            details: JSON.stringify({ body: req.body }),
            ipAddress: req.ip ?? undefined,
          },
        }).catch(() => {});
      }
      return originalJson(body);
    };
    next();
  };
}
