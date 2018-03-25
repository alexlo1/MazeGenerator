var WIDTH = 600;
var HEIGHT = 600;
var NUM_ROWS = 35;
var NUM_COLS = 35;
var PATH_ROWS = (NUM_ROWS - 1) / 2;
var PATH_COLS = (NUM_COLS - 1) / 2;
var TILE_WIDTH = WIDTH / NUM_ROWS;
var TILE_HEIGHT = HEIGHT / NUM_COLS;

var tiles;
var pathTiles;
var generated = false;
var unexplored = 0;

function Tile(row, col) {
  this.r = row;
  this.c = col;
  this.pathR = (row - 1) / 2;
  this.pathC = (col - 1) / 2;
  this.x = row / NUM_ROWS * HEIGHT;
  this.y = col / NUM_COLS * WIDTH;
  this.visited = false;
  this.isPathTile = false;
  this.isOpenWall = false;
  this.highlight = false;

  this.draw = function() {
    if(this.highlight) {
      fill(0, 200, 100);
    } else if(this.isPathTile) {
      fill(200);
    } else if(this.isOpenWall) {
      fill(200);
    } else {
      fill(0);
    }
    rect(this.x, this.y, TILE_WIDTH, TILE_HEIGHT);
  };
}

function reset() {
  generated = false;
  unexplored = 0;

  var i;
  var j;

  tiles = [];
  for(i = 0; i < NUM_ROWS; i++) {
    tiles[i] = new Array();
    for(j = 0; j < NUM_COLS; j++) {
      tiles[i][j] = new Tile(i, j);
    }
  }

  pathTiles = [];
  for(i = 0; i < PATH_ROWS; i++) {
    pathTiles[i] = [];
    for(j = 0; j < PATH_COLS; j++) {
      pathTiles[i][j] = tiles[2 * i + 1][2 * j + 1];
      pathTiles[i][j].isPathTile = true;
      unexplored++;
    }
  }
}

function setup() {
  createCanvas(WIDTH, HEIGHT);
  noStroke();
  background(0);
  reset();
}

function draw() {
  for(var i = 0; i < NUM_ROWS; i++) {
    for(var j = 0; j < NUM_COLS; j++) {
      tiles[i][j].draw();
    }
  }
}

/* Check for out-of-bounds errors */
function isValidPathTile(r, c) {
  return (r >= 0 && r < PATH_ROWS && c >= 0 && c < PATH_COLS);
}

/* Count the number of (un)explored neighboring pathTiles of a pathTile */
function getNeighbors(r, c, explored) {
  var count = [];
  var countPtr = 0;
  if(isValidPathTile(r - 1, c)) {
    if(pathTiles[r - 1][c].visited == explored) {
      count[countPtr++] = pathTiles[r - 1][c];
    }
  }
  if(isValidPathTile(r + 1, c)) {
    if(pathTiles[r + 1][c].visited == explored) {
      count[countPtr++] = pathTiles[r + 1][c];
    }
  }
  if(isValidPathTile(r, c - 1)) {
    if(pathTiles[r][c - 1].visited == explored) {
      count[countPtr++] = pathTiles[r][c - 1];
    }
  }
  if(isValidPathTile(r, c + 1)) {
    if(pathTiles[r][c + 1].visited == explored) {
      count[countPtr++] = pathTiles[r][c + 1];
    }
  }
  return count;
}

/* Get a random neighbor pathTile */
function getNeighbor(r, c, neighborArray) {
  var rand = int(random(neighborArray.length));
  return neighborArray[rand];
}

/* DFS / Backtracking algorithm
 * Random initial tile, mark as visited
 * While there are unexplored cells:
 *     If current tile has unexplored neighbors:
 *         Push current tile to the stack
 *         Pick a random unexplored neighbor
 *         Remove wall between neighbor and current
 *         Neighbor becomes current tile
 *     Else if stack is not empty:
 *         Current tile is the top of the stack, which is popped
 */
function backtrack() {
  reset();
  var backtrackStack = [];
  var stackPtr = -1;
  var currTile = pathTiles[int(random(PATH_ROWS))][int(random(PATH_COLS))];
  currTile.visited = true;
  unexplored--;
  while(unexplored > 0) {
    var un = getNeighbors(currTile.pathR, currTile.pathC, false);
    if(un.length > 0 && un.length <= 4) {
      backtrackStack[++stackPtr] = currTile;
      var currNeighbor = getNeighbor(currTile.pathR, currTile.pathC, un);
      var wallR = (currTile.r + currNeighbor.r) / 2;
      var wallC = (currTile.c + currNeighbor.c) / 2;
      tiles[wallR][wallC].isOpenWall = true;
      currTile = currNeighbor;
      currTile.visited = true;
      unexplored--;
    } else {
      currTile = backtrackStack[stackPtr--];
    }
  }
  generated = true;
}

/* Prim's algorithm (using tiles instead of edges)
 * Random initial tile, mark as visited
 * While there are unexplored cells:
 *     Add neighbors of current tile to tile listLength
 *     Get random tile from tile list, connect to current maze
 */
function randomPrim() {
  reset();
  var tileList = [];
  var listLength = 0;
  var currTile = pathTiles[int(random(PATH_ROWS))][int(random(PATH_COLS))];
  currTile.visited = true;
  unexplored--;
  while(unexplored > 0 && listLength > -1) {
    var un = getNeighbors(currTile.pathR, currTile.pathC, false);
    for(var t = 0; t < un.length; t++) {
      if(!tileList.includes(un[t])) {
        tileList[listLength++] = un[t];
      }
    }
    var rand = int(random(listLength));
    var currNeighbor = tileList[rand];
    tileList[rand] = tileList[listLength - 1];
    delete tileList[listLength - 1];
    listLength--;
    var nc = getNeighbors(currNeighbor.pathR, currNeighbor.pathC, true);
    var connection = getNeighbor(currNeighbor.pathR, currNeighbor.pathC, nc);
    var wallR = (currNeighbor.r + connection.r) / 2;
    var wallC = (currNeighbor.c + connection.c) / 2;
    tiles[wallR][wallC].isPathTile = true;
    currTile = currNeighbor;
    currTile.visited = true;
    unexplored--;
  }
  generated = true;
}
