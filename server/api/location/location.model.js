'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var LocationSchema = new Schema({
  building: Object,
  owner: String,
  geo: {type: Number, index: "2dsphere"}
});

module.exports = mongoose.model('Location', LocationSchema);