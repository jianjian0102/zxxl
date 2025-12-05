import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertAppointmentSchema,
  insertAnnouncementSchema,
  insertMessageSchema,
  insertConversationSchema,
} from "@shared/schema";
import { z } from "zod";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // ============ APPOINTMENTS API ============

  // Get all appointments (admin only in production)
  app.get("/api/appointments", async (req: Request, res: Response) => {
    try {
      const appointments = await storage.getAppointments();
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      res.status(500).json({ error: "Failed to fetch appointments" });
    }
  });

  // Get single appointment
  app.get("/api/appointments/:id", async (req: Request, res: Response) => {
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
      
      // Check for time slot conflict
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

  // Update appointment status
  app.patch("/api/appointments/:id/status", async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      if (!["pending", "confirmed", "cancelled", "completed"].includes(status)) {
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

  // Update appointment (for modifying date/time)
  app.patch("/api/appointments/:id", async (req: Request, res: Response) => {
    try {
      const appointment = await storage.getAppointment(req.params.id);
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
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
      
      if (newDate !== appointment.appointmentDate || newTime !== appointment.appointmentTime) {
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

  // Cancel appointment
  app.post("/api/appointments/:id/cancel", async (req: Request, res: Response) => {
    try {
      const appointment = await storage.getAppointment(req.params.id);
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
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
  app.post("/api/announcements", async (req: Request, res: Response) => {
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
  app.patch("/api/announcements/:id", async (req: Request, res: Response) => {
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
  app.delete("/api/announcements/:id", async (req: Request, res: Response) => {
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

  // ============ MESSAGES & CONVERSATIONS API ============

  // Get all conversations (admin view)
  app.get("/api/conversations", async (req: Request, res: Response) => {
    try {
      const conversations = await storage.getConversations();
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // Get single conversation with messages
  app.get("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
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

  // Send message in conversation
  app.post("/api/conversations/:id/messages", async (req: Request, res: Response) => {
    try {
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
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

  // Mark messages as read
  app.post("/api/conversations/:id/read", async (req: Request, res: Response) => {
    try {
      await storage.markMessagesAsRead(req.params.id);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error marking messages as read:", error);
      res.status(500).json({ error: "Failed to mark messages as read" });
    }
  });

  // Resolve conversation
  app.post("/api/conversations/:id/resolve", async (req: Request, res: Response) => {
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
