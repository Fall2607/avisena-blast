import { Request, Response } from 'express';
import { prisma } from '../server';
import { logger } from '../app';

export const createTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, message, variables } = req.body;
    if (!name || !message) {
      res.status(400).json({ error: 'Name and message are required' });
      return;
    }

    // variables should be an array of strings like ["nama", "tanggal"]
    const template = await prisma.template.create({
      data: { name, message, variables: variables || [] }
    });

    res.status(201).json(template);
  } catch (error) {
    logger.error(error, 'Error creating template');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTemplates = async (req: Request, res: Response): Promise<void> => {
  try {
    const templates = await prisma.template.findMany();
    res.status(200).json(templates);
  } catch (error) {
    logger.error(error, 'Error getting templates');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, message, variables } = req.body;

    const template = await prisma.template.update({
      where: { id },
      data: { name, message, variables }
    });

    res.status(200).json(template);
  } catch (error) {
    logger.error(error, 'Error updating template');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.template.delete({ where: { id } });
    res.status(200).json({ message: 'Template deleted successfully' });
  } catch (error) {
    logger.error(error, 'Error deleting template');
    res.status(500).json({ error: 'Internal server error' });
  }
};
