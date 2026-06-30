import { Request, Response } from 'express';
import { prisma } from '../utils/db';
import { qstr } from '../utils/query';

export async function createVisit(req: Request, res: Response) {
  const { patientId, departmentId, chiefComplaint, clinicalNotes, icd10Codes, diagnoses, treatmentPlan, followUpDate } = req.body;
  const doctorId = req.body.doctorId ?? req.user!.staffId;
  const visit = await prisma.visit.create({
    data: {
      patient: { connect: { id: patientId } },
      doctor: { connect: { id: doctorId } },
      department: { connect: { id: departmentId } },
      chiefComplaint,
      clinicalNotes, icd10Codes: icd10Codes ?? [],
      diagnoses: diagnoses ?? [], treatmentPlan,
      followUpDate: followUpDate ? new Date(followUpDate) : undefined,
    },
    include: {
      patient: { select: { firstName: true, lastName: true, allergies: true } },
      doctor: { select: { firstName: true, lastName: true } },
      department: { select: { name: true } },
    },
  });
  res.status(201).json(visit);
}

export async function getVisits(req: Request, res: Response) {
  const patientId = qstr(req.query.patientId);
  const doctorId = qstr(req.query.doctorId);
  const departmentId = qstr(req.query.departmentId);
  const page = qstr(req.query.page) ?? '1';
  const limit = qstr(req.query.limit) ?? '20';
  const skip = (Number(page) - 1) * Number(limit);
  const where: Record<string, unknown> = {};
  if (patientId) where.patientId = patientId;
  if (doctorId) where.doctorId = doctorId;
  if (departmentId) where.departmentId = departmentId;

  const [visits, total] = await Promise.all([
    prisma.visit.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { visitDate: 'desc' },
      include: {
        patient: { select: { firstName: true, lastName: true } },
        doctor: { select: { firstName: true, lastName: true, specialty: true } },
        department: { select: { name: true } },
      },
    }),
    prisma.visit.count({ where }),
  ]);
  res.json({ visits, total });
}

export async function getVisit(req: Request, res: Response) {
  const visit = await prisma.visit.findUnique({
    where: { id: String(req.params.id) },
    include: {
      patient: true,
      doctor: { select: { firstName: true, lastName: true, specialty: true } },
      department: { select: { name: true } },
      prescriptions: { include: { items: { include: { drug: true } }, doctor: { select: { firstName: true, lastName: true } } } },
      labOrders: { include: { tests: true } },
      radiologyOrders: true,
      admission: { include: { bed: { include: { department: true } } } },
    },
  });
  if (!visit) { res.status(404).json({ error: 'Visit not found' }); return; }
  res.json(visit);
}

export async function updateVisit(req: Request, res: Response) {
  const visit = await prisma.visit.update({
    where: { id: String(req.params.id) },
    data: {
      ...req.body,
      followUpDate: req.body.followUpDate ? new Date(req.body.followUpDate) : undefined,
    },
  });
  res.json(visit);
}

// ─── PRESCRIPTIONS ────────────────────────────────────────────────────────────

export async function createPrescription(req: Request, res: Response) {
  const { visitId, items } = req.body;
  const prescribedBy = req.user!.staffId!;

  // Check patient allergies vs prescribed drugs
  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    include: { patient: { select: { allergies: true } } },
  });
  const drugIds = items.map((i: { drugId: string }) => i.drugId);
  const drugs = await prisma.drug.findMany({ where: { id: { in: drugIds } } });
  const allergyConflicts = drugs.filter(d =>
    visit?.patient.allergies.some(a => d.genericName.toLowerCase().includes(a.toLowerCase()))
  );

  const prescription = await prisma.prescription.create({
    data: {
      visit: { connect: { id: visitId } },
      doctor: { connect: { id: prescribedBy } },
      items: { create: items },
    },
    include: { items: { include: { drug: true } } },
  });

  res.status(201).json({
    prescription,
    allergyWarnings: allergyConflicts.map(d => d.genericName),
  });
}
