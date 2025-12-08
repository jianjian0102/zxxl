import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, date, time, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["admin", "client"]);
export const consultationTypeEnum = pgEnum("consultation_type", ["regular", "welfare"]);
export const consultationModeEnum = pgEnum("consultation_mode", ["online", "offline"]);
export const appointmentStatusEnum = pgEnum("appointment_status", ["pending", "pending_payment", "confirmed", "cancelled", "completed"]);
export const genderEnum = pgEnum("gender", ["male", "female", "other"]);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: userRoleEnum("role").notNull().default("client"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Appointments table
export const appointments = pgTable("appointments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Scheduling
  appointmentDate: date("appointment_date").notNull(),
  appointmentTime: time("appointment_time").notNull(),
  consultationType: consultationTypeEnum("consultation_type").notNull(),
  consultationMode: consultationModeEnum("consultation_mode").notNull(),
  status: appointmentStatusEnum("status").notNull().default("pending"),
  
  // Personal info
  name: text("name").notNull(),
  gender: genderEnum("gender").notNull(),
  birthDate: date("birth_date").notNull(),
  occupation: text("occupation"),
  hobbies: text("hobbies"),
  
  // Contact info
  contactPhone: text("contact_phone").notNull(),
  contactEmail: text("contact_email"),
  emergencyContact: text("emergency_contact"),
  
  // Counseling history
  hasPreviousCounseling: boolean("has_previous_counseling").notNull().default(false),
  previousCounselingDetails: text("previous_counseling_details"),
  hasMentalDiagnosis: boolean("has_mental_diagnosis").notNull().default(false),
  mentalDiagnosisDetails: text("mental_diagnosis_details"),
  currentMedication: text("current_medication"),
  
  // Consultation focus (stored as JSON array)
  consultationTopics: text("consultation_topics").array(),
  situationDescription: text("situation_description").notNull(),
  
  // Agreements
  dataCollectionConsent: boolean("data_collection_consent").notNull().default(false),
  confidentialityConsent: boolean("confidentiality_consent").notNull().default(false),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Announcements table
export const announcements = pgTable("announcements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull(),
  isPinned: boolean("is_pinned").notNull().default(false),
  authorId: varchar("author_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Messages table
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull(),
  senderName: text("sender_name").notNull(),
  senderEmail: text("sender_email"),
  content: text("content").notNull(),
  isFromAdmin: boolean("is_from_admin").notNull().default(false),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Conversations table (to group messages)
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  visitorName: text("visitor_name").notNull(),
  visitorEmail: text("visitor_email"),
  subject: text("subject"),
  isResolved: boolean("is_resolved").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Schedule settings table (admin configurable time slots)
export const scheduleSettings = pgTable("schedule_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dayOfWeek: integer("day_of_week").notNull(), // 0-6, 0=Sunday
  timeSlot: text("time_slot").notNull(), // e.g. "10:00"
  isOnlineAvailable: boolean("is_online_available").notNull().default(true),
  isOfflineAvailable: boolean("is_offline_available").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Blocked dates table (for holidays or specific days off)
export const blockedDates = pgTable("blocked_dates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: date("date").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  announcements: many(announcements),
}));

export const announcementsRelations = relations(announcements, ({ one }) => ({
  author: one(users, {
    fields: [announcements.authorId],
    references: [users.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ many }) => ({
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
});

export const insertAnnouncementSchema = createInsertSchema(announcements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
  isRead: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isResolved: true,
});

export const insertScheduleSettingSchema = createInsertSchema(scheduleSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBlockedDateSchema = createInsertSchema(blockedDates).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;

export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type Announcement = typeof announcements.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

export type InsertScheduleSetting = z.infer<typeof insertScheduleSettingSchema>;
export type ScheduleSetting = typeof scheduleSettings.$inferSelect;

export type InsertBlockedDate = z.infer<typeof insertBlockedDateSchema>;
export type BlockedDate = typeof blockedDates.$inferSelect;
