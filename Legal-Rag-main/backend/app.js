// const express = require("express");
// const mongoose = require("mongoose");
// const cors = require("cors");
// const User = require("./models/User");

// const app = express();
// app.use(cors());
// app.use(express.json());

// mongoose.connect("mongodb://127.0.0.1:27017/react-login-tut", {
//   useNewUrlParser: true,
//   useUnifiedTopology: true
// })
// .then(() => console.log("MongoDB connected"))
// .catch(err => console.log(err));

// // Signup route
// app.post("/signup", async (req, res) => {
//   const { email, password } = req.body;
//   const existing = await User.findOne({ email });

//   if (existing) return res.send("exist");

//   await User.create({ email, password });
//   res.send("notexist");
// });

// // Login route
// app.post("/login", async (req, res) => {
//   const { email, password } = req.body;
//   const user = await User.findOne({ email });

//   if (user && user.password === password) {
//     res.send("exist");
//   } else {
//     res.send("notexist");
//   }
// });

// app.listen(8000, () => {
//   console.log("Server running on http://localhost:8000");
// });
console.log("APP.JS VERSION TEST");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const User = require("./models/User");

const app = express();
app.use(cors());
app.use(express.json());
app.get("/test", (req, res) => {
  console.log("TEST ROUTE HIT");
  res.send("working");
});

mongoose.connect("mongodb+srv://adepukaashyap8_db_user:yg08Objaf3NjT1AX@cluster0.n27s3ky.mongodb.net/?appName=Cluster0")
  .then(() => console.log("MongoDB Atlas connected"))
  .catch(err => console.log("MongoDB connection error:", err));


// Signup route
app.post("/signup", async (req, res) => {
  try {
    console.log("Received:", req.body);

    const { email, password } = req.body;

    const existing = await User.findOne({ email });

    if (existing) return res.send("exist");

    await User.create({ email, password });

    res.send("notexist");
  } catch (err) {
    console.log("Signup Error:", err);
    res.status(500).send("error");
  }
});

// Login route
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (user && user.password === password) {
    res.send("exist");
  } else {
    res.send("notexist");
  }
});

app.listen(2000, () => {
  console.log("Server running on http://localhost:2000");
});