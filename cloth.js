// settings
var background = new Image();
background.src = "/logo.png";

var physics_accuracy  = 3,
    mouse_influence   = 20,
    mouse_pinning_distance = 10,
    mouse_cut         = 5,
    gravity           = 10000,
    cloth_height      = 70,
    cloth_width       = 500,
    start_y           = 30,
    clothResolution   = 200,
    spacing_x         = (cloth_width/clothResolution),
    spacing_y         = (cloth_height/clothResolution),
    cloth_width       = spacing_x*clothResolution,
    cloth_height      = spacing_y*clothResolution;

var tear_distance     = 70,
    tearing           = false, 
    deltaTime         = 0.008,
    stiffness         = 0.3,
    pinning           = false,
    damping           = false;


// portable animation frame function 
window.requestAnimFrame =
    window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function (callback) {
        window.setTimeout(callback, 1000 / 60);
};

// define globals
var canvas,
    ctx,
    cloth,
    boundsx,
    boundsy,
    mouse = {
        down: false,
        button: 1,
        x: 0,
        y: 0,
        px: 0,
        py: 0
    };


// Define point class     
var Point = function (x, y) {
    // coordinates
    this.x      = x;
    this.y      = y;
    // momentum 
    this.px     = x;
    this.py     = y;
    // velocity
    this.vx     = 0;
    this.vy     = 0;
    this.pin_x  = null;
    this.pin_y  = null;
    //constraints
    this.constraints = [];
};

Point.prototype.add = function(operand)
{
    return new Point(this.x + operand.x,this.y+operand.y);
}


Point.prototype.update = function (delta) {
    if (mouse.down) {
        // compute distance between mouse and point
        var diff_x = this.x - mouse.x,
            diff_y = this.y - mouse.y,
            dist = Math.sqrt(diff_x * diff_x + diff_y * diff_y);

        if (mouse.button == 1) {
            if (dist < mouse_influence) {
                // update point momentum 
                if (pinning & dist < mouse_pinning_distance)
                {
                    this.x = mouse.x;
                    this.y = mouse.y; 
                }
                else if (damping)
                {
                    this.px = this.x - (mouse.x - mouse.px) * 0.8;
                    this.py = this.y - (mouse.y - mouse.py) * 0.8;
                }
                else
                {
                    this.px = this.x - (mouse.x - mouse.px) * 1.8;
                    this.py = this.y - (mouse.y - mouse.py) * 1.8;
                }
                
            }
            
        
        } else if (dist < mouse_cut) this.constraints = [];
    }

    this.add_force(0, gravity);

    delta *= delta;
    nx = this.x + ((this.x - this.px) * .99) + ((this.vx / 2) * delta);
    ny = this.y + ((this.y - this.py) * .99) + ((this.vy / 2) * delta);

    this.px = this.x;
    this.py = this.y;

    this.x = nx;
    this.y = ny;

    this.vy = this.vx = 0
};

Point.prototype.draw = function () {
    if (!this.constraints.length) return;

    var i = this.constraints.length;
    while (i--) this.constraints[i].draw();
};

Point.prototype.resolve_constraints = function () {
    if (this.pin_x != null && this.pin_y != null) {
        this.x = this.pin_x;
        this.y = this.pin_y;
        return;
    }

    var i = this.constraints.length;
    while (i--) this.constraints[i].resolve();

    this.x > boundsx ? this.x = 2 * boundsx - this.x : 1 > this.x && (this.x = 2 - this.x);
    this.y < 1 ? this.y = 2 - this.y : this.y > boundsy && (this.y = 2 * boundsy - this.y);
};

Point.prototype.attach = function (point) {
    this.constraints.push(
        new Constraint(this, point)
    );
};

Point.prototype.remove_constraint = function (constraint) {
    this.constraints.splice(this.constraints.indexOf(constraint), 1);
};

Point.prototype.add_force = function (x, y) {
    // adds velocity to the point
    this.vx += x;
    this.vy += y;

    var round = 400;
    this.vx = ~~(this.vx * round) / round;
    this.vy = ~~(this.vy * round) / round;
};

Point.prototype.pin = function (pinx, piny) {
    // sets the pin of the point
    this.pin_x = pinx;
    this.pin_y = piny;
};

var Constraint = function (p1, p2) {
    // defines length constraint object between two points
    // a constraint containes the two points 
    this.p1     = p1;
    this.p2     = p2;
    // and their distance
    var diff_x  = p1.x - p2.x,
    diff_y  = p1.y - p2.y,
    spacing    = Math.sqrt(diff_x * diff_x + diff_y * diff_y);
    this.length = spacing;
};

var Face = function(a,b,c,d) {
    this.ul = a; 
    this.ur = b;
    this.lr = c;
    this.ll = d; 
}

Face.prototype.draw = function() 
{
    ctx.beginPath();
    console.log(this)
    ctx.moveTo(this.ul.x,this.ul.y);
    ctx.lineTo(this.ur.x,this.ur.y);
    ctx.lineTo(this.lr.x,this.lr.y);
    ctx.lineTo(this.ll.x,this.ll.y);
    ctx.closePath();
    ctx.fill();
}

Constraint.prototype.resolve = function () {
    //compute actual distance between points 
    var diff_x  = this.p1.x - this.p2.x,
        diff_y  = this.p1.y - this.p2.y,
        dist    = Math.sqrt(diff_x * diff_x + diff_y * diff_y),
        //compute percentage difference between current distance and constraint length
        diff    = (this.length - dist) / dist;

    // if the distance is greater than a threshold we remove the constraint / tear 
    if (tearing & dist > tear_distance) this.p1.remove_constraint(this);

    // otherwise we apply a force proportional to the stretching 
    var px = diff_x * diff * stiffness;
    var py = diff_y * diff * stiffness;

    this.p1.x += px;
    this.p1.y += py;
    this.p2.x -= px;
    this.p2.y -= py;
};

Constraint.prototype.draw = function () {
    ctx.moveTo(this.p1.x, this.p1.y);
    ctx.lineTo(this.p2.x, this.p2.y);
};

var Cloth = function () {
    // creates cloth object 
    this.points = [];
    this.faces = []; 

    var start_x = canvas.width / 2 - cloth_width * spacing_x / 2;

    let offset_x  = new Point(spacing_x,0); 
    let offset_y  = new Point(0,spacing_y);
    let offset_xy = new Point(spacing_x,spacing_y);

    for (var y = 0; y <= cloth_height; y++) {
        for (var x = 0; x <= cloth_width; x++) {
            var p = new Point(start_x + x * spacing_x, start_y + y * spacing_y);

            x != 0 && p.attach(this.points[this.points.length - 1]);
            y == 0 && p.pin(p.x, p.y);
            y != 0 && p.attach(this.points[x + (y - 1) * (cloth_width + 1)])

            this.points.push(p);

            if (y < cloth_height & x < cloth_width)
            {
                var f = new Face(p,p.add(offset_x),p.add(offset_xy),p.add(offset_y));
                this.faces.push(f);
            }

        }
    }
};

Cloth.prototype.update = function () {
    var i = physics_accuracy;

    while (i--) {
        var p = this.points.length;
        while (p--) this.points[p].resolve_constraints();
    }

    i = this.points.length;
    while (i--) this.points[i].update(deltaTime);
};

Cloth.prototype.drawFaces = function()
{
    var i = this.points.length; 
    while(i--)
    {
        ctx.fillRect(this.points[i].x,this.points[i].y,spacing_x,spacing_y)
    }
}

Cloth.prototype.draw = function () {
    ctx.beginPath();

    var i = cloth.points.length;
    while (i--) cloth.points[i].draw();
    //var i = cloth.faces.length;
    //while (i--) cloth.faces[i].draw();
    ctx.strokeStyle = "#020d61";
    ctx.lineWidth = 1; 
    ctx.stroke();
};

function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    cloth.update();
    cloth.draw();

    requestAnimFrame(update);
}

function start() {
    canvas.onmousedown = function (e) {
        mouse.button  = e.which;
        mouse.px      = mouse.x;
        mouse.py      = mouse.y;
        var rect      = canvas.getBoundingClientRect();
        mouse.x       = e.clientX - rect.left,
        mouse.y       = e.clientY - rect.top,
        mouse.down    = true;
        e.preventDefault();
    };

    canvas.onmouseup = function (e) {
        mouse.down = false;
        e.preventDefault();
    };

    canvas.onmousemove = function (e) {
        mouse.px  = mouse.x;
        mouse.py  = mouse.y;
        var rect  = canvas.getBoundingClientRect();
        mouse.x   = e.clientX - rect.left,
        mouse.y   = e.clientY - rect.top,
        e.preventDefault();
    };

    canvas.ontouchstart = function (e) {
        mouse.button  = e.which;
        mouse.px      = mouse.x;
        mouse.py      = mouse.y;
        var rect      = canvas.getBoundingClientRect();
        mouse.x       = e.clientX - rect.left,
        mouse.y       = e.clientY - rect.top,
        mouse.down    = true;
        e.preventDefault();
    };

    canvas.ontouchend = function (e) {
        mouse.down = false;
        e.preventDefault();
    };

    canvas.ontouchmove = function (e) {
        mouse.px  = mouse.x;
        mouse.py  = mouse.y;
        var rect  = canvas.getBoundingClientRect();
        mouse.x   = e.clientX - rect.left,
        mouse.y   = e.clientY - rect.top,
        e.preventDefault();
    };

    canvas.oncontextmenu = function (e) {
        e.preventDefault();
    };

    boundsx = canvas.width - 1;
    boundsy = canvas.height - 1;

    ctx.strokeStyle = '#888';


    cloth = new Cloth();

    update();
}

window.onload = function () {
    canvas  = document.getElementById('c');
    ctx     = canvas.getContext('2d');
    ctx.drawImage(background,0,0);
    console.log(background)
    canvas.width  = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    start();
};
