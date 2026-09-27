const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
        email: String,
    password: String,   // Verification field (e.g., enrollment number)
});

module.exports = mongoose.model("User", userSchema);
