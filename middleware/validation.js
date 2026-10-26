var mongoose = require("mongoose");

// ===================== Validate ObjectId =========================

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

module.exports = {

  isValidObjectId
};