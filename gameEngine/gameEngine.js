var canvas = document.getElementById("canvas");
var processing = new Processing(canvas, function(processing) {
    processing.size(400, 400);
    processing.background(0xFFF);

    var mouseIsPressed = false;
    processing.mousePressed = function () { mouseIsPressed = true; };
    processing.mouseReleased = function () { mouseIsPressed = false; };

    var keyIsPressed = false;
    processing.keyPressed = function () { keyIsPressed = true; };
    processing.keyReleased = function () { keyIsPressed = false; };
    
    function getImage(s) {
        var url = "https://www.kasandbox.org/programming-images/" + s + ".png";
        processing.externals.sketch.imageCache.add(url);
        return processing.loadImage(url);
    }
    
    function getLocalImage(url) {
        processing.externals.sketch.imageCache.add(url);
        return processing.loadImage(url);
    }

    // use degrees rather than radians in rotate function
    var rotateFn = processing.rotate;
    processing.rotate = function (angle) {
        rotateFn(processing.radians(angle));
    };

    with (processing) {

/*
------<Game Engine>-------------------------------------------------------------------- 
    @author Prolight
    @version (actual) 0.2.2
    
    //Notes: 
    This is will be my best game engine and maybe a new game that will be better than Planet Search
(https://www.khanacademy.org/computer-programming/planet-search/6043450396573696) 
    my previous game, that was awesome! 
    
        This game will be better with efficency particularly in collision handling. Also I'm considering adding the cartesian system 
(https://www.khanacademy.org/computer-programming/camera-efficiency-system/5725525192278016)*/
/*------------------------------------------------------------------------------------*/
/**LOG :
*  v0.1 start,
*  v0.1.5 Done with checkPoints
*  v0.1.6 Done with checkPoints, doors and player transfering
*  v0.1.7 Done with comments at at start of program
*  v0.1.8 Less lines of code in objects revision
*  v0.1.9 Circles added!
*  c0.2.2 Bounding boxes added!
*  v0.2.3 Rect with Circle collision added
*  To do:
*    Graphics improvement
*    Collision
*/
/**-------------------------------------Code---------------------------------------- **/

var game = {
    gameState : "load",
    fps : 30,
    errors : false,
    playerPerSpawnPoint : 0,
};
var levelInfo = {
    level : "level1",
    symbol : 'a',
    width : 0,
    height : 0,
    gridSize : 40,
    normalGridSize : 40,
};
var loader = {
    firstLoad : true,
};

var keys = [];
var keyPressed = function()
{
    keys[keyCode] = true;
};
var keyReleased = function()
{
    keys[keyCode] = false; 
};

var error = function(message)
{
    if(game.errors)
    {
        println(message);
    }
};
var changeSpeed = function(prop)
{
    return (prop * levelInfo.gridSize) / levelInfo.normalGridSize;
};
var screenImageGetter = function()
{
    if(game.needsScreenImage)
    {
        game.screenImage = get(0, 0, width, height);
        game.needsScreenImage = false;
    }
};
var Fade = function()
{
    this.timer = 0;
    this.timerVel = 1;
    this.max = 100;
    this.fading = false;
    
    this.start = function(max, start)
    {
        this.max = max || this.max;
        this.timer = start || this.timer;
        this.fading = true;
    };
    this.full = function()
    {
        return (this.timer > this.max);
    };  
    this.update = function()
    {
        if(this.fading)
        {
            if(this.timer < 0 || this.timer > this.max)
            {
                this.timerVel = -this.timerVel;   
            }
            this.timer += this.timerVel;
            if(this.timer < 0)
            {
                this.fading = false;   
            }
            noStroke();
            fill(0, 0, 0, this.timer * 255 / this.max);
            rect(0, 0, width, height);
        }
    };
};
var fade = new Fade();

var observer = {
    collisionTypes : {
        "blank" : {
            colliding : function() {},
            applyCollision : function() {},
        },
        "pointcircle" : {
            colliding : function(point1, circle1)
            {
                return (dist(point1.xPos, point1.yPos, circle1.xPos, circle1.yPos) < circle1.radius);
            },
            applyCollision : function() {},
        },
        "rectcircle" : {
            colliding : function(rect1, circle1)
            {
                var point1 = {};
                rect1.middleXPos = rect1.xPos + rect1.width / 2;
                rect1.middleYPos = rect1.yPos + rect1.height / 2;
                rect1.halfLineThrough = dist(rect1.xPos, rect1.yPos, rect1.xPos + rect1.width, rect1.yPos + rect1.height) / 2;
                    
                //Step 1 : Get the closest point on the circle on the rectangle to the circle
                var angle = atan2(circle1.yPos - rect1.middleYPos, circle1.xPos - rect1.middleXPos);
                point1.xPos = rect1.middleXPos + (rect1.halfLineThrough * cos(angle));
                point1.yPos = rect1.middleYPos + (rect1.halfLineThrough * sin(angle));
                
                //Step 2 : Constrain the point into the rectangle
                point1.xPos = constrain(point1.xPos, rect1.xPos, rect1.xPos + rect1.width);
                point1.yPos = constrain(point1.yPos, rect1.yPos, rect1.yPos + rect1.height);
                
                //Step 3 : check if the point is colliding with the circle
                 circle1.pointDist = dist(circle1.xPos, circle1.yPos, point1.xPos, point1.yPos);
                 return (circle1.pointDist < circle1.radius);
            },
            applyCollision : function(rect1, circle1)
            {
                var point1 = {};
                angle = atan2(rect1.middleYPos - circle1.yPos, rect1.middleXPos - circle1.xPos);
                point1.xPos = rect1.xPos + (circle1.radius * cos(angle));
                point1.yPos = rect1.yPos + (circle1.radius * sin(angle));
                var escape = (circle1.radius - circle1.pointDist);
                rect1.inAir = (rect1.middleYPos > circle1.yPos);
                var inputX = escape * cos(angle);
                var inputY = escape * sin(angle);
                rect1.xPos += inputX;
                rect1.yPos += inputY;
                rect1.xVel = ((rect1.middleYPos > circle1.yPos) ? ((inputX > 0) ? 1 : -1) : rect1.xVel);
                rect1.yVel = ((inputY > 0) ? 1 : -1);
            },
        },
        "rectrect" : {
            colliding : function(rect1, rect2)
            {
                //Rectangle collision
                return ((rect1.xPos + rect1.width > rect2.xPos && 
                         rect1.xPos < rect2.xPos + rect2.width) &&
                        (rect1.yPos + rect1.height > rect2.yPos && 
                         rect1.yPos < rect2.yPos + rect2.height));
            },
            applyCollision : function(object1, object2, physicsInfo)
            {   
                var output = observer.getObjectsByMovementType(object1, object2);
                var mobileObject = output.mobileObject;
                var otherObject = output.fixedObject || output.mobileObject1;
                //Apply the collision based on direction (velocity) 
                if(physicsInfo.direction === "left" || physicsInfo.xVel < 0)
                {
                    mobileObject.xVel = 0;
                    mobileObject.xPos = otherObject.xPos + otherObject.width;
                }
                if(physicsInfo.direction === "right" || physicsInfo.xVel > 0)
                {
                    mobileObject.xVel = 0;
                    mobileObject.xPos = otherObject.xPos - mobileObject.width;
                }
                if(physicsInfo.direction === "up" || physicsInfo.yVel < 0)
                {
                    mobileObject.yVel = 0;
                    mobileObject.inAir = true;
                    mobileObject.yPos = otherObject.yPos + otherObject.height;
                }
                if(physicsInfo.direction === "down" || physicsInfo.yVel > 0)
                {
                    mobileObject.yVel = 0;
                    mobileObject.inAir = false;
                    mobileObject.yPos = otherObject.yPos - mobileObject.height;
                }
            },
        }
    },
    access : function(object1, object2, physicsInfo, access)
    {
        var info = observer.getType(
            object1.physics.shape, 
            object2.physics.shape,
            observer.collisionTypes
        );
        var colliding = false;
        
        if(!info.flipped)
        {
            colliding = observer.collisionTypes[info.type][access](object1, object2, physicsInfo);
        }else{
            colliding = observer.collisionTypes[info.type][access](object2, object1, physicsInfo);
        }
        return colliding;
    },
    colliding : function(object1, object2, physicsInfo)
    {
        return this.access(object1, object2, physicsInfo, "colliding");
    },
    applyCollision : function(object1, object2, physicsInfo)
    {
        return this.access(object1, object2, physicsInfo, "applyCollision");
    },
    boundingBoxesColliding : function(box1, box2, physicsInfo)
    {
        return observer.collisionTypes.rectrect.colliding(box1, box2);
    },
    getType : function(name1, name2, delegate)
    {
        var typeToReturn = "blank";
        var flipped = false;
        var type = name1 + name2;
        if(delegate[type] !== undefined)
        {
            typeToReturn = type;
        }else{
            //Flip shapes
            flipped = true;
            type = name2 + name1;
            if(delegate[type])
            {
                typeToReturn = type;
            }
        }
        return {
            type : typeToReturn,
            flipped : flipped,
        };
    },
    getObjectsByMovementType : function(object1, object2)
    {
        var toReturn = {};
        toReturn.add = function(string, object)
        {
            if(this[string] === undefined)
            {
                this[string] = object;   
            }else{
                this[string + 1] = object;   
            }
        };  
        toReturn.add(object1.physics.movement + "Object", object1);
        toReturn.add(object2.physics.movement + "Object", object2);
        return toReturn;
    },
};

var Camera = function(xPos, yPos, width, height)
{
    this.xPos = xPos;
    this.yPos = yPos;
    this.width = width;
    this.height = height;

    this.focusXPos = 0;
    this.focusYPos = 0;
    this.halfwidth = this.width / 2;
    this.halfheight = this.height / 2;

    this.speed = 0.30;
    
    this.attatch = function(object)
    {
        this.focusXPos = object.xPos + object.width / 2;
        this.focusYPos = object.yPos + object.height / 2;
        this.objectArray = object.arrayName;
        this.objectIndex = object.index;
    };
    
    this.view = function(input)
    {
        this.object = undefined;
        if(input.isArray)
        {
            this.object = input.getObject(this.objectArray)[this.objectIndex];   
        }else{
            this.object = input;    
        }
        //Get the postion from the object
        var xPos = this.object.xPos + this.object.width / 2;
        var yPos = this.object.yPos + this.object.height / 2;
        var angle = atan2(yPos - this.focusYPos, xPos - this.focusXPos);
        var distance = dist(this.focusXPos, this.focusYPos, xPos, yPos) * this.speed;
        
        this.focusXPos += distance * cos(angle);
        this.focusYPos += distance * sin(angle);

        //Keep the camera in the level
        this.focusXPos = constrain(
        this.focusXPos, this.halfwidth, levelInfo.width - this.halfwidth);
        this.focusYPos = constrain(
        this.focusYPos, this.halfheight, levelInfo.height - this.halfheight);
        
        translate(this.xPos, this.yPos);
        if(levelInfo.width >= this.width)
        {
            translate(this.halfwidth - this.focusXPos, 0);
        }
        if(levelInfo.height >= this.height)
        {
            translate(0, this.halfheight - this.focusYPos);
        }
    };
};
var cam = new Camera(0, 0, width, height);

var GameObject = function(xPos, yPos, width, height, Color)
{
    this.xPos = xPos;
    this.yPos = yPos;
    this.width = width;
    this.height = height;
    this.color = Color;

    this.boundingBox = this;

    this.physics = {
        shape : "rect",
        movement : "fixed",
        solidObject : true,
    };
    
    this.draw = function()
    {
        //stroke(0, 0, 0);
        fill(this.color);
        rect(this.xPos, this.yPos, this.width, this.height);
    };
    this.update = function() {};
    this.remove = function()
    {
        this.delete = true;
        this.onCollide = function() {};
    };
};
var createArray = function(object, inArray)
{
    var array = inArray || [];
    array.references = {};
    array.counter = 0;
    array.isArray = true;
    array.add = function(xPos, yPos, width, height, Color, name)
    {
        this.push((object.apply === undefined) ? xPos : 
        new object(xPos, yPos, width, height, Color));  
        this.getLast().arrayName = this.name;
        this.getLast().name = name || this.name;
        this.getLast().id = this.counter++;
        this.getLast().index = this.length - 1;
    };
    array.addBack = function(object)
    {
        this.references[object.name] = this.length;
        object.index = this.length;
        this.push(object);
    };
    array.clear = function()
    {
        this.length = 0;
        this.references = {};
    };
    array.addObject = function(name, xPos, yPos, width, height, Color)
    {
        if(this.references[name] === undefined)
        {
            this.references[name] = this.length;
        }else{
            error("Warning: You cannot have multiple objects \n" + 
                    "with the same name \'" + name + "\', Object removed.");
            //Exit the function immediately.
            return;
        }
        this.add(xPos, yPos, width, height, Color, name);
    };
    array.getObject = function(name)
    {
        if(this[this.references[name]] !== undefined)
        {
            return this[this.references[name]];
        }else{
            error("Error referencing object '" + name + "'"); 
            //return {};
        }
    };
    array.getLast = function()
    {
        return this[this.length - 1];  
    };
    array.draw = function() 
    {
        for(var i = 0; i < this.length; i++)
        {
            this[i].draw();   
        }    
    };
    array.update = function()
    {
        var objectDeleted = false;
        for(var i = 0; i < this.length; i++)
        {
            this[i].update();
            this[i].index = i;
            if(this[i].delete)
            {
                this.splice(i, 1);
                objectDeleted = true;
            }
        }
    };
    return array;
};

var Bar = function(xPos, yPos, width, height, Color)
{
    GameObject.call(this, xPos, yPos, width, height, Color);
    
    this.draw = function(amt, max) 
    {
        noStroke();
        fill(this.color);
        rect(this.xPos, this.yPos, (this.width * amt) / max, this.height);
        noFill();
        rect(this.xPos, this.yPos, this.width, this.height);
    };
};
var hpBar = new Bar(0, 0, 85, 20, color(32, 168, 80, 120));

var gameObjects = createArray([]);
gameObjects.removeObjects = function()
{
    this.saveObjects = [];
    this.saveObjects.player = 0;
    for(var i = 0; i < this.length; i++)
    {
        for(var j = 0; j < this[i].length; j++)
        {
            if(this[i][j].save)
            {
                if(this[i][j].arrayName === "player")
                {
                    this.saveObjects.player++; 
                }
                this[i][j].save = undefined;
                this.saveObjects.push(this[i][j]);
            }   
        }
        this[i].clear();   
    }
};
gameObjects.addSaveObjects = function()
{
    for(var i = 0; i < this.saveObjects.length; i++)
    {
        if(!this.saveObjects[i].ignore)
        {
            if(this.saveObjects[i].type === "lifeform" && 
               this.saveObjects[i].dead)
            {
                this.saveObjects[i].revive();
            }
            this.getObject(this.saveObjects[i].arrayName).addBack(this.saveObjects[i]);
        }
    }
};
gameObjects.setObjects = function(objects)
{
    for(var i = 0; i < objects.length; i++)
    {
        var checkPoint = this.getObject("checkPoint")[objects[i].checkPointIndex];
        if(objects[i].usingCheckPoint && checkPoint !== undefined)
        {
            checkPoint.setObject(objects[i]);
        }
        else if(objects[i].usingDoor && objects[i].doorName !== undefined)
        {
            var door = this.getObject("door").getObject(objects[i].doorName);
            if(door !== undefined)
            {
                door.setObject(objects[i]);
            }
            else if(objects[i].dead)
            {
                door = this.getObject("door").getObject(objects[i].outerDoorName);
                if(door !== undefined)
                {
                    door.setObject(objects[i]);
                }
            }
            if(door === undefined)
            {
                objects[i].ignore = true;                
            }   
        }else{
            objects[i].ignore = true;   
        }
    }
};
gameObjects.applyCollision = function(objectA, physicsInfo)
{
    for(var i = 0; i < this.length; i++)
    {
        for(var j = 0; j < this[i].length; j++)
        {
            var objectB = this[i][j];
            
            //If object is colliding with itself skip this loop
            if(objectA.arrayName === objectB.arrayName && objectA.id === objectB.id)
            {
                continue;   
            }
            
            var boundingBoxesColliding = observer.boundingBoxesColliding(objectA.boundingBox, objectB.boundingBox);
            
            //If the boundingBoxes of each objects are not colliding skip this loop
            if(!boundingBoxesColliding)
            {
                continue;
            }
            
            var colliding = true;
            if(!(objectA.physics.shape === "rect" && objectB.physics.shape === "rect"))
            {
                colliding = observer.colliding(objectA, objectB);
            }
            
            if(colliding)
            {
                if(objectA.physics.solidObject && objectB.physics.solidObject)
                {
                    observer.applyCollision(objectA, objectB, physicsInfo);
                }
                if(objectA.onCollide !== undefined)
                {
                    objectA.onCollide(objectB);
                }
                if(objectB.onCollide !== undefined)
                {
                    objectB.onCollide(objectA);
                }
            }
        }
    }
};
gameObjects.drawBoundingBoxes = function()
{
    for(var i = 0; i < this.length; i++)
    {
        for(var j = 0; j < this[i].length; j++)
        {
            var boundingBox = this[i][j].boundingBox;
            noFill();
            stroke(75, 75, 75);
            rect(boundingBox.xPos, boundingBox.yPos, boundingBox.width, boundingBox.height);v
        }
    }
};

var drawBlock = function(xPos, yPos, width, height, Color)
{
    noStroke();
    fill(Color);
    rect(xPos, yPos, width, height);
    fill(0, 0, 0, 80);
    triangle(xPos + width, yPos + height, xPos + width, yPos, xPos, yPos + height);
};
rect(0, 0, levelInfo.gridSize, levelInfo.gridSize);
drawBlock(0, 0, levelInfo.gridSize, levelInfo.gridSize, color(120, 120, 120));         
var blockImage = get(0, 0, levelInfo.gridSize, levelInfo.gridSize);

var Block = function(xPos, yPos, width, height, Color)
{
    GameObject.call(this, xPos, yPos, width, height, Color);
    this.type = "block";
    
    this.image = blockImage;
    this.draw = function() 
    {
        image(this.image, this.xPos, this.yPos, this.width, this.height);
    };
};
gameObjects.addObject("block", createArray(Block));

var Circle = function(xPos, yPos, diameter, Color)
{
    this.diameter = diameter;
    this.radius = this.diameter / 2;
    
    GameObject.call(this, xPos, yPos, diameter, diameter, Color);
    
    this.boundingBox = {
         xPos : this.xPos - this.radius,
         yPos : this.yPos - this.radius,
         width : this.diameter,
         height : this.diameter,
    };
    
    this.physics = {
        shape : "circle",
        movement : "fixed",
        solidObject : true,
    };
    
    this.draw = function()
    {
        fill(this.color);
        ellipse(this.xPos, this.yPos, this.diameter, this.diameter);
    };
};
gameObjects.addObject("circle", createArray(Circle));

var Slope = function(xPos, yPos, width, height, Color)
{
    GameObject.call(this, xPos, yPos, width, height, Color);
    
    this.physics = {
        shape : "tri",
        movement : "fixed",
        solidObject : true,
        boundingBox : this,
    };
    
    this.draw = function() 
    {
        noStroke();
        fill(this.color);
        switch(this.direction)
        {
            case "leftup" : 
                    triangle(this.xPos, this.yPos + this.height, 
                    this.xPos, this.yPos, 
                    this.xPos + this.width, this.yPos + this.height);
                break;
            
            case "rightup" : 
                    triangle(this.xPos, this.yPos + this.height, 
                    this.xPos + this.width, this.yPos, 
                    this.xPos + this.width, this.yPos + this.height);
                break;
                      
            case "leftdown" : 
                    triangle(this.xPos, this.yPos + this.height, 
                    this.xPos, this.yPos, 
                    this.xPos + this.width, this.yPos);
                break;
                     
            case "rightdown" : 
                    triangle(this.xPos, this.yPos, 
                    this.xPos + this.width, this.yPos, 
                    this.xPos + this.width, this.yPos + this.height);
                break;
        }
    };
};
gameObjects.addObject("slope", createArray(Slope));

var Coin = function(xPos, yPos, diameter, Color)
{
    Circle.call(this, xPos, yPos, diameter, Color);
    
    this.value = 1;
    this.type = "item";
    this.physics.shape = "rect";
    this.physics.solidObject = false;
    
    this.handleCollide = function(object)
    {
        object.coins += this.value;
        object.score += this.value * this.scoreMult || 100;
        this.remove();
    };
    this.onCollide = function(object)
    {
        if(object.type === "lifeform")
        {
            this.handleCollide(object);
        }
    };
};
gameObjects.addObject("coin", createArray(Coin));

var Hp = function(xPos, yPos, diameter, Color)
{
    Coin.call(this, xPos, yPos, diameter, Color);
    this.value = 5;
    this.onCollide = function(object)
    {
        if(object.type === "lifeform")
        {   
            object.hp += this.value;
            this.remove();
        }
    };
};
gameObjects.addObject("hp", createArray(Hp));

var Lava = function(xPos, yPos, width, height, Color)
{
    GameObject.call(this, xPos, yPos, width, height, Color);
    
    this.color = color(200, 80, 0);
    this.damage = 0.25;
    this.type = "other";
    this.physics = {
        shape : "rect",
        movement : "fixed",
        solidObject : false,
    };
    
    this.onCollide = function(object)
    {
        if(object.type === "lifeform")
        {
           object.hp -= this.damage;
        }
    };
};
gameObjects.addObject("lava", createArray(Lava));

var Door = function(xPos, yPos, width, height, Color)
{
    GameObject.call(this, xPos, yPos, width, height, Color);

    this.triggered = false;
    this.type = "other";
    this.physics = {
        shape : "rect",
        movement : "fixed",
    };
    
    this.setObjectProps = function(object, input)
    {   
        object.save = true;
        object.usingDoor = true;
        object.doorName = (input === "setObject") ? this.name : this.level + this.symbol; 
        object.outerDoorName = (input === "setObject") ? this.level + this.symbol : this.name;
    };
    this.setObject = function(object)
    {
        object.xPos = this.xPos;
        object.yPos = this.yPos + abs(this.height - object.height);
        object.xVel = 0;
        object.yVel = 0;
        this.setObjectProps(object, "setObject");
    };
    this.onCollide = function(object)
    {
        if(object.arrayName === "player" && object.controls.down())
        {
            this.setObjectProps(object, "onCollide");
            if(!this.triggered)
            {
                loader.startLoadLevel(this.level);
            }
            this.triggered = true;
        }
    };
};
gameObjects.addObject("door", createArray(Door));

var CheckPoint = function(xPos, yPos, width, height, Color)
{
    Door.call(this, xPos, yPos, width, height, Color);
    
    this.color = color(200, 0, 0);
    this.type = "other";
    
    this.draw = function() 
    {
        var fillValue = this.color * 0.8;
        fill(red(fillValue), green(fillValue), blue(fillValue), 125);
        rect(this.xPos, this.yPos, this.width, this.height);
        fill(this.color);
        rect(this.xPos + this.width / 4, this.yPos + this.height / 4,
        this.width / 2, this.height / 2);
    };
    this.setObjectProps = function(object)
    {
        object.checkPointLevel = levelInfo.level;
        object.checkPointIndex = this.index;
        object.save = true;
    };
    this.onCollide = function(object)
    {
        if(object.arrayName === "player")
        {
            this.color = color(0, 200, 0);
            this.setObjectProps(object);
            game.touchedCheckPoint = true;
        }
    };
};
gameObjects.addObject("checkPoint", createArray(CheckPoint));

var Player = function(xPos, yPos, width, height, Color)
{
    GameObject.call(this, xPos, yPos, width, height, Color);
    
    this.xVel = 0;
    this.xSpeed = 0.5;
    this.xFriction = 0.2;
    this.maxXVel = 5;
    this.xContinue = 0.15;
    this.yVel = 0;
    this.gravity = 0.5;
    this.jumpheight = 11.5;
    this.maxYVel = 11;
    this.maxFallSpeed = 12.5;
    this.inAir = false;
    this.coins = 0;
    this.score = 0;
    this.type = "lifeform";
    this.controls = {
        left : function()
        {
            return keys[LEFT] || keys[65];
        },
        right : function()
        {
            return keys[RIGHT] || keys[68];
        },
        jump : function()
        {
            return keys[UP] || keys[87];  
        },
        down : function()
        {
            return keys[DOWN] || keys[83];  
        },
    };
    this.physics = {
        shape : "rect",
        movement : "mobile",
        solidObject : true,
    };
    
    this.revive = function()
    {
        this.dead = false;
        this.fullHp = 25;
        this.hp = this.fullHp;
        this.score -= 100;
        this.coins--;
        this.score = max(this.score, 0);
        this.coins = max(this.coins, 0);
        this.usingCheckPoint = false;
    };
    this.revive();
    this.update = function()
    {
        //Move on key control
        if(this.controls.left())
        {
            this.xVel -= this.xSpeed;
        }
        if(this.controls.right())
        {
            this.xVel += this.xSpeed;
        }

        //Physics when no keys are being pressed
        if(!keys[LEFT] && !keys[RIGHT])
        {
            //Continue the curve on it's trajectory
            if(this.inAir)
            {
                if(this.xVel > 0)
                {
                    this.xVel += this.xContinue;
                }
                if(this.xVel < 0)
                {
                    this.xVel -= this.xContinue;
                }
            }

            //Apply friction
            if(this.xVel > 0)
            {
                this.xVel -= this.xFriction;
            }
            if(this.xVel < 0)
            {
                this.xVel += this.xFriction;
            }

            //Stop it from moving in a single direction
            if (this.xVel > 0 && this.xVel <= this.xFriction)
            {
                this.xVel = 0;
            } 
        }
        
        //Apply the velocity and collision
        this.xVel = constrain(this.xVel, -this.maxXVel, this.maxXVel);
        this.xPos += changeSpeed(this.xVel);
        gameObjects.applyCollision(this, {xVel : this.xVel});

        //Note: 1. update the velocity 
        //      2. edit/constrain it 
        //      3. apply it to the object.

        //Jump whem not in air (on block)
        if(!this.inAir && this.controls.jump())
        {
            this.yVel = -this.jumpheight;
        }

        //Apply gravity
        this.yVel += this.gravity;

        //Apply the velocity and collision
        this.inAir = true;
        this.yVel = constrain(this.yVel, -this.maxYVel, this.maxFallSpeed);
        this.yPos += changeSpeed(this.yVel);
        gameObjects.applyCollision(this, {yVel : this.yVel});
        this.setDirection = undefined; 
        
        this.hp = constrain(this.hp, 0, this.fullHp);
        if(this.yPos > levelInfo.height + this.height * 2 || this.hp <= 0)
        {
            this.dead = true; 
        }
        if(this.dead)
        {
            this.usingCheckPoint = true;
            loader.startLoadLevel(this.checkPointLevel || levelInfo.firstLevel);
        }
    };
};
gameObjects.addObject("player", createArray(Player));

var levels = {
    "level1" : {
        doors : {
            'a' : {
                level : "level2",
                symbol : 'a',
            },  
            'b' : {
                level : "level3",
                symbol : 'b',
            },
        },
        plan : [
            "bbbbbbbbbbb",
            "b         b",
            "b         b",
            "b    ##   b",
            "bs        b",
            "bbbb      b",
            "b       bbb",
            "b   hhcc bb",
            "b  #     Db",
            "bbbb  bbbbb",
            "b a       b",
            "b D   s   b",
            "bbbbbbb  bb",
        ]
    },
    "level2" : {
        doors : {
            'a' : {
                level : "level1",
                symbol : 'a'
            },
            'b' : {
                level : "level3",
                symbol : 'a',
            },
            'c' : {
                level : "level3",
                symbol : 'c',
            },
        },
        plan : [
            "bbbbbbbbbbb",
            "b         b",
            "bs        b",
            "bbbb  o   b",
            "bb        b",
            "bb O    bbb",
            "bb      a b",
            "bb      D b",
            "bbbbbbbbbbb",
            "bb       cb",
            "bD       Db",
            "bbbbbbbbbbb",
        ]
    },
    "level3" : {
        doors : {
            'a' : {
                level : "level2",
                symbol : 'b'
            },
            'b' : {
                level : "level1",
                symbol : 'b'
            },
            'c' : {
                level : "level2",
                symbol : 'c'
            },
        },
        plan : [
            "bbbbbbbbbbb",
            "b         b",
            "b         b",
            "bbb      bb",
            "b        bb",
            "b   b    Db",
            "b   RL  bbb",
            "bbb       b",
            "b    rl   b",
            "b     bb  b",
            "ba  c     b",
            "bD  D     b",
            "bbbbbbbbbbb",
        ]
    },
};
levels.getSymbol = function(col, row, levelPlan)
{
    if(col >= 0 && col < levelPlan[0].length &&
    row >= 0 && row < levelPlan.length)
    {
        return levelPlan[row][col];  
    }else{
        return " ";    
    }
};
levels.build = function(plan)
{
    var level = this[plan.level];
    levelInfo.width = level.plan[0].length * plan.gridSize;
    levelInfo.height = level.plan.length * plan.gridSize;
    
    for(var row = 0; row < level.plan.length; row++)
    {
        for (var col = 0; col < level.plan[row].length; col++) 
        {
            var xPos = col * plan.gridSize;
            var yPos = row * plan.gridSize;
            
            if(this.getSymbol(col, row + 1, level.plan) === 'D')
            {
                continue;   
            }
            
            switch(level.plan[row][col])
            {
                case 'b' :
                        gameObjects.getObject("block").add(xPos, yPos, plan.gridSize, plan.gridSize, color(0, 0, 200));
                    break;
                
                case 'o' :
                        gameObjects.getObject("circle").add(xPos + plan.gridSize / 2, yPos + plan.gridSize / 2, plan.gridSize, 175);
                    break;
               
                case 'O' :
                        gameObjects.getObject("circle").add(xPos + plan.gridSize, yPos + plan.gridSize, plan.gridSize * 2, 175);
                    break;
                
                case 'l' : 
                        gameObjects.getObject("slope").add(xPos, yPos, plan.gridSize, plan.gridSize, color(120, 120, 120));
                        gameObjects.getObject("slope").getLast().direction = "leftup";
                    break;
                    
                case 'r' : 
                        gameObjects.getObject("slope").add(xPos, yPos, plan.gridSize, plan.gridSize, color(120, 120, 120));
                        gameObjects.getObject("slope").getLast().direction = "rightup";
                    break;
                    
                case 'L' : 
                        gameObjects.getObject("slope").add(xPos, yPos, plan.gridSize, plan.gridSize, color(120, 120, 120));
                        gameObjects.getObject("slope").getLast().direction = "leftdown";
                    break;
                    
                case 'R' : 
                        gameObjects.getObject("slope").add(xPos, yPos, plan.gridSize, plan.gridSize, color(120, 120, 120));
                        gameObjects.getObject("slope").getLast().direction = "rightdown";
                    break;
                
                case 'c' :
                        gameObjects.getObject("coin").add(xPos + plan.gridSize / 4, yPos + plan.gridSize / 4, plan.gridSize / 2, color(220, 194, 30, 250));
                    break;
                
                case 'h' :
                        gameObjects.getObject("hp").add(xPos + plan.gridSize / 4, yPos + plan.gridSize / 4, plan.gridSize / 2, color(75, 194, 164, 200));
                    break;

                case '#' :
                        gameObjects.getObject("lava").add(xPos, yPos, plan.gridSize, plan.gridSize);
                    break;
                
                case 'D' : 
                        var getSymbol = this.getSymbol(col, row - 1, level.plan);
                        
                        gameObjects.getObject("door").addObject(
                        plan.level + getSymbol, 
                        xPos, yPos - plan.gridSize, 
                        plan.gridSize, plan.gridSize * 2, color(0, 200, 0));
                        
                        var door = gameObjects.getObject("door").getLast();
                        door.symbol = level.doors[getSymbol].symbol;
                        door.level = level.doors[getSymbol].level;
                        
                        if((level.doors[getSymbol].player || 
                           levelInfo.symbol === getSymbol) && 
                           gameObjects.saveObjects.player <= game.playerPerSpawnPoint)
                        {
                            gameObjects.getObject("player").add(0, 0, plan.gridSize, plan.gridSize, color(200, 0, 0)); 
                            door.setObject(gameObjects.getObject("player").getLast());
                        }
                    break;
                
                case 's' :
                        gameObjects.getObject("checkPoint").add(xPos, yPos, plan.gridSize, plan.gridSize);
                    break;
                
                case 'p' : 
                        if(gameObjects.saveObjects.player <= game.playerPerSpawnPoint)
                        {
                           gameObjects.getObject("player").add(xPos, yPos, plan.gridSize, plan.gridSize, color(200, 0, 0));
                        }
                    break;
            }   
        }
    }
};

loader.startLoadLevel = function(level)
{
    this.level = level;
    fade.start(20, (this.firstLoad) ? 20 : undefined);
    game.needsScreenImage = true;
    game.gameState = "load";
};  
loader.loadLevel = function(level)
{
    gameObjects.removeObjects();
    levels.build({level : level, gridSize : levelInfo.gridSize});
    gameObjects.setObjects(gameObjects.saveObjects);
    gameObjects.addSaveObjects();
    cam.attatch(gameObjects.getObject("player")[0]);
    gameObjects.saveObjects = [];
    levelInfo.level = level;
};
loader.update = function()
{
    if(fade.full() || this.firstLoad)
    {
        this.loadLevel(this.level);
        game.play();
        game.screenImage = get(0, 0, width, height);
        if(this.firstLoad)
        {
             levelInfo.firstLevel = this.level;
        }
    }
    if(!fade.fading)
    {
        game.gameState = "play";
    }
    image(game.screenImage, 0, 0);
    this.firstLoad = false;
    keys = []; //lock the keys!
};
loader.startLoadLevel(levelInfo.level);

var scoreBar = function()
{
    noStroke();
    fill(0, 120, 140, 150);
    rect(0, 0, width, 20);
    var player = gameObjects.getObject("player")[0];
    hpBar.draw(player.hp, player.fullHp);
    textSize(12.5);
    fill(0, 0, 0, 150);
    textAlign(LEFT, CENTER);
    text(player.hp.toFixed(2) + "/" + player.fullHp + " hp", 5, 10);
    text("Coins : " + player.coins, 100, 10);
    text("Score : " + player.score, 175, 10);
    text("Level : " + levelInfo.level, 275, 10);
    textAlign(NORMAL, NORMAL);
};

game.load = function()
{
    frameRate(30);
    loader.update();
    frameRate(this.fps);
};
game.play = function()
{
    background(147, 221, 250);
    pushMatrix();
        cam.view(gameObjects);
        gameObjects.update();
        gameObjects.draw();
        //gameObjects.drawBoundingBoxes();
    popMatrix();
    scoreBar();
};

var draw = function() 
{
    frameRate(game.fps);
    game[game.gameState]();
    screenImageGetter();
    fade.update();
};

    }
    if (typeof draw !== 'undefined') processing.draw = draw;
});