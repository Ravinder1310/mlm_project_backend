const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Package = require('../models/Package');
const cron = require('node-cron');

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
    const { name, price, photo1, photo2, discription, purchaseDate, supply, user} = req.body;
    const newPackage = new Package({ name, price, photo1, photo2, discription, purchaseDate, supply, user});
    await newPackage.save();
    res.status(201).json(newPackage);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const distributeWeeklySalaries = async () => {
    try {
        const users = await User.find({ active: true }).populate('packages');

        const distributeSalaryToUplines = async (user, weeklySalary, level) => {
            if (!user.referredBy) return; // Stop if no upline

            const uplineUser = await User.findOne({ referralCode: user.referredBy });
            if (uplineUser) {
                const levelMultiplier = {
                    1: 1, // 100% for direct referrals
                    2: 1, // 100% for second-level referrals
                    3: 1, // 100% for third-level referrals
                }[level] || 1; // Default to 100% if level is not in the map

                const uplineSalary = weeklySalary * levelMultiplier;

                // Update upline user's wallet
                uplineUser.wallet += uplineSalary;
                await uplineUser.save();

                // Record the transaction
                const transaction = new Transaction({
                    user: uplineUser._id,
                    amount: uplineSalary,
                    type: `uplineLevel${level}WeeklySalary`,
                });
                await transaction.save();

                // Recursively distribute to higher-level uplines
                await distributeSalaryToUplines(uplineUser, weeklySalary, level + 1);
            }
        };

        for (const user of users) {
            let weeklySalary = 0;

            // Calculate weekly salary based on referral performance
            const referrals = await User.find({ referredBy: user.referralCode });
            const numberOfReferrals = referrals.length;

            if (numberOfReferrals >= 3) weeklySalary += 100;
            if (numberOfReferrals >= 5) weeklySalary += 300;
            if (numberOfReferrals >= 10) weeklySalary += 700;
            if (numberOfReferrals >= 20) weeklySalary += 1500;
            if (numberOfReferrals >= 30) weeklySalary += 2500;

            // Save user's weekly salary
            if (weeklySalary > 0) {
                user.wallet += weeklySalary;
                await user.save();

                const transaction = new Transaction({
                    user: user._id,
                    amount: weeklySalary,
                    type: 'weeklySalary',
                });
                await transaction.save();

                // Distribute salary to upline users
                await distributeSalaryToUplines(user, weeklySalary, 1);
            }
        }

        console.log('Weekly salaries distributed');
    } catch (err) {
        console.error(err.message);
    }
};



  const distributeMonthlySalaries = async () => {
    try {
        const users = await User.find({ active: true }).populate('packages');

        const distributeSalaryToUplines = async (user, monthlySalary, level) => {
            if (!user.referredBy) return; // Stop if no upline

            const uplineUser = await User.findOne({ referralCode: user.referredBy });
            if (uplineUser) {
                const levelMultiplier = {
                    1: 1, // 100% for direct referrals
                    2: 1, // 100% for second-level referrals
                    3: 1, // 100% for third-level referrals
                }[level] || 1; // Default to 100% if level is not in the map

                const uplineSalary = monthlySalary * levelMultiplier;

                // Update upline user's wallet
                uplineUser.wallet += uplineSalary;
                await uplineUser.save();

                // Record the transaction
                const transaction = new Transaction({
                    user: uplineUser._id,
                    amount: uplineSalary,
                    type: `uplineLevel${level}MonthlySalary`,
                });
                await transaction.save();

                // Recursively distribute to higher-level uplines
                await distributeSalaryToUplines(uplineUser, monthlySalary, level + 1);
            }
        };

        for (const user of users) {
            let personalMonthlySalary = 0;
            let teamMonthlySalary = 0;

            // Calculate personal monthly salary based on referral performance
            const referrals = await User.find({ referredBy: user.referralCode });
            const numberOfReferrals = referrals.length;

            if (numberOfReferrals >= 5) personalMonthlySalary += 1500;
            if (numberOfReferrals >= 10) personalMonthlySalary += 2500;
            if (numberOfReferrals >= 20) personalMonthlySalary += 7500;
            if (numberOfReferrals >= 30) personalMonthlySalary += 12500;
            if (numberOfReferrals >= 40) personalMonthlySalary += 25000;
            if (numberOfReferrals >= 50) personalMonthlySalary += 50000;

            // Calculate team monthly salary based on total referrals within the team
            const teamReferrals = await User.find({ referredBy: { $in: referrals.map(r => r.referralCode) } });
            const numberOfTeamReferrals = teamReferrals.length;

            if (numberOfTeamReferrals >= 25) teamMonthlySalary += 1500;
            if (numberOfTeamReferrals >= 50) teamMonthlySalary += 2500;
            if (numberOfTeamReferrals >= 150) teamMonthlySalary += 7500;
            if (numberOfTeamReferrals >= 270) teamMonthlySalary += 12500;
            if (numberOfTeamReferrals >= 500) teamMonthlySalary += 25000;
            if (numberOfTeamReferrals >= 1000) teamMonthlySalary += 50000;

            const totalMonthlySalary = personalMonthlySalary + teamMonthlySalary;

            // Save user's monthly salary
            if (totalMonthlySalary > 0) {
                user.wallet += totalMonthlySalary;
                await user.save();

                const transaction = new Transaction({
                    user: user._id,
                    amount: totalMonthlySalary,
                    type: 'monthlySalary',
                });
                await transaction.save();

                // Distribute salary to upline users
                await distributeSalaryToUplines(user, totalMonthlySalary, 1);
            }
        }

        console.log('Monthly salaries distributed');
    } catch (err) {
        console.error(err.message);
    }
};

  
  
  // Schedule weekly salary distribution using cron job
  cron.schedule('0 0 * * 0', distributeWeeklySalaries);
  // Schedule monthly salary distribution using cron job
  cron.schedule('0 0 1 * *', distributeMonthlySalaries);
  
  exports.distributeWeeklySalaries = distributeWeeklySalaries;
  exports.distributeMonthlySalaries = distributeMonthlySalaries;
  
