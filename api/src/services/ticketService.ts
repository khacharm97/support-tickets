import { TicketModel, CreateTicketInput, UpdateTicketInput } from '../models/ticket';
import { logger } from '../config/logger';

export class TicketService {
  static async listTickets(page: number = 1, limit: number = 10) {
    return TicketModel.findAll(page, limit);
  }

  static async getTicket(id: number) {
    return TicketModel.findById(id);
  }

  static async createTicket(input: CreateTicketInput) {
    const ticket = await TicketModel.create(input);
    logger.info(`Created ticket ${ticket.id}`);
    return ticket;
  }

  static async updateTicket(id: number, input: UpdateTicketInput) {
    const updated = await TicketModel.update(id, input);
    if (updated) {
      logger.info(`Updated ticket ${id}`);
    }
    return updated;
  }

  static async deleteTicket(id: number) {
    const deleted = await TicketModel.softDelete(id);
    if (deleted) {
      logger.info(`Deleted ticket ${id}`);
    }
    return deleted;
  }
}

