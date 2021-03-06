//------------------------------------------------------------------
//
// Defines an animated model object.  The spec is defined as:
// {
//		spriteSheet: Image,
//		spriteSize: { width: , height: },	// In world coordinates
//		spriteCenter: { x:, y: },			// In world coordinates
//		spriteCount: Number of sprites in the sheet,
//		spriteTime: [array of times (milliseconds) for each frame]
// }
//
//------------------------------------------------------------------
Game.spriteManager = function (graphics, sounds, theParticles) {
	'use strict';

	let that = {},
		allSprites;

	let newSpriteFreq = 3000;
	let curTime = 0;
	let nextSpriteTime = 0;
	let curLevel = 1;
	let remainingSprites = 10;

	that.initialize = function () {
		allSprites = [];
		newSpriteFreq = 3000;
		curTime = 0;
		nextSpriteTime = 0;
		curLevel = 1;
		remainingSprites = 10;
	}

	//------------------------------------------------------------------
	//
	// Defines a game object/model that animates simply due to the passage
	// of time.
	//
	//------------------------------------------------------------------
	function AnimatedModel(spec) {
		var that = {};
		let sprite = graphics.SpriteSheet(spec);	// We contain a SpriteSheet, not inherited from, big difference

		//let health = 1000;
		let startHealth = spec.health;

		that.update = function (elapsedTime) {
			sprite.update(elapsedTime);
		};

		that.render = function () {
			sprite.draw();

			let startX = spec.center.x - 20;
			let startY = spec.center.y - 15;

			let healthFrac = spec.health / startHealth;
			let healthRemFrac = 1.0 - healthFrac;

			let totalWidth = 40;

			let greenLen = totalWidth * healthFrac;
			let redLen = totalWidth * healthRemFrac;

			let greenLoc = {
				x: startX,
				y: startY
			};

			let greenSize = {
				width: greenLen,
				height: 3
			};

			graphics.drawRectangle(greenLoc, greenSize, '#00FF00');

			let redLoc = {
				x: startX + greenLen,
				y: startY
			};

			let redSize = {
				width: redLen,
				height: 3
			};

			graphics.drawRectangle(redLoc, redSize, '#FF0000');
		};

		that.rotateRight = function (elapsedTime) {
			spec.rotation += spec.rotateRate * (elapsedTime);
		};

		that.rotateLeft = function (elapsedTime) {
			spec.rotation -= spec.rotateRate * (elapsedTime);
		};

		//------------------------------------------------------------------
		//
		// Move in the direction the sprite is facing
		//
		//------------------------------------------------------------------
		that.moveForward = function (elapsedTime) {
			//
			// Create a normalized direction vector
			var vectorX = Math.cos(spec.rotation + spec.orientation),
				vectorY = Math.sin(spec.rotation + spec.orientation);
			//
			// With the normalized direction vector, move the center of the sprite
			//console.log(spec, 'spec');
			spec.center.x += (vectorX * spec.moveRate * elapsedTime);
			spec.center.y += (vectorY * spec.moveRate * elapsedTime);
		};

		//------------------------------------------------------------------
		//
		// Move in the negative direction the sprite is facing
		//
		//------------------------------------------------------------------
		that.moveBackward = function (elapsedTime) {
			//
			// Create a normalized direction vector
			var vectorX = Math.cos(spec.rotation + spec.orientation),
				vectorY = Math.sin(spec.rotation + spec.orientation);
			//
			// With the normalized direction vector, move the center of the sprite
			spec.center.x -= (vectorX * spec.moveRate * elapsedTime);
			spec.center.y -= (vectorY * spec.moveRate * elapsedTime);
		};

		that.getLoc = function () {
			return {
				x: spec.center.x,
				y: spec.center.y,
				rotation: spec.rotation
			}
		};

		that.getFollowPath = function () {
			return spec.followPath;
		}

		that.reduceHealth = function (damage) {
			spec.health -= damage;
		}

		that.getHealth = function () {
			return spec.health;
		}

		that.isFlying = function() {
			return spec.isFlying;
		}

		return that;
	}

	//------------------------------------------------------------------
	//
	// Defines a game object/model that animates based upon the elapsed time
	// that occurs only when moving.
	//
	//------------------------------------------------------------------
	function AnimatedMoveModel(spec) {
		var that = AnimatedModel(spec),	// Inherit from AnimatedModel
			base = {
				moveForward: that.moveForward,
				moveBackward: that.moveBackward,
				rotateRight: that.rotateRight,
				rotateLeft: that.rotateLeft,
				update: that.update
			},
			didMoveForward = false,
			didMoveBackward = false;

		//------------------------------------------------------------------
		//
		// Replacing the update function from the base object.  In this update
		// we check to see if any movement was performed, if so, then the animation
		// is updated.
		//
		//------------------------------------------------------------------
		that.update = function (elapsedTime) {
			if (didMoveForward === true) {
				base.update(elapsedTime, true);
			} else if (didMoveBackward === true) {
				base.update(elapsedTime, false);
			}

			didMoveForward = false;
			didMoveBackward = false;
		};

		that.moveForward = function (elapsedTime) {
			base.moveForward(elapsedTime);
			didMoveForward = true;
		};

		that.moveBackward = function (elapsedTime) {
			base.moveBackward(elapsedTime);
			didMoveBackward = true;
		};

		that.rotateRight = function (elapsedTime) {
			base.rotateRight(elapsedTime);
			didMoveForward = true;
		};

		that.rotateLeft = function (elapsedTime) {
			base.rotateLeft(elapsedTime);
			didMoveForward = true;
		};

		return that;
	}

	//from sample code
	function crossProduct2d(v1, v2) {
		return (v1.x * v2.y) - (v1.y * v2.x);
	}

	function computeAngle(rotation, ptCenter, ptTarget) {
		var v1 = {
			x: Math.cos(rotation),
			y: Math.sin(rotation)
		},
			v2 = {
				x: ptTarget.x - ptCenter.x,
				y: ptTarget.y - ptCenter.y
			},
			dp,
			angle;

		v2.len = Math.sqrt((v2.x * v2.x) + (v2.y * v2.y));
		v2.x /= v2.len;
		v2.y /= v2.len;

		dp = (v1.x * v2.x) + (v1.y * v2.y);
		angle = Math.acos(dp);

		//
		// Get the cross product of the two vectors so we can know
		// which direction to rotate.
		let cp = crossProduct2d(v1, v2);

		return {
			angle: angle,
			crossProduct: cp
		};
	}

	function testTolerance(value, test, tolerance) {
		if (Math.abs(value - test) < tolerance) {
			return true;
		} else {
			return false;
		}
	}

	function updateLoc(sprite, elapsedTime, theGrid) {
		let loc = sprite.getLoc();
		let followPath = sprite.getFollowPath();

		let pathLoc = theGrid.getNearestPath(loc.x, loc.y, followPath, sprite.isFlying());
		//console.log(loc, pathLoc);
		var angleResult = computeAngle(loc.rotation /*- 1.570796*/, loc, pathLoc);
		if (testTolerance(angleResult.angle, 0, 0.2) === false) {
			if (angleResult.crossProduct > 0) {
				sprite.rotateRight(elapsedTime);
			} else {
				sprite.rotateLeft(elapsedTime);
			}
		} else {
			sprite.moveForward(elapsedTime);
		}

	};



	that.startNextLevel = function () {
		curLevel++;
		nextSpriteTime = 0;
		remainingSprites = 10;
	}

	function getRandomCreepPic() {
		let num = Math.floor(Math.random() * (2) + 1);
		let spritePic = [];
		switch (num) {
			case 1:
				spritePic = [
					'assets/creep1-blue.png',
					'assets/creep1-yellow.png',
					'assets/creep1-red.png',
				];
				spritePic = [
					{ pic:'assets/creep1-blue.png', count: 6, time: [1000, 200, 100, 1000, 100, 200], isFlying: false },
					{ pic:'assets/creep1-yellow.png', count: 6, time: [1000, 200, 100, 1000, 100, 200], isFlying: false },
					{ pic:'assets/creep1-red.png', count: 6, time: [1000, 200, 100, 1000, 100, 200], isFlying: false },
				];
				break;
			case 2:
				spritePic = [
					{ pic:'assets/creep2-blue.png', count: 4, time: [200, 1000, 200, 600 ], isFlying: false },
					{ pic:'assets/creep2-yellow.png', count: 4, time: [200, 1000, 200, 600 ], isFlying: false },
					{ pic:'assets/creep2-red.png', count: 4, time: [200, 1000, 200, 600 ], isFlying: true },
				];
				break;
			case 3:
				spritePic = [
					{ pic:'assets/creep3-blue.png', count: 4, time: [1000, 200, 200, 200 ], isFlying: false },
					{ pic:'assets/creep3-yellow.png', count: 4, time: [1000, 200, 200, 200 ], isFlying: true },
					{ pic:'assets/creep3-red.png', count: 4, time: [1000, 200, 200, 200 ], isFlying: true },
				];
				break;
		}
		return spritePic[curLevel - 1];
	}

	that.addNewSprite = function (theGrid) {
		remainingSprites--;
		let spritePic = getRandomCreepPic();
		let speed = 0;
		let health = 0;
		let followPath = Math.floor(Math.random() * (4) + 2);

		let theCenter = theGrid.getStartforPath(followPath);

		switch (curLevel) {
			case 1:
				speed = 200 / 10000;
				health = 1000;
				break;
			case 2:
				speed = 400 / 10000;
				health = 2000;
				break;
			case 3:
				speed = 800 / 10000;
				health = 4000;
				break;
		}

		allSprites.push(AnimatedModel({
			spriteSheet: spritePic.pic,
			spriteCount: spritePic.count,
			sprite: 0,
			spriteTime: spritePic.time,	// milliseconds per sprite animation frame
			center: theCenter,
			rotation: 0,
			orientation: 0,				// Sprite orientation with respect to "forward"
			moveRate: speed,			// pixels per millisecond
			rotateRate: 3.14159 / 1000,		// Radians per millisecond
			followPath: followPath,
			health: health,
			isFlying: spritePic.isFlying
		}));
	}


	that.update = function (elapsedTime, gameRunning, theGrid, score) {
		if (!gameRunning) {
			return false;
		}

		curTime += elapsedTime;
		if (nextSpriteTime < curTime && remainingSprites > 0) {
			nextSpriteTime = curTime + newSpriteFreq;
			that.addNewSprite(theGrid);
		}

		for (let i = 0; i < allSprites.length; i++) {
			updateLoc(allSprites[i], elapsedTime, theGrid);
			allSprites[i].update(elapsedTime);
		}

		for (let i = 0; i < allSprites.length; i++) {
			updateLoc(allSprites[i], elapsedTime, theGrid);
			allSprites[i].update(elapsedTime);
		}

		//remove dead sprites
		for (let i = allSprites.length - 1; i >= 0; i--) {
			if (allSprites[i].getHealth() <= 0) {
				sounds.deathCreep();
				let loc = allSprites[i].getLoc();
				theParticles.addText(loc, '+ 1');
				allSprites.splice(i, 1);
				score.killedSprite();
				i--;
			}
		}

		//remove escaped sprites
		for (let i = allSprites.length - 1; i >= 0; i--) {
			let pathNum = allSprites[i].getFollowPath();
			let loc = allSprites[i].getLoc();
			let dist = theGrid.getDistFromFinish(loc.x, loc.y, pathNum);
			if (dist <= 0.1) {
				allSprites.splice(i, 1);
				score.spriteEscaped();
				i--;
			}
		}

		let noMore = allSprites.length === 0 && remainingSprites === 0;
		if (noMore) {
			nextSpriteTime = curTime;
			curLevel++;
			remainingSprites = 10 * curLevel;
			newSpriteFreq *= 0.5;
		}

		return noMore;
	};

	that.render = function () {
		for (let i = 0; i < allSprites.length; i++) {
			allSprites[i].render();
		}
	};

	that.addMovingSprite = function (spec) {
		allSprites.push(AnimatedMoveModel(spec));
	};

	that.addSprite = function (spec) {
		allSprites.push(AnimatedModel(spec));
	};

	that.getAllSprites = function () {
		return allSprites;
	}

	that.reset = function () {
		allSprites.length = 0;
	};

	return that;
}(Game.graphics, Game.sounds, Game.particles);
