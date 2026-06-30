import { Request, Response } from 'express';
import { prisma } from '../utils/db';
import { qstr } from '../utils/query';

function generateInvoiceNo(): string {
  const date = new Date();
  const prefix = `INV-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const random = Math.floor(Math.random() * 90000) + 10000;
  return `${prefix}-${random}`;
}

export async function createInvoice(req: Request, res: Response) {
  const { patientId, hospitalId, items, dueDate, notes } = req.body;
  const resolvedHospitalId = hospitalId ?? req.user?.hospitalId;
  if (!resolvedHospitalId) {
    res.status(400).json({ error: 'hospitalId is required' });
    return;
  }
  const totalAmount = items.reduce((sum: number, i: { totalPrice: number }) => sum + i.totalPrice, 0);
  const invoice = await prisma.invoice.create({
    data: {
      invoiceNo: generateInvoiceNo(),
      patient: { connect: { id: patientId } },
      hospital: { connect: { id: resolvedHospitalId } },
      totalAmount,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      notes,
      items: { create: items },
    },
    include: { items: true, patient: { select: { firstName: true, lastName: true } } },
  });
  res.status(201).json(invoice);
}

export async function getInvoices(req: Request, res: Response) {
  const patientId = qstr(req.query.patientId);
  const paymentStatus = qstr(req.query.paymentStatus);
  const hospitalId = qstr(req.query.hospitalId);
  const page = qstr(req.query.page) ?? '1';
  const limit = qstr(req.query.limit) ?? '20';
  const skip = (Number(page) - 1) * Number(limit);
  const where: Record<string, unknown> = {
    hospitalId: hospitalId ?? req.user!.hospitalId,
  };
  if (patientId) where.patientId = patientId;
  if (paymentStatus) where.paymentStatus = paymentStatus;

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where, skip, take: Number(limit),
      orderBy: { issuedAt: 'desc' },
      include: {
        patient: { select: { firstName: true, lastName: true } },
        items: true,
      },
    }),
    prisma.invoice.count({ where }),
  ]);
  res.json({ invoices, total });
}

export async function recordPayment(req: Request, res: Response) {
  const { invoiceId, amount, method, reference, notes } = req.body;
  const payment = await prisma.payment.create({
    data: { invoice: { connect: { id: invoiceId } }, amount, method, reference, notes, receivedBy: req.user!.staffId },
  });
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true },
  });
  const totalPaid = invoice!.payments.reduce((s, p) => s + p.amount, 0);
  const paymentStatus =
    totalPaid >= invoice!.totalAmount ? 'PAID' :
    totalPaid > 0 ? 'PARTIAL' : 'UNPAID';
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { paidAmount: totalPaid, paymentStatus },
  });
  res.status(201).json(payment);
}

// ─── ANALYTICS ────────────────────────────────────────────────────────────────

export async function getDashboardStats(req: Request, res: Response) {
  const hId = qstr(req.query.hospitalId) ?? req.user!.hospitalId ?? '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    totalPatients, todayVisits, admittedPatients,
    availableBeds, totalBeds, pendingLabOrders,
    totalRevenue, unpaidInvoices,
  ] = await Promise.all([
    prisma.patient.count({ where: { hospitalId: hId } }),
    prisma.visit.count({
      where: {
        department: { hospitalId: hId },
        visitDate: { gte: today, lt: tomorrow },
      },
    }),
    prisma.admission.count({
      where: { status: 'ADMITTED', bed: { department: { hospitalId: hId } } },
    }),
    prisma.bed.count({
      where: { status: 'AVAILABLE', department: { hospitalId: hId } },
    }),
    prisma.bed.count({ where: { department: { hospitalId: hId } } }),
    prisma.labOrder.count({
      where: { status: 'ORDERED', department: { hospitalId: hId } },
    }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { invoice: { hospitalId: hId } },
    }),
    prisma.invoice.count({
      where: { hospitalId: hId, paymentStatus: 'UNPAID' },
    }),
  ]);

  res.json({
    totalPatients,
    todayVisits,
    admittedPatients,
    bedOccupancy: { available: availableBeds, total: totalBeds, occupied: totalBeds - availableBeds },
    pendingLabOrders,
    totalRevenue: totalRevenue._sum.amount ?? 0,
    unpaidInvoices,
  });
}
