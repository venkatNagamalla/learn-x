
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import {
  AccessToken,
  RoomServiceClient,
} from 'livekit-server-sdk';

import LiveClass from '../models/LiveClass.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import User from '../models/User.js';

import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { assertOwner } from '../utils/assertOwner.js';

const getRoomService = () => {
  const livekitUrl = process.env.LIVEKIT_URL;

  if (
    !livekitUrl ||
    !process.env.LIVEKIT_API_KEY ||
    !process.env.LIVEKIT_API_SECRET
  ) {
    throw new ApiError(500, 'LiveKit configuration is missing');
  }

  const httpUrl = livekitUrl.replace(/^wss:/, 'https:');

  return new RoomServiceClient(
    httpUrl,
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET
  );
};

const getOwnedLiveClass = async (id, user) => {
  const liveClass = await LiveClass.findById(id);

  if (!liveClass) {
    throw new ApiError(404, 'Live class not found');
  }

  const course = await Course.findById(liveClass.course);

  if (!course) {
    throw new ApiError(404, 'Course not found');
  }

  assertOwner(course, user);

  return liveClass;
};

// POST /api/live
export const createLiveClass = asyncHandler(async (req, res) => {
  const { courseId, title, scheduledAt } = req.body;

  if (!courseId || !title?.trim() || !scheduledAt) {
    throw new ApiError(
      400,
      'Course, title and scheduled date are required'
    );
  }

  const date = new Date(scheduledAt);

  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, 'Invalid scheduled date');
  }

  const course = await Course.findById(courseId);

  if (!course) {
    throw new ApiError(404, 'Course not found');
  }

  assertOwner(course, req.user);

  const liveClass = await LiveClass.create({
    course: course._id,
    instructor: req.user._id,
    title: title.trim(),
    scheduledAt: date,
    roomName: `class-${randomUUID()}`,
  });

  res.status(201).json({
    message: 'Live class scheduled successfully',
    liveClass,
  });
});

// GET /api/live/upcoming
export const getUpcomingLiveClasses = asyncHandler(
  async (req, res) => {
    let filter;

    if (req.user.role === 'instructor') {
      // Instructors can see all their classes, including ended ones.
      filter = {
        instructor: req.user._id,
      };
    } else if (req.user.role === 'student') {
      // Students only see upcoming and currently live classes.
      const enrollments = await Enrollment.find({
        user: req.user._id,
      }).select('course');

      const courseIds = enrollments.map(
        (enrollment) => enrollment.course
      );

      filter = {
        course: { $in: courseIds },
        status: { $in: ['scheduled', 'live'] },
        $or: [
          { scheduledAt: { $gte: new Date() } },
          { status: 'live' },
        ],
      };
    } else {
      throw new ApiError(403, 'Access denied');
    }

    const liveClasses = await LiveClass.find(filter)
      .populate('course', 'title thumbnail')
      .populate('instructor', 'name')
      .sort({ scheduledAt: -1 });

    res.json({
      items: liveClasses,
      total: liveClasses.length,
    });
  }
);

// GET /api/live/:id/history
// Only the owning instructor can view chat history after the class ends.
export const getLiveClassHistory = asyncHandler(
  async (req, res) => {
    const liveClass = await getOwnedLiveClass(
      req.params.id,
      req.user
    );

    if (liveClass.status !== 'ended') {
      throw new ApiError(
        400,
        'Chat history is available after the class ends'
      );
    }

    res.json({
      liveClass: {
        _id: liveClass._id,
        title: liveClass.title,
        scheduledAt: liveClass.scheduledAt,
        status: liveClass.status,
        messages: liveClass.messages,
      },
    });
  }
);

// PATCH /api/live/:id/start
export const startLiveClass = asyncHandler(async (req, res) => {
  const liveClass = await getOwnedLiveClass(
    req.params.id,
    req.user
  );

  if (liveClass.status !== 'scheduled') {
    throw new ApiError(
      400,
      'Only scheduled classes can be started'
    );
  }

  liveClass.status = 'live';
  await liveClass.save();

  res.json({
    message: 'Live class started successfully',
    liveClass,
  });
});

// PATCH /api/live/:id/end
export const endLiveClass = asyncHandler(async (req, res) => {
  const liveClass = await getOwnedLiveClass(
    req.params.id,
    req.user
  );

  if (liveClass.status === 'ended') {
    throw new ApiError(400, 'Live class has already ended');
  }

  const roomService = getRoomService();

  const rooms = await roomService.listRooms([
    liveClass.roomName,
  ]);

  if (rooms.length > 0) {
    await roomService.deleteRoom(liveClass.roomName);
  }

  liveClass.status = 'ended';
  await liveClass.save();

  res.json({
    message: 'Live class ended successfully',
    liveClass,
  });
});

// POST /api/live/:id/messages
// Instructor forwards chat messages; backend verifies the actual sender.
export const saveLiveClassMessage = asyncHandler(
  async (req, res) => {
    const liveClass = await getOwnedLiveClass(
      req.params.id,
      req.user
    );

    if (liveClass.status !== 'live') {
      throw new ApiError(400, 'Live class is not active');
    }

    const { text, senderId } = req.body;

    if (!text?.trim()) {
      throw new ApiError(400, 'Message text is required');
    }

    if (text.trim().length > 1000) {
      throw new ApiError(
        400,
        'Message cannot exceed 1000 characters'
      );
    }

    if (!senderId || !mongoose.isValidObjectId(senderId)) {
      throw new ApiError(400, 'Valid message sender is required');
    }

    const sender = await User.findById(senderId).select(
      'name role'
    );

    if (!sender) {
      throw new ApiError(404, 'Message sender not found');
    }

    const isInstructor =
      sender.role === 'instructor' &&
      String(sender._id) === String(liveClass.instructor);

    const isEnrolledStudent =
      sender.role === 'student' &&
      await Enrollment.exists({
        user: sender._id,
        course: liveClass.course,
      });

    if (!isInstructor && !isEnrolledStudent) {
      throw new ApiError(
        403,
        'Message sender is not authorized for this class'
      );
    }

    liveClass.messages.push({
      name: sender.name,
      text: text.trim(),
      at: new Date(),
    });

    await liveClass.save();

    res.status(201).json({
      message: 'Message saved successfully',
      savedMessage:
        liveClass.messages[liveClass.messages.length - 1],
    });
  }
);

// POST /api/live/:id/token
// Access is authorized by requireEnrollment middleware.
export const getLiveClassToken = asyncHandler(
  async (req, res) => {
    const liveClass = await LiveClass.findById(req.params.id);

    if (!liveClass) {
      throw new ApiError(404, 'Live class not found');
    }

    if (liveClass.status === 'ended') {
      throw new ApiError(400, 'This live class has ended');
    }

    const isHost =
      req.user.role === 'instructor' &&
      String(liveClass.instructor) === String(req.user._id);

    const isAdmin = req.user.role === 'admin';

    // Students can join only after the instructor starts the class.
    // The middleware has already verified their enrollment.
    if (!isHost && !isAdmin && liveClass.status !== 'live') {
      throw new ApiError(
        400,
        'Class has not started yet'
      );
    }

    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      {
        identity: String(req.user._id),
        name: req.user.name,
        ttl: '2h',
      }
    );

    at.addGrant({
      roomJoin: true,
      room: liveClass.roomName,
      canSubscribe: true,
      canPublish: true,
      canPublishData: true,
    });

    res.json({
      token: await at.toJwt(),
      serverUrl: process.env.LIVEKIT_URL,
      isHost,
    });
  }
);
