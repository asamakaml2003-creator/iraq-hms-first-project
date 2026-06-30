import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from './db';

async function main() {
  console.log('Seeding Iraq HMS database...');

  // Create demo hospital
  const hospital = await prisma.hospital.upsert({
    where: { licenseNo: 'MOH-IQ-DEMO-001' },
    update: {},
    create: {
      name: 'Baghdad Teaching Hospital',
      nameAr: 'مستشفى بغداد التعليمي',
      city: 'Baghdad',
      address: 'Al-Bab Al-Muadham, Baghdad, Iraq',
      phone: '+964 1 416 0111',
      email: 'info@bth.iq',
      licenseNo: 'MOH-IQ-DEMO-001',
    },
  });
  console.log(`Hospital: ${hospital.name}`);

  // Create departments
  const deptData = [
    { name: 'Emergency', code: 'ER' },
    { name: 'General Medicine', code: 'GEN' },
    { name: 'Surgery', code: 'SURG' },
    { name: 'Pediatrics', code: 'PED' },
    { name: 'ICU', code: 'ICU' },
    { name: 'Pharmacy', code: 'PHARM' },
    { name: 'Laboratory', code: 'LAB' },
    { name: 'Radiology', code: 'RADIO' },
    { name: 'Nursing', code: 'NURS' },
    { name: 'Dentistry', code: 'DENT' },
    { name: 'Anesthesiology', code: 'ANES' },
  ];

  const depts: Record<string, string> = {};
  for (const d of deptData) {
    const dept = await prisma.department.upsert({
      where: { hospitalId_code: { hospitalId: hospital.id, code: d.code } },
      update: {},
      create: { ...d, hospitalId: hospital.id },
    });
    depts[d.code] = dept.id;
    console.log(`  Department: ${dept.name}`);
  }

  // Create beds for ER and ICU
  for (let i = 1; i <= 10; i++) {
    await prisma.bed.upsert({
      where: { departmentId_number: { departmentId: depts['ER'], number: String(i) } },
      update: {},
      create: { number: String(i), departmentId: depts['ER'] },
    });
  }
  for (let i = 1; i <= 8; i++) {
    await prisma.bed.upsert({
      where: { departmentId_number: { departmentId: depts['ICU'], number: String(i) } },
      update: {},
      create: { number: String(i), departmentId: depts['ICU'] },
    });
  }
  console.log('  Beds: 18 beds created (ER + ICU)');

  // Create staff
  const doctorData = [
    { firstName: 'Ahmed', lastName: 'Al-Rashidi', nameAr: 'أحمد الراشدي', specialty: 'Emergency Medicine', deptCode: 'ER' },
    { firstName: 'Sarah', lastName: 'Hassan', nameAr: 'سارة حسن', specialty: 'General Medicine', deptCode: 'GEN' },
    { firstName: 'Omar', lastName: 'Khalil', nameAr: 'عمر خليل', specialty: 'Surgery', deptCode: 'SURG' },
    { firstName: 'Fatima', lastName: 'Al-Zubaidi', nameAr: 'فاطمة الزبيدي', specialty: 'Pediatrics', deptCode: 'PED' },
    { firstName: 'Ali', lastName: 'Mohammed', nameAr: 'علي محمد', specialty: 'Anesthesiology', deptCode: 'ANES' },
  ];

  const staffIds: string[] = [];
  for (const d of doctorData) {
    const staff = await prisma.staff.create({
      data: {
        firstName: d.firstName,
        lastName: d.lastName,
        nameAr: d.nameAr,
        gender: 'MALE',
        phone: '07X-XXX-XXXX',
        specialty: d.specialty,
        licenseNo: `IQ-2020-${Math.floor(Math.random() * 90000) + 10000}`,
        hospitalId: hospital.id,
        departmentId: depts[d.deptCode],
      },
    });
    staffIds.push(staff.id);
    console.log(`  Staff: Dr. ${staff.firstName} ${staff.lastName}`);
  }

  // Create users for each doctor
  const passwordHash = await bcrypt.hash('doctor123', 12);

  await prisma.user.upsert({
    where: { email: 'admin@bth.iq' },
    update: {},
    create: {
      email: 'admin@bth.iq',
      passwordHash: await bcrypt.hash('admin123', 12),
      role: 'HOSPITAL_ADMIN',
    },
  });

  for (let i = 0; i < doctorData.length; i++) {
    await prisma.user.upsert({
      where: { email: `${doctorData[i].lastName.toLowerCase().replace(/[^a-z]/g, '')}@bth.iq` },
      update: {},
      create: {
        email: `${doctorData[i].lastName.toLowerCase().replace(/[^a-z]/g, '')}@bth.iq`,
        passwordHash,
        role: 'DOCTOR',
        staffId: staffIds[i],
      },
    });
  }

  // Super admin
  await prisma.user.upsert({
    where: { email: 'superadmin@iraq-hms.iq' },
    update: {},
    create: {
      email: 'superadmin@iraq-hms.iq',
      passwordHash: await bcrypt.hash('superadmin123', 12),
      role: 'SUPER_ADMIN',
    },
  });

  // Create sample drugs
  const drugs = [
    { genericName: 'Amoxicillin', brandName: 'Amoxil', category: 'Antibiotics', unit: 'mg' },
    { genericName: 'Paracetamol', brandName: 'Panadol', category: 'Analgesics', unit: 'mg' },
    { genericName: 'Metformin', brandName: 'Glucophage', category: 'Antidiabetics', unit: 'mg' },
    { genericName: 'Amlodipine', brandName: 'Norvasc', category: 'Antihypertensives', unit: 'mg' },
    { genericName: 'Omeprazole', brandName: 'Losec', category: 'Gastrointestinal', unit: 'mg' },
    { genericName: 'Insulin Glargine', brandName: 'Lantus', category: 'Antidiabetics', unit: 'IU' },
    { genericName: 'Normal Saline 0.9%', brandName: 'NS', category: 'IV Fluids', unit: 'ml' },
    { genericName: 'Ceftriaxone', brandName: 'Rocephin', category: 'Antibiotics', unit: 'g' },
  ];

  for (const drug of drugs) {
    const d = await prisma.drug.create({ data: drug });
    await prisma.drugInventory.create({
      data: {
        drugId: d.id,
        hospitalId: hospital.id,
        quantity: 500,
        minimumStock: 50,
        expiryDate: new Date('2026-12-31'),
        batchNo: 'BATCH-2025-001',
        supplier: 'Iraq Medical Supplies',
      },
    });
  }
  console.log(`  Drugs: ${drugs.length} drugs + inventory created`);

  console.log('\n✅ Seed complete!');
  console.log('\n📋 Login Credentials:');
  console.log('  Super Admin:    superadmin@iraq-hms.iq  / superadmin123');
  console.log('  Hospital Admin: admin@bth.iq            / admin123');
  console.log('  Doctors:        alrashidi@bth.iq        / doctor123');
  console.log('                  hassan@bth.iq           / doctor123');
  console.log('                  khalil@bth.iq           / doctor123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
