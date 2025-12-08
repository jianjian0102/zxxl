import {
  users, appointments, announcements, messages, conversations, scheduleSettings, blockedDates,
  type User, type InsertUser,
  type Appointment, type InsertAppointment,
  type Announcement, type InsertAnnouncement,
  type Message, type InsertMessage,
  type Conversation, type InsertConversation,
  type ScheduleSetting, type InsertScheduleSetting,
  type BlockedDate, type InsertBlockedDate,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, asc, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  searchUsersByEmail(emailQuery: string): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  createVisitorUser(data: { email: string; password: string; name: string }): Promise<User>;

  // Appointments
  getAppointments(): Promise<Appointment[]>;
  getAppointment(id: string): Promise<Appointment | undefined>;
  getAppointmentsByEmail(email: string): Promise<Appointment[]>;
  getAppointmentsByUserId(userId: string, email?: string | null): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: string, data: Partial<InsertAppointment>): Promise<Appointment | undefined>;
  updateAppointmentStatus(id: string, status: "pending" | "confirmed" | "cancelled" | "completed"): Promise<Appointment | undefined>;
  checkTimeSlotAvailable(date: string, time: string, excludeAppointmentId?: string): Promise<boolean>;
  getBookedSlots(date: string): Promise<string[]>;
  linkAppointmentsToUser(email: string, userId: string): Promise<void>;

  // Announcements
  getAnnouncements(): Promise<Announcement[]>;
  getAnnouncement(id: string): Promise<Announcement | undefined>;
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;
  updateAnnouncement(id: string, data: Partial<InsertAnnouncement>): Promise<Announcement | undefined>;
  deleteAnnouncement(id: string): Promise<boolean>;

  // Messages & Conversations
  getConversations(): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation | undefined>;
  getConversationByEmail(email: string): Promise<Conversation | undefined>;
  getConversationsByUserId(userId: string, email?: string | null): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getMessagesByConversation(conversationId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessagesAsRead(conversationId: string): Promise<void>;
  resolveConversation(id: string): Promise<Conversation | undefined>;
  linkConversationsToUser(email: string, userId: string): Promise<void>;

  // Schedule Settings
  getScheduleSettings(): Promise<ScheduleSetting[]>;
  getScheduleSettingsByDay(dayOfWeek: number): Promise<ScheduleSetting[]>;
  createScheduleSetting(setting: InsertScheduleSetting): Promise<ScheduleSetting>;
  updateScheduleSetting(id: string, data: Partial<InsertScheduleSetting>): Promise<ScheduleSetting | undefined>;
  deleteScheduleSetting(id: string): Promise<boolean>;
  initializeDefaultSchedule(): Promise<void>;

  // Blocked Dates
  getBlockedDates(): Promise<BlockedDate[]>;
  isDateBlocked(date: string): Promise<boolean>;
  createBlockedDate(blockedDate: InsertBlockedDate): Promise<BlockedDate>;
  deleteBlockedDate(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async searchUsersByEmail(emailQuery: string): Promise<User[]> {
    return db
      .select()
      .from(users)
      .where(sql`${users.email} ILIKE ${'%' + emailQuery + '%'}`);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createVisitorUser(data: { email: string; password: string; name: string }): Promise<User> {
    const [user] = await db.insert(users).values({
      email: data.email,
      password: data.password,
      name: data.name,
      role: "client",
    }).returning();
    return user;
  }

  // Appointments
  async getAppointments(): Promise<Appointment[]> {
    return db.select().from(appointments).orderBy(desc(appointments.createdAt));
  }

  async getAppointment(id: string): Promise<Appointment | undefined> {
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
    return appointment || undefined;
  }

  async getAppointmentsByEmail(email: string): Promise<Appointment[]> {
    return db
      .select()
      .from(appointments)
      .where(eq(appointments.contactEmail, email))
      .orderBy(desc(appointments.appointmentDate), desc(appointments.appointmentTime));
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const [created] = await db.insert(appointments).values(appointment).returning();
    return created;
  }

  async updateAppointment(id: string, data: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    const [updated] = await db
      .update(appointments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(appointments.id, id))
      .returning();
    return updated || undefined;
  }

  async updateAppointmentStatus(id: string, status: "pending" | "confirmed" | "cancelled" | "completed"): Promise<Appointment | undefined> {
    const [updated] = await db
      .update(appointments)
      .set({ status, updatedAt: new Date() })
      .where(eq(appointments.id, id))
      .returning();
    return updated || undefined;
  }

  async checkTimeSlotAvailable(date: string, time: string, excludeAppointmentId?: string): Promise<boolean> {
    const conditions = [
      eq(appointments.appointmentDate, date),
      eq(appointments.appointmentTime, time),
      or(
        eq(appointments.status, "pending"),
        eq(appointments.status, "confirmed")
      )
    ];
    
    const existing = await db
      .select()
      .from(appointments)
      .where(and(...conditions));
    
    if (excludeAppointmentId) {
      return existing.filter(a => a.id !== excludeAppointmentId).length === 0;
    }
    return existing.length === 0;
  }

  async getBookedSlots(date: string): Promise<string[]> {
    const booked = await db
      .select({ time: appointments.appointmentTime })
      .from(appointments)
      .where(
        and(
          eq(appointments.appointmentDate, date),
          or(
            eq(appointments.status, "pending"),
            eq(appointments.status, "confirmed")
          )
        )
      );
    return booked.map(b => {
      const time = b.time;
      if (time.length > 5 && time.includes(':')) {
        return time.substring(0, 5);
      }
      return time;
    });
  }

  async getAppointmentsByUserId(userId: string, email?: string | null): Promise<Appointment[]> {
    if (email) {
      return db
        .select()
        .from(appointments)
        .where(
          or(
            eq(appointments.userId, userId),
            eq(appointments.contactEmail, email)
          )
        )
        .orderBy(desc(appointments.appointmentDate), desc(appointments.appointmentTime));
    }
    return db
      .select()
      .from(appointments)
      .where(eq(appointments.userId, userId))
      .orderBy(desc(appointments.appointmentDate), desc(appointments.appointmentTime));
  }

  async linkAppointmentsToUser(email: string, userId: string): Promise<void> {
    await db
      .update(appointments)
      .set({ userId })
      .where(eq(appointments.contactEmail, email));
  }

  // Announcements
  async getAnnouncements(): Promise<Announcement[]> {
    return db
      .select()
      .from(announcements)
      .orderBy(desc(announcements.isPinned), desc(announcements.createdAt));
  }

  async getAnnouncement(id: string): Promise<Announcement | undefined> {
    const [announcement] = await db.select().from(announcements).where(eq(announcements.id, id));
    return announcement || undefined;
  }

  async createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement> {
    const [created] = await db.insert(announcements).values(announcement).returning();
    return created;
  }

  async updateAnnouncement(id: string, data: Partial<InsertAnnouncement>): Promise<Announcement | undefined> {
    const [updated] = await db
      .update(announcements)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(announcements.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteAnnouncement(id: string): Promise<boolean> {
    const result = await db.delete(announcements).where(eq(announcements.id, id)).returning();
    return result.length > 0;
  }

  // Conversations & Messages
  async getConversations(): Promise<Conversation[]> {
    return db.select().from(conversations).orderBy(desc(conversations.updatedAt));
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation || undefined;
  }

  async getConversationByEmail(email: string): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.visitorEmail, email));
    return conversation || undefined;
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [created] = await db.insert(conversations).values(conversation).returning();
    return created;
  }

  async getMessagesByConversation(conversationId: string): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [created] = await db.insert(messages).values(message).returning();
    // Update conversation's updatedAt
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, message.conversationId));
    return created;
  }

  async markMessagesAsRead(conversationId: string): Promise<void> {
    await db
      .update(messages)
      .set({ isRead: true })
      .where(eq(messages.conversationId, conversationId));
  }

  async resolveConversation(id: string): Promise<Conversation | undefined> {
    const [updated] = await db
      .update(conversations)
      .set({ isResolved: true, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    return updated || undefined;
  }

  async getConversationsByUserId(userId: string, email?: string | null): Promise<Conversation[]> {
    if (email) {
      return db
        .select()
        .from(conversations)
        .where(
          or(
            eq(conversations.userId, userId),
            eq(conversations.visitorEmail, email)
          )
        )
        .orderBy(desc(conversations.updatedAt));
    }
    return db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt));
  }

  async linkConversationsToUser(email: string, userId: string): Promise<void> {
    await db
      .update(conversations)
      .set({ userId })
      .where(eq(conversations.visitorEmail, email));
  }

  // Schedule Settings
  async getScheduleSettings(): Promise<ScheduleSetting[]> {
    return db.select().from(scheduleSettings).orderBy(scheduleSettings.dayOfWeek, scheduleSettings.timeSlot);
  }

  async getScheduleSettingsByDay(dayOfWeek: number): Promise<ScheduleSetting[]> {
    return db
      .select()
      .from(scheduleSettings)
      .where(and(eq(scheduleSettings.dayOfWeek, dayOfWeek), eq(scheduleSettings.isActive, true)))
      .orderBy(scheduleSettings.timeSlot);
  }

  async createScheduleSetting(setting: InsertScheduleSetting): Promise<ScheduleSetting> {
    const [created] = await db.insert(scheduleSettings).values(setting).returning();
    return created;
  }

  async updateScheduleSetting(id: string, data: Partial<InsertScheduleSetting>): Promise<ScheduleSetting | undefined> {
    const [updated] = await db
      .update(scheduleSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(scheduleSettings.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteScheduleSetting(id: string): Promise<boolean> {
    const result = await db.delete(scheduleSettings).where(eq(scheduleSettings.id, id)).returning();
    return result.length > 0;
  }

  async initializeDefaultSchedule(): Promise<void> {
    const existing = await db.select().from(scheduleSettings).limit(1);
    if (existing.length > 0) return;

    const defaultSlots = ["10:00", "11:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];
    const workdays = [1, 2, 3, 4, 5];

    for (const day of workdays) {
      for (const slot of defaultSlots) {
        const isOfflineAvailable = !["18:00", "19:00"].includes(slot);
        await db.insert(scheduleSettings).values({
          dayOfWeek: day,
          timeSlot: slot,
          isOnlineAvailable: true,
          isOfflineAvailable: isOfflineAvailable,
          isActive: true,
        });
      }
    }
  }

  // Blocked Dates
  async getBlockedDates(): Promise<BlockedDate[]> {
    return db.select().from(blockedDates).orderBy(desc(blockedDates.date));
  }

  async isDateBlocked(date: string): Promise<boolean> {
    const [blocked] = await db.select().from(blockedDates).where(eq(blockedDates.date, date));
    return !!blocked;
  }

  async createBlockedDate(blockedDate: InsertBlockedDate): Promise<BlockedDate> {
    const [created] = await db.insert(blockedDates).values(blockedDate).returning();
    return created;
  }

  async deleteBlockedDate(id: string): Promise<boolean> {
    const result = await db.delete(blockedDates).where(eq(blockedDates.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
