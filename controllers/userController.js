const cron = require('node-cron');
const axios = require('axios');
const User = require('../models/User');
const Package = require('../models/Package');
const Transaction = require('../models/Transaction');
const Admin = require('../models/admin');

// Payment Gateway API Details
const API_URL = 'https://tejafinance.in/api/prod/merchant/pg/payment/initiate';
const TOKEN_URL = 'https://tejafinance.in/api/prod/merchant/getToken';
const RESPONSE_URL = 'https://tejafinance.in/pg/payment/{token}/response';


exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get Referral History

exports.getReferralHistory = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const referredUsers = await User.find({ referredBy: user.referralCode });

    res.status(200).json(referredUsers);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.buyPackage = async (req, res) => {
  try {
    const { packageId, bank_name, account, bank_IFSC, supply } = req.body;

    // Find the package by ID
    const packageData = await Package.findById(packageId);
    if (!packageData) {
      return res.status(404).json({ error: 'Package not found' });
    }

    // Find the user who is purchasing the package
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create a new package instance with the provided details
    const newPackage = new Package({
      name: packageData.name,
      photo1: packageData.photo1,
      pack_id: packageData.pack_id,
      photo2: packageData.photo2,
      bank_name,
      account,
      bank_IFSC,
      price: packageData.price,
      supply,
      user: user._id
    });

    // Save the new package to the database
    await newPackage.save();

    // Add the package to the user's list of purchased packages
    user.packages.push(newPackage);
    await user.save();

    // Create a transaction record for this purchase
    const transaction = new Transaction({
      user: user._id,
      amount: newPackage.price,
      type: 'purchase',
      package: newPackage._id
    });
    await transaction.save();

    // Return a success response
    res.status(200).json({ message: 'Package purchased successfully', package: newPackage });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get User Activity
exports.getUserActivity = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const referredUsers = await User.find({ referredBy: user.referralCode });

    const activeUsers = referredUsers.filter(user => user.active);
    const unrechargedUsers = referredUsers.filter(user => !user.active);

    res.status(200).json({ activeUsers, unrechargedUsers });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Calculate Daily Profits
exports.calculateDailyProfits = async () => {
  try {
    const users = await User.find({ active: true }).populate('packages');

    // Function to distribute profit to upline users
    const distributeProfitToUplines = async (user, dailyProfit, level) => {
      if (!user.referredBy || level > 3) return; // Stop if no upline or beyond 3 levels

      const uplineUser = await User.findOne({ referralCode: user.referredBy });
      if (uplineUser) {
        // Define profit percentages for each level
        const profitPercentages = {
          1: 0.10, // 10% for direct referrals
          2: 0.05, // 5% for second-level referrals
          3: 0.02, // 2% for third-level referrals
        };

        const profitPercentage = profitPercentages[level] || 0;
        const uplineProfit = dailyProfit * profitPercentage;

        // Update upline user's wallet
        uplineUser.wallet += uplineProfit;
        await uplineUser.save();

        // Record the transaction
        const transaction = new Transaction({
          user: uplineUser._id,
          amount: uplineProfit,
          type: `uplineLevel${level}DailyProfit`,
        });
        await transaction.save();

        // Recursively distribute profit to the next level
        await distributeProfitToUplines(uplineUser, dailyProfit, level + 1);
      }
    };

    // Calculate daily profit for each user
    for (const user of users) {
      let dailyProfit = 0;

      user.packages.forEach(pkg => {
        const daysSincePurchase = Math.floor((Date.now() - pkg.purchaseDate) / (1000 * 60 * 60 * 24));
        if (daysSincePurchase <= 45) {
          switch (pkg.name) {
            case 'C570':
              dailyProfit += 23;
              break;
            case 'J1550':
              dailyProfit += 62;
              break;
            case 'G3550':
              dailyProfit += 142;
              break;
            case 'E7500':
              dailyProfit += 317;
              break;
            case 'C12150':
              dailyProfit += 540;
              break;
            case 'S28800':
              dailyProfit += 1280;
              break;
            default:
              break;
          }
        }
      });

      if (dailyProfit > 0) {
        user.wallet += dailyProfit;
        await user.save();

        // Record the transaction
        const transaction = new Transaction({
          user: user._id,
          amount: dailyProfit,
          type: 'dailyProfit',
        });
        await transaction.save();

        // Distribute profit to upline users
        await distributeProfitToUplines(user, dailyProfit, 1);
      }
    }

    console.log('Daily profits distributed');
  } catch (err) {
    console.error('Error calculating daily profits:', err);
  }
};

// Calculate Daily Referral Profits
exports.calculateDailyReferralProfits = async () => {
  try {
    const users = await User.find({ active: true });

    for (const user of users) {
      let dailyProfit = 0;

      if (user.numberOfReferredUsers > 0) {
        // Fetch referred users created today
        const referredUsers = await User.find({
          referredBy: user.referralCode,
          createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        });

        // Sort referred users based on package price in descending order
        referredUsers.sort((a, b) => Math.max(...b.packages.map(p => p.price)) - Math.max(...a.packages.map(p => p.price)));

        // Define the profit map
        const profitMap = {
          1: { C570: 100, J1550: 100, G3550: 200, E7500: 400, C12150: 500, S28800: 500 },
          2: { C570: 150, J1550: 150, G3550: 300, E7500: 500, C12150: 600, S28800: 600 },
          3: { C570: 200, J1550: 200, G3550: 400, E7500: 600, C12150: 700, S28800: 700 },
        };

        let referralCount = 0;

        for (const referredUser of referredUsers) {
          // Check if the referred user's package is equal to or greater than the user's package
          const userMaxPackagePrice = Math.max(...user.packages.map(p => p.price));
          const referredUserMaxPackagePrice = Math.max(...referredUser.packages.map(p => p.price));

          if (referredUserMaxPackagePrice >= userMaxPackagePrice) {
            referralCount += 1;

            // Apply the profit map based on the referral count (capped at 3)
            const profitValues = profitMap[Math.min(referralCount, 3)];

            user.packages.forEach(pkg => {
              if (profitValues[pkg.name]) {
                dailyProfit += profitValues[pkg.name];
              }
            });
          }
        }

        // Update the user's wallet and save the transaction
        if (dailyProfit > 0) {
          user.wallet += dailyProfit;
          await user.save();

          const transaction = new Transaction({
            user: user._id,
            amount: dailyProfit,
            type: 'referralDailyProfit',
          });
          await transaction.save();
        }
      }
    }

    console.log('Daily referral profits distributed');
  } catch (err) {
    console.error('Error calculating daily referral profits:', err);
  }
};

