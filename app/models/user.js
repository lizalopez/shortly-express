var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');


//Bookshelf.Model.extend({})
var User = db.Model.extend({


  tableName: 'users'

});

module.exports = User;

//look up bcrypt to hash pw