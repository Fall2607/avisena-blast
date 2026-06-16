import { Request, Response } from 'express';
import { prisma } from '../server';
import { blastQueue } from '../jobs/queue';
import { logger } from '../app';

export const createCampaign = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, templateId, groupId, sessionName, minDelaySec = 5, maxDelaySec = 15, scheduledAt } = req.body;

    if (!name || !templateId || !groupId || !sessionName) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const template = await prisma.template.findUnique({ where: { id: templateId } });
    if (!template) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    const contacts = await prisma.contact.findMany({ where: { groupId } });
    if (contacts.length === 0) {
      res.status(400).json({ error: 'No contacts found in the selected group' });
      return;
    }

    const campaign = await prisma.campaign.create({
      data: {
        name,
        templateId,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: scheduledAt ? 'SCHEDULED' : 'RUNNING'
      }
    });

    const recipientsData = contacts.map(contact => ({
      campaignId: campaign.id,
      contactId: contact.id,
      status: 'PENDING'
    }));

    await prisma.campaignRecipient.createMany({ data: recipientsData });

    // Fetch created recipients to get their IDs
    const recipients = await prisma.campaignRecipient.findMany({
      where: { campaignId: campaign.id },
      include: { contact: true }
    });

    // Prepare jobs
    const jobs = recipients.map(recipient => {
      // Personalization
      let personalizedMessage = template.message;
      if (template.variables) {
        (template.variables as string[]).forEach(variable => {
          if (variable === 'nama') {
            personalizedMessage = personalizedMessage.replace(new RegExp(`{{${variable}}}`, 'g'), recipient.contact.name || '');
          } else if (variable === 'tanggal') {
            personalizedMessage = personalizedMessage.replace(new RegExp(`{{${variable}}}`, 'g'), new Date().toLocaleDateString('id-ID'));
          } else if (variable === 'email') {
            personalizedMessage = personalizedMessage.replace(new RegExp(`{{${variable}}}`, 'g'), recipient.contact.email || '');
          }
          // Add more mappings as needed
        });
      }

      return {
        name: 'sendBlast',
        data: {
          sessionId: sessionName,
          recipientId: recipient.id,
          phone: recipient.contact.phone,
          message: personalizedMessage,
          minDelaySec,
          maxDelaySec
        },
        opts: scheduledAt ? { delay: new Date(scheduledAt).getTime() - Date.now() } : {}
      };
    });

    // Add jobs to BullMQ
    await blastQueue.addBulk(jobs);

    if (scheduledAt) {
      res.status(201).json({ message: 'Campaign scheduled', campaignId: campaign.id });
    } else {
      res.status(201).json({ message: 'Campaign started', campaignId: campaign.id });
    }
  } catch (error) {
    logger.error(error, 'Error creating campaign');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCampaigns = async (req: Request, res: Response): Promise<void> => {
  try {
    const campaigns = await prisma.campaign.findMany({
      include: {
        template: { select: { name: true } },
        _count: { select: { recipients: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(campaigns);
  } catch (error) {
    logger.error(error, 'Error getting campaigns');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCampaignRecipients = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const recipients = await prisma.campaignRecipient.findMany({
      where: { campaignId: id },
      include: { contact: true }
    });
    res.status(200).json(recipients);
  } catch (error) {
    logger.error(error, 'Error getting campaign recipients');
    res.status(500).json({ error: 'Internal server error' });
  }
};
