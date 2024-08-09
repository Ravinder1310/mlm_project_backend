const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  photo1: { type: String, required: true },
  pack_id:{type: Number, required:true},
  photo2: { type: String, required: true },
  bank_name:{type:String,required:true},
  account:{type:String,required:true},
  bank_IFSC:{type:String,required:true},
  price: { type: Number, required: true },
  purchaseDate: { type: Date, default: Date.now },
  supply: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('Package', packageSchema);
