import { Role } from '@prisma/client';

export interface JwtPayload {
  userId: string;
  role: Role;
  staffId?: string;
  hospitalId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
