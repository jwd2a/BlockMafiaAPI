'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var GameSchema = new Schema({
  building: Object,
  player1: Object,
  player2: Object,
  winner: String,
  status: String
});

module.exports = mongoose.model('Game', GameSchema);