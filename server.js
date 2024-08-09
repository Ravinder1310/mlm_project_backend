const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');
const paymentRoutes = require('./routes/payment');
const { calculateDailyProfits, calculateDailyReferralProfits } = require('./controllers/userController');
const { sendSmsCode } = require('./controllers/authController'); // Corrected the import path
const cron = require('node-cron');
const cors = require('cors');

dotenv.config();



const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB', err);
  });

app.post('/api/v1/send-sms', sendSmsCode); // Changed from router to app and added the correct path
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/payment', paymentRoutes);

// Schedule daily, weekly, and monthly jobs
cron.schedule('0 0 * * *', calculateDailyProfits);
cron.schedule('0 0 * * *', calculateDailyReferralProfits); 

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
