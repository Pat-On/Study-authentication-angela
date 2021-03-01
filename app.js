require('dotenv').config();

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session')
const passport = require('passport')
const passportLocalMongoose = require('passport-local-mongoose')


const app = express();


app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}))


//express-session setting it with some initial configuartion
app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false,
}));

//build in passport - app is going to use passport and passport is initialize passport packet
app.use(passport.initialize())
//setting up the passport to deal with a session
app.use(passport.session())

//mongoose connection
mongoose.connect("mongodb://localhost:27017/userDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
mongoose.set('useCreateIndex', true);

//Upgrade: creating proper Schema base on mongoose - objec t created from mongoose.schema class
const userSchema = new mongoose.Schema({
  email: String,
  password: String
});
// this is going to do a lot of heavy lifting - hashing, salting, saving users
userSchema.plugin(passportLocalMongoose);

// setting new user model
const User = new mongoose.model("User", userSchema);

// creating local login strategy
passport.use(User.createStrategy())

//serialization deserialization of user
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
// !IMPORTANT order of the code from level 5 is very important!

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

//this route will be resposible to check if the user is authenitcated by the cookie! all modules from lvl 5 needed
app.get("/secrets", function(req, res) {
  if (req.isAuthenticated) {
    res.render("secrets")
  } else {
    res.redirect("/login")
  }
})

app.get("/logout", function(req, res) {
  req.logout();
  res.redirect("/")
})

app.post("/register", function(req, res) {
  //passport-local-mongoose - "shortcut"
  User.register({
    username: req.body.username
  }, req.body.password, function(err, user) {
    if (err) {
      console.log(err)
      res.redirect("/register")
    } else {
      passport.authenticate("local")(req, res, function() {
        //only if they logged in
        res.redirect("/secrets")
      })
    }
  })
})

app.post("/login", function(req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password
  })
  //method login comming from passport connected to app NICE!
  req.login(user, function(err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/secrets");
      })
    }
  })
})




app.listen(3000, function() {
  console.log("Server started on port 3000");
})