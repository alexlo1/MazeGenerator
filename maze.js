// General Variables ----------------------------------------------------------

var WIDTH = 600;
var HEIGHT = 600;
var MIN = 10;
var MAX = 100;
var ROWS = 31;
var COLS = 31;
var PATH_ROWS = (ROWS - 1) / 2;
var PATH_COLS = (COLS - 1) / 2;
var TILE_WIDTH = WIDTH / ROWS;
var TILE_HEIGHT = HEIGHT / COLS;

var tiles;
var pathTiles;
var generated = false;
var unexplored = 0;

// Object Classes -------------------------------------------------------------

/* Tile class to represent the maze from */
function Tile(row, col) {
  this.r = row;
  this.c = col;
  this.pathR = (row - 1) / 2;
  this.pathC = (col - 1) / 2;
  this.x = row / ROWS * HEIGHT;
  this.y = col / COLS * WIDTH;
  this.visited = false;
  this.isPathTile = false;
  this.isOpenWall = false;
  this.highlight = false;
  this.prev = this;
  this.height = 0;

  this.draw = function() {
    if(this.highlight) {
      stroke(0, 255, 200);
      fill(0, 255, 200);
    } else if(this.isPathTile) {
      stroke(255);
      fill(255);
    } else if(this.isOpenWall) {
      stroke(255);
      fill(255);
    } else {
      stroke(0);
      fill(0);
    }
    rect(this.x, this.y, TILE_WIDTH, TILE_HEIGHT);
  };
}
// Processing Main Methods ----------------------------------------------------

/* required by processing, initial setup */
function setup() {
  createCanvas(WIDTH, HEIGHT);
  background(0);
  reset();
  noLoop();
}

/* required by processing, constantly runs */
function draw() {
  for(var i = 0; i < ROWS; i++) {
    for(var j = 0; j < COLS; j++) {
      tiles[i][j].draw();
    }
  }
}

// Helper Methods -------------------------------------------------------------

/* Reset everything, also for inital setup */
function reset() {
  generated = false;
  unexplored = 0;

  var i;
  var j;

  tiles = [];
  for(i = 0; i < ROWS; i++) {
    tiles[i] = new Array();
    for(j = 0; j < COLS; j++) {
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

  redraw();
}

/* Clear highlighted solution path */
function unsolve() {
  for(var r = 0; r < ROWS; r++) {
    for(var c = 0; c < COLS; c++) {
      tiles[r][c].highlight = false;
    }
  }
  redraw();
}

/* For the larger/smaller buttons, changes the size of the maze */
function changeSize(delta) {
  if(ROWS + delta > MIN && COLS + delta > MIN &&
     ROWS + delta < MAX && COLS + delta < MAX) {
    ROWS += delta;
    COLS += delta;
    PATH_ROWS = (ROWS - 1) / 2;
    PATH_COLS = (COLS - 1) / 2;
    TILE_WIDTH = WIDTH / ROWS;
    TILE_HEIGHT = HEIGHT / COLS;
    reset();
  }
}

/* Before solving, clear previouses and visited */
function clearPrev() {
  for(var r = 0; r < ROWS; r++) {
    for(var c = 0; c < COLS; c++) {
      tiles[r][c].prev = tiles[r][c];
      tiles[r][c].visited = false;
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

// Disjoint Set Methods -------------------------------------------------------

/* For disjoint set / union-find
 * Finds the root of a node, performing path compression on the way
 */
function findRoot(a) {
  if(a.prev == a) {
    return a;
  } else {
    // path compression
    var array = [];
    var arrPtr = 0;
    while(a.prev != a) {
      array[arrPtr++] = a;
      a = a.prev;
    }
    for(var i = 0; i < array.length; i++) {
      array[i].prev = a;
    }
    return a;
  }
}

/* For disjoint set / union-find
 * Combines two roots into one set
 */
function merge(a, b) {
  if(a.height >= b.height) {
    b.prev = a;
    a.height++;
  } else {
    a.prev = b;
    b.height++;
  }
}

/* For disjoint set / union-find
 * Combines two sets into one by merging the roots of each set
 */
function addEdge(a, b) {
  if(findRoot(a) != findRoot(b)) {
    merge(findRoot(a), findRoot(b));
  }
}

// Main Maze-generating Methods --------------------------------------------------

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
  redraw();
}

/* BFS algorithm
 * Random initial tile, mark as visited
 * While there are unexplored cells:
 *     If current tile has unexplored neighbors:
 *         Enqueue current tile to the queue
 *         Pick a random unexplored neighbor
 *         Remove wall between neighbor and current
 *         Neighbor becomes current tile
 *     Else if stack is not empty:
 *         Current tile is the front of the queue, which is dequeued
 */
function bfs() {
  reset();
  var q = [];
  var qFront = -1;
  var qBack = -1;
  var currTile = pathTiles[int(random(PATH_ROWS))][int(random(PATH_COLS))];
  currTile.visited = true;
  unexplored--;
  while(unexplored > 0) {
    var un = getNeighbors(currTile.pathR, currTile.pathC, false);
    if(un.length > 0 && un.length <= 4) {
      q[++qBack] = currTile;
      var currNeighbor = getNeighbor(currTile.pathR, currTile.pathC, un);
      var wallR = (currTile.r + currNeighbor.r) / 2;
      var wallC = (currTile.c + currNeighbor.c) / 2;
      tiles[wallR][wallC].isOpenWall = true;
      currTile = currNeighbor;
      currTile.visited = true;
      unexplored--;
    } else {
      currTile = q[++qFront];
    }
  }
  generated = true;
  redraw();
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
    // get all unexplored neighbors and add them to the list
    var un = getNeighbors(currTile.pathR, currTile.pathC, false);
    for(var t = 0; t < un.length; t++) {
      if(!tileList.includes(un[t])) {
        tileList[listLength++] = un[t];
      }
    }

    // get a random tile from the list
    var rand = int(random(listLength));
    var currNeighbor = tileList[rand];
    tileList[rand] = tileList[listLength - 1];
    delete tileList[listLength - 1];
    listLength--;

    // find a tile that is part of the maze and is also adjacent to the
    // randomly chosen tile, and connect them
    var nc = getNeighbors(currNeighbor.pathR, currNeighbor.pathC, true);
    var connection = getNeighbor(currNeighbor.pathR, currNeighbor.pathC, nc);
    var wallR = (currNeighbor.r + connection.r) / 2;
    var wallC = (currNeighbor.c + connection.c) / 2;
    tiles[wallR][wallC].isOpenWall = true;
    currTile = currNeighbor;
    currTile.visited = true;
    unexplored--;
  }
  generated = true;
  redraw();
}

/* Kruskal's algorithm
 * Create list of all walls in the maze
 * Create disjoint set for each tile
 * For each wall, in a random order:
 *     If the tiles across the wall are not connected:
 *         Remove the wall
 *         Unionize the two tiles
 */
function randomKruskal() {
  reset();
  clearPrev();

  // create a list of all of the walls
  var wallList = [];
  var listLength = 0;
  for(var i = 0; i < ROWS; i++) {
    for(var j = 0; j < COLS; j++) {
      if(i > 0 && i < ROWS - 1 && j > 0 && j < COLS - 1 &&
       ((i % 2 == 0 && j % 2 == 1) || (i % 2 == 1 && j % 2 == 0))) {
        wallList[listLength++] = tiles[i][j];
      }
    }
  }

  // for every wall in the list, in a random order
  while(listLength > 0) {
    var rand = int(random(listLength));
    var currWall = wallList[rand];
    wallList[rand] = wallList[listLength - 1];
    delete wallList[listLength - 1];
    listLength--;

    // determine whether this wall has neighbors to the left and right,
    // or has neighbors above and below
    var tile1, tile2;
    if(currWall.r % 2 == 1) {
      tile1 = tiles[currWall.r][currWall.c - 1];
      tile2 = tiles[currWall.r][currWall.c + 1];
    } else {
      tile1 = tiles[currWall.r - 1][currWall.c];
      tile2 = tiles[currWall.r + 1][currWall.c];
    }
    // if there is no path from one wall to other:
    // remove wall, unionize with disjoint set methods
    if(findRoot(tile1) != findRoot(tile2)) {
      currWall.isOpenWall = true;
      addEdge(tile1, tile2);
    }
  }
  generated = true;
  redraw();
}

// Main Maze-solving Methods --------------------------------------------------

/* BFS algorithm
 * Uses a queue
 * Enqueue start pointer
 * While queue is not empty, dequeue, enqueue neighbors that are connected
 * When goal is found, retrace steps using previous tile variable
 */
function bfsSolve(startr, startc) {
  if(!generated) {
    alert('Please generate a maze first.');
    return;
  }
  clearPrev();
  var queue = [];
  queue[0] = pathTiles[startr][startc];
  queue[0].highlight = true;
  var front = 0;
  var back = 0;

  // while queue has elements:
  while(back - front + 1 > 0) {
    // if target is found, quit
    if(queue[front].pathR == PATH_ROWS - 1 &&
       queue[front].pathC == PATH_COLS - 1) {
      break;
    }

    // otherwise get unexplored neighbors and enqueue if the wall is open
    var un = getNeighbors(queue[front].pathR, queue[front].pathC, false);
    for(var t = 0; t < un.length; t++) {
      if(!queue.includes(un[t])) {
        var wall = tiles[(un[t].r + queue[front].r) / 2]
                        [(un[t].c + queue[front].c) / 2];
        if(wall.isOpenWall) {
          queue[++back] = un[t];
          un[t].prev = queue[front];
        }
      }
    }
    front++;
  }

  // starting from end goal, loop through previous and highlight
  var ptr = queue[front];
  while(ptr != pathTiles[startr][startc]) {
    ptr.highlight = true;
    tiles[(ptr.r + ptr.prev.r) / 2][(ptr.c + ptr.prev.c) / 2].highlight = true;
    ptr = ptr.prev;
  }
  redraw();
}
