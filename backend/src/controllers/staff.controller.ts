import { Request, Response } from 'express';
import { prisma } from '../utils/db';
import { qstr } from '../utils/query';

export async function createStaff(req: Request, res: Response) {
  const { hospitalId, departmentId, ...rest } = req.body;
  const resolvedHospitalId = hospitalId ?? req.user?.hospitalId;
  if (!resolvedHospitalId) {
    res.status(400).json({ error: 'hospitalId is required' });
    return;
  }
  const staff = await prisma.staff.create({
    data: {
      ...rest,
      hospital: { connect: { id: resolvedHospitalId } },
      ...(departmentId && { department: { connect: { id: departmentId } } }),
    },
  });
  res.status(201).json(staff);
}

export async function getStaff(req: Request, res: Response) {
  const hospitalId = qstr(req.query.hospitalId);
  const departmentId = qstr(req.query.departmentId);
  const search = qstr(req.query.search);
  const where: Record<string, unknown> = {
    hospitalId: hospitalId ?? req.user!.hospitalId,
  };
  if (departmentId) where.departmentId = departmentId;
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { specialty: { contains: search, mode: 'insensitive' } },
    ];
  }
  const staff = await prisma.staff.findMany({
    where,
    include: { department: { select: { name: true, code: true } } },
    orderBy: { lastName: 'asc' },
  });
  res.json(staff);
}

export async function getStaffMember(req: Request, res: Response) {
  const staff = await prisma.staff.findUnique({
    where: { id: String(req.params.id) },
    include: {
      department: true,
      hospital: { select: { name: true } },
      shifts: { orderBy: { date: 'desc' }, take: 14 },
      leaveRequests: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
  });
  if (!staff) { res.status(404).json({ error: 'Staff member not found' }); return; }
  res.json(staff);
}

export async function updateStaff(req: Request, res: Response) {
  const staff = await prisma.staff.update({ where: { id: String(req.params.id) }, data: req.body });
  res.json(staff);
}

// ─── SHIFTS ───────────────────────────────────────────────────────────────────

export async function createShift(req: Request, res: Response) {
  const { staffId, shiftType, date, startTime, endTime } = req.body;
  const shift = await prisma.shift.upsert({
    where: { staffId_date_shiftType: { staffId, date: new Date(date), shiftType } },
    update: { startTime, endTime },
    create: { staff: { connect: { id: staffId } }, shiftType, date: new Date(date), startTime, endTime },
  });
  res.status(201).json(shift);
}

export async function getShifts(req: Request, res: Response) {
  const hospitalId = qstr(req.query.hospitalId);
  const departmentId = qstr(req.query.departmentId);
  const date = qstr(req.query.date);
  const staffId = qstr(req.query.staffId);
  const where: Record<string, unknown> = {};
  if (staffId) {
    where.staffId = staffId;
  } else {
    where.staff = {
      hospitalId: hospitalId ?? req.user!.hospitalId,
      ...(departmentId ? { departmentId } : {}),
    };
  }
  if (date) where.date = new Date(date);
  const shifts = await prisma.shift.findMany({
    where,
    include: {
      staff: { select: { id: true, firstName: true, lastName: true, specialty: true } },
      attendances: true,
    },
    orderBy: [{ date: 'asc' }, { shiftType: 'asc' }],
  });
  res.json(shifts);
}

export async function clockIn(req: Request, res: Response) {
  const { shiftId } = req.body;
  const staffId = req.user!.staffId!;
  const attendance = await prisma.attendance.upsert({
    where: { id: `${staffId}-${shiftId}` },
    update: { clockIn: new Date() },
    create: { staff: { connect: { id: staffId } }, shift: { connect: { id: shiftId } }, clockIn: new Date() },
  });
  res.json(attendance);
}

export async function clockOut(req: Request, res: Response) {
  const { attendanceId } = req.body;
  const attendance = await prisma.attendance.update({
    where: { id: attendanceId },
    data: { clockOut: new Date() },
  });
  res.json(attendance);
}

export async function requestLeave(req: Request, res: Response) {
  const leave = await prisma.leaveRequest.create({
    data: {
      ...req.body,
      staff: { connect: { id: req.user!.staffId! } },
      startDate: new Date(req.body.startDate),
      endDate: new Date(req.body.endDate),
    },
  });
  res.status(201).json(leave);
}

export async function reviewLeave(req: Request, res: Response) {
  const { status } = req.body;
  const leave = await prisma.leaveRequest.update({
    where: { id: String(req.params.id) },
    data: { status, reviewedBy: req.user!.staffId },
  });
  res.json(leave);
}
