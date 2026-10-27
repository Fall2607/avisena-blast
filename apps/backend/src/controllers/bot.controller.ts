import { Request, Response } from 'express';
import { prisma } from '../server';
import { logger } from '../app';

export const getBotRules = async (req: Request, res: Response): Promise<void> => {
  try {
    const rules = await prisma.botRule.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(rules);
  } catch (error) {
    logger.error(error, 'Error fetching bot rules');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createBotRule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, triggerType, keywords, response, isActive, sessionId, buttons } = req.body;

    if (!name || !response) {
      res.status(400).json({ error: 'Name and response are required' });
      return;
    }

    if (triggerType !== 'FALLBACK' && !keywords) {
      res.status(400).json({ error: 'Keywords are required for non-fallback rules' });
      return;
    }

    const rule = await prisma.botRule.create({
      data: {
        name,
        triggerType: triggerType || 'EXACT',
        keywords: keywords || '',
        response,
        buttons: buttons ? (typeof buttons === 'string' ? buttons : JSON.stringify(buttons)) : null,
        isActive: isActive !== undefined ? isActive : true,
        sessionId: sessionId && sessionId !== 'ALL' ? sessionId : null
      }
    });

    res.status(201).json({ message: 'Bot rule created successfully', rule });
  } catch (error) {
    logger.error(error, 'Error creating bot rule');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateBotRule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, triggerType, keywords, response, isActive, sessionId, buttons } = req.body;

    const existingRule = await prisma.botRule.findUnique({ where: { id } });
    if (!existingRule) {
      res.status(404).json({ error: 'Bot rule not found' });
      return;
    }

    const updated = await prisma.botRule.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(triggerType && { triggerType }),
        ...(keywords !== undefined && { keywords }),
        ...(response && { response }),
        ...(buttons !== undefined && { buttons: buttons ? (typeof buttons === 'string' ? buttons : JSON.stringify(buttons)) : null }),
        ...(isActive !== undefined && { isActive }),
        ...(sessionId !== undefined && { sessionId: sessionId && sessionId !== 'ALL' ? sessionId : null })
      }
    });

    res.status(200).json({ message: 'Bot rule updated successfully', rule: updated });
  } catch (error) {
    logger.error(error, 'Error updating bot rule');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteBotRule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existingRule = await prisma.botRule.findUnique({ where: { id } });
    if (!existingRule) {
      res.status(404).json({ error: 'Bot rule not found' });
      return;
    }

    await prisma.botRule.delete({ where: { id } });
    res.status(200).json({ message: 'Bot rule deleted successfully' });
  } catch (error) {
    logger.error(error, 'Error deleting bot rule');
    res.status(500).json({ error: 'Internal server error' });
  }
};
