require('dotenv').config();

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");

const md5 = require("md5");

// const encrypt = require("mongoose-encryption");

const app = express();


app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}))
//mongoose connection
mongoose.connect("mongodb://localhost:27017/userDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
//schema creation - it is just normal JS object
// const userSchema = {
//   email: String,
//   password: String
// };
//Upgrade: creating proper Schema base on mongoose - objec t created from mongoose.schema class
const userSchema = new mongoose.Schema({
  email: String,
  password: String
});


// //plugin encryption and the secret word - needed to be done before mongoose.model()
// userSchema.plugin(encrypt, {
//   secret: process.env.SECRET,
//   encryptedFields: ["password"] //possible - anceyption of many fields
// })


// setting new user model
const User = new mongoose.model("User", userSchema);

//EJS rendering on the get routes
app.get("/", function(req, res) {
  res.render("home")
})
app.get("/login", function(req, res) {
  res.render("login")
})
app.get("/register", function(req, res) {
  res.render("register")
})

app.post("/register", function(req, res) {
  const newUser = new User({
    email: req.body.username,
    password: md5(req.body.password),
  })

  newUser.save(function(err) {
    if (err) {
      console.log(err)
    } else {
      res.render("secrets")
    }
  })
})

app.post("/login", function(req, res) {
  const username = req.body.username;
  const password = md5(req.body.password);
  User.findOne({
    email: username
  }, function(err, foundUser) {
    if (err) {
      console.log(err)
    } else {
      if (foundUser) {
        console.log(foundUser.password)
        if (foundUser.password === password) {
          res.render("secrets")
        }
      }
    }
  })
})




app.listen(3000, function() {
  console.log("Server started on port 3000");
})