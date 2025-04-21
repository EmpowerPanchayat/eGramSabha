const express = require('express');
const router = express.Router();
const GramSabha = require('../models/gramSabha');
const RSVP = require('../models/rsvp');
const auth = require('../middleware/auth');
const { isPanchayatPresident } = require('../middleware/roleCheck');
const Panchayat = require('../models/Panchayat');
const multer = require('multer');
const mongoose = require('mongoose');
const User = require('../models/User');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Helper function for face comparison
function calculateFaceDistance(descriptor1, descriptor2) {
  if (!descriptor1 || !descriptor2 || descriptor1.length !== descriptor2.length) {
    return Infinity;
  }

  let sum = 0;
  for (let i = 0; i < descriptor1.length; i++) {
    sum += Math.pow(descriptor1[i] - descriptor2[i], 2);
  }
  return Math.sqrt(sum);
}

// Create a new Gram Sabha meeting with attachments
router.post('/', auth.isAuthenticated, isPanchayatPresident, upload.array('attachments'), async (req, res) => {
    try {
        const { panchayatId, title, dateTime, date, time, location, agenda, description, scheduledDurationMinutes } = req.body;
        
        // Generate default title if not provided
        let generatedTitle = title;
        if (!title) {
            const panchayat = await Panchayat.findById(panchayatId);
            if (!panchayat) {
                return res.status(404).json({ success: false, message: 'Panchayat not found' });
            }
            
            const formattedDate = new Date(date).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            
            const formattedTime = new Date(`2000-01-01T${time}`).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
            
            generatedTitle = `Gram Sabha - ${panchayat.name} - ${formattedDate} - ${formattedTime}`;
        }

        // Process attachments if any
        const attachments = req.files ? req.files.map(file => ({
            filename: file.originalname,
            mimeType: file.mimetype,
            attachment: file.buffer.toString('base64'), // Store as base64 string in MongoDB
            uploadedAt: new Date()
        })) : [];

        const gramSabha = new GramSabha({
            panchayatId,
            title: generatedTitle,
            dateTime,
            location,
            agenda,
            description,
            scheduledById: req.official.id,
            scheduledDurationMinutes,
            attachments
        });

        await gramSabha.save();
        res.status(201).json({ 
            success: true, 
            data: {
                ...gramSabha.toObject(),
                attachments: gramSabha.attachments.map(att => ({
                    ...att,
                    attachment: `data:${att.mimeType};base64,${att.attachment}` // Convert to data URL for frontend
                }))
            }
        });
    } catch (error) {
        console.error('Error creating Gram Sabha:', error);
        res.status(500).json({ success: false, message: 'Error creating Gram Sabha' });
    }
});

// Get all Gram Sabha meetings for a panchayat
router.get('/panchayat/:panchayatId', async (req, res) => {
  try {
    const gramSabhas = await GramSabha.find({ panchayatId: req.params.panchayatId })
      .populate('scheduledById', 'name')
      .sort({ dateTime: -1 });
    res.send(gramSabhas);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Get a specific Gram Sabha meeting
router.get('/:id', async (req, res) => {
  try {
    const gramSabha = await GramSabha.findById(req.params.id)
      .populate('scheduledById', 'name')
      .populate('panchayatId', 'name');
    if (!gramSabha) {
      return res.status(404).send();
    }
    res.send(gramSabha);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Update a Gram Sabha meeting
router.patch('/:id', auth.isAuthenticated, isPanchayatPresident, async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = ['title', 'agenda', 'dateTime', 'date', 'time', 'location', 'scheduledDurationMinutes', 
    'meetingLink', 'status', 'minutes', 'meetingNotes', 'recordingLink', 'panchayatId',
    'actualDurationMinutes', 'transcript', 'conclusion', 'issues', 'guests'];
  
  const isValidOperation = updates.every(update => allowedUpdates.includes(update));
  const invalidUpdates = updates.filter(update => !allowedUpdates.includes(update));
  console.log({ invalidUpdates });
  if (!isValidOperation) {
    return res.status(400).send({ error: `Invalid updates! ${invalidUpdates.join(', ')}` });
  }

  try {
    const gramSabha = await GramSabha.findOne({ _id: req.params.id, scheduledById: req.official.id });
    
    if (!gramSabha) {
      return res.status(404).send();
    }

    updates.forEach(update => gramSabha[update] = req.body[update]);
    await gramSabha.save();
    res.send(gramSabha);
  } catch (error) {
    res.status(400).send(error);
  }
});

// Delete a Gram Sabha meeting
router.delete('/:id', auth.isAuthenticated, isPanchayatPresident, async (req, res) => {
  try {
    const gramSabha = await GramSabha.findOneAndDelete({ 
      _id: req.params.id, 
      scheduledById: req.official.id 
    });
    
    if (!gramSabha) {
      return res.status(404).send();
    }
    res.send(gramSabha);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Add attendance to a Gram Sabha meeting
router.post('/:id/attendance', auth.isAuthenticated, async (req, res) => {
  try {
    const gramSabha = await GramSabha.findById(req.params.id);
    if (!gramSabha) {
      return res.status(404).send();
    }

    gramSabha.attendances.push({
      ...req.body,
      userId: req.official._id
    });
    await gramSabha.save();
    res.status(201).send(gramSabha);
  } catch (error) {
    res.status(400).send(error);
  }
});

// Add attachment to a Gram Sabha meeting
router.post('/:id/attachments', auth.isAuthenticated, upload.single('file'), async (req, res) => {
    try {
        const gramSabha = await GramSabha.findById(req.params.id);
        if (!gramSabha) {
            return res.status(404).json({ success: false, message: 'Gram Sabha not found' });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        // Create new attachment object
        const attachment = {
            filename: req.file.originalname,
            mimeType: req.file.mimetype,
            attachment: req.file.buffer.toString('base64'),
            uploadedAt: new Date()
        };

        // Add to attachments array
        gramSabha.attachments.push(attachment);
        await gramSabha.save();

        // Return the attachment with data URL for immediate display
        const dataUrl = `data:${attachment.mimeType};base64,${attachment.attachment}`;
        
        res.status(201).json({
            success: true,
            data: {
                _id: gramSabha.attachments[gramSabha.attachments.length - 1]._id,
                filename: attachment.filename,
                mimeType: attachment.mimeType,
                uploadedAt: attachment.uploadedAt,
                attachment: dataUrl
            }
        });
    } catch (error) {
        console.error('Error adding attachment:', error);
        res.status(400).json({ success: false, message: 'Failed to add attachment' });
    }
});

// Get upcoming meetings for a panchayat
router.get('/panchayat/:panchayatId/upcoming', async (req, res) => {
    try {
        const now = new Date();
        const gramSabhas = await GramSabha.find({
            panchayatId: req.params.panchayatId,
            dateTime: { $gt: now },
            status: { $in: ['SCHEDULED', 'RESCHEDULED'] }
        })
        .populate('scheduledById', 'name')
        .sort({ dateTime: 1 })
        .limit(5);

        // Get RSVP counts for each meeting
        const meetingsWithRSVP = await Promise.all(gramSabhas.map(async (meeting) => {
            const rsvpCounts = await RSVP.aggregate([
                { $match: { gramSabhaId: meeting._id } },
                { $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }}
            ]);

            const counts = {
                CONFIRMED: 0,
                DECLINED: 0,
                MAYBE: 0
            };
            rsvpCounts.forEach(count => {
                counts[count._id] = count.count;
            });

            return {
                ...meeting.toObject(),
                rsvpCounts: counts
            };
        }));

        res.json(meetingsWithRSVP);
    } catch (error) {
        console.error('Error fetching upcoming meetings:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch upcoming meetings' });
    }
});

// Get past meetings for a panchayat
router.get('/panchayat/:panchayatId/past', async (req, res) => {
    try {
        const now = new Date();
        const gramSabhas = await GramSabha.find({
            panchayatId: req.params.panchayatId,
            dateTime: { $lt: now }
        })
        .populate('scheduledById', 'name')
        .sort({ dateTime: -1 })
        .limit(10);

        res.json(gramSabhas);
    } catch (error) {
        console.error('Error fetching past meetings:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch past meetings' });
    }
});

// RSVP for a meeting
router.post('/:id/rsvp/:usedId', async (req, res) => {
    try {
        const { status, comments } = req.body;
        const gramSabhaId = req.params.id;
        const userId = req.params.usedId;

        // Validate meeting exists and is upcoming
        const meeting = await GramSabha.findById(gramSabhaId);
        if (!meeting) {
            return res.status(404).json({ success: false, message: 'Meeting not found' });
        }

        if (new Date(meeting.dateTime) < new Date()) {
            return res.status(400).json({ success: false, message: 'Cannot RSVP for past meetings' });
        }

        // Create or update RSVP
        const rsvp = await RSVP.findOneAndUpdate(
            { gramSabhaId, userId },
            { status, comments },
            { upsert: true, new: true }
        );

        res.json({ success: true, data: rsvp });
    } catch (error) {
        console.error('Error handling RSVP:', error);
        res.status(500).json({ success: false, message: 'Failed to handle RSVP' });
    }
});

// Get RSVP status for a user
router.get('/:id/rsvp/:usedId', async (req, res) => {
    try {
      console.log({req});
        const rsvp = await RSVP.findOne({
            gramSabhaId: req.params.id,
            userId: req.params.usedId
        });

        res.json({ success: true, data: rsvp });
    } catch (error) {
        console.error('Error fetching RSVP status:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch RSVP status' });
    }
});

// Get RSVP statistics for a meeting
router.get('/:id/rsvp-stats', async (req, res) => {
    try {
        const rsvpCounts = await RSVP.aggregate([
            { $match: { gramSabhaId: new mongoose.Types.ObjectId(req.params.id) } },
            { $group: {
                _id: '$status',
                count: { $sum: 1 }
            }}
        ]);

        const counts = {
            CONFIRMED: 0,
            DECLINED: 0,
            MAYBE: 0
        };
        rsvpCounts.forEach(count => {
            counts[count._id] = count.count;
        });

        // Get total registered users in the panchayat
        const gramSabha = await GramSabha.findById(req.params.id);
        const totalUsers = await User.countDocuments({ panchayatId: gramSabha.panchayatId });
        const noResponse = totalUsers - (counts.CONFIRMED + counts.DECLINED + counts.MAYBE);

        res.json({ 
            success: true, 
            data: {
                ...counts,
                NO_RESPONSE: noResponse,
                TOTAL: totalUsers
            }
        });
    } catch (error) {
        console.error('Error fetching RSVP statistics:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch RSVP statistics' });
    }
});

/**
 * @route   POST /api/gram-sabha/:id/mark-attendance
 * @desc    Mark attendance for a meeting using face recognition
 * @access  Private (Officials only)
 */
router.post('/:id/mark-attendance', auth.isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { faceDescriptor, voterIdLastFour, panchayatId, verificationMethod } = req.body;

    // Validation
    if (!faceDescriptor || !Array.isArray(faceDescriptor) || faceDescriptor.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid face descriptor is required for verification'
      });
    }

    if (!voterIdLastFour || voterIdLastFour.length !== 4) {
      return res.status(400).json({
        success: false,
        message: 'Last 4 digits of voter ID are required'
      });
    }

    // Verify gram sabha exists and belongs to panchayat
    const gramSabha = await GramSabha.findOne({ _id: id, panchayatId });
    if (!gramSabha) {
      return res.status(404).json({
        success: false,
        message: 'Gram Sabha meeting not found'
      });
    }

    // Search for users with matching voter ID last 4 digits and registered faces
    const registeredUsers = await User.find({
      panchayatId,
      isRegistered: true,
      faceDescriptor: { $exists: true, $ne: null },
      voterIdNumber: { $regex: voterIdLastFour + '$', $options: 'i' } // Match ending with last 4 digits
    });

    if (registeredUsers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No registered users found with matching voter ID'
      });
    }

    // Find the best match among filtered users using the face-login algorithm
    let bestMatch = null;
    let minDistance = 0.5; // Threshold for face similarity

    for (const user of registeredUsers) {
      const distance = calculateFaceDistance(user.faceDescriptor, faceDescriptor);
      console.log(`Face distance with ${user.voterIdNumber}: ${distance}`);

      if (distance < minDistance) {
        minDistance = distance;
        bestMatch = user;
      }
    }

    if (!bestMatch) {
      return res.status(401).json({
        success: false,
        message: 'Face not recognized. Please try again or contact administrator.'
      });
    }

    // Check if the user is already marked as present
    const existingAttendance = gramSabha.attendances.find(
      attendance => attendance.userId.toString() === bestMatch._id.toString()
    );

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: 'Attendance already marked for this user'
      });
    }

    // Add attendance record
    const newAttendance = {
      userId: bestMatch._id,
      checkInTime: new Date(),
      verificationMethod,
      status: 'PRESENT'
    };

    gramSabha.attendances.push(newAttendance);
    await gramSabha.save();

    // Get panchayat to check quorum criteria and total registered users
    const panchayat = await Panchayat.findById(gramSabha.panchayatId);

    // If the meeting status is SCHEDULED and quorum is met, update status to IN_PROGRESS
    if (gramSabha.status === 'SCHEDULED') {
      // Get total voters in the panchayat
      const totalVoters = await User.countDocuments({
        panchayatId
      });
      console.log({totalVoters, panchayatCriteria: panchayat.sabhaCriteria, quorumRequired: totalVoters * (panchayat.sabhaCriteria/100 || 0.1)});
      // Calculate quorum as 10% of total voters
      const quorumRequired = Math.ceil(totalVoters * (panchayat.sabhaCriteria/100 || 0.1));

      // Calculate if quorum is met
      const attendanceCount = gramSabha.attendances.length;

      if (attendanceCount >= quorumRequired) {
        gramSabha.status = 'IN_PROGRESS';
        await gramSabha.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Attendance marked successfully',
      data: {
        user: {
          _id: bestMatch._id,
          name: bestMatch.name,
          voterIdNumber: bestMatch.voterIdNumber
        },
        attendance: newAttendance
      }
    });
  } catch (error) {
    console.error('Error marking attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while marking attendance: ' + error.message
    });
  }
});

/**
 * @route   GET /api/gram-sabha/:id/attendance-stats
 * @desc    Get attendance statistics for a meeting
 * @access  Private
 */
router.get('/:id/attendance-stats', auth.isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;

    // Get gram sabha meeting
    const gramSabha = await GramSabha.findById(id);
    if (!gramSabha) {
      return res.status(404).json({
        success: false,
        message: 'Gram Sabha meeting not found'
      });
    }

    // Get panchayat to check quorum criteria and total registered users
    const panchayat = await Panchayat.findById(gramSabha.panchayatId);
    if (!panchayat) {
      return res.status(404).json({
        success: false,
        message: 'Panchayat not found'
      });
    }

    // Get total registered users in the panchayat
    const totalRegistered = await User.countDocuments({
      panchayatId: gramSabha.panchayatId,
      isRegistered: true
    });

    // Get total voters in the panchayat (all users whether registered or not)
    const totalVoters = await User.countDocuments({
      panchayatId: gramSabha.panchayatId
    });

    // Count present users
    const presentCount = gramSabha.attendances.length;

    console.log({ totalVoters, panchayatCriteria: panchayat.sabhaCriteria, quorumRequired: totalVoters * (panchayat.sabhaCriteria / 100 || 0.1) });
    // Calculate quorum as 10% of total voters
    const quorumRequired = Math.ceil(totalVoters * (panchayat.sabhaCriteria / 100 || 0.1));


    return res.status(200).json({
      success: true,
      totalRegistered,
      totalVoters,
      present: presentCount,
      quorumRequired,
      quorumMet: presentCount >= quorumRequired
    });
  } catch (error) {
    console.error('Error getting attendance stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching attendance statistics: ' + error.message
    });
  }
});


module.exports = router; 