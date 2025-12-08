import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertAppointmentSchema,
  insertAnnouncementSchema,
  insertMessageSchema,
  insertConversationSchema,
  insertScheduleSettingSchema,
  insertBlockedDateSchema,
} from "@shared/schema";
import { z } from "zod";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import bcrypt from "bcrypt";

const ADMIN_USERNAME = "jianjian0102";
const ADMIN_PASSWORD_HASH = "$2b$10$ZDkMBlEUgct87nL49LFAku7WHpM6zDRcKBmAIZ4EyLVDZSQbgQEWu";

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.isAdmin) {
    return res.status(401).json({ error: "未授权访问" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // ============ ADMIN AUTH API ============

  app.post("/api/admin/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "请输入用户名和密码" });
      }
      
      if (username !== ADMIN_USERNAME) {
        return res.status(401).json({ error: "用户名或密码错误" });
      }
      
      const isValidPassword = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
      if (!isValidPassword) {
        return res.status(401).json({ error: "用户名或密码错误" });
      }
      
      req.session.isAdmin = true;
      res.json({ success: true, message: "登录成功" });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "登录失败" });
    }
  });

  app.post("/api/admin/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "登出失败" });
      }
      res.clearCookie("connect.sid");
      res.json({ success: true, message: "已登出" });
    });
  });

  app.get("/api/admin/me", (req: Request, res: Response) => {
    res.json({ isAdmin: !!req.session?.isAdmin });
  });

  // ============ APPOINTMENTS API ============

  // Get all appointments (admin only)
  app.get("/api/appointments", requireAdmin, async (req: Request, res: Response) => {
    try {
      const appointments = await storage.getAppointments();
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      res.status(500).json({ error: "Failed to fetch appointments" });
    }
  });

  // Get single appointment (admin only)
  app.get("/api/appointments/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const appointment = await storage.getAppointment(req.params.id);
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      res.json(appointment);
    } catch (error) {
      console.error("Error fetching appointment:", error);
      res.status(500).json({ error: "Failed to fetch appointment" });
    }
  });

  // Create appointment
  app.post("/api/appointments", async (req: Request, res: Response) => {
    try {
      const validatedData = insertAppointmentSchema.parse(req.body);
      
      // Check if date is blocked
      const isBlocked = await storage.isDateBlocked(validatedData.appointmentDate);
      if (isBlocked) {
        return res.status(409).json({ 
          error: "Date blocked",
          message: "该日期不开放预约"
        });
      }
      
      // Check if time slot is configured for the consultation mode
      const date = new Date(validatedData.appointmentDate);
      const dayOfWeek = date.getDay();
      const daySettings = await storage.getScheduleSettingsByDay(dayOfWeek);
      const slotSetting = daySettings.find(s => s.timeSlot === validatedData.appointmentTime);
      
      if (!slotSetting) {
        return res.status(409).json({ 
          error: "Time slot not available",
          message: "该时间段不可预约"
        });
      }
      
      // Check if slot is available for the consultation mode
      const isOnline = validatedData.consultationMode === "online";
      if (isOnline && !slotSetting.isOnlineAvailable) {
        return res.status(409).json({ 
          error: "Online not available",
          message: "该时间段不支持线上咨询"
        });
      }
      if (!isOnline && !slotSetting.isOfflineAvailable) {
        return res.status(409).json({ 
          error: "Offline not available",
          message: "该时间段不支持线下咨询"
        });
      }
      
      // Check for time slot conflict (already booked)
      const isAvailable = await storage.checkTimeSlotAvailable(
        validatedData.appointmentDate,
        validatedData.appointmentTime
      );
      
      if (!isAvailable) {
        return res.status(409).json({ 
          error: "Time slot conflict",
          message: "该时间段已被预约，请选择其他时间"
        });
      }
      
      const appointment = await storage.createAppointment(validatedData);
      res.status(201).json(appointment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      console.error("Error creating appointment:", error);
      res.status(500).json({ error: "Failed to create appointment" });
    }
  });

  // Update appointment status (admin only)
  app.patch("/api/appointments/:id/status", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      if (!["pending", "pending_payment", "confirmed", "cancelled", "completed"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      
      const appointment = await storage.updateAppointmentStatus(req.params.id, status);
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      res.json(appointment);
    } catch (error) {
      console.error("Error updating appointment:", error);
      res.status(500).json({ error: "Failed to update appointment" });
    }
  });

  // Get appointments by email (for visitor history lookup)
  app.get("/api/appointments/by-email/:email", async (req: Request, res: Response) => {
    try {
      const appointments = await storage.getAppointmentsByEmail(decodeURIComponent(req.params.email));
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching appointments by email:", error);
      res.status(500).json({ error: "Failed to fetch appointments" });
    }
  });

  // Update appointment (for modifying date/time) - requires email verification
  app.patch("/api/appointments/:id", async (req: Request, res: Response) => {
    try {
      const appointment = await storage.getAppointment(req.params.id);
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      
      // Verify ownership via email (unless admin)
      const { verifyEmail } = req.body;
      const isAdmin = req.session?.isAdmin;
      if (!isAdmin && (!verifyEmail || verifyEmail !== appointment.contactEmail)) {
        return res.status(403).json({ 
          error: "Unauthorized",
          message: "邮箱验证失败，无权修改此预约"
        });
      }
      
      // Check modification deadline: 10:00 PM on the day before
      const appointmentDate = new Date(appointment.appointmentDate);
      const deadline = new Date(appointmentDate);
      deadline.setDate(deadline.getDate() - 1);
      deadline.setHours(22, 0, 0, 0);
      
      if (new Date() > deadline) {
        return res.status(403).json({ 
          error: "Modification deadline passed",
          message: "修改截止时间已过（咨询前一天22:00前）"
        });
      }
      
      // If changing date/time, check for conflicts
      const newDate = req.body.appointmentDate || appointment.appointmentDate;
      const newTime = req.body.appointmentTime || appointment.appointmentTime;
      const consultationMode = appointment.consultationMode;
      
      if (newDate !== appointment.appointmentDate || newTime !== appointment.appointmentTime) {
        // Check if new date is blocked
        const isBlocked = await storage.isDateBlocked(newDate);
        if (isBlocked) {
          return res.status(409).json({ 
            error: "Date blocked",
            message: "该日期不开放预约"
          });
        }
        
        // Check if time slot is configured for the consultation mode
        const date = new Date(newDate);
        const dayOfWeek = date.getDay();
        const daySettings = await storage.getScheduleSettingsByDay(dayOfWeek);
        const slotSetting = daySettings.find(s => s.timeSlot === newTime);
        
        if (!slotSetting) {
          return res.status(409).json({ 
            error: "Time slot not available",
            message: "该时间段不可预约"
          });
        }
        
        // Check if slot is available for the consultation mode
        const isOnline = consultationMode === "online";
        if (isOnline && !slotSetting.isOnlineAvailable) {
          return res.status(409).json({ 
            error: "Online not available",
            message: "该时间段不支持线上咨询"
          });
        }
        if (!isOnline && !slotSetting.isOfflineAvailable) {
          return res.status(409).json({ 
            error: "Offline not available",
            message: "该时间段不支持线下咨询"
          });
        }
        
        const isAvailable = await storage.checkTimeSlotAvailable(newDate, newTime, req.params.id);
        if (!isAvailable) {
          return res.status(409).json({ 
            error: "Time slot conflict",
            message: "该时间段已被预约，请选择其他时间"
          });
        }
      }
      
      const updated = await storage.updateAppointment(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating appointment:", error);
      res.status(500).json({ error: "Failed to update appointment" });
    }
  });

  // Cancel appointment - requires email verification
  app.post("/api/appointments/:id/cancel", async (req: Request, res: Response) => {
    try {
      const appointment = await storage.getAppointment(req.params.id);
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      
      // Verify ownership via email (unless admin)
      const { verifyEmail } = req.body;
      const isAdmin = req.session?.isAdmin;
      if (!isAdmin && (!verifyEmail || verifyEmail !== appointment.contactEmail)) {
        return res.status(403).json({ 
          error: "Unauthorized",
          message: "邮箱验证失败，无权取消此预约"
        });
      }
      
      // Check cancellation deadline: 10:00 PM on the day before
      const appointmentDate = new Date(appointment.appointmentDate);
      const deadline = new Date(appointmentDate);
      deadline.setDate(deadline.getDate() - 1);
      deadline.setHours(22, 0, 0, 0);
      
      if (new Date() > deadline) {
        return res.status(403).json({ 
          error: "Cancellation deadline passed",
          message: "取消截止时间已过（咨询前一天22:00前）"
        });
      }
      
      const updated = await storage.updateAppointmentStatus(req.params.id, "cancelled");
      res.json(updated);
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      res.status(500).json({ error: "Failed to cancel appointment" });
    }
  });

  // Get booked slots for a date (for conflict detection)
  app.get("/api/appointments/slots/:date", async (req: Request, res: Response) => {
    try {
      const bookedSlots = await storage.getBookedSlots(req.params.date);
      res.json({ bookedSlots });
    } catch (error) {
      console.error("Error fetching booked slots:", error);
      res.status(500).json({ error: "Failed to fetch booked slots" });
    }
  });

  // ============ ANNOUNCEMENTS API ============

  // Get all announcements
  app.get("/api/announcements", async (req: Request, res: Response) => {
    try {
      const announcements = await storage.getAnnouncements();
      res.json(announcements);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      res.status(500).json({ error: "Failed to fetch announcements" });
    }
  });

  // Get single announcement
  app.get("/api/announcements/:id", async (req: Request, res: Response) => {
    try {
      const announcement = await storage.getAnnouncement(req.params.id);
      if (!announcement) {
        return res.status(404).json({ error: "Announcement not found" });
      }
      res.json(announcement);
    } catch (error) {
      console.error("Error fetching announcement:", error);
      res.status(500).json({ error: "Failed to fetch announcement" });
    }
  });

  // Create announcement (admin only)
  app.post("/api/announcements", requireAdmin, async (req: Request, res: Response) => {
    try {
      const validatedData = insertAnnouncementSchema.parse(req.body);
      const announcement = await storage.createAnnouncement(validatedData);
      res.status(201).json(announcement);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      console.error("Error creating announcement:", error);
      res.status(500).json({ error: "Failed to create announcement" });
    }
  });

  // Update announcement (admin only)
  app.patch("/api/announcements/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const announcement = await storage.updateAnnouncement(req.params.id, req.body);
      if (!announcement) {
        return res.status(404).json({ error: "Announcement not found" });
      }
      res.json(announcement);
    } catch (error) {
      console.error("Error updating announcement:", error);
      res.status(500).json({ error: "Failed to update announcement" });
    }
  });

  // Delete announcement (admin only)
  app.delete("/api/announcements/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const success = await storage.deleteAnnouncement(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Announcement not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting announcement:", error);
      res.status(500).json({ error: "Failed to delete announcement" });
    }
  });

  // ============ SCHEDULE SETTINGS API ============

  // Initialize default schedule (called on app startup or first access)
  await storage.initializeDefaultSchedule();

  // Get all schedule settings (admin only)
  app.get("/api/schedule-settings", requireAdmin, async (req: Request, res: Response) => {
    try {
      const settings = await storage.getScheduleSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching schedule settings:", error);
      res.status(500).json({ error: "Failed to fetch schedule settings" });
    }
  });

  // Get available time slots for a specific date (public)
  app.get("/api/schedule/available/:date", async (req: Request, res: Response) => {
    try {
      const dateStr = req.params.date;
      const mode = req.query.mode as "online" | "offline" | undefined;
      
      // Check if date is blocked
      const isBlocked = await storage.isDateBlocked(dateStr);
      if (isBlocked) {
        return res.json({ slots: [], isBlocked: true });
      }
      
      // Get day of week from date
      const date = new Date(dateStr);
      const dayOfWeek = date.getDay();
      
      // Get schedule settings for this day
      const daySettings = await storage.getScheduleSettingsByDay(dayOfWeek);
      
      // Get already booked slots
      const bookedSlots = await storage.getBookedSlots(dateStr);
      
      // Filter by mode if specified
      const availableSlots = daySettings
        .filter(s => {
          if (mode === "online") return s.isOnlineAvailable;
          if (mode === "offline") return s.isOfflineAvailable;
          return s.isOnlineAvailable || s.isOfflineAvailable;
        })
        .map(s => ({
          time: s.timeSlot,
          isOnlineAvailable: s.isOnlineAvailable && !bookedSlots.includes(s.timeSlot),
          isOfflineAvailable: s.isOfflineAvailable && !bookedSlots.includes(s.timeSlot),
          isBooked: bookedSlots.includes(s.timeSlot),
        }));
      
      res.json({ slots: availableSlots, isBlocked: false });
    } catch (error) {
      console.error("Error fetching available slots:", error);
      res.status(500).json({ error: "Failed to fetch available slots" });
    }
  });

  // Create schedule setting (admin only)
  app.post("/api/schedule-settings", requireAdmin, async (req: Request, res: Response) => {
    try {
      const validatedData = insertScheduleSettingSchema.parse(req.body);
      const setting = await storage.createScheduleSetting(validatedData);
      res.status(201).json(setting);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      console.error("Error creating schedule setting:", error);
      res.status(500).json({ error: "Failed to create schedule setting" });
    }
  });

  // Update schedule setting (admin only)
  app.patch("/api/schedule-settings/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const setting = await storage.updateScheduleSetting(req.params.id, req.body);
      if (!setting) {
        return res.status(404).json({ error: "Schedule setting not found" });
      }
      res.json(setting);
    } catch (error) {
      console.error("Error updating schedule setting:", error);
      res.status(500).json({ error: "Failed to update schedule setting" });
    }
  });

  // Delete schedule setting (admin only)
  app.delete("/api/schedule-settings/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const success = await storage.deleteScheduleSetting(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Schedule setting not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting schedule setting:", error);
      res.status(500).json({ error: "Failed to delete schedule setting" });
    }
  });

  // ============ BLOCKED DATES API ============

  // Get all blocked dates (admin only)
  app.get("/api/blocked-dates", requireAdmin, async (req: Request, res: Response) => {
    try {
      const blockedDates = await storage.getBlockedDates();
      res.json(blockedDates);
    } catch (error) {
      console.error("Error fetching blocked dates:", error);
      res.status(500).json({ error: "Failed to fetch blocked dates" });
    }
  });

  // Create blocked date (admin only)
  app.post("/api/blocked-dates", requireAdmin, async (req: Request, res: Response) => {
    try {
      const validatedData = insertBlockedDateSchema.parse(req.body);
      const blockedDate = await storage.createBlockedDate(validatedData);
      res.status(201).json(blockedDate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      console.error("Error creating blocked date:", error);
      res.status(500).json({ error: "Failed to create blocked date" });
    }
  });

  // Delete blocked date (admin only)
  app.delete("/api/blocked-dates/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const success = await storage.deleteBlockedDate(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Blocked date not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting blocked date:", error);
      res.status(500).json({ error: "Failed to delete blocked date" });
    }
  });

  // ============ MESSAGES & CONVERSATIONS API ============

  // Get all conversations (admin view)
  app.get("/api/conversations", requireAdmin, async (req: Request, res: Response) => {
    try {
      const conversations = await storage.getConversations();
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // Get conversation by email (for visitors to find their existing conversation)
  app.get("/api/conversations/by-email/:email", async (req: Request, res: Response) => {
    try {
      const email = decodeURIComponent(req.params.email);
      const conversation = await storage.getConversationByEmail(email);
      if (!conversation) {
        return res.status(404).json({ error: "No conversation found for this email" });
      }
      const messages = await storage.getMessagesByConversation(conversation.id);
      res.json({ ...conversation, messages });
    } catch (error) {
      console.error("Error fetching conversation by email:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  // Get single conversation with messages - requires email verification for visitors
  app.get("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      
      // Verify ownership via email query param (unless admin)
      const verifyEmail = req.query.verifyEmail as string;
      const isAdmin = req.session?.isAdmin;
      if (!isAdmin && (!verifyEmail || verifyEmail !== conversation.visitorEmail)) {
        return res.status(403).json({ 
          error: "Unauthorized",
          message: "邮箱验证失败，无权查看此对话"
        });
      }
      
      const messages = await storage.getMessagesByConversation(req.params.id);
      res.json({ ...conversation, messages });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  // Create new conversation (visitor starts a conversation)
  app.post("/api/conversations", async (req: Request, res: Response) => {
    try {
      const validatedData = insertConversationSchema.parse(req.body);
      
      // Check if email is provided (required)
      if (!validatedData.visitorEmail) {
        return res.status(400).json({ error: "邮箱是必填项" });
      }
      
      // Check if email already has a conversation
      const existingConversation = await storage.getConversationByEmail(validatedData.visitorEmail);
      if (existingConversation) {
        return res.status(409).json({ 
          error: "该邮箱已有对话记录",
          existingConversationId: existingConversation.id 
        });
      }
      
      const conversation = await storage.createConversation(validatedData);
      res.status(201).json(conversation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  // Send message in conversation - requires email verification for visitors
  app.post("/api/conversations/:id/messages", async (req: Request, res: Response) => {
    try {
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      
      const { senderType, verifyEmail } = req.body;
      const isAdmin = req.session?.isAdmin;
      
      // Admin can send as "admin", visitors must verify email
      if (senderType === "admin" && !isAdmin) {
        return res.status(403).json({ 
          error: "Unauthorized",
          message: "无权以管理员身份发送消息"
        });
      }
      
      // Visitors must verify their email matches the conversation
      if (senderType === "visitor" && !isAdmin) {
        if (!verifyEmail || verifyEmail !== conversation.visitorEmail) {
          return res.status(403).json({ 
            error: "Unauthorized",
            message: "邮箱验证失败，无权在此对话中发送消息"
          });
        }
      }
      
      const messageData = {
        ...req.body,
        conversationId: req.params.id,
      };
      const validatedData = insertMessageSchema.parse(messageData);
      const message = await storage.createMessage(validatedData);
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      console.error("Error creating message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Mark messages as read (admin only)
  app.post("/api/conversations/:id/read", requireAdmin, async (req: Request, res: Response) => {
    try {
      await storage.markMessagesAsRead(req.params.id);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error marking messages as read:", error);
      res.status(500).json({ error: "Failed to mark messages as read" });
    }
  });

  // Resolve conversation (admin only)
  app.post("/api/conversations/:id/resolve", requireAdmin, async (req: Request, res: Response) => {
    try {
      const conversation = await storage.resolveConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      res.json(conversation);
    } catch (error) {
      console.error("Error resolving conversation:", error);
      res.status(500).json({ error: "Failed to resolve conversation" });
    }
  });

  // ============ FILE UPLOAD API ============

  // Get upload URL for welfare proof documents
  app.post("/api/upload", async (req: Request, res: Response) => {
    try {
      const { filename, contentType } = req.body;
      const objectStorageService = new ObjectStorageService();
      const { uploadUrl, fileKey } = await objectStorageService.getObjectEntityUploadURL(filename);
      res.json({ uploadUrl, fileKey });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // Serve uploaded files
  app.get("/objects/:objectPath(*)", async (req: Request, res: Response) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "File not found" });
      }
      return res.status(500).json({ error: "Failed to serve file" });
    }
  });

  return httpServer;
}
