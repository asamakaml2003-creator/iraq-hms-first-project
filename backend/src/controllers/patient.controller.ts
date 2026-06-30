import { Request, Response } from 'express';
import { prisma } from '../utils/db';
import { qstr } from '../utils/query';
import crypto from 'crypto';

export async function createPatient(req: Request, res: Response) {
  const {
    nationalId, firstName, lastName, nameAr, gender, dateOfBirth, bloodType,
    phone, address, email, hospitalId, emergencyContact, emergencyPhone,
    chronicDiseases, allergies, pastSurgeries, familyHistory, currentMedications,
  } = req.body;

  const resolvedHospitalId = hospitalId ?? req.user?.hospitalId;
  if (!resolvedHospitalId) {
    res.status(400).json({ error: 'hospitalId is required' });
    return;
  }

  const qrCode = crypto.randomUUID();
  const patient = await prisma.patient.create({
    data: {
      nationalId, firstName, lastName, nameAr, gender, dateOfBirth: new Date(dateOfBirth),
      bloodType, phone, address, email,
      hospital: { connect: { id: resolvedHospitalId } },
      emergencyContact, emergencyPhone,
      chronicDiseases: chronicDiseases ?? [],
      allergies: allergies ?? [],
      pastSurgeries: pastSurgeries ?? [],
      familyHistory, currentMedications: currentMedications ?? [],
      qrCode,
    },
  });
  res.status(201).json(patient);
}

export async function getPatients(req: Request, res: Response) {
  const search = qstr(req.query.search);
  const hospitalId = qstr(req.query.hospitalId);
  const page = qstr(req.query.page) ?? '1';
  const limit = qstr(req.query.limit) ?? '20';
  const skip = (Number(page) - 1) * Number(limit);
  const where: Record<string, unknown> = {
    hospitalId: hospitalId ?? req.user!.hospitalId,
  };
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { nationalId: { contains: search } },
      { phone: { contains: search } },
      { qrCode: search },
    ];
  }
  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, firstName: true, lastName: true, nameAr: true,
        nationalId: true, gender: true, dateOfBirth: true, bloodType: true,
        phone: true, qrCode: true, createdAt: true,
        _count: { select: { visits: true } },
      },
    }),
    prisma.patient.count({ where }),
  ]);
  res.json({ patients, total, page: Number(page), limit: Number(limit) });
}

export async function getPatient(req: Request, res: Response) {
  const patient = await prisma.patient.findUnique({
    where: { id: String(req.params.id) },
    include: {
      vitalSigns: { orderBy: { recordedAt: 'desc' }, take: 10 },
      documents: { orderBy: { uploadedAt: 'desc' } },
      visits: {
        orderBy: { visitDate: 'desc' },
        take: 10,
        include: {
          doctor: { select: { firstName: true, lastName: true, specialty: true } },
          department: { select: { name: true } },
          prescriptions: { include: { items: { include: { drug: true } } } },
        },
      },
      admissions: {
        orderBy: { admittedAt: 'desc' },
        take: 5,
        include: { bed: { include: { department: true } } },
      },
    },
  });
  if (!patient) { res.status(404).json({ error: 'Patient not found' }); return; }
  res.json(patient);
}

export async function updatePatient(req: Request, res: Response) {
  const { hospitalId, dateOfBirth, ...rest } = req.body;
  const patient = await prisma.patient.update({
    where: { id: String(req.params.id) },
    data: {
      ...rest,
      ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
      ...(hospitalId && { hospital: { connect: { id: hospitalId } } }),
    },
  });
  res.json(patient);
}

export async function addVitalSigns(req: Request, res: Response) {
  const vital = await prisma.vitalSign.create({
    data: {
      ...req.body,
      patient: { connect: { id: String(req.params.id) } },
      recordedBy: req.user?.staffId,
    },
  });
  res.status(201).json(vital);
}

export async function getPatientByQR(req: Request, res: Response) {
  const patient = await prisma.patient.findUnique({
    where: { qrCode: String(req.params.qr) },
    select: {
      id: true, firstName: true, lastName: true, nationalId: true,
      bloodType: true, allergies: true, chronicDiseases: true,
    },
  });
  if (!patient) { res.status(404).json({ error: 'Patient not found' }); return; }
  res.json(patient);
}
