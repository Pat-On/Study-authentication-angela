require('dotenv').config();

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session')
const passport = require('passport')
const passportLocalMongoose = require('passport-local-mongoose')

//lvl 6
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();


app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}))


//express-session setting it with some initial configuartion
app.use(session({
  secret: process.env.SECRET,
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
  //local authentication field
  email: String,
  password: String,
  // google authenticate field
  googleId: String,
  secret: String
});
// this is going to do a lot of heavy lifting - hashing, salting, saving users
userSchema.plugin(passportLocalMongoose);

// lvl 6
userSchema.plugin(findOrCreate)

// setting new user model
const User = new mongoose.model("User", userSchema);

// creating local login strategy
passport.use(User.createStrategy())

//IT GAVE ME ERROR IN LEVEL 6 - IT NO WORKING WITH GOOGLE STRATEGY ONLY WITH local
//serialization deserialization of user
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());
// !IMPORTANT order of the code from level 5 is very important!

//SERIALIZATION AND DESERIALIZATION WHICH SHOULD WORK WITH ANY TYPE OF serialization
passport.serializeUser(function(user, done) {
  done(null, user.id);
})

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user)
  })
})


//passport googleusercontent -> it have to be added after all set-ups right before rounds
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    //check if this is working: - line bellow
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, done) {
    console.log(profile)
    // findOrCreate is normally pseudo code, but we can import the "mongoose-findorcreate" to make it work
    //here it would create user if no exist or find if existing
    User.findOrCreate({
      googleId: profile.id
    }, function(err, user) {
      return done(err, user);
    });
  }
));


//EJS rendering on the get routes
app.get("/", function(req, res) {
  res.render("home")
})

app.get("/auth/google",
  passport.authenticate("google", {
    //we will tell to google what we want by scope
    scope: ['profile']
  })
)
//app.get -> comming from the google authentication!
app.get('/auth/google/secrets',
  passport.authenticate('google', {
    failureRedirect: '/login'
  }),
  function(req, res) {
    //successul authentication, redirect to the secret page
    res.redirect('/secrets');
  });


app.get("/login", function(req, res) {
  res.render("login")
})
app.get("/register", function(req, res) {
  res.render("register")
})

//this route will be resposible to check if the user is authenitcated by the cookie! all modules from lvl 5 needed
app.get("/secrets", function(req, res) {
  //{$ne:null}
  User.find({
    "secret": {
      $exists: true
    }
  }, function(err, foundUsers) {
    if (err) {
      console.log(err)
    } else {
      if (foundUsers) {
        res.render("secrets", {
          usersWithSecrets: foundUsers
        })
      }
    }
  })
})

app.get("/submit", function(req, res) {
  if (req.isAuthenticated) {
    res.render("submit")
  } else {
    res.redirect("/login")
  }
})

app.post("/submit", function(req, res) {
  const submittedSecret = req.body.secret;

  console.log(req.user._id)

  User.findById(req.user._id, function(err, foundUser) {
    if (err) {
      console.log(err)
    } else {
      if (foundUser) {
        foundUser.secret = submittedSecret;
        foundUser.save(function() {
          res.redirect("/secrets")
        })
      }
    }
  })
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