import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/db';
import { Role } from '@prisma/client';

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password required' });
    return;
  }
  const user = await prisma.user.findUnique({
    where: { email },
    include: { staff: { select: { hospitalId: true } } },
  });
  if (!user || !user.isActive) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
  const token = jwt.sign(
    {
      userId: user.id,
      role: user.role,
      staffId: user.staffId ?? undefined,
      hospitalId: user.staff?.hospitalId,
    },
    process.env.JWT_SECRET!,
    { expiresIn: (process.env.JWT_EXPIRES_IN ?? '8h') as unknown as number }
  );
  res.json({
    token,
    user: { id: user.id, email: user.email, role: user.role, staffId: user.staffId },
  });
}

export async function createUser(req: Request, res: Response) {
  const { email, password, role, staffId } = req.body;
  if (!email || !password || !role) {
    res.status(400).json({ error: 'email, password, and role are required' });
    return;
  }
  if (!Object.values(Role).includes(role)) {
    res.status(400).json({ error: 'Invalid role' });
    return;
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'Email already in use' });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash, role, staffId },
    select: { id: true, email: true, role: true, staffId: true, createdAt: true },
  });
  res.status(201).json(user);
}

export async function getMe(req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: {
      id: true, email: true, role: true, lastLogin: true,
      staff: {
        select: {
          id: true, firstName: true, lastName: true, specialty: true,
          department: { select: { id: true, name: true } },
          hospital: { select: { id: true, name: true } },
        },
      },
    },
  });
  res.json(user);
}

export async function changePassword(req: Request, res: Response) {
  const { currentPassword, newPassword } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) { res.status(400).json({ error: 'Current password is incorrect' }); return; }
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  res.json({ message: 'Password updated successfully' });
}
