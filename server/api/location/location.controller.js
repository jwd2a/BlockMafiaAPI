'use strict';

var _ = require('lodash');
var Location = require('./location.model');
var User = require('../user/user.model');
var request = require("request");
var _ = require("underscore");

// Get list of locations
exports.index = function (req, res) {


  if (req.query.center) {
    var center = req.query.center.split(",");
  }

  if (req.query.nearby) {
    console.log("GETTING NEARBY");
    console.log(req.query.nearby[0]);
    getNearbyLocations({
      lat: req.query.nearby[0],
      lng: req.query.nearby[1]
    }, res);
    return;
  }

  if (req.query.p1) {
    console.log("determine");
    return determineIntersection(req, res);
  }

  if (!req.query.center) {
    res.send(400, "You must supply a center point for a location query");
  }

  var fsURL = "https://api.foursquare.com/v2/venues/search?ll=" + center[0] + "," + center[1] + "&radius=" + req.query.radius + "&client_id=2VGQMQJRMIE1G52F2ZSYIT2TOYRISS5VI4BBPYEFCVCS2R0Q&client_secret=HN5RQX402W4DRXT2ZN3PV0JRD3SYLNYZZ1KCUN5LZEJGQ0DF&v=20150601";

  var fsVenues = [];
  var venuesToMap = [];

  request(fsURL, function (err, resp, body) {
    var body = JSON.parse(body);

    body.response.venues.forEach(function (venue) {
      fsVenues.push(venue.id);
    });
    
    //dummy for testing - DELETE IN PROD
    
    fsVenues.push("4c362addae2da593deb6fcc5");
    
    //this finds owned properties:
    
    Location.find({ "building.id": { $in: fsVenues } }, function (err, locations) {
      if (!err) {

        console.log("Number of owned venues in this view:", locations.length);

        body.response.venues.forEach(function (venue) {

          locations.forEach(function (ownedLocation) {
            if (ownedLocation.building.id == venue.id) {
              var newVenue = venue;
              newVenue.isOwned = true;
              newVenue.owner = ownedLocation.building.owner;
              body.response.venues.splice(body.response.venues.indexOf(venue), 1, newVenue);
            }
          });
        });
        return res.send(body.response.venues);
      }
    });
  });
};

// Get a single location
exports.show = function (req, res) {
  Location.findById(req.params.id, function (err, location) {
    if (err) { return handleError(res, err); }
    if (!location) { return res.send(404); }
    return res.json(location);
  });
};

// Purchases a location
exports.buy = function (req, res) {

  if (!req.body.facebook_id) {
    return res.send(401, "Unauthorized access");
  }

  User.findOne({ "facebook.id": req.body.facebook_id }, function (err, user) {
    if (user.dough > req.body.building.cost) {
      var newLocation = req.body.building;
      newLocation.owner = user;
      newLocation.geo = [req.body.building.location.lng, req.body.building.location.lat];
      Location.create(req.body, function (err, location) {
        if (err) { return handleError(res, err); }
        //update User's dough       
        User.findOneAndUpdate({ "facebook.id": req.body.facebook_id }, { dough: user.dough - req.body.building.cost }, function (err) {
          if (err) { return handleError(res, err); }
          return res.json(201, location);
        });
      });

    } else {
      res.send(405, "Sorry, you don't have enough dough");
    }
  });

};

// Updates an existing location in the DB.
exports.update = function (req, res) {
  if (req.body._id) { delete req.body._id; }
  Location.findById(req.params.id, function (err, location) {
    if (err) { return handleError(res, err); }
    if (!location) { return res.send(404); }
    var updated = _.merge(location, req.body);
    updated.save(function (err) {
      if (err) { return handleError(res, err); }
      return res.json(200, location);
    });
  });
};

// Deletes a location from the DB.
exports.destroy = function (req, res) {
  Location.findById(req.params.id, function (err, location) {
    if (err) { return handleError(res, err); }
    if (!location) { return res.send(404); }
    location.remove(function (err) {
      if (err) { return handleError(res, err); }
      return res.send(204);
    });
  });
};

function determineIntersection(req, res) {

  var q = {
    p1: {
      x: 36.154597,
      y: -86.786353
    }
  };
  
  q.p2 = {
    x: 36.156014,
    y: -86.785833
  }

  q.circle = {
    x: 36.153406,
    y: -86.788849
  }

  q.radius = .1;

  console.log(q);
  
  var plane = determineSizeOfPlane(q.p1, q.p2);
  console.log("plane", plane);
  var circle = findCircleOnPlane(q.p1, q.p2, q.circle, plane);
  console.log("circle", circle);
  
  //  var q = req.query;
  //  q.p1 = {
  //    x: q.p1[0],
  //    y: q.p1[1]
  //  }
  //  q.p2 = {
  //    x: q.p2[0],
  //    y: q.p2[1]
  //  }
  //  q.circle = {
  //    x: q.circle[0],
  //    y: q.circle[1]
  //  }
  //  
  var int = interceptOnCircle(q.p1, q.p2, q.circle, q.radius);
  if (int) {
    console.log("INTERCEPTION!");
    console.log(int);
    return true;
  } else {
    console.log(int);
    return false;
  }

}


function getNearbyLocations(location, res) {
  Location.geoNear({
    type: "Point",
    coordinates: [location.lng, location.lat]
  }, function (err, locations) {
      res.send(locations);
    });
}

function handleError(res, err) {
  return res.send(500, err);
}

//returns the X and Y dimensions of the plane in miles

function determineSizeOfPlane(p1, p2) {
  console.log("SIZE OF PLANE");
  return {
    x: GreatCircle.distance(p1.x, p1.y, p2.x, p1.y),
    y: GreatCircle.distance(p1.x, p1.y, p1.x, p2.y)
  };
  
}

//var plane = determineSizeOfPlane(p1,p2);



function buildCartesianMileagePlane(point1, point2) {
  //from top left corner clockwise
  
  var y1 = {
    x: 0 - plane.x / 2,
    y: 0 + plane.y / 2
  }
  var y2 = {
    x: 0 + plane.x / 2,
    y: 0 + plane.y / 2
  }
  var y3 = {
    x: 0 + plane.x / 2,
    y: 0 - plane.y / 2
  }
  var y4 = {
    x: 0 - plane.x / 2,
    y: 0 - plane.y / 2
  }
}

function findCircleOnPlane(p1, p2, c, plane) {
  return {
    x: GreatCircle.distance(p1.x, p1.y, p1.x, c.y) - plane.y / 2,
    y: GreatCircle.distance(p1.x, p1.y, c.x, p1.y) - plane.x / 2
  }
}


// Great Circle Shit

var GreatCircle = {

  validateRadius: function (unit) {
    var r = { 'KM': 6371.009, 'MI': 3958.761, 'NM': 3440.070, 'YD': 6967420, 'FT': 20902260 };
    if (unit in r) return r[unit];
    else return unit;
  },

  distance: function (lat1, lon1, lat2, lon2, unit) {
    if (unit === undefined) unit = 'KM';
    var r = this.validateRadius(unit);
    lat1 *= Math.PI / 180;
    lon1 *= Math.PI / 180;
    lat2 *= Math.PI / 180;
    lon2 *= Math.PI / 180;
    var lonDelta = lon2 - lon1;
    var a = Math.pow(Math.cos(lat2) * Math.sin(lonDelta), 2) + Math.pow(Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lonDelta), 2);
    var b = Math.sin(lat1) * Math.sin(lat2) + Math.cos(lat1) * Math.cos(lat2) * Math.cos(lonDelta);
    var angle = Math.atan2(Math.sqrt(a), b);

    return angle * r;
  },

  bearing: function (lat1, lon1, lat2, lon2) {
    lat1 *= Math.PI / 180;
    lon1 *= Math.PI / 180;
    lat2 *= Math.PI / 180;
    lon2 *= Math.PI / 180;
    var lonDelta = lon2 - lon1;
    var y = Math.sin(lonDelta) * Math.cos(lat2);
    var x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lonDelta);
    var brng = Math.atan2(y, x);
    brng = brng * (180 / Math.PI);

    if (brng < 0) { brng += 360; }

    return brng;
  },

  destination: function (lat1, lon1, brng, dt, unit) {
    if (unit === undefined) unit = 'KM';
    var r = this.validateRadius(unit);
    lat1 *= Math.PI / 180;
    lon1 *= Math.PI / 180;
    var lat3 = Math.asin(Math.sin(lat1) * Math.cos(dt / r) + Math.cos(lat1) * Math.sin(dt / r) * Math.cos(brng * Math.PI / 180));
    var lon3 = lon1 + Math.atan2(Math.sin(brng * Math.PI / 180) * Math.sin(dt / r) * Math.cos(lat1), Math.cos(dt / r) - Math.sin(lat1) * Math.sin(lat3));

    return {
      'LAT': lat3 * 180 / Math.PI,
      'LON': lon3 * 180 / Math.PI
    };
  }
}

function interceptOnCircle(p1, p2, c, r) {
  console.log("p2", p2);
  //p1 is the first line point
  //p2 is the second line point
  //c is the circle's center
  //r is the circle's radius

  var p3 = { x: p1.x - c.x, y: p1.y - c.y } //shifted line points
  var p4 = { x: p2.x - c.x, y: p2.y - c.y }

  var m = (p4.y - p3.y) / (p4.x - p3.x); //slope of the line
  var b = p3.y - m * p3.x; //y-intercept of line

  var underRadical = Math.pow((Math.pow(r, 2) * (Math.pow(m, 2) + 1)), 2) - Math.pow(b, 2); //the value under the square root sign 

  if (underRadical < 0) {
    //line completely missed
    return false;
  } else {
    var t1 = (-2 * m * b + 2 * Math.sqrt(underRadical)) / (2 * Math.pow(m, 2) + 2); //one of the intercept x's
    var t2 = (-2 * m * b - 2 * Math.sqrt(underRadical)) / (2 * Math.pow(m, 2) + 2); //other intercept's x
    var i1 = { x: t1, y: m * t1 + b } //intercept point 1
    var i2 = { x: t2, y: m * t2 + b } //intercept point 2
    return [i1, i2];
  }
}