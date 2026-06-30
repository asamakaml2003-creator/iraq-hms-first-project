import { Request, Response } from 'express';
import { prisma } from '../utils/db';
import { qstr } from '../utils/query';

export async function createLabOrder(req: Request, res: Response) {
  const { visitId, patientId, departmentId, tests, priority, notes } = req.body;
  const orderedBy = req.body.orderedBy ?? req.user!.staffId;
  const order = await prisma.labOrder.create({
    data: {
      visit: { connect: { id: visitId } },
      patientId,
      doctor: { connect: { id: orderedBy } },
      department: { connect: { id: departmentId } },
      priority: priority ?? 'ROUTINE', notes,
      tests: { create: tests.map((t: { testName: string; testCode?: string }) => ({ testName: t.testName, testCode: t.testCode })) },
    },
    include: { tests: true, doctor: { select: { firstName: true, lastName: true } } },
  });
  res.status(201).json(order);
}

export async function getLabOrders(req: Request, res: Response) {
  const patientId = qstr(req.query.patientId);
  const status = qstr(req.query.status);
  const departmentId = qstr(req.query.departmentId);
  const where: Record<string, unknown> = {};
  if (patientId) where.patientId = patientId;
  if (status) where.status = status;
  if (departmentId) where.departmentId = departmentId;
  const orders = await prisma.labOrder.findMany({
    where,
    include: {
      tests: true,
      doctor: { select: { firstName: true, lastName: true } },
    },
    orderBy: { orderedAt: 'desc' },
  });
  res.json(orders);
}

export async function updateLabResult(req: Request, res: Response) {
  const { testId, result, unit, referenceRange, isCritical, performedBy } = req.body;
  const test = await prisma.labTest.update({
    where: { id: testId },
    data: { result, unit, referenceRange, isCritical, performedAt: new Date(), performedBy },
  });
  // If all tests in order have results, mark order as completed
  const order = await prisma.labOrder.findUnique({
    where: { id: test.labOrderId },
    include: { tests: true },
  });
  const allDone = order?.tests.every(t => t.result !== null);
  const hasCritical = order?.tests.some(t => t.isCritical);
  if (allDone && order) {
    await prisma.labOrder.update({
      where: { id: order.id },
      data: { status: hasCritical ? 'CRITICAL' : 'COMPLETED' },
    });
  }
  res.json(test);
}

// ─── RADIOLOGY ────────────────────────────────────────────────────────────────

export async function createRadiologyOrder(req: Request, res: Response) {
  const { visitId, orderedBy: bodyOrderedBy, ...rest } = req.body;
  const orderedBy = bodyOrderedBy ?? req.user!.staffId;
  const order = await prisma.radiologyOrder.create({
    data: {
      ...rest,
      visit: { connect: { id: visitId } },
      doctor: { connect: { id: orderedBy } },
    },
    include: { doctor: { select: { firstName: true, lastName: true } } },
  });
  res.status(201).json(order);
}

export async function getRadiologyOrders(req: Request, res: Response) {
  const patientId = qstr(req.query.patientId);
  const status = qstr(req.query.status);
  const where: Record<string, unknown> = {};
  if (patientId) where.patientId = patientId;
  if (status) where.status = status;
  const orders = await prisma.radiologyOrder.findMany({
    where,
    include: { doctor: { select: { firstName: true, lastName: true } } },
    orderBy: { orderedAt: 'desc' },
  });
  res.json(orders);
}

export async function submitRadiologyReport(req: Request, res: Response) {
  const { reportText, imageUrls } = req.body;
  const order = await prisma.radiologyOrder.update({
    where: { id: String(req.params.id) },
    data: {
      reportText, imageUrls: imageUrls ?? [],
      status: 'REPORTED', reportedAt: new Date(),
      reportedBy: req.user!.staffId,
    },
  });
  res.json(order);
}
