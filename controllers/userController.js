const Razorpay = require('razorpay');
const cron = require('node-cron');
const crypto = require('crypto');
const User = require('../models/User');
const Package = require('../models/Package');
const Transaction = require('../models/Transaction');
const Admin = require('../models/admin');


const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('packages');
    res.status(200).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.buyPackage = async (req, res) => {
  try {
    const { packageId } = req.body;
    const user = await User.findById(req.user.id);
    const package = await Package.findById(packageId);

    if (!package) {
      return res.status(404).json({ error: 'Package not found' });
    }

    // Create a Razorpay order
    const options = {
      amount: package.price * 100, // Amount in paise
      currency: 'INR',
      receipt: `order_rcptid_${user._id}`,
    };

    const order = await razorpay.orders.create(options);

    res.status(200).json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.handlePaymentCallback = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, packageId } = req.body;

    // Verify signature
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const user = await User.findById(req.user.id);
    const package = await Package.findById(packageId);

    if (!package) {
      return res.status(404).json({ error: 'Package not found' });
    }

    user.packages.push(package);
    user.active = true;
    user.wallet += 110; // Welcome bonus
    await user.save();

    const transaction = new Transaction({
      user: user._id,
      amount: package.price,
      type: 'deposit',
    });
    await transaction.save();

    res.status(200).json({ message: 'Payment successful', user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.withdrawAmount = async (req, res) => {
  try {
    const { amount } = req.body;
    const user = await User.findById(req.user.id);

    if (amount < 110) {
      return res.status(400).json({ error: 'Minimum withdrawal amount is 110' });
    }

    if (user.wallet < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const deduction = amount * 0.06;
    const netAmount = amount - deduction;

    user.wallet -= amount;
    await user.save();

    // Deduction charge to admin
    const admin = await Admin.findOne(); // Assuming there's only one admin
    admin.wallet = admin.wallet ? admin.wallet + deduction : deduction;
    await admin.save();

    const transaction = new Transaction({
      user: user._id,
      amount: netAmount,
      type: 'withdrawal',
    });
    await transaction.save();

    res.status(200).json({ message: 'Withdrawal successful', netAmount });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getReferralHistory = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const referredUsers = await User.find({ referredBy: user.referralCode });

    res.status(200).json(referredUsers);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

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

const calculateDailyProfits = async () => {
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
        console.error(err.message);
    }
};


// Schedule daily profit calculation using cron job
cron.schedule('0 0 * * *', calculateDailyProfits);

exports.calculateDailyProfits = calculateDailyProfits;
