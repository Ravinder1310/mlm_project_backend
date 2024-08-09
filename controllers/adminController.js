const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Package = require('../models/Package');

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find().populate('user');
    res.status(200).json(transactions);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};  

exports.managePackages = async (req, res) => {
  try {
    const { name, price, photo1, photo2, discription, purchaseDate, supply, user } = req.body;
    const newPackage = new Package({ name, price, photo1, photo2, discription, purchaseDate, supply, user });
    await newPackage.save();
    res.status(201).json(newPackage);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.activateUserAndAssignPackage = async (req, res) => {
  try {
    const { userId, packageId } = req.body;

    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find the package by ID
    const package = await Package.findById(packageId);
    if (!package) {
      return res.status(404).json({ error: 'Package not found' });
    }

    // Update the user's status and assign the package
    user.status = 'active'; // Assuming 'status' is the field to activate the user
    user.package = packageId; // Assuming 'package' is the field to store package details

    await user.save();

    res.status(200).json({
      message: 'User activated and package assigned successfully',
      user,
      package
    }); 
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};






module.exports = exports;
