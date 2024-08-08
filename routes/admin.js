const express = require('express');
const { getAllUsers, getAllTransactions, managePackages, distributeWeeklySalaries, distributeMonthlySalaries } = require('../controllers/adminController');
const { adminProtect } = require('../middleware/auth');

const router = express.Router();

router.get('/users', adminProtect, getAllUsers);
router.get('/transactions', adminProtect, getAllTransactions);
router.post('/packages', adminProtect, managePackages);
router.post('/distribute-weekly-salaries', adminProtect, distributeWeeklySalaries);
router.post('/distribute-monthly-salaries', adminProtect, distributeMonthlySalaries);

module.exports = router;
