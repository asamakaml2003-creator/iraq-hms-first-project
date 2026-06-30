import { Request, Response } from 'express';
import { prisma } from '../utils/db';
import { qstr } from '../utils/query';

export async function createHospital(req: Request, res: Response) {
  const hospital = await prisma.hospital.create({ data: req.body });
  res.status(201).json(hospital);
}

export async function getHospitals(req: Request, res: Response) {
  const hospitals = await prisma.hospital.findMany({
    include: {
      _count: { select: { departments: true, staff: true, patients: true } },
    },
    orderBy: { name: 'asc' },
  });
  res.json(hospitals);
}

export async function getHospital(req: Request, res: Response) {
  const hospital = await prisma.hospital.findUnique({
    where: { id: String(req.params.id) },
    include: {
      departments: {
        include: {
          _count: { select: { beds: true, staff: true } },
        },
      },
      _count: { select: { staff: true, patients: true } },
    },
  });
  if (!hospital) { res.status(404).json({ error: 'Hospital not found' }); return; }
  res.json(hospital);
}

export async function updateHospital(req: Request, res: Response) {
  const hospital = await prisma.hospital.update({ where: { id: String(req.params.id) }, data: req.body });
  res.json(hospital);
}

// ─── DEPARTMENTS ──────────────────────────────────────────────────────────────

export async function createDepartment(req: Request, res: Response) {
  const { hospitalId, ...rest } = req.body;
  const resolvedHospitalId = hospitalId ?? req.user?.hospitalId;
  if (!resolvedHospitalId) {
    res.status(400).json({ error: 'hospitalId is required' });
    return;
  }
  const dept = await prisma.department.create({
    data: { ...rest, hospital: { connect: { id: resolvedHospitalId } } },
  });
  res.status(201).json(dept);
}

export async function getDepartments(req: Request, res: Response) {
  const hospitalId = qstr(req.query.hospitalId);
  const depts = await prisma.department.findMany({
    where: { hospitalId: hospitalId ?? req.user!.hospitalId ?? '' },
    include: {
      _count: { select: { beds: true, staff: true, visits: true } },
    },
  });
  res.json(depts);
}

// ─── BEDS ─────────────────────────────────────────────────────────────────────

export async function getBeds(req: Request, res: Response) {
  const departmentId = qstr(req.query.departmentId);
  const beds = await prisma.bed.findMany({
    where: departmentId ? { departmentId } : {},
    include: {
      admissions: {
        where: { status: 'ADMITTED' },
        include: { patient: { select: { firstName: true, lastName: true } } },
        take: 1,
      },
    },
  });
  res.json(beds);
}

export async function updateBedStatus(req: Request, res: Response) {
  const bed = await prisma.bed.update({
    where: { id: String(req.params.id) },
    data: { status: req.body.status },
  });
  res.json(bed);
}

export async function admitPatient(req: Request, res: Response) {
  const { patientId, visitId, bedId, estimatedDischarge } = req.body;
  await prisma.bed.update({ where: { id: bedId }, data: { status: 'OCCUPIED' } });
  const admission = await prisma.admission.create({
    data: {
      patient: { connect: { id: patientId } },
      bed: { connect: { id: bedId } },
      ...(visitId && { visit: { connect: { id: visitId } } }),
      estimatedDischarge: estimatedDischarge ? new Date(estimatedDischarge) : undefined,
    },
    include: { bed: { include: { department: true } }, patient: true },
  });
  res.status(201).json(admission);
}

export async function dischargePatient(req: Request, res: Response) {
  const { admissionId, dischargeNotes } = req.body;
  const admission = await prisma.admission.update({
    where: { id: admissionId },
    data: { status: 'DISCHARGED', dischargedAt: new Date(), dischargeNotes },
    include: { bed: true },
  });
  await prisma.bed.update({ where: { id: admission.bedId }, data: { status: 'AVAILABLE' } });
  res.json(admission);
}
