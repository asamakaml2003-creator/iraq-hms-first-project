import { Request, Response } from 'express';
import { prisma } from '../utils/db';

export async function createDrug(req: Request, res: Response) {
  const drug = await prisma.drug.create({ data: req.body });
  res.status(201).json(drug);
}

export async function getDrugs(req: Request, res: Response) {
  const { search, category } = req.query;
  const where: Record<string, unknown> = { isActive: true };
  if (search) {
    where.OR = [
      { genericName: { contains: String(search), mode: 'insensitive' } },
      { brandName: { contains: String(search), mode: 'insensitive' } },
    ];
  }
  if (category) where.category = category;
  const drugs = await prisma.drug.findMany({ where, orderBy: { genericName: 'asc' } });
  res.json(drugs);
}

export async function getInventory(req: Request, res: Response) {
  const { hospitalId } = req.query;
  const inventory = await prisma.drugInventory.findMany({
    where: {
      hospitalId: String(hospitalId ?? req.user!.hospitalId),
      expiryDate: { gte: new Date() },
    },
    include: { drug: true },
    orderBy: { expiryDate: 'asc' },
  });
  const lowStock = inventory.filter(i => i.quantity <= i.minimumStock);
  res.json({ inventory, lowStock });
}

export async function updateInventory(req: Request, res: Response) {
  const { drugId, quantity, expiryDate, batchNo, supplier, unitCost } = req.body;
  const hospitalId = req.body.hospitalId ?? req.user!.hospitalId;
  const entry = await prisma.drugInventory.upsert({
    where: { drugId_hospitalId_batchNo: { drugId, hospitalId, batchNo: batchNo ?? '' } },
    update: { quantity: { increment: quantity } },
    create: { drugId, hospitalId, quantity, expiryDate: new Date(expiryDate), batchNo, supplier, unitCost },
    include: { drug: true },
  });
  res.json(entry);
}

export async function dispenseDrugs(req: Request, res: Response) {
  const { prescriptionId, items } = req.body;
  const dispensedBy = req.user!.staffId!;

  const results = await Promise.all(
    items.map(async (item: { drugId: string; quantity: number }) => {
      const inventory = await prisma.drugInventory.findFirst({
        where: {
          drugId: item.drugId,
          hospitalId: req.user!.hospitalId,
          quantity: { gte: item.quantity },
          expiryDate: { gte: new Date() },
        },
        orderBy: { expiryDate: 'asc' },
      });
      if (!inventory) throw new Error(`Insufficient stock for drug ${item.drugId}`);
      await prisma.drugInventory.update({
        where: { id: inventory.id },
        data: { quantity: { decrement: item.quantity } },
      });
      return prisma.drugDispensing.create({
        data: {
          prescription: { connect: { id: prescriptionId } },
          drug: { connect: { id: item.drugId } },
          quantity: item.quantity,
          dispensedBy,
        },
      });
    })
  );
  res.status(201).json(results);
}
