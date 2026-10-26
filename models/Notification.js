const mongoose = require("mongoose");
var mongoosePaginate = require("mongoose-paginate");

const notificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subtitle: { type: String },
  type: { type: String, required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  friendRequestId: { type: String },
  eventId: { type: String },
});

notificationSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("Notfication", notificationSchema);