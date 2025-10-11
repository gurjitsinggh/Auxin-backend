import express from 'express';
import Appointment from '../models/Appointment.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Get available time slots for a specific date
router.get('/available', optionalAuth, async (req, res) => {
  try {
    const { date } = req.query;

    if (!date || typeof date !== 'string') {
      return res.status(400).json({
        error: 'Date parameter is required in YYYY-MM-DD format',
        code: 'INVALID_DATE'
      });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        error: 'Invalid date format. Use YYYY-MM-DD',
        code: 'INVALID_DATE_FORMAT'
      });
    }

    // Check if date is not in the past
    const requestedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (requestedDate < today) {
      return res.status(400).json({
        error: 'Cannot check availability for past dates',
        code: 'PAST_DATE'
      });
    }

    // Generate all possible time slots
    const allSlots = (Appointment as any).generateTimeSlots();

    // Find booked appointments for this date
    const bookedAppointments = await Appointment.find({
      date: requestedDate,
      status: { $in: ['confirmed', 'pending'] }
    }).select('time');

    const bookedTimes = new Set(bookedAppointments.map(apt => apt.time));

    // Mark slots as unavailable if they're booked
    const availableSlots = allSlots.map((slot: any) => ({
      ...slot,
      available: !bookedTimes.has(slot.time)
    }));

    console.log(`📅 Available slots for ${date}: ${availableSlots.filter((s: any) => s.available).length}/${availableSlots.length}`);

    res.json({
      slots: availableSlots,
      date: date,
      totalSlots: availableSlots.length,
      availableCount: availableSlots.filter((s: any) => s.available).length
    });

  } catch (error) {
    console.error('Error fetching available slots:', error);
    res.status(500).json({
      error: 'Failed to fetch available time slots',
      code: 'FETCH_SLOTS_ERROR'
    });
  }
});

// Book an appointment
router.post('/book', authenticateToken, async (req, res) => {
  try {
    const { date, time, userEmail, userName } = req.body;
    const userId = req.user!.userId;

    // Validation
    if (!date || !time || !userEmail || !userName) {
      return res.status(400).json({
        error: 'All fields are required: date, time, userEmail, userName',
        code: 'MISSING_FIELDS'
      });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        error: 'Invalid date format. Use YYYY-MM-DD',
        code: 'INVALID_DATE_FORMAT'
      });
    }

    // Validate time format and business hours
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(time)) {
      return res.status(400).json({
        error: 'Invalid time format. Use HH:MM',
        code: 'INVALID_TIME_FORMAT'
      });
    }

    const [hours, minutes] = time.split(':').map(Number);
    const timeInMinutes = hours * 60 + minutes;
    const startTime = 9 * 60; // 9:00 AM
    const endTime = 17 * 60 + 30; // 5:30 PM

    if (timeInMinutes < startTime || timeInMinutes > endTime || minutes % 30 !== 0) {
      return res.status(400).json({
        error: 'Time must be within business hours (09:00-17:30) in 30-minute intervals',
        code: 'INVALID_TIME_SLOT'
      });
    }

    // Check if date is not in the past
    const appointmentDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (appointmentDate < today) {
      return res.status(400).json({
        error: 'Cannot book appointments for past dates',
        code: 'PAST_DATE'
      });
    }

    // Check if user email matches authenticated user
    if (userEmail !== req.user!.email) {
      return res.status(400).json({
        error: 'Email must match authenticated user',
        code: 'EMAIL_MISMATCH'
      });
    }

    // Check if time slot is available
    const existingAppointment = await Appointment.findOne({
      date: appointmentDate,
      time: time,
      status: { $in: ['confirmed', 'pending'] }
    });

    if (existingAppointment) {
      return res.status(409).json({
        error: 'Time slot not available',
        code: 'SLOT_UNAVAILABLE'
      });
    }

    // Check if user already has an appointment on this date
    const userExistingAppointment = await Appointment.findOne({
      userId: userId,
      date: appointmentDate,
      status: { $in: ['confirmed', 'pending'] }
    });

    if (userExistingAppointment) {
      return res.status(409).json({
        error: 'You already have an appointment on this date',
        code: 'DUPLICATE_DATE_BOOKING'
      });
    }

    // Create the appointment
    const appointment = new Appointment({
      userId,
      userEmail,
      userName,
      date: appointmentDate,
      time,
      status: 'confirmed'
    });

    await appointment.save();

    console.log(`✅ Appointment booked: ${userName} (${userEmail}) on ${date} at ${time}`);

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      appointment: {
        id: appointment._id,
        date: appointment.date,
        time: appointment.time,
        status: appointment.status,
        createdAt: appointment.createdAt
      }
    });

  } catch (error) {
    console.error('Error booking appointment:', error);
    
    // Handle duplicate key error (race condition)
    if ((error as any).code === 11000) {
      return res.status(409).json({
        error: 'Time slot was just booked by another user',
        code: 'SLOT_UNAVAILABLE'
      });
    }

    res.status(500).json({
      error: 'Failed to book appointment',
      code: 'BOOKING_ERROR'
    });
  }
});

// Get user's appointments
router.get('/my-appointments', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { status, limit = 50, page = 1 } = req.query;

    // Build query
    const query: any = { userId };
    
    if (status && typeof status === 'string') {
      if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
        return res.status(400).json({
          error: 'Invalid status. Must be: pending, confirmed, or cancelled',
          code: 'INVALID_STATUS'
        });
      }
      query.status = status;
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 50));
    const skip = (pageNum - 1) * limitNum;

    // Fetch appointments with pagination
    const appointments = await Appointment.find(query)
      .sort({ date: -1, time: -1 }) // Most recent first
      .skip(skip)
      .limit(limitNum);

    const totalCount = await Appointment.countDocuments(query);

    console.log(`📋 Fetched ${appointments.length} appointments for user ${req.user!.email}`);

    res.json({
      appointments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        pages: Math.ceil(totalCount / limitNum)
      }
    });

  } catch (error) {
    console.error('Error fetching user appointments:', error);
    res.status(500).json({
      error: 'Failed to fetch appointments',
      code: 'FETCH_APPOINTMENTS_ERROR'
    });
  }
});

// Cancel appointment
router.put('/:appointmentId/cancel', authenticateToken, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const userId = req.user!.userId;

    if (!appointmentId) {
      return res.status(400).json({
        error: 'Appointment ID is required',
        code: 'MISSING_APPOINTMENT_ID'
      });
    }

    // Find the appointment
    const appointment = await Appointment.findOne({
      _id: appointmentId,
      userId: userId
    });

    if (!appointment) {
      return res.status(404).json({
        error: 'Appointment not found',
        code: 'APPOINTMENT_NOT_FOUND'
      });
    }

    // Check if appointment is already cancelled
    if (appointment.status === 'cancelled') {
      return res.status(400).json({
        error: 'Appointment is already cancelled',
        code: 'ALREADY_CANCELLED'
      });
    }

    // Check if appointment can be cancelled (not in the past + buffer time)
    if (!(appointment as any).canBeCancelled()) {
      return res.status(400).json({
        error: 'Cannot cancel appointment less than 1 hour before scheduled time',
        code: 'CANCELLATION_TOO_LATE'
      });
    }

    // Update appointment status
    appointment.status = 'cancelled';
    await appointment.save();

    console.log(`❌ Appointment cancelled: ${appointment.userName} on ${appointment.date} at ${appointment.time}`);

    res.json({
      success: true,
      message: 'Appointment cancelled successfully',
      appointment: {
        id: appointment._id,
        date: appointment.date,
        time: appointment.time,
        status: appointment.status
      }
    });

  } catch (error) {
    console.error('Error cancelling appointment:', error);
    res.status(500).json({
      error: 'Failed to cancel appointment',
      code: 'CANCELLATION_ERROR'
    });
  }
});

// Admin: Get all appointments (optional - for future admin panel)
router.get('/admin/all', authenticateToken, async (req, res) => {
  try {
    // TODO: Add admin role check when you implement user roles
    const { date, status, limit = 100, page = 1 } = req.query;

    const query: any = {};
    
    if (date && typeof date === 'string') {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (dateRegex.test(date)) {
        query.date = new Date(date);
      }
    }
    
    if (status && typeof status === 'string') {
      if (['pending', 'confirmed', 'cancelled'].includes(status)) {
        query.status = status;
      }
    }

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 100));
    const skip = (pageNum - 1) * limitNum;

    const appointments = await Appointment.find(query)
      .sort({ date: 1, time: 1 })
      .skip(skip)
      .limit(limitNum);

    const totalCount = await Appointment.countDocuments(query);

    res.json({
      appointments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        pages: Math.ceil(totalCount / limitNum)
      }
    });

  } catch (error) {
    console.error('Error fetching all appointments:', error);
    res.status(500).json({
      error: 'Failed to fetch appointments',
      code: 'FETCH_ALL_APPOINTMENTS_ERROR'
    });
  }
});

export default router;
