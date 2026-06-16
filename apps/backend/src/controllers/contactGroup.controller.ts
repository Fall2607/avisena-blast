import { Request, Response } from 'express';
import { prisma } from '../server';
import { logger } from '../app';

export const createGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const group = await prisma.contactGroup.create({
      data: { name, description }
    });

    res.status(201).json(group);
  } catch (error) {
    logger.error(error, 'Error creating contact group');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getGroups = async (req: Request, res: Response): Promise<void> => {
  try {
    const groups = await prisma.contactGroup.findMany({
      include: {
        _count: {
          select: { contacts: true }
        }
      }
    });
    res.status(200).json(groups);
  } catch (error) {
    logger.error(error, 'Error getting contact groups');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const group = await prisma.contactGroup.update({
      where: { id },
      data: { name, description }
    });

    res.status(200).json(group);
  } catch (error) {
    logger.error(error, 'Error updating contact group');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.contactGroup.delete({ where: { id } });
    res.status(200).json({ message: 'Group deleted successfully' });
  } catch (error) {
    logger.error(error, 'Error deleting contact group');
    res.status(500).json({ error: 'Internal server error' });
  }
};
