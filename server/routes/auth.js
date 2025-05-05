const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post('/register', async (req, res) => {
  const { email, username, password, confirmPassword, whatsapp } = req.body;
  if (!email || !username || !password || !confirmPassword || !whatsapp) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }
  const existingUser = await User.findOne({ $or: [{ username }, { email }] });
  if (existingUser) {
    return res.status(400).json({ message: 'Username or email already exists' });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({
    email,
    username,
    password: hashedPassword,
    whatsapp,
    role: 'user',
  });
  await user.save();
  const token = jwt.sign({ id: user._id, role: user.role, username: user.username }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '24h' });
  res.status(201).json({ token, role: user.role, id: user._id, username: user.username });
});

router.post('/google', async (req, res) => {
  const { idToken } = req.body;
  try {
    const ticket = await client.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    const googleId = payload['sub'];
    const email = payload['email'];
    let user = await User.findOne({ googleId });
    if (user) {
      const token = jwt.sign({ id: user._id, role: user.role, username: user.username }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '24h' });
      res.json({ token, role: user.role, id: user._id, username: user.username, newUser: false });
    } else {
      const existingEmailUser = await User.findOne({ email });
      if (existingEmailUser) {
        return res.status(400).json({ message: 'Email already registered' });
      }
      let username = payload['given_name'] + '_' + payload['family_name'];
      username = username.toLowerCase().replace(/\s/g, '_');
      let count = 1;
      while (await User.findOne({ username })) {
        username = `${payload['given_name']}_${payload['family_name']}${count}`;
        count++;
      }
      const password = crypto.randomBytes(6).toString('hex');
      const hashedPassword = await bcrypt.hash(password, 10);
      user = new User({
        email,
        username,
        password: hashedPassword,
        googleId,
        role: 'user',
      });
      await user.save();
      const token = jwt.sign({ id: user._id, role: user.role, username: user.username }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '24h' });
      res.json({ token, role: user.role, id: user._id, username: user.username, newUser: true });
    }
  } catch (error) {
    res.status(401).json({ message: 'Invalid Google token' });
  }
});

module.exports = router;
