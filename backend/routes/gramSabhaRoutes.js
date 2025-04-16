const express = require('express');
const router = express.Router();
const GramSabha = require('../models/gramSabha');
const auth = require('../middleware/auth');
const { isPanchayatPresident } = require('../middleware/roleCheck');
const Panchayat = require('../models/Panchayat');

// Create a new Gram Sabha meeting
router.post('/', auth.isAuthenticated, isPanchayatPresident, async (req, res) => {
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

    const gramSabha = new GramSabha({
      panchayatId,
      title: generatedTitle,
      dateTime,
      location,
      agenda,
      description,
      scheduledById: req.official.id,
      scheduledDurationMinutes
    });

    await gramSabha.save();
    res.status(201).json({ success: true, data: gramSabha });
  } catch (error) {
    console.error('Error creating Gram Sabha:', error);
    res.status(500).json({ success: false, message: 'Error creating Gram Sabha' });
  }
});

// Get all Gram Sabha meetings for a panchayat
router.get('/panchayat/:panchayatId', auth.isAuthenticated, async (req, res) => {
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
router.get('/:id', auth.isAuthenticated, async (req, res) => {
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
  const allowedUpdates = ['title', 'dateTime', 'date', 'time', 'location', 'scheduledDurationMinutes', 
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
router.post('/:id/attachments', auth.isAuthenticated, isPanchayatPresident, async (req, res) => {
  try {
    const gramSabha = await GramSabha.findById(req.params.id);
    if (!gramSabha) {
      return res.status(404).send();
    }

    gramSabha.attachments.push(req.body);
    await gramSabha.save();
    res.status(201).send(gramSabha);
  } catch (error) {
    res.status(400).send(error);
  }
});

module.exports = router; 