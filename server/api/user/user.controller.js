'use strict';

var User = require('./user.model');
var Location = require('../location/location.model.js');
var passport = require('passport');
var config = require('../../config/environment');
var jwt = require('jsonwebtoken');
//var basicAuth = require("basic-auth");

var validationError = function (res, err) {
  return res.json(422, err);
};

/**
 * Get list of users
 * restriction: 'admin'
 */
exports.index = function (req, res) {
  User.find({}, '-salt -hashedPassword', function (err, users) {
    if (err) return res.send(500, err);
    res.json(200, users);
  });
};

/**
 * Creates a new user
 */
exports.create = function (req, res, next) {
  
  //first, let's see if we have this user already, if not, we'll create one
  
  console.log("request body", req.body);
  
  User.findOne({ "facebook.id": req.body.facebook.id }, function (err, user) {
    console.log(user);
    if (user) {
      return res.send(200, user);
    } else {
      console.log("Creating a new user", req.body);
      var newUser = new User(req.body);
      newUser.dough = 1000000; //SETS INITIAL AMOUNT OF DOUGH
      newUser.provider = 'facebook';
      newUser.role = 'user';
      //newUser.accessToken = sha1(req.body.facebook.id);
      newUser.save(function (err, user) {
//        if (err) return validationError(res, err);
//        var token = jwt.sign({ _id: user._id }, config.secrets.session, { expiresInMinutes: 60 * 5 });
        res.json(user);
      });
    }
  });
};

/**
 * Get a single user
 */
exports.show = function (req, res, next) {
  var userId = req.params.id;

  User.findById(userId, function (err, user) {
    if (err) return next(err);
    if (!user) return res.send(401);
    res.json(user.profile);
  });
};

/**
 * Deletes a user
 * restriction: 'admin'
 */
exports.destroy = function (req, res) {
  User.findByIdAndRemove(req.params.id, function (err, user) {
    if (err) return res.send(500, err);
    return res.send(204);
  });
};

/**
 * Change a users password
 */
exports.changePassword = function (req, res, next) {
  var userId = req.user._id;
  var oldPass = String(req.body.oldPassword);
  var newPass = String(req.body.newPassword);

  User.findById(userId, function (err, user) {
    if (user.authenticate(oldPass)) {
      user.password = newPass;
      user.save(function (err) {
        if (err) return validationError(res, err);
        res.send(200);
      });
    } else {
      res.send(403);
    }
  });
};

/**
 * Get my info
 */
exports.me = function (req, res, next) {
  var userId = req.user._id;
  User.findOne({
    _id: userId
  }, '-salt -hashedPassword', function (err, user) { // don't ever give out the password or salt
      if (err) return next(err);
      if (!user) return res.json(401);
      res.json(user);
    });
};

/**
 * Authentication callback
 */
exports.authCallback = function (req, res, next) {
  res.redirect('/');
};


// Get a user's locations

exports.getUsersLocations = function (req, res) {
  if (!req.user) {
    res.send(401, "Must be authorized to access a user's locations");
  }
  Location.find({ owner: req.user._id }, function (err, locations) {
    if (locations) {
      res.send(200, locations);
    } else {
      res.send(404);
    }
  })
}

//session validation


//exports.validateSession = function(req, res, next){
//		
//	return basicAuth(function(accessToken,p,fn){
//
//			if (!accessToken){
//				fn(null, null);
//			}
//			
//			User.findOne({accessToken:accessToken}, function(err, result){
//				if(result){
//					fn(null, result);
//				}
//				else {
//					fn(null, null);
//				}		
//			});
//	})(req, res, next);
//				
//};
