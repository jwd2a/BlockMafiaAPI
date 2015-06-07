var GreatCircle = {

    validateRadius: function(unit) {
        var r = {'KM': 6371.009, 'MI': 3958.761, 'NM': 3440.070, 'YD': 6967420, 'FT': 20902260};
        if ( unit in r ) return r[unit];
        else return unit;
    },

    distance: function(lat1, lon1, lat2, lon2, unit) {
        if ( unit === undefined ) unit = 'KM';
        var r = this.validateRadius(unit); 
        lat1 *= Math.PI / 180;
        lon1 *= Math.PI / 180;
        lat2 *= Math.PI / 180;
        lon2 *= Math.PI / 180;
        var lonDelta = lon2 - lon1;
        var a = Math.pow(Math.cos(lat2) * Math.sin(lonDelta) , 2) + Math.pow(Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lonDelta) , 2);
        var b = Math.sin(lat1) * Math.sin(lat2) + Math.cos(lat1) * Math.cos(lat2) * Math.cos(lonDelta);
        var angle = Math.atan2(Math.sqrt(a) , b);
        
        return angle * r;
    },
    
    bearing: function(lat1, lon1, lat2, lon2) {
        lat1 *= Math.PI / 180;
        lon1 *= Math.PI / 180;
        lat2 *= Math.PI / 180;
        lon2 *= Math.PI / 180;
        var lonDelta = lon2 - lon1;
        var y = Math.sin(lonDelta) * Math.cos(lat2);
        var x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lonDelta);
        var brng = Math.atan2(y, x);
        brng = brng * (180 / Math.PI);
        
        if ( brng < 0 ) { brng += 360; }
        
        return brng;
    },
    
    destination: function(lat1, lon1, brng, dt, unit) {
        if ( unit === undefined ) unit = 'KM';
        var r = this.validateRadius(unit);
        lat1 *= Math.PI / 180;
        lon1 *= Math.PI / 180;
        var lat3 = Math.asin(Math.sin(lat1) * Math.cos(dt / r) + Math.cos(lat1) * Math.sin(dt / r) * Math.cos( brng * Math.PI / 180 ));
        var lon3 = lon1 + Math.atan2(Math.sin( brng * Math.PI / 180 ) * Math.sin(dt / r) * Math.cos(lat1) , Math.cos(dt / r) - Math.sin(lat1) * Math.sin(lat3));
        
        return {
            'LAT': lat3 * 180 / Math.PI,
            'LON': lon3 * 180 / Math.PI
        };
    }

}

/* Taps in Tampa */
var p1 = [27.9501224737974,-82.4609413379432];
/* My House */
var p2 = [28.0694503373883, -82.6293627459496];

var segmentDist = GreatCircle.distance(p1[0], p1[1], p2[0], p2[1], "MI");

var p1ToRightBtmCorner = GreatCircle.distance(p1[0], p1[1], p1[0], p2[1], "MI");
var p2ToRightBtmCorner = GreatCircle.distance(p2[0], p2[1], p1[0], p2[1], "MI");

var point1 = {
	x: 0-p1ToRightBtmCorner/2,
	y: 0-p2ToRightBtmCorner/2
}

var point2 = {
	x: p1ToRightBtmCorner/2,
	y: p2ToRightBtmCorner/2
}

var circle = {
	x: 4,
	y: 5
}

console.log(point1);
console.log(point2);

var result = interceptOnCircle(point1, point2, circle, 1);
console.log(result);

function interceptOnCircle(p1,p2,c,r){
    //p1 is the first line point
    //p2 is the second line point
    //c is the circle's center
    //r is the circle's radius

    var p3 = {x:p1.x - c.x, y:p1.y - c.y} //shifted line points
    var p4 = {x:p2.x - c.x, y:p2.y - c.y}

    var m = (p4.y - p3.y) / (p4.x - p3.x); //slope of the line
    var b = p3.y - m * p3.x; //y-intercept of line

    var underRadical = Math.pow((Math.pow(r,2)*(Math.pow(m,2)+1)),2)-Math.pow(b,2); //the value under the square root sign 

    if (underRadical < 0){
    //line completely missed
        return false;
    } else {
        var t1 = (-2*m*b+2*Math.sqrt(underRadical))/(2 * Math.pow(m,2) + 2); //one of the intercept x's
        var t2 = (-2*m*b-2*Math.sqrt(underRadical))/(2 * Math.pow(m,2) + 2); //other intercept's x
        var i1 = {x:t1,y:m*t1+b} //intercept point 1
        var i2 = {x:t2,y:m*t2+b} //intercept point 2
        return [i1,i2];
    }
}