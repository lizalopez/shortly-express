var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');
var cookieParser = require('cookie-parser');


var db = require('./app/config');

var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({secret: 'mysecret', 
                 saveUninitialized: true,
                 resave: true}));
app.use(express.static(__dirname + '/public'));

function restrict(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    req.session.error = 'Access denied!';
    res.redirect('/login');
  }
};

app.get('/', restrict,
function(req, res) {
  // res.render('index');
  res.render('index');
});

app.get('/create', 
function(req, res) {
  // res.render('index'); 
  res.redirect('login');
});

app.get('/links', 
function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  });
  
});

app.get('/signup', 
function(req, res) {
  console.log('GETTING on signup, body:', res.body);
  res.render('signup');
});

app.post('/signup', 
function(req, res) {
  var text = req.query.text;
  var user = new User({username: req.body.username, password: req.body.password}).save().then(function() {console.log("singup: added");});
  //db.run("insert into USERS(id, username, password) values(?, 'user', 'pw')");
  // console.log('POSTING on signup, body:', req.body);
  console.log("user",user);
  res.send(200);
  // res.location('/');
  res.redirect('/');
});

app.get('/login',
  function (req, res){
    res.render('login');
  });

app.post('/login',
  function(req, res){
    var username = req.body.username;
    var password = req.body.password;
    console.log('user model:', User);
    Users.reset().fetch().then(function(found) {
      found.models.forEach(function(model){
        console.log('each attr:', model.attributes);
        if (model.attributes.username === username) {
          //check pw
          console.log('matching user!');
          if (model.attributes.password === password) {
            console.log('matching pw!!');
            req.session.regenerate(function(){
              req.session.user = username;
              res.redirect('/');
              });
          } else {
            //incorrect pw
          }
        } else {
          //user doesn't exist, render login w message?
        }
      });
      console.log('found in db:', found.models.attributes);
    });

    // if (username === 'demo' && password === 'demo') {
    //   console.log('demo entered', username, password);
    //   req.session.regenerate(function(){
    //     req.session.user = username;
    //     res.redirect('/');
    //     });
    // } else {
    //   res.redirect('/links');
    // }
});
app.get('/logout', function(request, response){
  console.log("got here")
    request.session.destroy(function(){
      console.log("session ended")
        response.redirect('/login');
    });
});
app.post('/links', 
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    res.redirect('login');

    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        Links.create({
          url: uri,
          title: title,
          base_url: req.headers.origin
        })
        .then(function(newLink) {
          res.send(200, newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/



/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits')+1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
