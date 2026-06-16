import { Request, Response } from 'express';
import { prisma } from '../server';
import { logger } from '../app';

export const createContact = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, phone, email, groupId } = req.body;
    if (!name || !phone) {
      res.status(400).json({ error: 'Name and phone are required' });
      return;
    }

    const contact = await prisma.contact.create({
      data: { name, phone, email, groupId }
    });

    res.status(201).json(contact);
  } catch (error) {
    logger.error(error, 'Error creating contact');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getContacts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { groupId } = req.query;
    
    const whereClause = groupId ? { groupId: String(groupId) } : {};

    const contacts = await prisma.contact.findMany({
      where: whereClause,
      include: {
        group: {
          select: { name: true }
        }
      }
    });
    
    res.status(200).json(contacts);
  } catch (error) {
    logger.error(error, 'Error getting contacts');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateContact = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, phone, email, groupId } = req.body;

    const contact = await prisma.contact.update({
      where: { id },
      data: { name, phone, email, groupId }
    });

    res.status(200).json(contact);
  } catch (error) {
    logger.error(error, 'Error updating contact');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteContact = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.contact.delete({ where: { id } });
    res.status(200).json({ message: 'Contact deleted successfully' });
  } catch (error) {
    logger.error(error, 'Error deleting contact');
    res.status(500).json({ error: 'Internal server error' });
  }
};

import * as xlsx from 'xlsx';
import csv from 'csv-parser';
import fs from 'fs';

export const importContacts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { groupId } = req.body;
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const file = req.file;
    const contactsToCreate: any[] = [];

    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      await new Promise<void>((resolve, reject) => {
        fs.createReadStream(file.path)
          .pipe(csv())
          .on('data', (data) => {
            if (data.name && data.phone) {
              contactsToCreate.push({
                name: data.name,
                phone: data.phone,
                email: data.email || null,
                groupId: groupId || null
              });
            }
          })
          .on('end', resolve)
          .on('error', reject);
      });
    } else {
      const workbook = xlsx.readFile(file.path);
      const sheetName = workbook.SheetNames[0];
      const sheetData = xlsx.utils.sheet_to_json<any>(workbook.Sheets[sheetName]);
      
      sheetData.forEach(data => {
        if (data.name && data.phone) {
          contactsToCreate.push({
            name: String(data.name),
            phone: String(data.phone),
            email: data.email ? String(data.email) : null,
            groupId: groupId || null
          });
        }
      });
    }

    if (contactsToCreate.length > 0) {
      // Use createMany to insert in bulk, ignore duplicates if possible
      // Prisma createMany skipDuplicates is supported on Postgres
      await prisma.contact.createMany({
        data: contactsToCreate,
        skipDuplicates: true
      });
    }

    // Clean up uploaded file
    fs.unlinkSync(file.path);

    res.status(200).json({ message: `Successfully imported ${contactsToCreate.length} contacts` });
  } catch (error) {
    logger.error(error, 'Error importing contacts');
    res.status(500).json({ error: 'Internal server error' });
  }
};
