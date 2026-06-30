import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { qstr } from '../utils/query';

import * as auth from '../controllers/auth.controller';
import * as hospital from '../controllers/hospital.controller';
import * as patient from '../controllers/patient.controller';
import * as staff from '../controllers/staff.controller';
import * as visit from '../controllers/visit.controller';
import * as pharmacy from '../controllers/pharmacy.controller';
import * as lab from '../controllers/lab.controller';
import * as billing from '../controllers/billing.controller';

const r = Router();

// ─── AUTH ─────────────────────────────────────────────────────────────────────
r.post('/auth/login', auth.login);
r.get('/auth/me', authenticate, auth.getMe);
r.post('/auth/change-password', authenticate, auth.changePassword);
r.post('/auth/users', authenticate, authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN'), auth.createUser);

// ─── HOSPITALS ────────────────────────────────────────────────────────────────
r.get('/hospitals', authenticate, hospital.getHospitals);
r.post('/hospitals', authenticate, authorize('SUPER_ADMIN'), hospital.createHospital);
r.get('/hospitals/:id', authenticate, hospital.getHospital);
r.put('/hospitals/:id', authenticate, authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN'), hospital.updateHospital);

r.get('/departments', authenticate, hospital.getDepartments);
r.post('/departments', authenticate, authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN'), hospital.createDepartment);

r.get('/beds', authenticate, hospital.getBeds);
r.put('/beds/:id/status', authenticate, hospital.updateBedStatus);
r.post('/admissions', authenticate, authorize('DOCTOR', 'NURSE', 'HOSPITAL_ADMIN'), hospital.admitPatient);
r.post('/admissions/discharge', authenticate, authorize('DOCTOR', 'HOSPITAL_ADMIN'), hospital.dischargePatient);

// ─── PATIENTS ─────────────────────────────────────────────────────────────────
r.get('/patients', authenticate, patient.getPatients);
r.post('/patients', authenticate, patient.createPatient);
r.get('/patients/qr/:qr', authenticate, patient.getPatientByQR);
r.get('/patients/:id', authenticate, patient.getPatient);
r.put('/patients/:id', authenticate, patient.updatePatient);
r.post('/patients/:id/vitals', authenticate, patient.addVitalSigns);

// ─── STAFF & SHIFTS ────────────────────────────────────────────────────────────
r.get('/staff', authenticate, staff.getStaff);
r.post('/staff', authenticate, authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN'), staff.createStaff);
r.get('/staff/:id', authenticate, staff.getStaffMember);
r.put('/staff/:id', authenticate, authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN'), staff.updateStaff);

r.get('/shifts', authenticate, staff.getShifts);
r.post('/shifts', authenticate, authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN'), staff.createShift);
r.post('/attendance/clock-in', authenticate, staff.clockIn);
r.post('/attendance/clock-out', authenticate, staff.clockOut);
r.post('/leave', authenticate, staff.requestLeave);
r.put('/leave/:id', authenticate, authorize('HOSPITAL_ADMIN', 'SUPER_ADMIN'), staff.reviewLeave);

// ─── VISITS / EMR ─────────────────────────────────────────────────────────────
r.get('/visits', authenticate, visit.getVisits);
r.post('/visits', authenticate, authorize('DOCTOR'), visit.createVisit);
r.get('/visits/:id', authenticate, visit.getVisit);
r.put('/visits/:id', authenticate, authorize('DOCTOR'), visit.updateVisit);
r.post('/prescriptions', authenticate, authorize('DOCTOR'), visit.createPrescription);

// ─── PHARMACY ─────────────────────────────────────────────────────────────────
r.get('/drugs', authenticate, pharmacy.getDrugs);
r.post('/drugs', authenticate, authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'PHARMACIST'), pharmacy.createDrug);
r.get('/inventory', authenticate, pharmacy.getInventory);
r.post('/inventory', authenticate, authorize('PHARMACIST', 'HOSPITAL_ADMIN'), pharmacy.updateInventory);
r.post('/dispense', authenticate, authorize('PHARMACIST'), pharmacy.dispenseDrugs);

// ─── LAB & RADIOLOGY ──────────────────────────────────────────────────────────
r.post('/lab-orders', authenticate, authorize('DOCTOR'), lab.createLabOrder);
r.get('/lab-orders', authenticate, lab.getLabOrders);
r.post('/lab-orders/result', authenticate, authorize('LAB_TECHNICIAN'), lab.updateLabResult);

r.post('/radiology-orders', authenticate, authorize('DOCTOR'), lab.createRadiologyOrder);
r.get('/radiology-orders', authenticate, lab.getRadiologyOrders);
r.put('/radiology-orders/:id/report', authenticate, authorize('RADIOLOGIST', 'DOCTOR'), lab.submitRadiologyReport);

// ─── BILLING ──────────────────────────────────────────────────────────────────
r.post('/invoices', authenticate, authorize('ACCOUNTANT', 'RECEPTIONIST', 'HOSPITAL_ADMIN'), billing.createInvoice);
r.get('/invoices', authenticate, billing.getInvoices);
r.post('/payments', authenticate, authorize('ACCOUNTANT', 'RECEPTIONIST'), billing.recordPayment);

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
r.get('/dashboard/stats', authenticate, billing.getDashboardStats);

// ─── APPOINTMENTS ─────────────────────────────────────────────────────────────
r.get('/appointments', authenticate, async (req, res) => {
  const patientId = qstr(req.query.patientId);
  const doctorId = qstr(req.query.doctorId);
  const date = qstr(req.query.date);
  const { prisma } = await import('../utils/db');
  const where: Record<string, unknown> = {};
  if (patientId) where.patientId = patientId;
  if (doctorId) where.doctorId = doctorId;
  if (date) {
    const d = new Date(date);
    const next = new Date(d); next.setDate(next.getDate() + 1);
    where.scheduledAt = { gte: d, lt: next };
  }
  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      patient: { select: { firstName: true, lastName: true } },
      doctor: { select: { firstName: true, lastName: true, specialty: true } },
      department: { select: { name: true } },
    },
    orderBy: { scheduledAt: 'asc' },
  });
  res.json(appointments);
});

r.post('/appointments', authenticate, async (req, res) => {
  const { prisma } = await import('../utils/db');
  const { patientId, doctorId, departmentId, hospitalId, scheduledAt, ...rest } = req.body;
  const resolvedHospitalId = hospitalId ?? req.user?.hospitalId;
  if (!resolvedHospitalId) {
    res.status(400).json({ error: 'hospitalId is required' });
    return;
  }
  const appt = await prisma.appointment.create({
    data: {
      ...rest,
      patient: { connect: { id: patientId } },
      doctor: { connect: { id: doctorId } },
      department: { connect: { id: departmentId } },
      hospital: { connect: { id: resolvedHospitalId } },
      scheduledAt: new Date(scheduledAt),
    },
    include: {
      patient: { select: { firstName: true, lastName: true } },
      doctor: { select: { firstName: true, lastName: true } },
    },
  });
  res.status(201).json(appt);
});

r.put('/appointments/:id', authenticate, async (req, res) => {
  const { prisma } = await import('../utils/db');
  const appt = await prisma.appointment.update({
    where: { id: String(req.params.id) },
    data: req.body,
  });
  res.json(appt);
});

export default r;
