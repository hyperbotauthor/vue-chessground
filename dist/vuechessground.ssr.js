'use strict';Object.defineProperty(exports,'__esModule',{value:true});var vuecomps=require('@publishvue/vuecomps'),chessground=require('chessground'),chessops=require('@publishvue/chessops'),fetchclient=require('@publishvue/fetchclient');function _interopNamespace(e){if(e&&e.__esModule)return e;var n=Object.create(null);if(e){Object.keys(e).forEach(function(k){if(k!=='default'){var d=Object.getOwnPropertyDescriptor(e,k);Object.defineProperty(n,k,d.get?d:{enumerable:true,get:function(){return e[k]}});}})}n["default"]=e;return Object.freeze(n)}var fetchclient__namespace=/*#__PURE__*/_interopNamespace(fetchclient);var StoreCache = function StoreCache(){
  this.clear();
};

var prototypeAccessors$2 = { empty: { configurable: true },now: { configurable: true },size: { configurable: true } };

prototypeAccessors$2.empty.get = function (){    
  return !this.size
};

prototypeAccessors$2.now.get = function (){
  return new Date().getTime()
};

StoreCache.prototype.setItem = function setItem (key, value){
  this.cache[key] = value;
  this.lastWrite = this.now;
};

StoreCache.prototype.getItem = function getItem (key){
  return this.cache[key]
};

StoreCache.prototype.clear = function clear (){
  this.cache = {};
  this.lastWrite = this.now;
};

prototypeAccessors$2.size.get = function (){
  return Object.keys(this.cache).length
};

Object.defineProperties( StoreCache.prototype, prototypeAccessors$2 );

var AuthStore = function AuthStore(props){
  // prodHost is the host of the production server
  // if the host of the page source is different
  // we are in development
  this.prodHost = props.prodHost || "";
  // writeDelay is the delay in ms after elapsing of which 
  // without write the buffer has to be written to remote
  this.writeDelay = props.writeDelay || 5000;
  // maxWriteDelay is the maximum delay after which the buffer
  // must be written to remote
  this.maxWriteDelay = props.maxWriteDelay || 30000;
  // watchInterval is the interval at which the state
  // has to be monitored
  this.watchInterval = props.watchInterval || 1000;
  // isRemoteKey is a boolean function of store key
  // which should return true if the key has to be stored
  // permanently only at the remote
  this.isRemoteKey = props.isRemoteKey || ( function (key) { return false; } );
  // mockDelay is the simulated remote read delay in dev in ms
  this.mockDelay = props.mockDelay || 1500;
  // authstoreFuncProt is the Netlify authstore function protocol
  this.authstoreFuncProt = props.authstoreFuncProt || "https:";
  // authstoreFuncPath is the Netlify authstore function path
  this.authstoreFuncPath = props.authstoreFuncPath || ".netlify/functions/authstore";
  // vm is the virtual machine using the auth store
  this.vm = props.vm || null;

  this.authstoreFuncUrl = (this.authstoreFuncProt) + "//" + (this.prodHost) + "/" + (this.authstoreFuncPath);

  this.cache = new StoreCache();
  this.writeBuffer = new StoreCache();

  this.lastWrite = this.cache.now;

  setInterval(this.watch.bind(this), this.watchInterval);

  this.setInfo(("authstore ready " + (this.authstoreFuncUrl)));
};

var prototypeAccessors$1$1 = { isDev: { configurable: true } };

prototypeAccessors$1$1.isDev.get = function (){
  return document.location.host !== this.prodHost
};

AuthStore.prototype.setItem = function setItem (key, value){
  this.cache.setItem(key, value);
  this.writeBuffer.setItem(key, value);    
};

AuthStore.prototype.getItem = function getItem (key){
    var this$1$1 = this;

  return new Promise(function (resolve) {
    var cached = this$1$1.cache.getItem(key);

    if(typeof cached !== "undefined"){
      resolve(cached);
      return
    }

    var stored = JSON.parse(localStorage.getItem(key));

    if(stored !== null){
      this$1$1.cache.setItem(key, stored);
      this$1$1.writeBuffer.setItem(key, stored);

      if(this$1$1.isDev && this$1$1.isRemoteKey(key)){
        setTimeout(function (_) {
          resolve(stored);
        }, this$1$1.mockDelay * (0.5 + Math.random()));
      }else {
        resolve(stored);
      }

      return
    }

    if(this$1$1.isDev) { return }

    fetch(this$1$1.authstoreFuncUrl, {
      method: "POST",
      body: JSON.stringify({
        ACTION: "get",
        DOCUMENT_ID: key,
        LICHESS_TOKEN: localStorage.getItem("LICHESS_TOKEN"),
      })
    }).then(function (response) { return response.json().then(function (result) {
      console.log("authstore fetched", result);
      if(result){          
        var json = JSON.parse(result.content);
        this$1$1.cache.setItem(key, json);
        resolve(json);
      }else {
        this$1$1.cache.setItem(key, null);
        resolve(null);
      }
    }); });
  })
};

AuthStore.prototype.shouldWrite = function shouldWrite (){
  if(this.writeBuffer.empty) { return false }

  if( ( this.writeBuffer.now - this.writeBuffer.lastWrite ) > this.writeDelay ) { return true }

  if( ( this.writeBuffer.now - this.lastWrite ) > this.maxWriteDelay ) { return true }

  return false
};

AuthStore.prototype.setInfo = function setInfo (info){
  console.log(info);

  if(this.vm){
    this.vm["authstoreInfo"] = info;
  }
};

AuthStore.prototype.watch = function watch (){
    var this$1$1 = this;
    
  if(this.shouldWrite()){      
    this.lastWrite = this.cache.now;

    var size = this.writeBuffer.size;
      
    if(this.isDev){
      for(var key in this.writeBuffer.cache){
        localStorage.setItem(key, JSON.stringify(this.writeBuffer.cache[key]));
      }

      this.setInfo(("written " + size + " item(s) at " + (this.writeBuffer.now)));

      this.writeBuffer.clear();

      return
    }

    var bulk = Object.entries(this.writeBuffer.cache).map(function (entry) { return ({
      updateOne: {
        filter: {
          _id : entry[0]
        },
        update: {
          $set: {
            content: JSON.stringify(entry[1]),
          }
        },
        upsert: true
      }
    }); });

    console.log("bulk", bulk);

    this.setInfo(("writing " + size + " item(s) at " + (this.writeBuffer.now)));

    fetch(this.authstoreFuncUrl, {
        method: "POST",
        body: JSON.stringify({
          ACTION: "bulkwrite",
          DOCUMENT: JSON.stringify(bulk),
          LICHESS_TOKEN: localStorage.getItem("LICHESS_TOKEN"),
        })
      }).then(function (_) {          
        this$1$1.setInfo(("written " + size + " item(s) at " + (this$1$1.writeBuffer.now)));
    });

    this.writeBuffer.clear();
  }
};

Object.defineProperties( AuthStore.prototype, prototypeAccessors$1$1 );function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}var stockfish = createCommonjsModule(function (module) {
var NON_CHESS960 = true;

var MAX_PLMS_GEN_DEPTH = 1;

var DEFAULT_VARIANT = "standard";

var DO_COMMENTS = true;

var DEFAULT_MOVE_OVERHEAD = 1000;

function strippedfen(fen){
    return fen.split(" ").slice(0, 4).join(" ")
}

function stripsan(san){
    var strippedsan = san.replace(new RegExp("[+#]*", "g"), "");
    return strippedsan
}

var PIECE_DIRECTION_STRINGS = ["w", "nw", "n", "ne", "e", "se", "s", "sw"];

function pieceDirectionStringToSquareDelta(pieceDirectionString){
    var squareDelta = SquareDelta(0, 0);
    if(pieceDirectionString.includes("n")) { squareDelta.y = -1; }
    if(pieceDirectionString.includes("s")) { squareDelta.y = 1; }
    if(pieceDirectionString.includes("e")) { squareDelta.x = 1; }
    if(pieceDirectionString.includes("w")) { squareDelta.x = -1; }
    return squareDelta
}

var SquareDelta_ = function SquareDelta_(x, y){
      this.x = x;
      this.y = y;
  };

  SquareDelta_.prototype.equalto = function equalto (sd){
      return ( 
          ( this.x == sd.x ) &&
          ( this.y == sd.y )
      )
  };

  SquareDelta_.prototype.inverse = function inverse (){
      return SquareDelta(-this.x, -this.y)
  };

  SquareDelta_.prototype.angle = function angle (){
      var pds = this.toPieceDirectionString();
      return Math.PI / 4 * PIECE_DIRECTION_STRINGS.indexOf(pds)
  };

  SquareDelta_.prototype.toPieceDirectionString = function toPieceDirectionString (){
      var buff = "";
      if(this.y){
          buff += this.y < 0 ? "n" : "s";
      }
      if(this.x){
          buff += this.x > 0 ? "e" : "w";
      }
      return buff
  };

  SquareDelta_.prototype.normalized = function normalized (){
      if((this.x == 0) && (this.y == 0)) { return null }
      if((this.x * this.y) == 0){
          return SquareDelta(Math.sign(this.x), Math.sign(this.y))
      }else {
          if(Math.abs(this.x) != Math.abs(this.y)) { return null }
          return SquareDelta(Math.sign(this.x), Math.sign(this.y))
      }
  };
function SquareDelta(x, y){return new SquareDelta_(x, y)}

var NUM_SQUARES = 8;
var LAST_SQUARE = NUM_SQUARES - 1;
var BOARD_AREA = NUM_SQUARES * NUM_SQUARES;

var STANDARD_START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
var ANTICHESS_START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1";
var RACING_KINGS_START_FEN = "8/8/8/8/8/8/krbnNBRK/qrbnNBRQ w - - 0 1";
var HORDE_START_FEN = "rnbqkbnr/pppppppp/8/1PP2PP1/PPPPPPPP/PPPPPPPP/PPPPPPPP/PPPPPPPP w kq - 0 1";
var THREE_CHECK_START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 3+3 0 1";
var CRAZYHOUSE_START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR[] w KQkq - 0 1";
var SCHESS_START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR[HEhe] w KQBCDFGkqbcdfg - 0 1";
var EIGHTPIECE_START_FEN = "jlsesqkbnr/pppppppp/8/8/8/8/PPPPPPPP/JLneSQKBNR w KQkq - 0 1 -";

var WHITE = true;
var BLACK = false;

function ROOK_DIRECTIONS(){return [
    SquareDelta(1,0),
    SquareDelta(-1,0),
    SquareDelta(0,1),
    SquareDelta(0,-1)
]}

function BISHOP_DIRECTIONS(){return [
    SquareDelta(1,1),
    SquareDelta(-1,-1),
    SquareDelta(1,-1),
    SquareDelta(-1,1)
]}

function QUEEN_DIRECTIONS(){return [
    SquareDelta(1,0),
    SquareDelta(-1,0),
    SquareDelta(0,1),
    SquareDelta(0,-1),
    SquareDelta(1,1),
    SquareDelta(-1,-1),
    SquareDelta(1,-1),
    SquareDelta(-1,1)
]}

function KING_DIRECTIONS(){return [
    SquareDelta(1,0),
    SquareDelta(-1,0),
    SquareDelta(0,1),
    SquareDelta(0,-1),
    SquareDelta(1,1),
    SquareDelta(-1,-1),
    SquareDelta(1,-1),
    SquareDelta(-1,1)
]}

function KNIGHT_DIRECTIONS(){return [
    SquareDelta(2,1),
    SquareDelta(2,-1),
    SquareDelta(-2,1),
    SquareDelta(-2,-1),
    SquareDelta(1,2),
    SquareDelta(1,-2),
    SquareDelta(-1,2),
    SquareDelta(-1,-2)
]}

function JAILER_DIRECTIONS(){return [
    SquareDelta(1,0),
    SquareDelta(-1,0),
    SquareDelta(0,1),
    SquareDelta(0,-1)
]}

function SENTRY_DIRECTIONS(){return [
    SquareDelta(1,1),
    SquareDelta(-1,-1),
    SquareDelta(1,-1),
    SquareDelta(-1,1)
]}

function PIECE_DIRECTIONS(kind){
    if(kind == "r") { return [ROOK_DIRECTIONS(), true] }    
    if(kind == "b") { return [BISHOP_DIRECTIONS(), true] }
    if(kind == "q") { return [QUEEN_DIRECTIONS(), true] }
    if(kind == "k") { return [KING_DIRECTIONS(), false] }
    if(kind == "n") { return [KNIGHT_DIRECTIONS(), false] }    
    if(kind == "j") { return [JAILER_DIRECTIONS(), true] }    
    if(kind == "s") { return [SENTRY_DIRECTIONS(), true] }    
}

function getPieceDirection(piece){
    if(piece.kind == "l") { return [ [ piece.direction ] , true ] }
    return PIECE_DIRECTIONS(piece.kind)
}

function ADJACENT_DIRECTIONS(){
    var adjDirs = [];
    for(var i=-1;i<=1;i++){ for(var j=-1;j<=1;j++){ if((i!=0)||(j!=0)) { adjDirs.push(SquareDelta(i,j)); } } }
    return adjDirs
}

var PAWNDIRS_WHITE = {
    baserank: 6,
    promrank: 0,
    pushtwo: SquareDelta(0, -2),
    pushone: SquareDelta(0, -1),
    captures: [SquareDelta(-1, -1), SquareDelta(1, -1)]
};

var PAWNDIRS_BLACK = {
    baserank: 1,
    promrank: 7,
    pushtwo: SquareDelta(0, 2),
    pushone: SquareDelta(0, 1),
    captures: [SquareDelta(-1, 1), SquareDelta(1, 1)]
};

function PAWNDIRS(color){
    return color ? PAWNDIRS_WHITE : PAWNDIRS_BLACK
}

var VARIANT_KEYS = [    
    [ "standard", "Standard", STANDARD_START_FEN ],
    [ "chess960", "Chess960", STANDARD_START_FEN ],
    [ "crazyhouse", "Crazyhouse", CRAZYHOUSE_START_FEN ],
    [ "antichess", "Giveaway", ANTICHESS_START_FEN ],
    [ "atomic", "Atomic", STANDARD_START_FEN ],
    [ "horde", "Horde", HORDE_START_FEN ],
    [ "kingOfTheHill", "King of the Hill", STANDARD_START_FEN ],
    [ "racingKings", "Racing Kings", RACING_KINGS_START_FEN ],
    [ "threeCheck", "Three-check", THREE_CHECK_START_FEN ],
    [ "seirawan", "S-Chess", SCHESS_START_FEN ],
    [ "eightpiece", "8-Piece", EIGHTPIECE_START_FEN ] ];

var INCLUDE_LIMITS = true;

function baseRank(color){
    if(color == BLACK) { return 0 }
    return LAST_SQUARE
}

function getvariantstartfen(variant){
    var key = VARIANT_KEYS.find(function (value){ return value[0]==variant; });
    if(key) { return key[2] }
    return STANDARD_START_FEN
}

var Square_ = function Square_(file, rank){
      this.file = file;
      this.rank = rank;
  };

  Square_.prototype.adddelta = function adddelta (v){
      return Square(this.file + v.x, this.rank + v.y)
  };

  Square_.prototype.equalto = function equalto (sq){
      if(!sq) { return false }
      return ( this.file == sq.file ) && ( this.rank == sq.rank )
  };

  Square_.prototype.clone = function clone (){
      return Square(this.file, this.rank)
  };
function Square(file, rank){return new Square_(file, rank)}

var ALL_SQUARES = [];
for(var rank=0;rank<NUM_SQUARES;rank++) { for(var file=0;file<NUM_SQUARES;file++) { ALL_SQUARES.push(Square(file, rank)); } }

var Piece_ = function Piece_(kind, color, direction){
      this.kind = kind;
      this.color = color;
      this.direction = direction;
  };

  Piece_.prototype.isempty = function isempty (){
      return !this.kind
  };

  Piece_.prototype.toString = function toString (){
      if(this.isempty()) { return "-" }
      var buff = (!this.color) ? this.kind: this.kind.toUpperCase();
      if(this.direction) { buff += this.direction.toPieceDirectionString(); }
      return buff
  };

  Piece_.prototype.tocolor = function tocolor (color){
      return Piece(this.kind, color, this.direction)
  };

  Piece_.prototype.colorInverse = function colorInverse (){
      return this.tocolor(!this.color)
  };

  Piece_.prototype.inverse = function inverse (){
      var colorInverse = this.colorInverse();

      if(this.kind == "l"){
          colorInverse.direction = colorInverse.direction.inverse();
      }

      return colorInverse
  };

  Piece_.prototype.equalto = function equalto (p){
      if(this.direction && p.direction){
          if(!this.direction.equalto(p.direction)) { return false }
      }else if(this.direction || p.direction) { return false }

      return ( 
          ( this.kind == p.kind ) &&
          ( this.color == p.color )
      )
  };

  Piece_.prototype.clone = function clone (){
      return Piece(this.kind, this.color, this.direction)
  };

  Piece_.prototype.letter = function letter (){
      if(!this.color) { return this.kind }
      return this.kind.toUpperCase()
  };
function Piece(kind, color, direction){return new Piece_(kind, color, direction)}
function PieceL(letter){
    if(letter == letter.toLowerCase()) { return new Piece_(letter, BLACK) }
    return new Piece_(letter.toLowerCase(), WHITE)
}

var Move_ = function Move_(fromsq, tosq, prompiece, epclsq, epsq, promsq){
      this.fromsq = fromsq;
      this.tosq = tosq;
      this.prompiece = prompiece;
      this.epclsq = epclsq;
      this.epsq = epsq;
      this.promsq = promsq;
  };

  Move_.prototype.effpromsq = function effpromsq (){
      return this.promsq || this.tosq
  };

  Move_.prototype.roughlyequalto = function roughlyequalto (move){
      return this.fromsq.equalto(move.fromsq) && this.tosq.equalto(move.tosq)
  };

  Move_.prototype.strictlyEqualTo = function strictlyEqualTo (move){
      if(this.promsq){
          if(!move.promsq) { return false }
          if(!this.promsq.equalto(move.promsq)) { return false }
      }
      if(this.prompiece){
          if(!move.prompiece) { return false }
          if(!this.prompiece.equalto(move.prompiece)) { return false }
      }
      return this.fromsq.equalto(move.fromsq) && this.tosq.equalto(move.tosq)
  };
function Move(fromsq, tosq, prompiece, epclsq, epsq, promsq){return new Move_(fromsq, tosq, prompiece, epclsq, epsq, promsq)}

function LANCER_PROMOTION_PIECES(color, addCancel){
    var lpp = QUEEN_DIRECTIONS().map(function (qd) { return Piece("l", color, qd); });
    if(addCancel) { lpp = lpp.concat([
        Piece("x", BLACK, SquareDelta(0, 0))
    ]); }
    return lpp
}

var FIFTY_MOVE_RULE_LIMIT     = 100;

var ChessBoard_ = function ChessBoard_(props){        
      this.props = props || {};

      this.variant = this.props.variant || DEFAULT_VARIANT;
        
      this.rep = Array(BOARD_AREA).fill(null);    

      this.stack = [];

      this.setfromfen();
  };

var prototypeAccessors = { turnVerbal: { configurable: true },reverseTurnVerbal: { configurable: true } };

  ChessBoard_.prototype.PROMOTION_PIECES = function PROMOTION_PIECES (color, addCancel){
      var basicPieces = [
          Piece("q", color, SquareDelta(0, 0)),
          Piece("r", color, SquareDelta(1, 0)),
          Piece("b", color, SquareDelta(0, 1)),
          Piece("n", color, SquareDelta(1, 1)) ];

      if(this.IS_SCHESS()){
          basicPieces = basicPieces.concat([
              Piece("e", color, SquareDelta(0, 2)),
              Piece("h", color, SquareDelta(1, 2)) ]);
          if(addCancel){
              basicPieces = basicPieces.concat([                  
                  Piece("x", BLACK, SquareDelta(0, 3)) ]);
          }
      }else if(this.IS_EIGHTPIECE()){
          basicPieces = LANCER_PROMOTION_PIECES(color, addCancel).concat([
              Piece("j", color, SquareDelta(-1, 2)),
              Piece("q", color, SquareDelta(0, 2)),
              Piece("r", color, SquareDelta(1, 2)),
              Piece("s", color, SquareDelta(-1, 3)),
              Piece("b", color, SquareDelta(0, 3)),
              Piece("n", color, SquareDelta(1, 3)) ]);
      }else {
          if(addCancel) { basicPieces = basicPieces.concat([
              Piece("x", BLACK, SquareDelta(0, 2)) ]); }
      }

      var maxy = basicPieces.map(function (p) { return p.direction; }).reduce(function (prev, curr) { return curr.rank > prev ? curr.rank : prev; }, 0);

      if(!color){
          basicPieces.forEach(function (p) { return p.direction.y = maxy - p.direction.y; });
      }

      return basicPieces
  };

  ChessBoard_.prototype.status = function status (){
      var lms = this.legalmovesforallpieces();

      if(lms.length){
          if(this.halfmoveclock >= FIFTY_MOVE_RULE_LIMIT){
              return {
                  terminated: true,
                  result: 0.5,
                  resultReason: "fifty move rule"
              }
          }
          return {
              terminated: false,
              result: null,
              resultReason: "in progress"
          }
      }

      if(this.iskingincheck(this.turn)){
          return {
              terminated: true,
              result: ( this.turn == WHITE ) ? 0 : 1,
              resultReason: "mate"
          }
      }

      return {
          terminated: true,
          result: 0.5,
          resultReason: "stalemate"
      }
  };

  ChessBoard_.prototype.IS_ATOMIC = function IS_ATOMIC (){
      return this.variant == "atomic"
  };

  ChessBoard_.prototype.IS_ANTICHESS = function IS_ANTICHESS (){
      return this.variant == "antichess"
  };

  ChessBoard_.prototype.IS_SCHESS = function IS_SCHESS (){
      return this.variant == "seirawan"
  };

  ChessBoard_.prototype.IS_EIGHTPIECE = function IS_EIGHTPIECE (){
      return this.variant == "eightpiece"
  };

  ChessBoard_.prototype.pieceStore = function pieceStore (){
      if(!this.piecestorefen) { return [] }
      return this.piecestorefen.split("").map(function (letter) { return PieceL(letter); })
  };

  ChessBoard_.prototype.squareStore = function squareStore (){
        var this$1$1 = this;

      if(!this.castlefen == "-") { return [] }

      return this.castlefen.split("").map(function (letter) {
          switch(letter){
              case "K":                    
                  return this$1$1.rookorigsq("k", WHITE)
              case "Q":
                  return this$1$1.rookorigsq("q", WHITE)
              case "k":
                  return this$1$1.rookorigsq("k", BLACK)
              case "q":
                  return this$1$1.rookorigsq("q", BLACK)
              default:
                  var lower = letter.toLowerCase();
                  var color = letter == lower ? BLACK : WHITE;
                  var file = lower.charCodeAt(0) - "a".charCodeAt(0);
                  var rank = baseRank(color);                
                  return Square(file, rank)
          }            
      })
  };

  ChessBoard_.prototype.pieceStoreColor = function pieceStoreColor (color){
      return this.pieceStore().filter(function (p) { return p.color == color; })
  };

  ChessBoard_.prototype.adjacentsquares = function adjacentsquares (sq){
        var this$1$1 = this;

      return ADJACENT_DIRECTIONS().map(function (dir){ return sq.adddelta(dir); }).filter(function (sq){ return this$1$1.squareok(sq); })
  };

  ChessBoard_.prototype.jailerAdjacentSquares = function jailerAdjacentSquares (sq){
        var this$1$1 = this;

      return JAILER_DIRECTIONS().map(function (dir) { return sq.adddelta(dir); }).filter(function (sq) { return this$1$1.squareok(sq); })
  };

  ChessBoard_.prototype.isSquareJailedBy = function isSquareJailedBy (sq, color){
        var this$1$1 = this;

      return this.jailerAdjacentSquares(sq).filter(function (testsq) { return this$1$1.pieceatsquare(testsq).equalto(Piece("j", color)); }).length > 0
  };

  ChessBoard_.prototype.kingsadjacent = function kingsadjacent (){
      var wkw = this.whereisking(WHITE);
      if(!wkw) { return false }
      var wkb = this.whereisking(BLACK);
      if(!wkb) { return false }
      return this.adjacentsquares(wkw).find(function (sq){ return sq.equalto(wkb); })
  };

  ChessBoard_.prototype.algebtosquare = function algebtosquare (algeb){                
      if(algeb == "-") { return null }
      var file = algeb.charCodeAt(0) - "a".charCodeAt(0);
      var rank = NUM_SQUARES - 1 - ( algeb.charCodeAt(1) - "1".charCodeAt(0) );
      return Square(file, rank)
  };

  ChessBoard_.prototype.algebtomovesimple = function algebtomovesimple (algeb){
      if(typeof algeb == "undefined") { return null }
      if(algeb === null) { return null }
      if((algeb == "-") || (algeb == "")) { return null }

      return Move(
          this.algebtosquare(algeb.substring(0,2)),
          this.algebtosquare(algeb.substring(2,4))
      )
  };

  prototypeAccessors.turnVerbal.get = function (){
      return this.turn ? "white" : "black"
  };

  prototypeAccessors.reverseTurnVerbal.get = function (){
      return this.turn ? "black" : "white"
  };

  ChessBoard_.prototype.setfromfen = function setfromfen (fenopt, variantopt){        
      this.variant = variantopt || this.variant;
      this.fen = fenopt || getvariantstartfen(this.variant);

      this.fenparts = this.fen.split(" ");
      this.rawfen = this.fenparts[0];
      this.rankfens = this.rawfen.split("/");
      this.turnfen = this.fenparts[1];           
      this.castlefen = this.fenparts[2];
      this.epfen = this.fenparts[3];  
      this.halfmovefen = this.fenparts[4];          
      this.fullmovefen = this.fenparts[5];          
      this.disablefen = null;
      if(this.fenparts.length > 6) { this.disablefen = this.fenparts[6]; }

      // schess piece store
      var rawfenparts = this.rawfen.split(/\[|\]/);
      this.piecestorefen = rawfenparts.length > 1 ? rawfenparts[1] : "";        

      this.turn = this.turnfen == "w" ? WHITE : BLACK;

      this.epsq = this.algebtosquare(this.epfen);

      this.halfmoveclock = parseInt(this.halfmovefen);
      this.fullmovenumber = parseInt(this.fullmovefen);

      for(var i$1=0;i$1<BOARD_AREA;i$1++) { this.rep[i$1] = Piece(); }

      var i = 0;        
      for(var i$2 = 0, list = this.rankfens; i$2 < list.length; i$2 += 1){            
          var rankfen = list[i$2];

          var rfa = Array.from(rankfen);
          var rfai = 0;
          do{
              var c = rfa[rfai++];
              if((c>='0')&&(c<='9')){
                  var repcnt = c.charCodeAt(0) - '0'.charCodeAt(0);
                  for(var j=0;j<repcnt;j++){
                      this.rep[i++] = Piece();
                  }
              }else {
                  var kind = c;
                  var color = BLACK;
                  if((c>='A')&&(c<="Z")){
                      kind = c.toLowerCase();
                      color = WHITE;
                  }   
                    
                  if(kind == "l"){
                      // lancer
                      var buff = rfa[rfai++];                                                
                      if(["n", "s"].includes(buff)){
                          var test = rfa[rfai];
                          if(["e", "w"].includes(test)){
                              buff += test;
                              rfai++;
                          }
                      }                        
                      this.rep[i++] = Piece(kind, color, pieceDirectionStringToSquareDelta(buff));
                  }else {
                      this.rep[i++] = Piece(kind, color);
                  }                    
              }
          }while(rfai < rfa.length)
      }                

      return this
  };

  ChessBoard_.prototype.pieceatsquare = function pieceatsquare (sq){
      return this.rep[sq.file + sq.rank * NUM_SQUARES]
  };

  ChessBoard_.prototype.toString = function toString (){
      var buff = "";
      for(var i = 0, list = ALL_SQUARES; i < list.length; i += 1){
          var sq = list[i];

          buff += this.pieceatsquare(sq).toString();
          if(sq.file == LAST_SQUARE) { buff += "\n"; }
      }
      return buff
  };

  ChessBoard_.prototype.squaretoalgeb = function squaretoalgeb (sq){return ("" + (String.fromCharCode(sq.file + 'a'.charCodeAt(0))) + (String.fromCharCode(NUM_SQUARES - 1 - sq.rank + '1'.charCodeAt(0))))};

  ChessBoard_.prototype.movetoalgeb = function movetoalgeb (move, nochess960){
        var assign;

      if(!move) { return "-" }

      if(this.IS_SCHESS()){            
          if(move.castling){                
              var from = move.fromsq;
              var to = move.delrooksq;
              if(move.placeCastlingPiece){
                  if(move.placeCastlingSquare.equalto(to)){
                      (assign = [to, from], from = assign[0], to = assign[1]);
                  }                    
              }
              return ("" + (this.squaretoalgeb(from)) + (this.squaretoalgeb(to)) + (move.placeCastlingPiece ? move.placeCastlingPiece.kind : ''))
          }
          if(move.placePiece){
              return ("" + (this.squaretoalgeb(move.fromsq)) + (this.squaretoalgeb(move.tosq)) + (move.placePiece.kind))
          }
      }

      var fromp = this.pieceatsquare(move.fromsq);
      var top = this.pieceatsquare(move.tosq);

      var prom = move.prompiece ? move.prompiece.kind : "";

      if((fromp.kind == "l") || ((fromp.kind == "s")) && (top.kind == "l")){
          if(move.prompiece){
              prom += move.prompiece.direction.toPieceDirectionString();
          }else {
              // lancer prompiece may be missing when lancer is pushed
              prom += fromp.direction.toPieceDirectionString();
          }            
      }

      if(move.promsq) { prom += "@" + this.squaretoalgeb(move.promsq); }

      if((!nochess960) && move.castling){
          return ("" + (this.squaretoalgeb(move.fromsq)) + (this.squaretoalgeb(move.delrooksq)))
      }

      return ("" + (this.squaretoalgeb(move.fromsq)) + (this.squaretoalgeb(move.tosq)) + prom)
  };

  ChessBoard_.prototype.squaretorepindex = function squaretorepindex (sq){
      return sq.file + sq.rank * NUM_SQUARES
  };

  ChessBoard_.prototype.setpieaceatsquare = function setpieaceatsquare (sq, p){
      this.rep[this.squaretorepindex(sq)] = p;
  };

  ChessBoard_.prototype.squaresForPieceKind = function squaresForPieceKind (kind, color){
        var this$1$1 = this;

      return ALL_SQUARES.filter(function (sq) {
          var p = this$1$1.pieceatsquare(sq);
          return (p.kind == kind) && (p.color == color)
      })
  };

  ChessBoard_.prototype.attacksonsquarebylancer = function attacksonsquarebylancer (sq, color){
      var attacks = [];
      for(var i = 0, list = this.squaresForPieceKind("l", color); i < list.length; i += 1){
          var testsq = list[i];

          var plms = this.pseudolegalmovesforpieceatsquare(this.pieceatsquare(testsq), testsq);
          attacks = attacks.concat(plms.filter(function (plm) { return plm.tosq.equalto(sq); }));
      }
      return attacks.map(function (attack) { return Move(attack.tosq, attack.fromsq); })
  };

  ChessBoard_.prototype.attacksonsquarebysentry = function attacksonsquarebysentry (sq, color){
      var attacks = [];
      for(var i = 0, list = this.squaresForPieceKind("s", color); i < list.length; i += 1){
          var testsq = list[i];

          var plms = this.pseudolegalmovesforpieceatsquare(this.pieceatsquare(testsq), testsq);            
          attacks = attacks.concat(plms.filter(function (plm) { return plm.promsq; }))
              .filter(function (plm) { return plm.promsq.equalto(sq); });
      }        
      return attacks.map(function (attack) { return Move(attack.promsq, attack.fromsq); })
  };

  ChessBoard_.prototype.attacksonsquarebypieceInner = function attacksonsquarebypieceInner (sq, p){
        var this$1$1 = this;
                        
      if(p.kind == "l") { return this.attacksonsquarebylancer(sq, p.color) }

      if(p.kind == "s") { return this.attacksonsquarebysentry(sq, p.color) }

      var plms = this.pseudolegalmovesforpieceatsquare(p.inverse(), sq);        

      return plms.filter(function (move) { return this$1$1.pieceatsquare(move.tosq).equalto(p); })
  };

  ChessBoard_.prototype.attacksonsquarebypiece = function attacksonsquarebypiece (sq, p){
        var this$1$1 = this;

      var attacks = this.attacksonsquarebypieceInner(sq, p);

      return attacks.filter(function (attack) { return !this$1$1.isSquareJailedBy(attack.tosq, !p.color); })
  };

  ChessBoard_.prototype.issquareattackedbycolor = function issquareattackedbycolor (sq, color){
      var pieceLetters = ['q', 'r', 'b', 'n', 'k'];
      if(this.IS_SCHESS()) { pieceLetters = pieceLetters.concat(["e", "h"]); }
      if(this.IS_EIGHTPIECE()) { pieceLetters = pieceLetters.concat(["s"]); }
      for(var i = 0, list = pieceLetters; i < list.length; i += 1){
          var pl = list[i];

          if(this.attacksonsquarebypiece(sq, Piece(pl, color)).length > 0) { return true }
      }
      if(this.IS_EIGHTPIECE()){
          for(var i$1 = 0, list$1 = LANCER_PROMOTION_PIECES(color); i$1 < list$1.length; i$1 += 1){
              var lancer = list$1[i$1];

              if(this.attacksonsquarebypiece(sq, lancer).length > 0) { return true }
          }
      }
      var pd = PAWNDIRS(!color);
      for(var i$2 = 0, list$2 = pd.captures; i$2 < list$2.length; i$2 += 1){
          var capt = list$2[i$2];

          var testsq = sq.adddelta(capt);
          if(this.squareok(testsq)){
              if(this.pieceatsquare(testsq).equalto(Piece('p', color))) { return true }
          }
      }
      return false
  };

  ChessBoard_.prototype.whereisking = function whereisking (color){
      var searchking = Piece('k', color);
      for(var i = 0, list = ALL_SQUARES; i < list.length; i += 1){            
          var sq = list[i];

          if(this.pieceatsquare(sq).equalto(searchking)) { return sq }
      }
      return null
  };

  ChessBoard_.prototype.iskingincheckAfterMove = function iskingincheckAfterMove (move, color){
      this.push(move);
      var ischeck = this.iskingincheck(color);
      this.pop();
      return ischeck
  };

  ChessBoard_.prototype.iskingincheck = function iskingincheck (color){
      var wk = this.whereisking(color);        
      if(this.IS_EIGHTPIECE()){
          if(!wk) { return true }
      }
      if(this.IS_ATOMIC()){
          if(!wk) { return true }
          var wkopp = this.whereisking(!color);        
          if(!wkopp) { return false }
          if(this.kingsadjacent()) { return false }
      }else {
          if(!wk) { return false }
      }        
      return this.issquareattackedbycolor(wk, !color)
  };

  ChessBoard_.prototype.deletecastlingrights = function deletecastlingrights (deleterightsstr, color){
      if(this.castlefen == "-") { return }
      if(color) { deleterightsstr = deleterightsstr.toUpperCase(); }
      var deleterights = deleterightsstr.split("");        
      var rights = this.castlefen.split("");
      {
          var deleteright = list[i];

          var loop = function () {
          rights = rights.filter(function (right){ return right != deleteright; });
        };

        
        }for(var i = 0, list = deleterights; i < list.length; i += 1) loop();
      this.castlefen = rights.length > 0 ? rights.join("") : "-";
  };

  ChessBoard_.prototype.rookorigsq = function rookorigsq (side, color){
      if(color){
          if(side == "k") { return Square(7, 7) }
          else { return Square(0, 7) }
      }else {
          if(side == "k") { return Square(7, 0) }
          else { return Square(0, 0) }
      }
  };

  ChessBoard_.prototype.rookorigpiece = function rookorigpiece (side, color){
      if(this.IS_EIGHTPIECE()){
          if(side == "q") { return Piece("j", color) }
      }
      return Piece("r", color)
  };

  ChessBoard_.prototype.castletargetsq = function castletargetsq (side, color){
      if(color){
          if(side == "k") { return Square(6, 7) }
          else { return Square(2, 7) }
      }else {
          if(side == "k") { return Square(6, 0) }
          else { return Square(2, 0) }
      }
  };

  ChessBoard_.prototype.rooktargetsq = function rooktargetsq (side, color){
      if(color){
          if(side == "k") { return Square(5, 7) }
          else { return Square(3, 7) }
      }else {
          if(side == "k") { return Square(5, 0) }
          else { return Square(3, 0) }
      }
  };

  ChessBoard_.prototype.squaresbetween = function squaresbetween (sq1orig, sq2orig, includelimits){        
      var sq1 = sq1orig.clone();
      var sq2 = sq2orig.clone();
      var rev = sq2.file < sq1.file;
      if(rev){
          var temp = sq1;
          sq1 = sq2;
          sq2 = temp;
      }
      var sqs = [];
      if(includelimits) { sqs.push(sq1.clone()); }
      var currentsq = sq1;
      var ok = true;
      do{
          currentsq.file++;
          if(currentsq.file < sq2.file) { sqs.push(currentsq.clone()); }
          else if(currentsq.file == sq2.file){
              if(includelimits) { sqs.push(currentsq.clone()); }
              ok = false;
          }else {
              console.log("warning, squaresbetween received equal files");
              ok = false;
          }
      }while(ok)
      return sqs
  };

  ChessBoard_.prototype.cancastle = function cancastle (side, color){
        var this$1$1 = this;
        
      if(!this.castlefen.includes(color ? side.toUpperCase() : side)) { return false }
      var wk = this.whereisking(color);        
      if(!wk) { return false }
      var ro = this.rookorigsq(side, color);                        
      var betweensqs = this.squaresbetween(wk, ro);              
      if(betweensqs.length != betweensqs.filter(function (sq){ return this$1$1.pieceatsquare(sq).isempty(); }).length) { return false }        
      var ct = this.castletargetsq(side, color);        
      var passingsqs = this.squaresbetween(wk, ct, INCLUDE_LIMITS);        
      for(var i = 0, list = passingsqs; i < list.length; i += 1){
          var sq = list[i];

          if(this.issquareattackedbycolor(sq, !color)) { return false }
      }
      if(this.IS_EIGHTPIECE()){
          if(this.isSquareJailedBy(this.rookorigsq(side, color), !color)) { return false }
          if(this.isKingJailed(color)) { return false }
      }
      return true
  };

  ChessBoard_.prototype.isKingJailed = function isKingJailed (color){
      var wk = this.whereisking(color);

      if(!wk) { return false }

      return this.isSquareJailedBy(wk, !color)
  };

  ChessBoard_.prototype.getstate = function getstate (){
      return {
          rep: this.rep.map(function (p){ return p.clone(); }),
          turn: this.turn,            
          epsq: this.epsq ? this.epsq.clone() : null,
          halfmoveclock: this.halfmoveclock,
          fullmovenumber: this.fullmovenumber,

          rawfen: this.rawfen,
          turnfen: this.turnfen,
          castlefen: this.castlefen,
          epfen: this.epfen,
          halfmovefen: this.halfmovefen,
          fullmovefen: this.fullmovefen,
          disablefen: this.disablefen,
          piecestorefen: this.piecestorefen,            

          fen: this.fen
      }
  };

  ChessBoard_.prototype.pushstate = function pushstate (){
      this.stack.push(this.getstate());
  };

  ChessBoard_.prototype.setstate = function setstate (state){
      this.rep = state.rep;
      this.turn = state.turn;        
      this.epsq = state.epsq;
      this.halfmoveclock = state.halfmoveclock;
      this.fullmovenumber = state.fullmovenumber;

      this.rawfen = state.rawfen;
      this.turnfen = state.turnfen;
      this.castlefen = state.castlefen;
      this.epfen = state.epfen;
      this.halfmovefen = state.halfmovefen;
      this.fullmovefen = state.fullmovefen;
      this.disablefen = state.disablefen;
      this.piecestorefen = state.piecestorefen;        

      this.fen = state.fen;
  };

  ChessBoard_.prototype.pop = function pop (){
      this.setstate(this.stack.pop());
  };

  ChessBoard_.prototype.algebtomove = function algebtomove (algeb){
        var this$1$1 = this;

      if(!algeb) { return null }
      if(algeb == "-") { return null }

      var lms = this.legalmovesforallpieces();

      var move = lms.find(function (testmove) { return this$1$1.movetoalgeb(testmove) == algeb; });

      if(move) { return move }

      // try non chess960
      return lms.find(function (testmove) { return this$1$1.movetoalgeb(testmove, NON_CHESS960) == algeb; })
  };

  ChessBoard_.prototype.pushalgeb = function pushalgeb (algeb){
      var move = this.algebtomove(algeb);

      if(!move) { return false }

      this.push(move);

      return true
  };

  ChessBoard_.prototype.removePlacePieceFromStore = function removePlacePieceFromStore (p){
      var pstore = this.piecestorefen.split("");
      pstore = pstore.filter(function (pl) { return p.toString() != pl; });
      this.piecestorefen = pstore.join("");
  };

  ChessBoard_.prototype.removeSquareFromStore = function removeSquareFromStore (sq){
      var algeb = this.squaretoalgeb(sq);
      var fileLetter = algeb.substring(0, 1);

      if(sq.rank == baseRank(WHITE)){
          this.deletecastlingrights(fileLetter, WHITE);
          return
      }

      if(sq.rank == baseRank(BLACK)){
          this.deletecastlingrights(fileLetter, BLACK);
          return
      }
  };

  ChessBoard_.prototype.push = function push (move){                
      this.pushstate();

      var fromp = this.pieceatsquare(move.fromsq);

      // set squares

      var top = this.pieceatsquare(move.tosq);        
      this.setpieaceatsquare(move.fromsq, Piece());

      if(move.placePiece){
          this.setpieaceatsquare(move.fromsq, move.placePiece);

          this.removePlacePieceFromStore(move.placePiece);            
      }

      if(move.placeMove){
          this.removeSquareFromStore(move.fromsq);
      }

      // move from piece in any case, overwrite this with normal promotion if needed
      this.setpieaceatsquare(move.tosq, fromp);

      if(move.prompiece){                                    
          this.setpieaceatsquare(move.effpromsq(), move.promsq ? move.prompiece : this.turn ? move.prompiece.tocolor(WHITE) : move.prompiece);
      }   

      if(move.promsq){
          if(fromp.kind == "s"){
              if(move.prompiece.kind != "p"){
                  this.disablefen = this.movetoalgeb(Move(move.promsq, move.tosq));
              }                
          }
      }else {
          if(this.IS_EIGHTPIECE()){
              this.disablefen = "-";
          }            
      }

      if(move.epclsq){            
          this.setpieaceatsquare(move.epclsq, Piece());
      }

      if(move.castling){
          this.setpieaceatsquare(move.delrooksq, Piece());
          this.setpieaceatsquare(move.putrooksq, move.putrookpiece);
      }

      // set castling rights

      if(move.castling) { this.deletecastlingrights("kq", this.turn); }

      if(this.IS_SCHESS()){
          if(fromp.kind == "k"){            
              for(var i = 0, list = ["k", "q"]; i < list.length; i += 1){
                  var side = list[i];

                  if(this.cancastle(side, this.turn)){
                      var letter = side;
                      var newLetter = this.squaretoalgeb(this.rookorigsq(side, this.turn))[0];
                      if(this.turn == WHITE){
                          letter = letter.toUpperCase();
                          newLetter = newLetter.toUpperCase();
                      }
                      this.castlefen = this.castlefen.replace(letter, newLetter);
                  }
              }
          }
      }

      for(var i$1 = 0, list$1 = ["k", "q"]; i$1 < list$1.length; i$1 += 1){
          var side$1 = list$1[i$1];

          var rosq = this.rookorigsq(side$1, this.turn);
          var rop = this.pieceatsquare(rosq);
          if(!rop.equalto(this.rookorigpiece(side$1, this.turn))) { this.deletecastlingrights(side$1, this.turn); }
      }

      if(fromp.kind == "k"){            
          this.deletecastlingrights("kq", this.turn);
      }

      // calculate new state

      this.turn = !this.turn;        
      this.epsq = null;
      if(move.epsq) { this.epsq = move.epsq; }

      this.turnfen = this.turn ? "w" : "b";
      if(this.turn){
          this.fullmovenumber++;
          this.fullmovefen = "" + (this.fullmovenumber);
      }
      var capture = false;
      if(!top.isempty()) { capture = true; }
      if(move.epclsq) { capture = true; }
      var pawnmove = fromp.kind == "p";
      if(capture || pawnmove){
          this.halfmoveclock = 0;
      }else {
          this.halfmoveclock++;
      }

      // atomic explosions
      if(this.IS_ATOMIC()){
          if(capture){                
              this.setpieaceatsquare(move.tosq, Piece());
              for(var i$2 = 0, list$2 = this.adjacentsquares(move.tosq); i$2 < list$2.length; i$2 += 1){                                        
                  var sq = list$2[i$2];

                  var ispawn = this.pieceatsquare(sq).kind == "p";                    
                  if(!ispawn){                                 
                      this.setpieaceatsquare(sq, Piece());
                  }
              }
          }
      }

      // place castling
      if(move.castling && this.IS_SCHESS()){            
          if(move.placeCastlingPiece){
              this.setpieaceatsquare(move.placeCastlingSquare, move.placeCastlingPiece);

              this.removePlacePieceFromStore(move.placeCastlingPiece);
          }
      }

      this.halfmovefen = "" + (this.halfmoveclock);
      this.epfen = this.epsq ? this.squaretoalgeb(this.epsq) : "-";

      var rawfenbuff = "";
      var cumul = 0;

      for(var i$3 = 0, list$3 = ALL_SQUARES; i$3 < list$3.length; i$3 += 1){
          var sq$1 = list$3[i$3];

          var p = this.pieceatsquare(sq$1);
          if(p.isempty()){
              cumul++;
          }else {
              if(cumul > 0){
                  rawfenbuff += "" + cumul;
                  cumul = 0;
              }
              rawfenbuff += p.toString();
          }
          if( (cumul > 0) && ( sq$1.file == LAST_SQUARE ) ){
              rawfenbuff += "" + cumul;
              cumul = 0;
          }
          if( (sq$1.file == LAST_SQUARE) && (sq$1.rank < LAST_SQUARE) ){
              rawfenbuff += "/";
          }
      }

      this.rawfen = rawfenbuff;

      var psb = this.IS_SCHESS() ? ("[" + (this.piecestorefen) + "]") : "";

      this.fen = this.rawfen + psb + " " + this.turnfen + " " + this.castlefen + " " + this.epfen + " " + this.halfmovefen + " " + this.fullmovefen;

      if(this.disablefen) { this.fen += " " + this.disablefen; }
  };

  ChessBoard_.prototype.reportRawFen = function reportRawFen (){
      var rawfenbuff = "";
      var cumul = 0;

      for(var i = 0, list = ALL_SQUARES; i < list.length; i += 1){
          var sq = list[i];

          var p = this.pieceatsquare(sq);
          if(p.isempty()){
              cumul++;
          }else {
              if(cumul > 0){
                  rawfenbuff += "" + cumul;
                  cumul = 0;
              }
              rawfenbuff += p.toString();
          }
          if( (cumul > 0) && ( sq.file == LAST_SQUARE ) ){
              rawfenbuff += "" + cumul;
              cumul = 0;
          }
          if( (sq.file == LAST_SQUARE) && (sq.rank < LAST_SQUARE) ){
              rawfenbuff += "/";
          }
      }

      return rawfenbuff
  };

  ChessBoard_.prototype.squareok = function squareok (sq){
      return ( sq.file >= 0 ) && ( sq.rank >= 0 ) && ( sq.file < NUM_SQUARES ) && ( sq.rank < NUM_SQUARES)
  };

  ChessBoard_.prototype.assertMaxPlmsGenDepth = function assertMaxPlmsGenDepth (depth){        
      if(depth <= MAX_PLMS_GEN_DEPTH) { return true }
      console.log(("max plms gen depth " + MAX_PLMS_GEN_DEPTH + " exceeded at depth " + depth));
      return false
  };

  ChessBoard_.prototype.pseudolegalmovesforpieceatsquare = function pseudolegalmovesforpieceatsquare (p, sq, depthOpt){
        var this$1$1 = this;
                        
      var depth = depthOpt || 0;
      if(!this.assertMaxPlmsGenDepth(depth)) { return [] }

      var origPiece = this.pieceatsquare(sq);

      if(this.IS_EIGHTPIECE()){
          if(p.kind == "s"){
              // remove sentry for move generation                
              this.setpieaceatsquare(sq, Piece());
          }
      }

      var acc = this.pseudolegalmovesforpieceatsquareinner(p, sq, depth);

      var pstore = this.pieceStoreColor(p.color);
        
      if(this.IS_SCHESS()){
          if(sq.rank == baseRank(p.color)){
              if(this.squareStore().find(function (tsq) { return tsq.equalto(sq); })) { var loop = function () {
                  var psp = list[i];

                    acc = acc.concat(this$1$1.pseudolegalmovesforpieceatsquareinner(p, sq, depth).map(function (psm) {                        
                      psm.placePiece = psp;
                      return psm
                  }));
              };

                  for(var i = 0, list = pstore; i < list.length; i += 1)loop(); }
              acc = acc.map(function (psm) {
                  psm.placeMove = true;
                  return psm
              });
          }            
      }

      // restore original piece in any case
      this.setpieaceatsquare(sq, origPiece);

      return acc
  };

  ChessBoard_.prototype.pseudolegalmovesforpieceatsquareinner = function pseudolegalmovesforpieceatsquareinner (p, sq, depthOpt){
      var depth = depthOpt || 0;
      if(!this.assertMaxPlmsGenDepth(depth)) { return [] }

      if(p.kind == "e"){
          var acc = this.pseudolegalmovesforpieceatsquareinnerpartial(Piece("r", p.color), sq, depth);
          acc = acc.concat(this.pseudolegalmovesforpieceatsquareinnerpartial(Piece("n", p.color), sq, depth));
          return acc
      }

      if(p.kind == "h"){
          var acc$1 = this.pseudolegalmovesforpieceatsquareinnerpartial(Piece("b", p.color), sq, depth);
          acc$1 = acc$1.concat(this.pseudolegalmovesforpieceatsquareinnerpartial(Piece("n", p.color), sq, depth));
          return acc$1
      }

      return this.pseudolegalmovesforpieceatsquareinnerpartial(p, sq, depth)
  };

  ChessBoard_.prototype.pushLancerMoves = function pushLancerMoves (plms, color, move){
      for(var i = 0, list = PIECE_DIRECTION_STRINGS; i < list.length; i += 1){
          var ds = list[i];

          plms.push(Move(move.fromsq, move.tosq, Piece("l", color, pieceDirectionStringToSquareDelta(ds))));
      }
  };

  ChessBoard_.prototype.pseudolegalmovesforpieceatsquareinnerpartial = function pseudolegalmovesforpieceatsquareinnerpartial (p, sq, depthOpt){
        var this$1$1 = this;
                        
      var depth = depthOpt || 0;
      if(!this.assertMaxPlmsGenDepth(depth)) { return [] }

      var dirobj = getPieceDirection(p);        
      var plms = [];                

      var sentryCaptureAllowed = true;
      var pushTwoAllowed = true;
      var moveJailedProhibited = true;

      if(this.IS_EIGHTPIECE() && (depth > 0)){
          // impose restrictions on sentry push
          sentryCaptureAllowed = false;            
          pushTwoAllowed = false;
          // allow sentry to push jailed piece
          // TODO: clarify this rule
          moveJailedProhibited = false;
      }

      if((p.kind == "k") && this.isSquareJailedBy(sq, !p.color)){
          // jailed king can pass
          plms.push(Move(sq, sq.clone()));
      }

      if(this.isSquareJailedBy(sq, !p.color) && moveJailedProhibited) { return plms }

      if(dirobj){
          for(var i$2 = 0, list$2 = dirobj[0]; i$2 < list$2.length; i$2 += 1){                
              var dir = list$2[i$2];

              var ok;
              var currentsq = sq;                
              do{                    
                  currentsq = currentsq.adddelta(dir);                    
                  ok = this.squareok(currentsq);                    
                  if(ok){
                      var tp = this.pieceatsquare(currentsq);                                                
                      if(p.kind == "l"){
                          if(tp.isempty()){                            
                              this.pushLancerMoves(plms, p.color, Move(sq, currentsq));
                          }else if(tp.color != p.color){
                              this.pushLancerMoves(plms, p.color, Move(sq, currentsq));
                              ok = false;
                          }else;
                      }else {
                          if(tp.isempty()){                            
                              plms.push(Move(sq, currentsq));
                          }else if(tp.color != p.color){
                              if(p.kind == "s"){
                                  // sentry push                                    
                                  if(sentryCaptureAllowed){
                                      var pushedPiece = this.pieceatsquare(currentsq);
                                      var testPiece = pushedPiece.colorInverse();
                                      var tplms = this.pseudolegalmovesforpieceatsquare(testPiece, currentsq, depth + 1);                                        
                                      var sentryPushSquares = [];
                                      var usedSquares = [];
                                      tplms.forEach(function (tplm) {
                                          // make sure only one move is added per target square
                                          if(!usedSquares.find(function (usq) { return usq.equalto(tplm.tosq); })){                                                
                                              var testMove = Move(sq, currentsq, pushedPiece, null, null, tplm.tosq);
                                              sentryPushSquares.push(tplm.tosq);
                                              plms.push(testMove);              
                                              usedSquares.push(tplm.tosq);                              
                                          }                                            
                                      });
                                      if(pushedPiece.kind == "l"){
                                          // nudge lancer
                                          var emptyAdjacentSquares = this.adjacentsquares(currentsq)
                                              .filter(function (testsq) { return this$1$1.pieceatsquare(testsq).isempty(); });
                                          for(var i$1 = 0, list$1 = emptyAdjacentSquares; i$1 < list$1.length; i$1 += 1){
                                              var eas = list$1[i$1];

                                              var lancerNudgeDirs = [
                                                  SquareDelta(eas.file - currentsq.file, eas.rank - currentsq.rank)
                                              ];
                                              var loop = function () {
                                                  var dir$1 = list[i];

                                                  var nudgeMove = Move(sq, currentsq, Piece("l", pushedPiece.color, dir$1), null, null, eas);
                                                  nudgeMove.nudge = true;                                                    
                                                  if(!sentryPushSquares.find(function (sps) { return sps.equalto(nudgeMove.promsq); })){
                                                      plms.push(nudgeMove);
                                                  }                                                    
                                              };

                                                for(var i = 0, list = lancerNudgeDirs; i < list.length; i += 1)loop();
                                          }
                                      }                                        
                                  }
                              }else {
                                  if(p.kind != "j") { plms.push(Move(sq, currentsq)); }
                              }                                
                              ok = false;
                          }else {
                              ok = false;
                          }
                      }                        
                  }
              }while(ok && dirobj[1])
          }
      }else if(p.kind == "p"){
          var pdirobj = PAWNDIRS(p.color);
          var pushonesq = sq.adddelta(pdirobj.pushone);
          // sentry may push pawn to a square where push one is not possible
          var pushoneempty = this.squareok(pushonesq) ? this.pieceatsquare(pushonesq).isempty() : false;
          if(pushoneempty){
              if(pushonesq.rank == pdirobj.promrank){                                        
                  for(var i$3 = 0, list$3 = this.PROMOTION_PIECES(p.color); i$3 < list$3.length; i$3 += 1){
                      var pp = list$3[i$3];

                      if(pp.kind != "l") { pp.direction = null; }
                      plms.push(Move(sq, pushonesq, pp));    
                  }
              }else {
                  plms.push(Move(sq, pushonesq));
              }                
          }
          if(sq.rank == pdirobj.baserank){
              if(pushoneempty){
                  var pushtwosq = sq.adddelta(pdirobj.pushtwo);
                  if(this.pieceatsquare(pushtwosq).isempty() && pushTwoAllowed){                        
                      // push two
                      var setepsq = null;
                      for(var i$4 = 0, list$4 = pdirobj.captures; i$4 < list$4.length; i$4 += 1){
                          var ocsqdelta = list$4[i$4];

                          var ocsq = pushonesq.adddelta(ocsqdelta);
                          if(this.squareok(ocsq)){
                              if(this.pieceatsquare(ocsq).equalto(Piece('p', !p.color))){                                    
                                  setepsq = pushonesq;
                              }
                          }
                      }
                      plms.push(Move(sq, pushtwosq, null, null, setepsq));
                  }
              }
          }            
          for(var i$6 = 0, list$6 = pdirobj.captures; i$6 < list$6.length; i$6 += 1){
              var captdir = list$6[i$6];

              var captsq = sq.adddelta(captdir);
              if(this.squareok(captsq)){
                  var captp = this.pieceatsquare(captsq);
                  if(!captp.isempty() && captp.color != p.color){
                      if(captsq.rank == pdirobj.promrank){
                          for(var i$5 = 0, list$5 = this.PROMOTION_PIECES(p.color); i$5 < list$5.length; i$5 += 1){
                              var pp$1 = list$5[i$5];

                              if(pp$1.kind != "l") { pp$1.direction = null; }
                              plms.push(Move(sq, captsq, pp$1));    
                          }
                      }else {
                          plms.push(Move(sq, captsq));
                      }                
                  }                    
                  if(captp.isempty() && captsq.equalto(this.epsq)){                        
                      var epmove = Move(sq, captsq, null, captsq.adddelta(SquareDelta(0, -pdirobj.pushone.y)));                        
                      plms.push(epmove);
                  }
              }                
          }
      }

      if(this.IS_EIGHTPIECE()){
          var disabledMove = this.algebtomovesimple(this.disablefen);

          if(disabledMove){
              plms = plms.filter(function (plm) { return !plm.roughlyequalto(disabledMove); });
                
              if( (p.kind == "l") && (sq.equalto(disabledMove.fromsq)) ){
                  // nudged lancer has special moves
                  var ndirs = QUEEN_DIRECTIONS().filter(function (qd) { return !qd.equalto(p.direction); });
                  for(var i$7 = 0, list$7 = ndirs; i$7 < list$7.length; i$7 += 1){
                      var dir$2 = list$7[i$7];

                      var nok = true;
                      var ncurrentsq = sq;
                      while(nok){
                          ncurrentsq = ncurrentsq.adddelta(dir$2);
                          if(this.squareok(ncurrentsq)){
                              var np = this.pieceatsquare(ncurrentsq);
                              if(np.isempty()){
                                  var nmove = Move(sq, ncurrentsq, Piece("l", p.color, dir$2));
                                  nmove.keepDirection = true;
                                  plms.push(nmove);
                              }else {                                    
                                  if(np.color != p.color){
                                      var nmove$1 = Move(sq, ncurrentsq, Piece("l", p.color, dir$2));
                                      nmove$1.keepDirection = true;
                                      plms.push(nmove$1);
                                      nok = false;
                                  }                                    
                              }
                          }else {
                              nok = false;
                          }
                      }
                  }
              }

              // disallow moving back towards sentry
              plms = plms.filter(function (plm) {
                  // knight and king are already taken care of, as they are not sliding pieces
                  if((p.kind != "n") && (p.kind != "k")){                        
                      var normDir = SquareDelta(
                          disabledMove.tosq.file - disabledMove.fromsq.file,
                          disabledMove.tosq.rank - disabledMove.fromsq.rank
                      ).normalized();
                      if(normDir){
                          var testcurrentsq = plm.fromsq.adddelta(normDir);
                          while(this$1$1.squareok(testcurrentsq)){
                              if(plm.tosq.equalto(testcurrentsq)) { return false }
                              testcurrentsq = testcurrentsq.adddelta(normDir);
                          }
                      }
                  }
                  return true
              });
          }
      }

      return plms
  };

  ChessBoard_.prototype.pseudolegalmovesforallpieces = function pseudolegalmovesforallpieces (){
      var plms = [];
      for(var i = 0, list = ALL_SQUARES; i < list.length; i += 1){
          var sq = list[i];

          var p = this.pieceatsquare(sq);
          if(!p.isempty() && (p.color == this.turn)){                
              plms = plms.concat(this.pseudolegalmovesforpieceatsquare(p, sq));
          }
      }
      return plms
  };

  ChessBoard_.prototype.movecheckstatus = function movecheckstatus (move){        
      this.push(move);
      var status = {
          meincheck: this.iskingincheck(!this.turn),
          oppincheck: this.iskingincheck(this.turn)
      };
      this.pop();
      return status
  };

  ChessBoard_.prototype.createCastlingMove = function createCastlingMove (side){
      var move = Move(this.whereisking(this.turn), this.castletargetsq(side, this.turn));
      move.castling = true;        
      move.san = side == "k" ? "O-O" : "O-O-O";
      move.delrooksq = this.rookorigsq(side, this.turn);
      move.putrooksq = this.rooktargetsq(side, this.turn);
      move.putrookpiece = this.rookorigpiece(side, this.turn);
      move.passingSquares = this.squaresbetween(move.fromsq, move.delrooksq, INCLUDE_LIMITS);        
      return move
  };

  ChessBoard_.prototype.legalmovesforallpieces = function legalmovesforallpieces (){
      var lms = [];
      for(var i = 0, list = this.pseudolegalmovesforallpieces(); i < list.length; i += 1){
          var move = list[i];

          var mchst = this.movecheckstatus(move);            
          if(!mchst.meincheck){
              move.oppincheck = mchst.oppincheck;
              lms.push(move);
          }
      }
      for(var i$2 = 0, list$2 = ["k", "q"]; i$2 < list$2.length; i$2 += 1)
      {
          var side = list$2[i$2];

          if(this.cancastle(side, this.turn)){
          var move$1 = this.createCastlingMove(side);
          if(!this.iskingincheckAfterMove(move$1, this.turn)){
              lms.push(move$1);
              var pstore = this.pieceStoreColor(this.turn);
              if(pstore.length){
                  if(this.IS_SCHESS()){
                      for(var i$1 = 0, list$1 = pstore; i$1 < list$1.length; i$1 += 1){
                          var psp = list$1[i$1];

                          var moveK = this.createCastlingMove(side);
                          moveK.placeCastlingPiece = psp;
                          moveK.placeCastlingSquare = move$1.fromsq;
                          moveK.san += "/" + psp.kind.toUpperCase() + this.squaretoalgeb(moveK.placeCastlingSquare);
                          lms.push(moveK);
                          var moveR = this.createCastlingMove(side);
                          moveR.placeCastlingPiece = psp;
                          moveR.placeCastlingSquare = this.rookorigsq(side, this.turn);
                          moveR.san += "/" + psp.kind.toUpperCase() + this.squaretoalgeb(moveR.placeCastlingSquare);
                          lms.push(moveR);
                      }
                  }
              }
          }
      }
        }        
      return lms
  };

  ChessBoard_.prototype.ismovecapture = function ismovecapture (move){
      if(move.epclsq) { return true }
      var top = this.pieceatsquare(move.tosq);
      return(!top.isempty())        
  };

  ChessBoard_.prototype.santomove = function santomove (san){
        var this$1$1 = this;

      if(typeof san == "undefined") { return null }
      if(san === null) { return null }
      var lms = this.legalmovesforallpieces();
      return lms.find(function (move){ return stripsan(this$1$1.movetosan(move)) == stripsan(san); })
  };

  ChessBoard_.prototype.movetosan = function movetosan (move){        
      var check = move.oppincheck ? "+" : "";        
      if(move.oppincheck){            
          this.push(move);
          if(this.legalmovesforallpieces().length == 0) { check = "#"; }
          this.pop();
      }

      if(move.castling) { return move.san + check }

      var fromp = this.pieceatsquare(move.fromsq);        
      var capt = this.ismovecapture(move);
      var fromalgeb = this.squaretoalgeb(move.fromsq);
      var toalgeb = this.squaretoalgeb(move.tosq);
      var prom = "";
      if(move.prompiece){
          prom = "=" + move.prompiece.kind.toUpperCase();

          if(move.prompiece.kind == "l") { prom += move.prompiece.direction.toPieceDirectionString(); }

          if(move.promsq) { prom += "@" + this.squaretoalgeb(move.promsq); }
      }
      /*if(fromp.kind == "l"){
          prom = move.prompiece.direction.toPieceDirectionString()
      }*/
      var place = move.placePiece ? "/" + move.placePiece.kind.toUpperCase() : "";

      if(fromp.kind == "p"){
          return capt ? fromalgeb[0] + "x" + toalgeb + place + prom + check : toalgeb + place + prom + check
      }

      var qualifier = "";                
      var attacks = this.attacksonsquarebypiece(move.tosq, fromp);        
      if(fromp.kind == "l"){
          attacks = [];
          for(var i$1 = 0, list$1 = LANCER_PROMOTION_PIECES(fromp.color); i$1 < list$1.length; i$1 += 1){
              var lancer = list$1[i$1];

              var lancerattacks = this.attacksonsquarebypiece(move.tosq, lancer);                                
              var loop = function () {                    
                  var lancerattack = list[i];

                  if(!attacks.find(function (attack) { return attack.tosq.equalto(lancerattack.tosq); })) { attacks.push(lancerattack); }
              };

                for(var i = 0, list = lancerattacks; i < list.length; i += 1)loop();                
          }
      }
      var files = [];
      var ranks = [];
      var samefiles = false;
      var sameranks = false;        
      for(var i$2 = 0, list$2 = attacks; i$2 < list$2.length; i$2 += 1){                        
          var attack = list$2[i$2];

          if(files.includes(attack.tosq.file)) { samefiles = true; }
          else { files.push(attack.tosq.file); }
          if(ranks.includes(attack.tosq.rank)) { sameranks = true; }
          else { ranks.push(attack.tosq.rank); }            
      }
      if(attacks.length > 1){
          if(sameranks && samefiles) { qualifier = fromalgeb; }
          else if(samefiles) { qualifier = fromalgeb[1]; }
          else { qualifier = fromalgeb[0]; }
      }        
      var letter = fromp.kind.toUpperCase();        
      return capt ? letter + qualifier + "x" + toalgeb + prom + check : letter + qualifier + toalgeb + place + prom + check
  };

  ChessBoard_.prototype.squarefromalgeb = function squarefromalgeb (algeb){        
      var file = algeb.charCodeAt(0) - "a".charCodeAt(0);
      var rank = NUM_SQUARES - 1 - ( algeb.charCodeAt(1) - "1".charCodeAt(0) );
      return Square(file, rank)
  };

  ChessBoard_.prototype.movefromalgeb = function movefromalgeb (algeb){
      var move = new Move(this.squarefromalgeb(algeb.slice(0,2)), this.squarefromalgeb(algeb.slice(2,4)));

      if(algeb.includes("@")){            
          if(this.IS_SCHESS()){                
              var sq = this.squarefromalgeb(algeb.slice(2,4));
              var p = new Piece(algeb.slice(0,1).toLowerCase(), this.turnfen == "w");
              return new Move(sq, sq, p)    
          }            

          if(this.IS_EIGHTPIECE()){
              var sq$1 = this.squarefromalgeb(algeb.match(/@(.*)/)[1]);
              move.promsq = sq$1;
          }
      }        
      return move
  };

Object.defineProperties( ChessBoard_.prototype, prototypeAccessors );
function ChessBoard(props){return new ChessBoard_(props)}

function parseDrawing(comment){
    if(comment.match(/:/)) { return null }

    var drawing = {
        kind: "circle",
        color: "green",
        thickness: 5,
        opacity: 9,
        squares: []
    };   

    var sqstr = null; 

    if(comment.includes("@")){
        var parts = comment.split("@");
        comment = parts[0];
        sqstr = parts[1];
    }

    var ok;

    do{
        ok = false;

        var m$1 = comment.match(/^([lwxz])(.*)/);    

        if(m$1){
            drawing.kind = {l: "circle", w: "arrow", x: "square", z: "image"}[m$1[1]];
            comment = m$1[2];
            ok = true;
        }

        m$1 = comment.match(/^([rnuy])(.*)/);
        if(m$1){
            drawing.color = {r: "red", n: "green", u: "blue", y: "yellow"}[m$1[1]];
            comment = m$1[2];
            ok = true;
        }
        m$1 = comment.match(/^t([0-9])(.*)/);
        if(m$1){
            drawing.thickness = parseInt(m$1[1]);
            comment = m$1[2];
            ok = true;
        }
        m$1 = comment.match(/^o([0-9])(.*)/);
        if(m$1){
            drawing.opacity = parseInt(m$1[1]);
            comment = m$1[2];
            ok = true;
        }
    }while(ok)

    ok = true;

    if(sqstr) { comment = sqstr; }

    if(drawing.kind == "image"){
        m = comment.match(/^([^\s#]*)(.*)/);
        drawing.name = m[1];
        return drawing
    }

    do{        
        m = comment.match(/^([a-z][0-9])(.*)/);
        if(m){            
            drawing.squares.push(m[1]);
            comment = m[2];
        }else {
            ok = false;
        }
    }while(ok)

    return drawing
}

function parseDrawings(comment){
    var drawings = [];

    var ok = true;

    do{
        var m = comment.match(/([^#]*)#([^#\s]*)(.*)/);
        if(m){
            comment = m[1] + m[3];
            var pd = parseDrawing(m[2]);
            if(pd) { drawings.push(pd); }
        }else {
            ok = false;
        }
    }while(ok)

    return drawings
}

function parseProps(comment){
    var props = {};

    var ok = true;

    do{
        var m = comment.match(/([^#]*)#([^#:]+):([^#\s]*)(.*)/);
        if(m){
            comment = m[1] + m[4];
            props[m[2]] = m[3];
        }else {
            ok = false;
        }
    }while(ok)

    return props
}

var EXCLUDE_THIS = true;

var GLICKO_INITIAL_RATING         = 1500;
var GLICKO_INITIAL_RD             = 250;

var Glicko_ = function Glicko_(props){
      this.fromBlob(props);
  };

  Glicko_.prototype.fromBlob = function fromBlob (propsOpt){
      var props = propsOpt || {};
      this.rating = props.rating || GLICKO_INITIAL_RATING;
      this.rd = props.rd || GLICKO_INITIAL_RD;
      return this
  };

  Glicko_.prototype.serialize = function serialize (){
      return {
          rating: this.rating,
          rd: this.rd
      }
  };
function Glicko(props){return new Glicko_(props)}

var ANONYMOUS_USERNAME        = "@nonymous";
var SHOW_RATING               = true;

var Player_ = function Player_(props){
      this.fromBlob(props);
  };

  Player_.prototype.equalTo = function equalTo (player){
      return ( this.id == player.id ) && ( this.provider == player.provider )
  };

  Player_.prototype.displayName = function displayName (){
      return this.username || ANONYMOUS_USERNAME
  };

  Player_.prototype.qualifiedDisplayName = function qualifiedDisplayName (showRating){
      var qdn = this.displayName();
      if(this.provider) { qdn += " ( " + (this.provider) + " )"; }
      if(showRating) { qdn += " " + (this.glicko.rating); }
      return qdn
  };

  Player_.prototype.fromBlob = function fromBlob (propsOpt){
      var props = propsOpt || {};
      this.id = props.id;
      this.username = props.username;
      this.provider = props.provider;
      this.glicko = Glicko(props.glicko);
      this.seated = !!props.seated;
      this.seatedAt = props.seatedAt || null;
      this.index = props.index || 0;
      this.thinkingTime = props.thinkingTime || 0;
      this.startedThinkingAt = props.startedThinkingAt || null;
      this.offerDraw = props.offerDraw;
      return this
  };

  Player_.prototype.setIndex = function setIndex (index){
      this.index = index;
      return this
  };

  Player_.prototype.serialize = function serialize (){
      return {
          id: this.id,
          username: this.username,
          provider: this.provider,
          glicko: this.glicko.serialize(),
          seated: this.seated,
          seatedAt: this.seatedAt,
          index: this.index,
          thinkingTime: this.thinkingTime,
          startedThinkingAt: this.startedThinkingAt,
          offerDraw: this.offerDraw,
      }
  };
function Player(props){return new Player_(props)}

var ChatMessage_ = function ChatMessage_(props){
      this.fromBlob(props);
  };

  ChatMessage_.prototype.fromBlob = function fromBlob (propsOpt){
      var props = propsOpt || {};
      this.author = Player(props.author);
      this.msg = props.msg || "Chat message.";
      this.createdAt = new Date().getTime();
      return this
  };

  ChatMessage_.prototype.serialize = function serialize (){
      return {
          author: this.author.serialize(),
          msg: this.msg
      }
  };

  ChatMessage_.prototype.asText = function asText (){
      return ((this.author.qualifiedDisplayName()) + " : " + (this.msg))
  };
function ChatMessage(props){return new ChatMessage_(props)}

var Chat_ = function Chat_(props){
      this.fromBlob(props);
  };

  Chat_.prototype.postMessage = function postMessage (chatMessage){
      this.messages.unshift(chatMessage);

      if(chatMessage.msg == "delall"){
          this.messages = [];
      }

      while(this.messages.length > this.capacity) { this.messages.pop(); }
  };

  Chat_.prototype.fromBlob = function fromBlob (propsOpt){
      var props = propsOpt || {};
      this.capacity = props.capacity || 100;
      this.messages = (props.messages || []).map(function (blob) { return ChatMessage(blob); });
      return this
  };

  Chat_.prototype.serialize = function serialize (){
      return {
          capacity: this.capacity,
          messages: this.messages.map(function (message) { return message.serialize(); })
      }
  };

  Chat_.prototype.asText = function asText (){
      return this.messages.map(function (message) { return message.asText(); }).join("\n")
  };
function Chat(props){return new Chat_(props)}

var MAX_NUM_PLAYERS       = 2;

var Players_ = function Players_(props){
      this.fromBlob(props);
  };

  Players_.prototype.forEach = function forEach (func){
      this.players.forEach(func);
  };

  Players_.prototype.hasPlayer = function hasPlayer (player){
      return this.players.find(function (pl) { return pl.equalTo(player); })
  };

  Players_.prototype.hasSeatedPlayer = function hasSeatedPlayer (player){
      var find = this.hasPlayer(player);
      if(!find) { return false }
      return find.seated
  };

  Players_.prototype.fromBlob = function fromBlob (propsOpt){
      var props = propsOpt || {};
      this.players = [];
      var repo = props.players || [];
      for(var i=0; i < MAX_NUM_PLAYERS; i++){
          var blob = repo.length ? repo.shift() : null;
          var player = Player(blob).setIndex(i);
          this.players.push(player);
      }
      return this
  };

  Players_.prototype.getByIndex = function getByIndex (index){
      return this.players[index]
  };

  Players_.prototype.setPlayer = function setPlayer (player){        
      this.players[player.index] = player;
  };

  Players_.prototype.getByColor = function getByColor (color){
      if(color) { return this.getByIndex(1) }
      return this.getByIndex(0)
  };

  Players_.prototype.serialize = function serialize (){
      return {
          players: this.players.map(function (player) { return player.serialize(); })
      }
  };
function Players(props){return new Players_(props)}

var DEFAULT_INITIAL_CLOCK = 3;
var DEFAULT_INCREMENT     = 2;

var Timecontrol_ = function Timecontrol_(props){
      this.fromBlob(props);
  };

  Timecontrol_.prototype.fromBlob = function fromBlob (propsOpt){
      var props = propsOpt || {};
      this.initial = props.initial || DEFAULT_INITIAL_CLOCK;
      this.increment = props.increment || DEFAULT_INCREMENT;
      return this
  };

  Timecontrol_.prototype.serialize = function serialize (){
      return {
          initial: this.initial,
          increment: this.increment
      }
  };

  Timecontrol_.prototype.toString = function toString (){
      return ((this.initial) + " + " + (this.increment))
  };
function Timecontrol(props){return new Timecontrol_(props)}

var GameNode_ = function GameNode_(){        
  };

var prototypeAccessors$1 = { strippedfen: { configurable: true },analysiskey: { configurable: true },depth: { configurable: true } };

  GameNode_.prototype.getMove = function getMove (){                
      if(!this.parentid) { return null }
      var board = ChessBoard().setfromfen(this.getparent().fen, this.parentgame.variant);
      var move = board.santomove(this.gensan);        
      return move
  };

  prototypeAccessors$1.strippedfen.get = function (){
      return strippedfen(this.fen)
  };

  prototypeAccessors$1.analysiskey.get = function (){
      return ("analysis/" + (this.parentgame.variant) + "/" + (this.strippedfen))
  };

  GameNode_.prototype.hasSan = function hasSan (san){
        var this$1$1 = this;

      return this.childids.find(function (childid) { return this$1$1.parentgame.gamenodes[childid].gensan == san; })
  };

  prototypeAccessors$1.depth.get = function (){
      var depth = 0;
      var current = this;
      while(current.parentid){            
          current = current.getparent();
          depth++;
      }
      return depth
  };

  GameNode_.prototype.stripCommentOfImages = function stripCommentOfImages (){
      this.comment = this.comment.replace(/#z[^#\s]*/g, "");
  };

  GameNode_.prototype.stripCommentOfDelays = function stripCommentOfDelays (){
      this.comment = this.comment.replace(/#delay:[^#\s]*/g, "");
  };

  GameNode_.prototype.addImageToComment = function addImageToComment (name, setdelay){
      if(setdelay) { this.stripCommentOfDelays(); }
      this.stripCommentOfImages();
      this.comment += "#z@" + name;
      this.comment += "#delay:" + setdelay;
  };

  GameNode_.prototype.fromblob = function fromblob (parentgame, blob){
      this.parentgame = parentgame;
      this.id = blob.id;
      this.genalgeb = blob.genalgeb;
      this.gensan = blob.gensan;
      this.fen = blob.fen;
      this.childids = blob.childids || [];
      this.parentid = blob.parentid || null;
      this.weights = ( blob.weights || [0, 0] ).map(function (w) { return parseInt(w); });
      this.error = blob.error;
      this.priority = 0;
      this.comment = blob.comment || "";
      this.hasEval = blob.hasEval || false;
      this.eval = blob.eval || null;
      return this
  };

  GameNode_.prototype.props = function props (){
      return parseProps(this.comment)
  };

  GameNode_.prototype.drawings = function drawings (){
      return parseDrawings(this.comment)
  };

  GameNode_.prototype.fullmovenumber = function fullmovenumber (){
      var parent = this.getparent();
      if(!parent) { return null }
      return parseInt(parent.fen.split(" ")[5])
  };

  GameNode_.prototype.regid = function regid (){
      return this.id.replace(/\+/g, "\\+")
  };

  GameNode_.prototype.subnodes = function subnodes (){
      var subnodes = [];
      for(var id in this.parentgame.gamenodes){
          if( id.match(new RegExp(("^" + (this.regid()) + "_"))) ){
              subnodes.push(this.parentgame.gamenodes[id]);
          }
      }
      return subnodes
  };
    
  GameNode_.prototype.turn = function turn (){
      return this.fen.match(/ w/)
  };

  GameNode_.prototype.getparent = function getparent (){
      if(this.parentid) { return this.parentgame.gamenodes[this.parentid] }
      return null
  };

  GameNode_.prototype.siblings = function siblings (excludethis){
        var this$1$1 = this;

      if(!this.parentid) { return [] }
      var childs = this.getparent().sortedchilds();
      if(excludethis) { childs = childs.filter(function (child){ return child.id != this$1$1.id; }); }
      return childs
  };

  GameNode_.prototype.geterror = function geterror (){
      return this.error ? this.error : 0
  };

  GameNode_.prototype.moderror = function moderror (dir){
      this.error = this.geterror() + dir;
      if(this.error < 0) { this.error = 0; }
  };

  GameNode_.prototype.moderrorrec = function moderrorrec (dir){        
      var node = this;
      while(node){            
          node.moderror(dir);            
          node = node.getparent();
          if(node) { node = node.getparent(); }
      }
  };

  GameNode_.prototype.opptrainweight = function opptrainweight (){
      return this.weights[0] + this.weights[1]
  };

  GameNode_.prototype.metrainweight = function metrainweight (){
      return this.weights[0]
  };

  GameNode_.prototype.sortweight = function sortweight (){
      return this.priority * 100 + this.weights[0] * 10 + this.weights[1]
  };

  GameNode_.prototype.sortchildids = function sortchildids (ida, idb){
      var a = this.parentgame.gamenodes[ida];
      var b = this.parentgame.gamenodes[idb];
      return b.sortweight() - a.sortweight()
  };

  GameNode_.prototype.sortedchilds = function sortedchilds (){
        var this$1$1 = this;

      return this.childids.sort(this.sortchildids.bind(this)).map(function (childid){ return this$1$1.parentgame.gamenodes[childid]; })
  };

  GameNode_.prototype.sortedchildsopp = function sortedchildsopp (){
      return this.sortedchilds().filter(function (child){ return child.opptrainweight() > 0; })
  };

  GameNode_.prototype.sortedchildsme = function sortedchildsme (){
      return this.sortedchilds().filter(function (child){ return child.metrainweight() > 0; })
  };

  GameNode_.prototype.revsortedchilds = function revsortedchilds (){
      return this.sortedchilds().reverse()
  };

  GameNode_.prototype.serialize = function serialize (){
      return {
          id: this.id,
          genalgeb: this.genalgeb,
          gensan: this.gensan,
          fen: this.fen,
          childids: this.childids,
          parentid: this.parentid,
          weights: this.weights,
          error: this.error,
          comment: this.comment,
          hasEval: this.hasEval,
          eval: this.eval
      }
  };

  GameNode_.prototype.clone = function clone (){
      return GameNode().fromblob(this.parentgame, this.serialize())
  };

Object.defineProperties( GameNode_.prototype, prototypeAccessors$1 );
function GameNode(){return new GameNode_()}
var UNSEAT_PLAYER_DELAY   = 5 * 60 * 1000;

var DURATION_VERBAL       = true;

function formatDuration(ms, verbal){
    var sec = 1000;
    var min = 60 * sec;
    var hour = 60 * min;
    var buff = "";
    var h = Math.floor(ms / hour);
    if(ms > hour){        
        ms = ms - h * hour;
        buff += h + " hour";
        if(h > 1) { buff += "s"; }
        buff += " , ";
    }
    var m = Math.floor(ms / min);
    if(ms > min){        
        ms = ms - m * min;
        buff += m + " minute";
        if(m > 1) { buff += "s"; }
        buff += " , ";
    }
    var s = Math.floor(ms / sec);
    buff += s + " second";
    if(s > 1) { buff += "s"; }
    if(verbal) { return buff }
    var hp = ("" + h).padStart(2, "0");
    var mp = ("" + m).padStart(2, "0");
    var sp = ("" + s).padStart(2, "0");
    return (hp + ":" + mp + ":" + sp)
}

var OrderedHash_ = function OrderedHash_(blob){
      this.fromBlob(blob);
  };

  OrderedHash_.prototype.fromBlob = function fromBlob (blobOpt){        
      this.blob = blobOpt || [];
      return this
  };

  OrderedHash_.prototype.getKey = function getKey (key){
      return this.blob.find(function (entry) { return entry[0] == key; })
  };

  OrderedHash_.prototype.get = function get (key){
      var entry = this.getKey(key);
      if(entry) { return entry[1] }
      return null
  };

  OrderedHash_.prototype.setKey = function setKey (key, value){
      var entry = this.getKey(key);

      if(entry){
          entry[1] = value;
          return
      }

      this.blob.push([key, value]);
  };
function OrderedHash(blobOpt){return new OrderedHash_(blobOpt)}

function displayNameForVariantKey(variantKey){
    return variantKey.substring(0,1).toUpperCase() + variantKey.substring(1)
}

function pgnVariantToVariantKey(pgnVariant){    
    return pgnVariant.substring(0,1).toLowerCase() + pgnVariant.substring(1)
}

function parsePgnPartsFromLines(lines){
    var parseHead = true;
    var parseBody = false;
    var headers = [];
    var bodyLines = [];

    // remove leading empty lines
    while(lines.length && (!lines[0])) { lines.shift(); }
    
    do{
        var line = lines.shift();
        var m = (void 0);
        if(parseHead){
            if(!line){
                parseHead = false;
            }else if(m = line.match(/^\[([^ ]+) \"([^\"]+)/)){                
                headers.push([m[1], m[2]]);
            }else {
                parseHead = false;
                lines.unshift(line);
            }
        }else {
            if(parseBody){
                if(!line){
                    return [lines, headers, bodyLines.join("\n")]
                }else {
                    bodyLines.push(line);
                }
            }else if(line){
                parseBody = true;
                bodyLines.push(line);
            }
        }
    }while(lines.length)
    
    return [lines, headers, bodyLines.join("\n")]
}

var UPDATE_THINKING_TIME      = true;
var FOLD_REPETITION           = 3;

var Game_ = function Game_(props){       
      this.fromblob(props);
  };

var prototypeAccessors$2 = { allNodes: { configurable: true },forAllNodes: { configurable: true } };

  Game_.prototype.getRandomMove = function getRandomMove (){
      var lms = this.board.legalmovesforallpieces();

      if(lms.length){
          var index = Math.floor(Math.random() * lms.length);

          var move = lms[index];

          return move
      }

      return null
  };

  Game_.prototype.getForwardMove = function getForwardMove (){
      var scs = this.getcurrentnode().sortedchilds();        
      if(!scs.length) { return null }
      return scs[0].getMove()
  };

  Game_.prototype.offerDraw = function offerDraw (player){
      var find = this.players.hasPlayer(player);
      if(!find){
          return "Only playing sides can offer draw."
      }
      find.offerDraw = true;
      if(this.drawAccepted()){
          this.terminate(
              0.5,
              "draw agreed"
          );
      }
      return true
  };

  Game_.prototype.revokeDraw = function revokeDraw (player){
      var find = this.players.hasPlayer(player);
      if(!find){
          return "Only playing sides can revoke draw."
      }
      find.offerDraw = false;
      return true
  };

  Game_.prototype.drawOffered = function drawOffered (){
      var result = false;
      this.players.forEach(function (pl) {
          if(pl.offerDraw) { result = true; }
      });
      return result
  };

  Game_.prototype.drawAccepted = function drawAccepted (){
      var result = true;
      this.players.forEach(function (pl) {
          if(!pl.offerDraw) { result = false; }
      });
      return result
  };

  Game_.prototype.turnPlayer = function turnPlayer (){
      return this.players.getByColor(this.board.turn)
  };

  Game_.prototype.oppTurnPlayer = function oppTurnPlayer (){
      return this.players.getByColor(!this.board.turn)
  };

  Game_.prototype.canMakeMove = function canMakeMove (player){        
      return this.turnPlayer().equalTo(player)
  };

  Game_.prototype.turnMoveTime = function turnMoveTime (){
      return new Date().getTime() - this.turnPlayer().startedThinkingAt
  };

  Game_.prototype.turnTimeLeft = function turnTimeLeft (){
      return Math.max(this.turnPlayer().thinkingTime - this.turnMoveTime(), 0)
  };

  Game_.prototype.checkTurnTimedOut = function checkTurnTimedOut (updateThinkingTime){
      if(!this.inProgress) { return false }
      var tl = this.turnTimeLeft();        
      if(updateThinkingTime) { this.turnPlayer().thinkingTime = tl; }
      if(tl <= 0){            
          this.terminate(
              (this.board.turn == WHITE) ? 0 : 1,
              "flagged"
          );
          return true
      }
      return false
  };

  Game_.prototype.isRepetition = function isRepetition (times){
      var mults = {};

      for(var id in this.gamenodes){
          var node = this.gamenodes[id];
          var sfen = strippedfen(node.fen);
          if(mults[sfen]) { mults[sfen]++; }
          else { mults[sfen] = 1; }
          if(mults[sfen] >= times) { return true }
      }

      return false
  };

  Game_.prototype.makeSanMoveResult = function makeSanMoveResult (san){
      if(this.checkTurnTimedOut(UPDATE_THINKING_TIME)){
          return true
      }else if(this.makeSanMove(san)){
          var status = this.board.status();
          if(status.terminated){
              this.terminate(
                  status.result,
                  status.resultReason
              );
              return true
          }
          if(this.isRepetition(FOLD_REPETITION)){
              this.terminate(
                  0.5,
                  "threefold repetition"
              );
              return true
          }
          this.oppTurnPlayer().thinkingTime += this.timecontrol.increment * 1000;
          this.startThinking();
          return true
      }
      return "Illegal move."
  };

  Game_.prototype.makeSanMove = function makeSanMove (sanOpt){        
      var m = sanOpt.match(/[0-9\.]*(.*)/);

      var san = m[1];

      if(!san) { return false }

      var move = this.board.santomove(san);

      if(move){
          this.makemove(move);
          return true
      }

      return false
  };

  Game_.prototype.mergeGameRecursive = function mergeGameRecursive (node){
      for(var i = 0, list = node.sortedchilds(); i < list.length; i += 1){
          var child = list[i];

          if(this.makeSanMove(child.gensan)){
              if(child.comment) { this.getcurrentnode().comment = child.comment; }
              this.mergeGameRecursive(child);
              this.back();
          }
      }
  };

  Game_.prototype.mergeGame = function mergeGame (game){
      var gameRootFen = game.getrootnode().fen;
      var rootFen = this.getcurrentnode().fen;

      if(gameRootFen != rootFen){
          return "Merge game failed. Game root fen does not match current fen."
      }

      this.mergeGameRecursive(game.getrootnode());

      return "Game merged ok."
  };

  Game_.prototype.buildFromPGN = function buildFromPGN (headers, body, variantOpt){
      var variant = variantOpt || DEFAULT_VARIANT;

      var board = ChessBoard().setfromfen(null, variant);
      var fen = board.fen;

      this.pgnHeaders = OrderedHash(headers);
      this.pgnBody = body;

      var setVariant = this.pgnHeaders.get("Variant");
      var setFen = this.pgnHeaders.get("FEN");

      if(setVariant) { variant = pgnVariantToVariantKey(setVariant); }
      if(setFen) { fen = setFen; }

      this.setfromfen(fen, variant);

      var acc = "";
      var commentLevel = 0;

      var nodeStack = [];

      for(var i = 0, list = (this.pgnBody + " ").split(""); i < list.length; i += 1){            
          var c = list[i];

          if(c == "("){
              if(commentLevel){
                  acc += c;
              }else {
                  if(acc){
                      this.makeSanMove(acc);
                      acc = "";                  
                  }                    
                  nodeStack.push(this.getcurrentnode().clone());                                                       
                  this.back();
              }                
          }else if(c == ")"){
              if(commentLevel){
                  acc += c;
              }else {  
                  if(acc){
                      this.makeSanMove(acc);
                      acc = "";                  
                  }                    
                  this.setfromnode(nodeStack.pop());                    
              }                   
          }else if(c == "{"){                
              if(commentLevel){
                  acc += "{";
              }else {
                  if(acc){
                      this.makeSanMove(acc);
                      acc = "";                  
                  }                    
              }
              commentLevel++;                
          }else if(c == "}"){
              if(commentLevel){                    
                  commentLevel--;
                  if(commentLevel){
                      acc += "}";
                  }else {
                      if(acc){
                          this.getcurrentnode().comment = acc;
                          acc = "";
                      }
                  }
              }                
          }else {
              if(c == " "){
                  if(commentLevel){
                      acc += " ";
                  }else if(acc){
                      this.makeSanMove(acc);
                      acc = "";
                  }
              }else {
                  acc += c;
              }
          }
      }

      return this
  };

  Game_.prototype.parsePGN = function parsePGN (pgn, variantOpt){
      var parseResult = parsePgnPartsFromLines(pgn.split("\n"));

      this.buildFromPGN(parseResult[1], parseResult[2], variantOpt);

      return [ parseResult[0], this ]
  };

  Game_.prototype.setHeaders = function setHeaders (blob){
      this.pgnHeaders.fromBlob(blob);
      this.setDefaultPgnHeaders();
  };

  Game_.prototype.nodesForFen = function nodesForFen (fen){
      return Object.entries(this.gamenodes)
          .filter(function (gne) { return gne[1].parentid; })
          .filter(function (gne) { return strippedfen(gne[1].getparent().fen) == strippedfen(fen); })
          .map(function (gne) { return gne[1]; })
  };

  Game_.prototype.bookForFen = function bookForFen (fen){        
      var book = {};
      this.nodesForFen(fen).forEach(function (node) {
          if(!book[node.genalgeb]) { book[node.genalgeb] = [0,0]; }
          book[node.genalgeb][0] += node.weights[0];
          book[node.genalgeb][1] += node.weights[1];
      });
      return book
  };

  Game_.prototype.weightedAlgebForFen = function weightedAlgebForFen (fen, indices){
      var buff = [];
      var book = this.bookForFen(fen);        
      var loop = function ( algeb ) {
          var mult = indices.reduce(function (acc, curr) { return acc + book[algeb][curr]; }, 0);
          buff = buff.concat(Array(mult).fill(algeb));
      };

        for(var algeb in book)loop( algeb );                
      if(!buff.length) { return null }
      return buff[Math.floor(Math.random() * buff.length)]
  };

  prototypeAccessors$2.allNodes.get = function (){
      return Object.entries(this.gamenodes).map(function (entry) { return entry[1]; })
  };

  prototypeAccessors$2.forAllNodes.get = function (){
      return this.allNodes.forEach
  };

  Game_.prototype.removePriority = function removePriority (){
      this.forAllNodes(function (node) { return node.priority = 0; });
  };

  Game_.prototype.fen = function fen (){
      return this.getcurrentnode().fen
  };

  Game_.prototype.merge = function merge (g){
      this.removePriority();
      g.tobegin();
      this.tobegin();
      if(g.fen() != this.fen()) { return "Merge failed, starting positions don't match." }
      var i = 0;
      while(g.forward()){
          var san = g.getcurrentnode().gensan;
          var move = this.board.santomove(san);
          if(!move) { return ("Merge detected invalid san ( move: " + i + ", san: " + san + " ).") }
          this.makemove(move);
          var currentnode = this.getcurrentnode();
          for(var i$1 = 0, list = currentnode.siblings(EXCLUDE_THIS); i$1 < list.length; i$1 += 1) {
              var sibling = list[i$1];

              sibling.priority = 0;
            }
          currentnode.priority = 1;
          i++;
      }
      return ("Merged all " + i + " move(s) ok.")
  };

  Game_.prototype.fromsans = function fromsans (sans){
      this.setfromfen(getvariantstartfen(this.variant));
      for(var i = 0, list = sans; i < list.length; i += 1){
          var san = list[i];

          var move = this.board.santomove(san);
          if(move){
              this.makemove(move);
          }else {
              return this
          }
      }
      return this
  };

  Game_.prototype.setfromfen = function setfromfen (fenopt, variantopt){        
      this.variant = variantopt || this.variant; 
      this.board.setfromfen(fenopt, this.variant);
      this.gamenodes = {
          root: GameNode().fromblob(this, {
              parentgame: this,
              id: "root",
              genalgeb: null,
              gensan: null,
              fen: this.board.fen                
          })
      };
      this.currentnodeid = "root";
      this.pgnHeaders.blob = [];
      this.setDefaultPgnHeaders();
      return this
  };

  Game_.prototype.reset = function reset (variant){
      this.setfromfen(null, variant);
  };

  Game_.prototype.setfromnode = function setfromnode (node){
      this.currentnodeid = node.id;
      this.board.setfromfen(this.getcurrentnode().fen, this.variant);
  };

  Game_.prototype.makemove = function makemove (move){
      var algeb = this.board.movetoalgeb(move);
      var san = this.board.movetosan(move);

      this.board.push(move);

      this.makemovenode(GameNode().fromblob(this, {                        
          genalgeb: algeb,
          gensan: san,
          fen: this.board.fen
      }));
  };

  Game_.prototype.setTimecontrol = function setTimecontrol (player, blob){
      if(this.players.hasSeatedPlayer(player)){
          this.variant = blob.variant;
          this.timecontrol = Timecontrol(blob.timecontrol);
          return true
      }else {
          return "Only seated players can set time control."
      }
  };

  Game_.prototype.hasAllPlayers = function hasAllPlayers (){
      return this.players.getByColor(WHITE).seated && this.players.getByColor(BLACK).seated
  };

  Game_.prototype.terminate = function terminate (result, reason){
      this.inProgress = false;
      this.terminated = true;
      this.terminatedAt = new Date().getTime();
      this.result = result;
      this.resultReason = reason;
      this.players.forEach(function (pl) {
          pl.seated = false;
          pl.seatedAt = null;
      });

      if(this.terminationCallback){
          this.terminationCallback();
      }
  };

  Game_.prototype.resignPlayer = function resignPlayer (player){
      if(!this.inProgress) { return "You can only resign an ongoing game." }
      if(this.players.hasPlayer(player)){            
          if(player.index == 0) { this.terminate(
              1,
              "black resigned"
          ); }
          else { this.terminate(
              0,
              "white resigned"
          ); }
          return true
      }else {
          return "You can only resign your own game."
      }
  };

  Game_.prototype.sitPlayer = function sitPlayer (player, UNSEAT){
      var pl = this.players.getByIndex(player.index);
      if(pl.seated && (pl.id != player.id)){
          var elapsed = new Date().getTime() - pl.seatedAt;
          if(elapsed < UNSEAT_PLAYER_DELAY) { return ("Player can be unseated after " + (formatDuration(UNSEAT_PLAYER_DELAY - elapsed, DURATION_VERBAL)) + ".") }
      }
      if(UNSEAT){
          player = Player().setIndex(player.index);
      }else {            
          if(this.players.hasSeatedPlayer(player)) { return "Already seated." }
          player.seated = true;
          player.seatedAt = new Date().getTime();
      }        
      this.players.setPlayer(player);
      if(this.hasAllPlayers()){
          this.startGame();
      }else {
          if(this.terminated){
              this.playerSeatedAfterTermination = true;      }
          }            
      return true
  };

  Game_.prototype.startThinking = function startThinking (){
      this.turnPlayer().startedThinkingAt = new Date().getTime();
  };

  Game_.prototype.startGame = function startGame (){
        var this$1$1 = this;

      this.inProgress = true;
      this.terminated = false;
      this.result = null;
      this.resultReason = "in progress";
      this.setfromfen(null, this.variant);
      this.players.forEach(function (pl) {
          pl.thinkingTime = this$1$1.timecontrol.initial * 60 * 1000;
          pl.offerDraw = false;
      });
      this.startedAt = new Date().getTime();
      this.playerSeatedAfterTermination = false;
      this.chat.messages = [];
      this.startThinking();
      if(this.startCallback) { this.startCallback(); }
  };

  // gbl
  Game_.prototype.fromblob = function fromblob (blobOpt){
      var blob = blobOpt || {};

      this.board = ChessBoard();
      this.variant = blob.variant || DEFAULT_VARIANT;                
      this.pgnHeaders = OrderedHash(blob.pgnHeaders);
      this.pgnBody = blob.pgnBody || "*";        

      this.setfromfen(null, null);                
      var gamenodesserialized = blob.gamenodes || {};        
      for(var id in gamenodesserialized){
          this.gamenodes[id] = GameNode().fromblob(this, gamenodesserialized[id]);
      }
      this.currentnodeid = blob.currentnodeid || "root";
      this.board.setfromfen(this.getcurrentnode().fen, this.variant);

      this.setDefaultPgnHeaders();

      this.flip = !!blob.flip;        
      this.animations = blob.animations || [];
      this.selectedAnimation = blob.selectedAnimation;
      this.animationDescriptors = blob.animationDescriptors || {};                
      this.timecontrol = Timecontrol(blob.timecontrol);
      this.players = Players(blob.players);
      this.inProgress = !!blob.inProgress;
      this.terminated = !!blob.terminated;
      this.result = blob.result;
      this.resultReason = blob.resultReason || "in progress";
      this.startedAt = blob.startedAt || null;
      this.terminatedAt = blob.terminatedAt || null;
      this.chat = Chat(blob.chat);
      this.playerSeatedAfterTermination = blob.playerSeatedAfterTermination;
      return this
  };

  Game_.prototype.playersVerbal = function playersVerbal (){
      return ((this.players.getByColor(WHITE).qualifiedDisplayName(SHOW_RATING)) + " - " + (this.players.getByColor(BLACK).qualifiedDisplayName(SHOW_RATING)))
  };

  Game_.prototype.resultVerbal = function resultVerbal (){
      if(this.result == 1) { return "1 - 0" }
      if(this.result == 0) { return "0 - 1" }
      return "1/2 - 1/2"
  };

  Game_.prototype.setDefaultPgnHeaders = function setDefaultPgnHeaders (){
      this.pgnHeaders.setKey("Variant", displayNameForVariantKey(this.variant));
      this.pgnHeaders.setKey("FEN", this.getrootnode().fen);
  };

  Game_.prototype.subtree = function subtree (node, nodes, line){
      var clone = node.clone();
      if(!nodes){
          nodes = {};
          clone.id = "root";
          clone.genalgeb = null;
          clone.gensan = null;
          clone.parentid = null;
          line = ["root"];
      }else {
          clone.id = line.join("_");
          clone.parentid = line.slice(0, line.length -1).join("_");
      }
      nodes[clone.id] = clone;
      var newchildids = [];
      for(var i = 0, list = node.sortedchilds(); i < list.length; i += 1){
          var child = list[i];

          var childline = line.concat(child.gensan);
          this.subtree(child, nodes, childline);
          var childid = childline.join("_");
          newchildids.push(childid);            
      }
      clone.childids = newchildids;
      return nodes
  };

  Game_.prototype.subtreeSize = function subtreeSize (nodeOpt){
      var node = nodeOpt || this.getcurrentnode();
      return Object.entries(this.subtree(node)).length
  };

  Game_.prototype.reduce = function reduce (nodeOpt){
      var node = nodeOpt || this.getcurrentnode();
      return Game().fromblob(Object.assign({}, this.serialize(), {gamenodes: this.subtree(node),
          currentnodeid: "root"}))
  };

  Game_.prototype.reduceLine = function reduceLine (nodeOpt){
        var this$1$1 = this;

      var current = nodeOpt || this.getcurrentnode();

      while(current.parentid){
          var child = current;
          current = current.getparent();
          if(current.childids.length > 1){
              current.sortedchilds().slice(1).forEach(function (child) {
                  for(var id in this$1$1.gamenodes){
                      if( id.match(new RegExp(("^" + (child.regid())))) ){
                          delete this$1$1.gamenodes[id];
                      }
                  }            
              });
          }
          current.childids = [child.id];
      }
  };

  Game_.prototype.pgninfo = function pgninfo (fromroot){
      var rootnode = this.getrootnode();
      var pgnMoves = [];
      var oldcurrentnodeid = this.currentnodeid;
      if(fromroot){            
          this.currentnodeid = "root";
          while(this.forward()){
              pgnMoves.push(this.getcurrentnode().gensan);
          }            
      }else {
          var currentnode = this.getcurrentnode();
          while(this.back()){
              pgnMoves.unshift(currentnode.gensan);
              currentnode = this.getcurrentnode();
          }
      }
      this.currentnodeid = oldcurrentnodeid;
      return {
          variant: this.variant,
          initialFen: rootnode.fen,
          pgnMoves: pgnMoves,
          white: "?",
          black: "?",
          date: "?"
      }
  };

  Game_.prototype.movewithnumber = function movewithnumber (node, force, docomments, reportAsUCI, ignoreNumber){
      var fenparts = node.fen.split(" ");
      var number = fenparts[5] + ".";
      if(fenparts[1] == "w") { number = "" + ( parseInt(fenparts[5]) - 1 ) + ".."; }
      if(ignoreNumber) { number = ""; }
      var comments = "";
      if(docomments) { if(node.comment) { comments = " { " + (node.comment) + " }"; } }
      if(typeof docomments == "object"){            
          comments = "";
          var analysisinfo = docomments[node.analysiskey];
          if(analysisinfo){
              var rai = new RichAnalysisInfo(analysisinfo);
              if(rai.hasScorenumerical){
                  var scorenumerical = -rai.scorenumerical;
                  comments = " { " + ((scorenumerical > 0 ? "+":"") + scorenumerical) + " }";
              }                
          }
          if(node.hasEval){
              var scorenumerical$1 = -node.eval;
              comments = " { " + ((scorenumerical$1 > 0 ? "+":"") + scorenumerical$1) + " }";
          }
      }
      return ("" + (((fenparts[1] == "b")||force)?(number ? number + " " : ""):"") + (reportAsUCI ? node.genalgeb : node.gensan) + comments)
  };

  Game_.prototype.line = function line (docomments, nodeOpt, reportAsUCI, ignoreNumber){
        var this$1$1 = this;

      var current = nodeOpt || this.getcurrentnode();
      var nodes = [];
      while(current){
          nodes.unshift(current);
          current = current.getparent();
      }
      nodes.shift();
      var first = true;        
      return nodes.map(function (node){            
          var mn = this$1$1.movewithnumber(node, first, docomments, reportAsUCI, ignoreNumber);
          first = false;            
          return mn
      }).join(" ")
  };

  Game_.prototype.multiPGN = function multiPGN (params){        
      var childs = params.rootNode.sortedchilds();

      if(!childs.length){            
          return params.buff
      }

      var mainChild = childs[0];

      if(!params.variationStart) { params.buff += " "; }
      params.buff += this.movewithnumber(mainChild, params.variationStart, params.docomments, params.reportAsUCI);

      if(childs.length > 1){            
          for(var i = 0, list = childs.slice(1); i < list.length; i += 1){
              var child = list[i];

              params.buff += " ( ";                            
              params.buff += this.movewithnumber(child, true, params.docomments, params.reportAsUCI);
              params.buff = this.multiPGN({
                  docomments: params.docomments,
                  rootNode: child,
                  variationStart: false,
                  buff: params.buff
              });
              params.buff += " )";            
          }            
      }

      return this.multiPGN({
          docomments: params.docomments,
          rootNode: mainChild,
          variationStart: false,
          buff: params.buff,
          reportAsUCI: params.reportAsUCI
      })
  };

  Game_.prototype.reportPgnHeaders = function reportPgnHeaders (rootNode){
      this.pgnHeaders.setKey("FEN", rootNode ? rootNode.fen : this.getrootnode().fen);
      var buff = this.pgnHeaders.blob.map(function (entry) { return ("[" + (entry[0]) + " \"" + (entry[1]) + "\"]"); }).join("\n");
      this.pgnHeaders.setKey("FEN", this.getrootnode().fen);
      return buff
  };

  Game_.prototype.pgn = function pgn (docomments, rootNodeOpt, domulti, keepBaseLine, reportAsUCI){
      var rootNode = rootNodeOpt || this.getrootnode();

      return ((this.reportPgnHeaders(keepBaseLine ? this.getrootnode() : rootNode)) + "\n\n" + (domulti ? this.multiPGN({
          docomments: docomments,
          rootNode: rootNode,
          variationStart: (!keepBaseLine) || (rootNode.id == "root"),
          buff: keepBaseLine ? this.line(!DO_COMMENTS, rootNode, reportAsUCI) : "",
          reportAsUCI: reportAsUCI
      }) : this.line(docomments, null, reportAsUCI)))
  };

  Game_.prototype.getcurrentnode = function getcurrentnode (){
      return this.gamenodes[this.currentnodeid]
  };

  Game_.prototype.getrootnode = function getrootnode (){
      return this.gamenodes["root"]
  };

  Game_.prototype.tnodecmp = function tnodecmp (a, b){
      return b.subnodes().length - a.subnodes().length
  };

  Game_.prototype.transpositions = function transpositions (nodeOpt){        
      var node = nodeOpt || this.getcurrentnode();
      var tnodesentries = Object.entries(this.gamenodes).filter(function (entry){ return entry[1].fen == node.fen; });        
      var tnodes = tnodesentries.map(function (entry){ return entry[1]; });
      tnodes.sort(this.tnodecmp);        
      return tnodes
  };

  Game_.prototype.makemovenode = function makemovenode (gamenode){                
      var currentnode = this.getcurrentnode();
      gamenode.id = this.currentnodeid + "_" + gamenode.gensan;
      if(!currentnode.childids.includes(gamenode.id)){
          currentnode.childids.push(gamenode.id);
          gamenode.parentid = this.currentnodeid;
          this.gamenodes[gamenode.id] = gamenode;
      }
      this.currentnodeid = gamenode.id;
      this.transpositions(this.getcurrentnode())[0].id;
      // switch to best transposition
      //this.currentnodeid = besttranspositionid
      this.board.setfromfen(this.getcurrentnode().fen, this.variant);
  };

  Game_.prototype.back = function back (){
      var currentnode = this.getcurrentnode();
      if(currentnode.parentid){
          this.currentnodeid = currentnode.parentid;
          this.board.setfromfen(this.getcurrentnode().fen, this.variant);
          return true
      }
      return false
  };

  Game_.prototype.del = function del (){        
      var oldcurrentnode = this.getcurrentnode();
      var parentid = oldcurrentnode.parentid;
      if(parentid){                        
          for(var id in this.gamenodes){
              if( id.match(new RegExp(("^" + (oldcurrentnode.regid())))) ){
                  delete this.gamenodes[id];
              }
          }            
          this.currentnodeid = parentid;
          var currentnode = this.getcurrentnode();
          currentnode.childids = currentnode.childids.filter(function (childid){ return childid != oldcurrentnode.id; });
          this.board.setfromfen(this.fen(), this.variant);
          return true
      }
      return false
  };

  Game_.prototype.tobegin = function tobegin (){
      if(!this.back()) { return false }
      while(this.back()){ }        
      return true
  };

  Game_.prototype.toend = function toend (){
      if(!this.forward()) { return false }
      while(this.forward()){ }        
      return true
  };

  Game_.prototype.forward = function forward (){
      var currentnode = this.getcurrentnode();
      if(currentnode.childids.length > 0){
          this.currentnodeid = currentnode.sortedchilds()[0].id;
          this.board.setfromfen(this.getcurrentnode().fen, this.variant);
          return true
      }
      return false
  };

  // gsr
  Game_.prototype.serialize = function serialize (){
      var gamenodesserialized = {};
      for(var id in this.gamenodes){
          gamenodesserialized[id] = this.gamenodes[id].serialize();
      }
      return {
          variant: this.variant,            
          flip: this.flip,
          gamenodes: gamenodesserialized,
          currentnodeid: this.currentnodeid,
          animations: this.animations,
          selectedAnimation: this.selectedAnimation,
          animationDescriptors: this.animationDescriptors,
          pgnHeaders: this.pgnHeaders.blob,
          pgnBody: this.pgnBody,
          timecontrol: this.timecontrol.serialize(),
          players: this.players.serialize(),
          inProgress: this.inProgress,
          terminated: this.terminated,
          result: this.result,
          resultReason: this.resultReason,
          startedAt: this.startedAt,
          terminatedAt: this.terminatedAt,
          chat: this.chat.serialize(),
          playerSeatedAfterTermination: this.playerSeatedAfterTermination,
      }
  };

  Game_.prototype.clone = function clone (){
      return Game().fromblob(this.serialize())
  };

Object.defineProperties( Game_.prototype, prototypeAccessors$2 );
function Game(props){return new Game_(props)}

///////////////////////////////////////////////////////////////////////////////////////////
/*function createExports(){
    module.exports.ChessBoard = ChessBoard
}

if(typeof module != "undefined") if(typeof module.exports != "undefined") createExports()*/
///////////////////////////////////////////////////////////////////////////////////////////

var ENGINE_READY = 0;
var ENGINE_RUNNING = 1;
var ENGINE_STOPPING = 2;

var MATE_SCORE = 10000;

var AbstractEngine = function AbstractEngine(sendanalysisinfo, path){      
    this.sendanalysisinfo = sendanalysisinfo;

    this.path = path;

    this.spawn();

    setInterval(this.checkcommand.bind(this), 200);
};

AbstractEngine.prototype.setcommand = function setcommand (command, payload){
  this.command = command;
  this.payload = payload;
};

AbstractEngine.prototype.play = function play (initialFen, moves, variant, timecontrol, moveOverHead){
      var this$1$1 = this;

    return P(function (resolve) {
        this$1$1.resolvePlay = resolve;
        this$1$1.go({
            fen: initialFen,
            moves: moves,
            variant: variant,
            timecontrol: timecontrol,
            moveOverHead: moveOverHead
        });
    })
};

AbstractEngine.prototype.processstdoutline = function processstdoutline (line){
    var this$1$1 = this;
    
  if(line.match(/^info string/)) { return }

  var bm = line.match(/^bestmove ([^\s]+)/);

  if(bm){
    var bestmove = bm[1];

    this.analysisinfo.state = ENGINE_READY;

    this.sendanalysisinfo(JSON.parse(JSON.stringify(this.analysisinfo)));

    if(this.resolvePlay){          
        var scorenumerical = null;
        try{
          scorenumerical = this.analysisinfo.summary[0].scorenumerical;
        }catch(err){}          
        this.resolvePlay({bestmove: bestmove, scorenumerical: scorenumerical});
        this.resolvePlay = null;
    }

    return
  }

  if(line.match(/^info/)){        
    var depth = null;
    var mdepth = line.match(/ depth (.+)/);

    if(mdepth){
      depth = parseInt(mdepth[1]);          
    }                

    var mtime = line.match(/ time (.+)/);

    if(mtime){
      this.analysisinfo.time = parseInt(mtime[1]);          
    }                

    var mnodes = line.match(/ nodes (.+)/);

    if(mnodes){
      this.analysisinfo.nodes = parseInt(mnodes[1]);          
    }                

    var mnps = line.match(/ nps (.+)/);

    if(mnps){
      this.analysisinfo.nps = parseInt(mnps[1]);          
    }                

    var move = null;

    var mp = line.match(/ pv (.+)/);      

    if(mp){        
      var pv = mp[1].split(" ");        
      move = pv[0];                  
      var state = this.analyzedboard.getstate();
      var pvsan = [];
      for(var i$1 = 0, list = pv; i$1 < list.length; i$1 += 1){
        var algeb = list[i$1];

          try{              
          var move$1 = this.analyzedboard.algebtomove(algeb);                        
          pvsan.push(this.analyzedboard.movetosan(move$1));            
          this.analyzedboard.push(move$1);
        }catch(err){
        }                                
      }

      this.pvsans[move] = pvsan;
      this.pvalgebs[move] = pv;
      this.analyzedboard.setstate(state);
    } 

    if(depth){
      if(depth < this.highestdepth) { return }
      this.highestdepth = depth;
    }      

    if(!move) { return }

    var scorecp = null;

    var mscp = line.match(/ score cp (.+)/);

    if(mscp){
      scorecp = parseInt(mscp[1]);
    }

    var scoremate = null;

    var msmate = line.match(/ score mate (.+)/);

    if(msmate){
      scoremate = parseInt(msmate[1]);
    }

    var scorenumerical$1 = scorecp;

    if(scoremate){
      if(scoremate < 0){
        scorenumerical$1 = - MATE_SCORE - scoremate;
      }else {
        scorenumerical$1 = MATE_SCORE - scoremate;
      }
    }        

    this.pvs[move] = {depth: this.highestdepth, scorecp: scorecp, scoremate: scoremate, scorenumerical: scorenumerical$1};        

    var newpvs = {};

    for(var move$2 in this.pvs){
      if(this.pvs[move$2].depth >= (this.highestdepth - 1)){
        newpvs[move$2] = this.pvs[move$2];
      }
    }

    this.pvs = newpvs;        

    this.sortedpvs = Object.keys(this.pvs)
      .sort(function (a, b){ return this$1$1.pvs[b].scorenumerical - this$1$1.pvs[a].scorenumerical; })                                
      .sort(function (a, b){ return this$1$1.pvs[b].depth - this$1$1.pvs[a].depth; });                                
    
  var pvsAtDepth = {};
  this.completeddepth = 0;
  for(var i$2 = 0, list$1 = this.sortedpvs.slice(0, this.multipv); i$2 < list$1.length; i$2 += 1){            
      var move$3 = list$1[i$2];

        var currentdepth = this.pvs[move$3].depth;
      if(typeof pvsAtDepth[currentdepth] != "undefined"){
          pvsAtDepth[currentdepth]++;
      }else {
          pvsAtDepth[currentdepth]=1;
      }
      if(pvsAtDepth[currentdepth] >= this.multipv){
          this.completeddepth = currentdepth;
      }
  }

    if(this.completeddepth > this.lastcompleteddepth){
      this.lastcompleteddepth = this.completeddepth;        
      var summary = [];
      var i = 0;
      for(var i$3 = 0, list$2 = this.sortedpvs.slice(); i$3 < list$2.length; i$3 += 1){
        var uci = list$2[i$3];

          if(i<this.multipv){            
          summary.push({
            multipv: i+1,
            depth: this.lastcompleteddepth,
            uci: uci,
            scorenumerical: this.pvs[uci].scorenumerical,
            pvsans: this.pvsans[uci],
            pvalgebs: this.pvalgebs[uci]
          });                    
        }        
        i++;
      }

      this.analysisinfo.lastcompleteddepth = this.lastcompleteddepth;
      this.analysisinfo.summary = summary;
        
      if(this.analysisinfo.lastcompleteddepth >= ( this.minDepth ? this.minDepth : 0 ) ){            
        this.sendanalysisinfo(this.analysisinfo);
      }        
    }
  }      
};

AbstractEngine.prototype.sendcommandtoengine = function sendcommandtoengine (command){
    // abstract
};

AbstractEngine.prototype.issuecommand = function issuecommand (command){

    this.sendcommandtoengine(command);
};

AbstractEngine.prototype.go = function go (payload){
  this.highestdepth = 0;
  this.completeddepth = 0;
  this.lastcompleteddepth = 0;
  this.pvs = {};
  this.pvsans = {};
  this.pvalgebs = {};
  this.sortedpvs = [];
  this.time = 0;
  this.nodes = 0;
  this.nps = 0;

  this.multipv = payload.multipv || 1;            
  this.threads = payload.threads || 1;            
  this.analyzedfen = payload.fen;     
  this.moves = payload.moves;    
  this.timecontrol = payload.timecontrol;
  this.variant = payload.variant || DEFAULT_VARIANT;        
  this.analysiskey = payload.analysiskey || ("analysis/" + (this.variant) + "/" + (strippedfen(this.analyzedfen)));               
  this.analyzedboard = ChessBoard().setfromfen(this.analyzedfen, this.variant);
  this.moveOverHead = payload.moveOverHead || DEFAULT_MOVE_OVERHEAD;

  /*let lms = this.analyzedboard.legalmovesforallpieces()

  if( lms.length < this.multipv ) this.multipv = lms.length

  if(this.multipv == 0){
      return
  }*/

  this.analysisinfo = {      
    multipv: this.multipv,    
    threads: this.threads,    
    analyzedfen: this.analyzedfen,        
    variant: this.variant,
    analysiskey: this.analysiskey,
    lastcompleteddepth: 0,
    summary: []
  };

  this.issuecommand(("setoption name UCI_Variant value " + (this.variant == "standard" ? "chess" : this.variant)));
  this.issuecommand(("setoption name MultiPV value " + (this.multipv)));        
  this.issuecommand(("setoption name Threads value " + (this.threads)));        
  this.issuecommand(("setoption name Move Overhead value " + (this.moveOverHead)));        
  this.issuecommand(("position fen " + (this.analyzedfen) + (this.moves ? " moves " + this.moves : "")));
    
  var goCommand = "go" + (this.timecontrol ? " wtime " + this.timecontrol.wtime + " winc " + this.timecontrol.winc + " btime " + this.timecontrol.btime + " binc " + this.timecontrol.binc : " infinite");
    
  this.issuecommand(goCommand);

  this.analysisinfo.state = ENGINE_RUNNING;    

  this.sendanalysisinfo(this.analysisinfo);
};

AbstractEngine.prototype.stop = function stop (){
  if(this.analysisinfo.state != ENGINE_RUNNING) { return }

  this.issuecommand("stop");

  this.analysisinfo.state = ENGINE_STOPPING;    

  this.sendanalysisinfo(this.analysisinfo);
};

AbstractEngine.prototype.spawnengineprocess = function spawnengineprocess (){
    // abstract
};

AbstractEngine.prototype.spawn = function spawn (){
    this.summary = [ "engine ready" ];

    this.analysisinfo = {
      state: ENGINE_READY,
      summary: [],        
      lastcompleteddepth: 0,        
      time: 0,
      nodes: 0,
      nps: 0,
      multipv: null,
      analyzedfen: null,        
      variant: null,
      threads: null,
      analysiskey: null,
    };

    this.spawnengineprocess();
};

AbstractEngine.prototype.checkcommand = function checkcommand (){    
  if(this.command){
      if(this.command == "go"){                
          if(this.analysisinfo.state != ENGINE_READY){            
              this.stop();          
          }else {          
              this.go(this.payload);
              this.command = null;
          }
      }
      if(this.command == "stop"){        
          this.stop();          
          this.command = null;
      }      
  }
};

var RichAnalysisInfo = function RichAnalysisInfo(analysisinfo){
      this.analysisinfo = analysisinfo;

      this.board = ChessBoard().setfromfen(analysisinfo.analyzedfen, analysisinfo.variant);

      this.lms = this.board.legalmovesforallpieces();

      for(var i = 0, list = this.analysisinfo.summary; i < list.length; i += 1){
          var item = list[i];

        var move = this.board.movefromalgeb(item.uci);
          item.move = move;
          var detailedmove = this.board.algebtomove(item.uci);
          if(detailedmove){
              item.san = this.board.movetosan(detailedmove);                
              item.detailedmove = detailedmove;                                
          }
      }

      this.analysisinfo.summary = this.analysisinfo.summary.filter(function (item) { return item.pvsans.length > 0; });
  };

var prototypeAccessors$3 = { hasScorenumerical: { configurable: true },scorenumerical: { configurable: true },running: { configurable: true } };

  prototypeAccessors$3.hasScorenumerical.get = function (){
      if(!this.analysisinfo.summary.length) { return false }
      var scorenumerical = this.analysisinfo.summary[0].scorenumerical;        
      return (typeof scorenumerical == "number")
  };

  prototypeAccessors$3.scorenumerical.get = function (){
      return this.hasScorenumerical ? this.analysisinfo.summary[0].scorenumerical : null
  };

  prototypeAccessors$3.running.get = function (){
      return this.analysisinfo.state != ENGINE_READY
  };

  RichAnalysisInfo.prototype.live = function live (live$1){
      this.isLive = live$1;
      if(!this.running) { this.isLive = false; }
      return this
  };

  RichAnalysisInfo.prototype.asText = function asText (){        
      var npsInfo = this.isLive ? (" --> nps " + (this.analysisinfo.nps || "0")) : "";
      return ("--> " + (this.isLive ? "running -->" : "stored  -->") + " depth  " + (this.analysisinfo.lastcompleteddepth.toString().padEnd(3, " ") + npsInfo) + "\n" + (this.analysisinfo.summary.map(function (item) { return item.pvsans[0].padEnd(8, " ") + ((item.scorenumerical < 0 ? "" : "+") + item.scorenumerical.toString()).padEnd(8, " ") + "-> " + item.pvsans.slice(1, Math.min(item.pvsans.length, 6)).join(" "); }).join("\n")))
  };

Object.defineProperties( RichAnalysisInfo.prototype, prototypeAccessors$3 );

/*if(typeof module != "undefined") if(typeof module.exports != "undefined"){
    module.exports = {
        AbstractEngine: AbstractEngine,
        VARIANT_TO_ENGINE: VARIANT_TO_ENGINE,
        ChessBoard: ChessBoard,
        Glicko: Glicko,
        Player: Player,
        Players: Players,
        Game: GameNode,
        Game: Game,    
        ChatMessage: ChatMessage,    
        Chat: Chat,
        MAX_NUM_PLAYERS: MAX_NUM_PLAYERS,
        UNSEAT: UNSEAT,
        Square: Square,
        Piece: Piece
    }
}*/

var STOCKFISH_JS_PATH         = "/stockfish/stockfish.wasm.js";

var LocalEngine = /*@__PURE__*/(function (AbstractEngine) {
  function LocalEngine(sendanalysisinfo){
        AbstractEngine.call(this, sendanalysisinfo);
    }

  if ( AbstractEngine ) LocalEngine.__proto__ = AbstractEngine;
  LocalEngine.prototype = Object.create( AbstractEngine && AbstractEngine.prototype );
  LocalEngine.prototype.constructor = LocalEngine;

    LocalEngine.prototype.spawnengineprocess = function spawnengineprocess (){
        var this$1$1 = this;

        this.stockfish = new Worker(STOCKFISH_JS_PATH);

        this.stockfish.onmessage = function (message) {
            this$1$1.processstdoutline(message.data);
        };
    };

    LocalEngine.prototype.sendcommandtoengine = function sendcommandtoengine (command){
        this.stockfish.postMessage(command);
    };

    LocalEngine.prototype.terminate = function terminate (){
        this.stockfish.terminate();
    };

  return LocalEngine;
}(AbstractEngine));

{ {
    module.exports = {
      LocalEngine: LocalEngine,
      ENGINE_READY: ENGINE_READY,
      ENGINE_STOPPING: ENGINE_STOPPING,
      ENGINE_RUNNING: ENGINE_RUNNING,
    };
} }
});
var stockfish_1 = stockfish.LocalEngine;
var stockfish_2 = stockfish.ENGINE_READY;
var stockfish_3 = stockfish.ENGINE_STOPPING;
var stockfish_4 = stockfish.ENGINE_RUNNING;function simpleFetch(url, params, callback) {
    params.headers = params.headers || {};
    if (params.asForm)
      { params.headers["Content-Type"] = "application/x-www-form-urlencoded"; }
    if (params.asJson) { params.headers.Accept = "application/json"; }
    if (params.asVndLichessV3Json) {
      params.headers.Accept = "application/vnd.lichess.v3+json";
      params.asJson = true;
    }
    if (params.asNdjson) { params.headers.Accept = "application/x-ndjson"; }
    if (params.accessToken)
      { params.headers.Authorization = "Bearer " + params.accessToken; }
    if (params.server)
      { api(
        "request:fetch",
        {
          url: url,
          params: params
        },
        function (result) { return callback(result); }
      ); }
    else
      { fetch(url, params).then(
        function (response) { return response.text().then(
            function (text) {
              if (params.asJson || params.asNdjson) {
                try {
                  var obj;
                  if (params.asNdjson) {
                    obj = text
                      .split("\n")
                      .filter(function (line) { return line.length; })
                      .map(function (line) { return JSON.parse(line); });
                  } else {
                    obj = JSON.parse(text);
                  }
                  try {
                    callback({ ok: true, content: obj });
                  } catch (err) {
                    console.log(err, obj);
                  }
                } catch (err) {
                  console.log("fetch parse json error", err);
                  callback({ ok: false, status: "Error: Could not parse json." });
                }
              } else {
                callback({ ok: true, content: text });
              }
            },
            function (err) {
              console.log("fetch get response text error", err);
              callback({
                ok: false,
                status: "Error: Failed to get response text."
              });
            }
          ); },
        function (err) {
          console.log("fetch error", err);
          callback({ ok: false, status: "Error: Failed to fetch." });
        }
      ); }
  }

  function getLocal(key, deffault){
    var stored = localStorage.getItem(key);
    if(stored === null) { return deffault }
    try{
      var blob = JSON.parse(stored);
      return blob
    }catch(err){
      return deffault
    }
  }

  function setLocal(key, value){
    localStorage.setItem(key, JSON.stringify(value, null, 2));
  }

var BOOK_MOVE_RATINGS = {
  0: {class: "unrated"},
  1: {class: "forcedloss"},
  2: {class: "losing"},
  3: {class: "troll"},
  4: {class: "dubious"},
  5: {class: "experimental"},
  6: {class: "stable"},
  7: {class: "promising"},
  8: {class: "good"},
  9: {class: "winning"},
  10: {class: "forcedwin"},
};

var BookMove = function BookMove(san){
  this.blob = {
    san: san,
    rating: 0
  };
};

var prototypeAccessors = { rating: { configurable: true },class: { configurable: true } };

BookMove.prototype.serialize = function serialize (){
  return this.blob
};

BookMove.prototype.deserialize = function deserialize (blob){
  this.blob = {
    san: blob.san,
    rating: blob.rating || 0
  };

  return this
};

prototypeAccessors.rating.get = function (){
  return this.blob.rating
};

prototypeAccessors.rating.set = function (rating){
  this.blob.rating = rating;
};

prototypeAccessors.class.get = function (){
  return BOOK_MOVE_RATINGS[this.rating].class
};

Object.defineProperties( BookMove.prototype, prototypeAccessors );

var BookPosition = function BookPosition(variant, fen){
  this.blob = {
    variant: variant,
    fen: fen,
    moves: {}
  };

  this.fromStored();
};

var prototypeAccessors$1 = { variant: { configurable: true },fen: { configurable: true },storeKey: { configurable: true },moves: { configurable: true } };

prototypeAccessors$1.variant.get = function (){
  return this.blob.variant
};

prototypeAccessors$1.variant.set = function (variant){
  this.blob.variant = variant;
};

prototypeAccessors$1.fen.get = function (){
  return this.blob.fen
};

prototypeAccessors$1.fen.set = function (fen){
  this.blob.fen = fen;
};

prototypeAccessors$1.storeKey.get = function (){
  return ("bookposition/" + (this.variant) + "/" + (this.fen))
};

BookPosition.prototype.getStoredBlob = function getStoredBlob (){
  return getLocal(this.storeKey, this.blob)
};

BookPosition.prototype.storeBlob = function storeBlob (){
  setLocal(this.storeKey, this.serialize());

  return this
};

BookPosition.prototype.fromStored = function fromStored (){
  var blob = this.getStoredBlob();

  return this.deserialize(blob)
};

prototypeAccessors$1.moves.get = function (){
  return this.blob.moves
};

prototypeAccessors$1.moves.set = function (moves){
  this.blob.moves = moves;
};

BookPosition.prototype.serialize = function serialize (){
  return {
    variant: this.variant,
    fen: this.fen,
    moves: Object.fromEntries(Object.entries(this.moves).map(function (entry) { return [entry[0], entry[1].serialize()]; }))
  }
};

prototypeAccessors$1.moves.get = function (){
  return this.blob.moves
};

BookPosition.prototype.getMove = function getMove (san){
  var move = this.moves[san] || new BookMove(san);
  this.moves[san] = move;
  return move
};

BookPosition.prototype.getRating = function getRating (san){
  return this.getMove(san).rating
};

BookPosition.prototype.setRating = function setRating (san, rating){
  this.getMove(san).rating = rating;
};

BookPosition.prototype.getClass = function getClass (san){
  return this.getMove(san).class
};

BookPosition.prototype.deserialize = function deserialize (blob){
  this.variant = blob.variant;
  this.fen = blob.fen;
  this.moves = Object.fromEntries(Object.entries(blob.moves).map(function (entry) { return [entry[0], new BookMove().deserialize(entry[1])]; }));

  return this
};

Object.defineProperties( BookPosition.prototype, prototypeAccessors$1 );var LICHESS_BOOK_URL = "https://explorer.lichess.ovh/lichess";

var LICHESS_BOOK_MAX_MOVES = 12;
var LICHESS_BOOK_AVG_RATINGS = [1600, 1800, 2000, 2200, 2500];
var LICHESS_BOOK_TIME_CONTROLS = ["bullet", "blitz", "rapid", "classical"];

var STANDARD_START_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

var DEFAULT_VARIANT = "standard";

var bookCache = {};

function requestLichessBook(
  fenOpt,
  variantOpt,
  maxMovesOpt,
  ratingListOpt,
  speedListOpt
) {
  var fen = fenOpt || STANDARD_START_FEN;
  var variant = variantOpt || DEFAULT_VARIANT;
  var maxMoves = maxMovesOpt || LICHESS_BOOK_MAX_MOVES;
  var ratingList = ratingListOpt || LICHESS_BOOK_AVG_RATINGS;
  var speedList = speedListOpt || LICHESS_BOOK_TIME_CONTROLS;

  var key = fen + "|" + variant + "|" + maxMoves + "|" + ratingList + "|" + speedList;

  if (bookCache[key]) {
    //console.log("book position found in cache for key", key);
    return Promise.resolve(bookCache[key]);
  }

  var ratings = ratingList.map(function (opt) { return ("ratings%5B%5D=" + opt); }).join("&");

  var speeds = speedList.map(function (opt) { return ("speeds%5B%5D=" + opt); }).join("&");

  var url =
    LICHESS_BOOK_URL + "?fen=" + fen + "&moves=" + maxMoves + "&variant=" + variant;

  if (ratings) { url += "&" + ratings; }

  if (speeds) { url += "&" + speeds; }

  return new Promise(function (resolve) {
    simpleFetch(
      url,
      {
        asJson: true
      },
      function (result) {
        if (result.ok) {
          result.content.fen = fen;
          bookCache[key] = result.content;
          resolve(result.content);
        }
      }
    );
  });
}

function weightedRandom(book) {
  if (!book) { return null; }

  if (!book.moves.length) { return null; }

  var sum = 0;

  for (var i$1 = 0, list = book.moves; i$1 < list.length; i$1 += 1) {
    var move = list[i$1];

    move.total = move.white + move.draws + move.black;
    sum += move.total;
  }

  var rnd = Math.floor(Math.random() * sum);

  var ctotal = book.moves[0].total;

  var i = 0;

  while (ctotal < rnd) {
    ctotal += book.moves[i++].total;
  }

  var selectedMove = book.moves[i];

  return selectedMove;
}

function makeVariant(display, chessops, explorer) {
  return {
    display: display,
    chessops: chessops,
    explorer: explorer
  };
}

var LICHESS_VARIANTS = [
  makeVariant("Standard", "chess", "standard"),
  makeVariant("Antichess", "antichess", "antichess"),
  makeVariant("Atomic", "atomic", "atomic"),
  makeVariant("Crazyhouse", "crazyhouse", "crazyhouse"),
  makeVariant("Horde", "horde", "horde"),
  makeVariant("King of the Hill", "kingofthehill", "kingOfTheHill"),
  makeVariant("Racing Kings", "racingkings", "racingKings")
];

function chessopsToExplorer(variant) {
  var search = LICHESS_VARIANTS.find(function (test) { return test.chessops === variant; });
  return search ? search.explorer : "standard";
}

function explorerToChessops(variant) {
  var search = LICHESS_VARIANTS.find(function (test) { return test.explorer === variant; });
  return search ? search.chessops : "chess";
}//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//

var script$1 = {
  name: 'VueCustomTooltip',
  props: {
    label: String,
    active: {
      type: Boolean,
      default: true,
    },
    sticky: Boolean, // Always showing
    multiline: Boolean, // Multiple lines
    underlined: Boolean,
    abbreviation: Boolean,
    position: {
      type: String,
      default: 'is-top',
      validator: function validator(value) {
        return ['is-top', 'is-bottom', 'is-left', 'is-right'].indexOf(value) > -1
      },
    },
    size: {
      type: String,
      default: 'is-medium',
      validator: function validator(value) {
        return ['is-small', 'is-medium', 'is-large'].indexOf(value) > -1
      },
    },
  },
  data: function data() {
    return {
      labelText: this.label || null,
      isActive: this.active || true,
      isSticky: this.sticky || false,
      isMultiline: this.multiline || false,
      isUnderlined: this.underlined || false,
      isAbbreviation: this.abbreviation || false,
      hasPosition: this.position || 'is-top',
      hasSize: this.size || 'is-medium',
    }
  },
  computed: {
    dynamicStyles: function dynamicStyles() {
      return {
        '--vue-custom-tooltip-color':
          this.$vueCustomTooltip && this.$vueCustomTooltip.hasOwnProperty('color')
            ? this.$vueCustomTooltip.color
            : null,
        '--vue-custom-tooltip-background':
          this.$vueCustomTooltip && this.$vueCustomTooltip.hasOwnProperty('background')
            ? this.$vueCustomTooltip.background
            : null,
        '--vue-custom-tooltip-border-radius':
          this.$vueCustomTooltip && this.$vueCustomTooltip.hasOwnProperty('borderRadius')
            ? this.$vueCustomTooltip.borderRadius
            : null,
        '--vue-custom-tooltip-font-weight':
          this.$vueCustomTooltip && this.$vueCustomTooltip.hasOwnProperty('fontWeight')
            ? this.$vueCustomTooltip.fontWeight
            : null,
      }
    },
  },
  watch: {
    label: {
      handler: function handler(value) {
        this.labelText = value;
      },
      immediate: true,
    },
    active: {
      handler: function handler(value) {
        this.isActive = value;
      },
      immediate: true,
    },
    sticky: {
      handler: function handler(value) {
        this.isSticky = value;
      },
      immediate: true,
    },
    multiline: {
      handler: function handler(value) {
        this.isMultiline = value;
      },
      immediate: true,
    },
    underlined: {
      handler: function handler(value) {
        this.isUnderlined = value;
      },
      immediate: true,
    },
    abbreviation: {
      handler: function handler(value) {
        this.isAbbreviation = value;
      },
      immediate: true,
    },
    position: {
      handler: function handler(value) {
        this.hasPosition = value;
      },
      immediate: true,
    },
    size: {
      handler: function handler(value) {
        this.hasSize = value;
      },
      immediate: true,
    },
  },
};

function normalizeComponent$1(template, style, script, scopeId, isFunctionalTemplate, moduleIdentifier /* server only */, shadowMode, createInjector, createInjectorSSR, createInjectorShadow) {
    if (typeof shadowMode !== 'boolean') {
        createInjectorSSR = createInjector;
        createInjector = shadowMode;
        shadowMode = false;
    }
    // Vue.extend constructor export interop.
    var options = typeof script === 'function' ? script.options : script;
    // render functions
    if (template && template.render) {
        options.render = template.render;
        options.staticRenderFns = template.staticRenderFns;
        options._compiled = true;
        // functional template
        if (isFunctionalTemplate) {
            options.functional = true;
        }
    }
    // scopedId
    if (scopeId) {
        options._scopeId = scopeId;
    }
    var hook;
    if (moduleIdentifier) {
        // server build
        hook = function (context) {
            // 2.3 injection
            context =
                context || // cached call
                    (this.$vnode && this.$vnode.ssrContext) || // stateful
                    (this.parent && this.parent.$vnode && this.parent.$vnode.ssrContext); // functional
            // 2.2 with runInNewContext: true
            if (!context && typeof __VUE_SSR_CONTEXT__ !== 'undefined') {
                context = __VUE_SSR_CONTEXT__;
            }
            // inject component styles
            if (style) {
                style.call(this, createInjectorSSR(context));
            }
            // register component module identifier for async chunk inference
            if (context && context._registeredComponents) {
                context._registeredComponents.add(moduleIdentifier);
            }
        };
        // used by ssr in case component is cached and beforeCreate
        // never gets called
        options._ssrRegister = hook;
    }
    else if (style) {
        hook = shadowMode
            ? function (context) {
                style.call(this, createInjectorShadow(context, this.$root.$options.shadowRoot));
            }
            : function (context) {
                style.call(this, createInjector(context));
            };
    }
    if (hook) {
        if (options.functional) {
            // register for functional component in vue file
            var originalRender = options.render;
            options.render = function renderWithStyleInjection(h, context) {
                hook.call(context);
                return originalRender(h, context);
            };
        }
        else {
            // inject component registration as beforeCreate hook
            var existing = options.beforeCreate;
            options.beforeCreate = existing ? [].concat(existing, hook) : [hook];
        }
    }
    return script;
}

var isOldIE = typeof navigator !== 'undefined' &&
    /msie [6-9]\\b/.test(navigator.userAgent.toLowerCase());
function createInjector(context) {
    return function (id, style) { return addStyle(id, style); };
}
var HEAD;
var styles = {};
function addStyle(id, css) {
    var group = isOldIE ? css.media || 'default' : id;
    var style = styles[group] || (styles[group] = { ids: new Set(), styles: [] });
    if (!style.ids.has(id)) {
        style.ids.add(id);
        var code = css.source;
        if (css.map) {
            // https://developer.chrome.com/devtools/docs/javascript-debugging
            // this makes source maps inside style tags work properly in Chrome
            code += '\n/*# sourceURL=' + css.map.sources[0] + ' */';
            // http://stackoverflow.com/a/26603875
            code +=
                '\n/*# sourceMappingURL=data:application/json;base64,' +
                    btoa(unescape(encodeURIComponent(JSON.stringify(css.map)))) +
                    ' */';
        }
        if (!style.element) {
            style.element = document.createElement('style');
            style.element.type = 'text/css';
            if (css.media)
                { style.element.setAttribute('media', css.media); }
            if (HEAD === undefined) {
                HEAD = document.head || document.getElementsByTagName('head')[0];
            }
            HEAD.appendChild(style.element);
        }
        if ('styleSheet' in style.element) {
            style.styles.push(code);
            style.element.styleSheet.cssText = style.styles
                .filter(Boolean)
                .join('\n');
        }
        else {
            var index = style.ids.size - 1;
            var textNode = document.createTextNode(code);
            var nodes = style.element.childNodes;
            if (nodes[index])
                { style.element.removeChild(nodes[index]); }
            if (nodes.length)
                { style.element.insertBefore(textNode, nodes[index]); }
            else
                { style.element.appendChild(textNode); }
        }
    }
}

/* script */
var __vue_script__$1 = script$1;

/* template */
var __vue_render__$1 = function () {var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;return _c(_vm.isAbbreviation ? 'abbr' : 'span',{tag:"component",class:[
    _vm.hasPosition,
    _vm.hasSize,
    {
      'vue-custom-tooltip': _vm.isActive && _vm.labelText,
      'is-sticky': _vm.isSticky,
      'has-multiline': _vm.isMultiline,
      'is-underlined': _vm.isUnderlined || _vm.isAbbreviation,
    } ],style:([_vm.dynamicStyles, { cursor: _vm.isAbbreviation ? 'help' : 'pointer' }]),attrs:{"data-label":_vm.labelText,"aria-label":_vm.labelText,"role":"tooltip"}},[_vm._t("default")],2)};
var __vue_staticRenderFns__$1 = [];

  /* style */
  var __vue_inject_styles__$1 = function (inject) {
    if (!inject) { return }
    inject("data-v-60bf38c6_0", { source: ".vue-custom-tooltip{--vue-custom-tooltip-color:#fff;--vue-custom-tooltip-background:#000;--vue-custom-tooltip-border-radius:100px;--vue-custom-tooltip-font-weight:400}", map: undefined, media: undefined })
,inject("data-v-60bf38c6_1", { source: ".vue-custom-tooltip{position:relative;display:inline-block;text-decoration-line:none!important}.vue-custom-tooltip.is-top:after,.vue-custom-tooltip.is-top:before{top:auto;right:auto;bottom:calc(100% + 5px + 2px);left:50%;transform:translateX(-50%)}.vue-custom-tooltip.is-top:before{border-top:5px solid #000;border-top:5px solid var(--vue-custom-tooltip-background);border-right:5px solid transparent;border-left:5px solid transparent;bottom:calc(100% + 2px)}.vue-custom-tooltip.is-top.has-multiline.is-small:after{width:140px}.vue-custom-tooltip.is-top.has-multiline.is-medium:after{width:250px;padding:.6rem 1.25rem .65rem}.vue-custom-tooltip.is-top.has-multiline.is-large:after{width:480px;padding:0.6rem 1rem 0.65rem}.vue-custom-tooltip.is-right:after,.vue-custom-tooltip.is-right:before{top:50%;right:auto;bottom:auto;left:calc(100% + 5px + 2px);transform:translateY(-50%)}.vue-custom-tooltip.is-right:before{border-top:5px solid transparent;border-right:5px solid #000;border-right:5px solid var(--vue-custom-tooltip-background);border-bottom:5px solid transparent;left:calc(100% + 2px)}.vue-custom-tooltip.is-right.has-multiline.is-small:after{width:140px}.vue-custom-tooltip.is-right.has-multiline.is-medium:after{width:250px;padding:.6rem 1.25rem .65rem}.vue-custom-tooltip.is-right.has-multiline.is-large:after{width:480px;padding:0.6rem 1rem 0.65rem}.vue-custom-tooltip.is-bottom:after,.vue-custom-tooltip.is-bottom:before{top:calc(100% + 5px + 2px);right:auto;bottom:auto;left:50%;transform:translateX(-50%)}.vue-custom-tooltip.is-bottom:before{border-right:5px solid transparent;border-bottom:5px solid #000;border-bottom:5px solid var(--vue-custom-tooltip-background);border-left:5px solid transparent;top:calc(100% + 2px)}.vue-custom-tooltip.is-bottom.has-multiline.is-small:after{width:140px}.vue-custom-tooltip.is-bottom.has-multiline.is-medium:after{width:250px;padding:.6rem 1.25rem .65rem}.vue-custom-tooltip.is-bottom.has-multiline.is-large:after{width:480px;padding:0.6rem 1rem 0.65rem}.vue-custom-tooltip.is-left:after,.vue-custom-tooltip.is-left:before{top:50%;right:calc(100% + 5px + 2px);bottom:auto;left:auto;transform:translateY(-50%)}.vue-custom-tooltip.is-left:before{border-top:5px solid transparent;border-bottom:5px solid transparent;border-left:5px solid #000;border-left:5px solid var(--vue-custom-tooltip-background);right:calc(100% + 2px)}.vue-custom-tooltip.is-left.has-multiline.is-small:after{width:140px}.vue-custom-tooltip.is-left.has-multiline.is-medium:after{width:250px;padding:.6rem 1.25rem .65rem}.vue-custom-tooltip.is-left.has-multiline.is-large:after{width:480px;padding:0.6rem 1rem 0.65rem}.vue-custom-tooltip.is-underlined{border-bottom:1px dotted #000;border-bottom:1px dotted var(--vue-custom-tooltip-background);line-height:1.2}.vue-custom-tooltip:after,.vue-custom-tooltip:before{position:absolute;content:'';opacity:0;visibility:hidden;pointer-events:none;transition:opacity 86ms ease-out,visibility 86ms ease-out}.vue-custom-tooltip:before{z-index:889}.vue-custom-tooltip:after{content:attr(data-label);color:#fff;color:var(--vue-custom-tooltip-color);background:#000;background:var(--vue-custom-tooltip-background);width:auto;max-width:100vw;padding:.35rem .75rem .45rem;border-radius:100px;border-radius:var(--vue-custom-tooltip-border-radius);font-size:.85rem!important;font-weight:400;font-weight:var(--vue-custom-tooltip-font-weight);line-height:1.3;letter-spacing:normal!important;text-transform:none;box-shadow:0 1px 2px 1px rgba(0,1,0,.2);z-index:888;white-space:nowrap}.vue-custom-tooltip:not([data-label='']):hover:after,.vue-custom-tooltip:not([data-label='']):hover:before{opacity:1;visibility:visible}:disabled .vue-custom-tooltip{pointer-events:none}.vue-custom-tooltip:not([data-label='']).is-sticky:after,.vue-custom-tooltip:not([data-label='']).is-sticky:before{opacity:1;visibility:visible}.vue-custom-tooltip.has-multiline:after{display:block;padding:.5rem .75rem .65rem;text-align:center;line-height:1.4;white-space:pre-wrap}", map: undefined, media: undefined });

  };
  /* scoped */
  var __vue_scope_id__$1 = undefined;
  /* module identifier */
  var __vue_module_identifier__$1 = undefined;
  /* functional template */
  var __vue_is_functional_template__$1 = false;
  /* style inject SSR */

  /* style inject shadow dom */



  var __vue_component__$1 = /*#__PURE__*/normalizeComponent$1(
    { render: __vue_render__$1, staticRenderFns: __vue_staticRenderFns__$1 },
    __vue_inject_styles__$1,
    __vue_script__$1,
    __vue_scope_id__$1,
    __vue_is_functional_template__$1,
    __vue_module_identifier__$1,
    false,
    createInjector,
    undefined,
    undefined
  );

// Import vue component

var defaultOptions = {
  name: 'VueCustomTooltip',
  color: '#fff',
  background: '#000',
  borderRadius: 12,
  fontWeight: 400,
};

// Declare install function executed by Vue.use()
var install$1 = function installMyComponent(Vue, opt) {
  // Don't install if already installed, or SSR
  if (install$1.installed || Vue.prototype.$isServer) { return }
  install$1.installed = true;

  // Grab user options
  var userOptions = Object.assign({}, opt);

  // HEX regex: Hash, plus 3 or 6 valid characters
  var hexRegex = /^#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
  // Test color for valid HEX
  if (userOptions.hasOwnProperty('color') && !hexRegex.test(userOptions.color)) {
    delete userOptions.color;
  }
  // Test background for valid HEX
  if (userOptions.hasOwnProperty('background') && !hexRegex.test(userOptions.background)) {
    delete userOptions.background;
  }

  // borderRadius regex: number between 1-9, then any other numbers
  var borderRadiusRegex = /^[0-9]+$/;
  // Test borderRadius for integer
  if (userOptions.hasOwnProperty('borderRadius') && !borderRadiusRegex.test(userOptions.borderRadius)) {
    delete userOptions.borderRadius;
  }

  // fontWeight regex: number between 1-9 followed by two zeros
  var fontWeightRegex = /^[1-9]{1}00$/;
  // Test fontWeight for integer
  if (userOptions.hasOwnProperty('fontWeight') && !fontWeightRegex.test(userOptions.fontWeight)) {
    delete userOptions.fontWeight;
  }

  // Merge options
  var options = Object.assign({}, defaultOptions, userOptions);

  // Mutate borderRadius
  options.borderRadius = options.borderRadius + 'px';

  // Add global property (mainly for passing styles)
  Vue.prototype.$vueCustomTooltip = options;

  // Register component, using options.name.
  // e.g. <VueCustomTooltip>
  Vue.component(options.name, __vue_component__$1);
};

// Create module definition for Vue.use()
var plugin$1 = {
  install: install$1,
};

// Auto-install when vue is found (eg. in browser via <script> tag)
var GlobalVue$1 = null;
if (typeof window !== 'undefined') {
  GlobalVue$1 = window.Vue;
} else if (typeof global !== 'undefined') {
  GlobalVue$1 = global.Vue;
}
if (GlobalVue$1) {
  GlobalVue$1.use(plugin$1, defaultOptions);
}

// Inject install function into component - allows component
// to be registered via Vue.use() as well as Vue.component()
__vue_component__$1.install = install$1;//

var ENTRIES_SEP = "\n--------------------\n";

var script = {
  name: "Vuechessground",  
  props: {
    nextdelay: {
      type: Number,
      default: 3000
    },
    nextalltimeout: {
      type: Number,
      default: 10000
    },
    prodhost: {
      type: String,
      default: "openingtrainer.netlify.app"
    },
    hastraining: {
      type: Boolean,
      default: false,
    },
    username: {
      type: String,
      default: "",
    },
    uploadapplycompression: {
      type: Boolean,
      deafult: false,
    }
  },
  data: function data(){
    var variants = [
      {display: "Standard", key: "standard"},
      {display: "Atomic", key: "atomic"},
      {display: "Antichess", key: "antichess"},
      {display: "Crazyhouse", key: "crazyhouse"},
      {display: "Horde", key: "horde"},
      {display: "Racing Kings", key: "racingkings"},      
      {display: "Three Check", key: "3check"} ];
    var selectedVariant = getLocal("board/selectedvariant", "standard");
    this.selectVariant(variants, selectedVariant);
    var pos = chessops.Pos();
    var history = getLocal("board/history", []);    
    return {      
      pos: pos,
      board: null,
      legalsans: [],
      history: history,      
      variants: variants,
      promuci: null,
      showpromotion: false,
      prompieces: [],
      prompiecesext: [],
      currentbook: null,
      bookmoves: [],
      orientation: getLocal("board/orientation", "white"),
      firstVariantChanged: true,
      randLeft: 0,
      trainOn: false,
      expectedMoves: [],
      getExpected: false,
      awaitTrainMove: false,
      trainTimeout: null,
      sankey: 0,
      settingsOpen: false,      
      lichessgames: [],
      allowSetup: true,
      clickedgame: null,
      rawgames: [],
      selectedgameid: null,
      analyzing: false,
      info: null,
      enginestate: stockfish_2,
      ENGINE_READY: stockfish_2,
      ENGINE_STOPPING: stockfish_3,
      ENGINE_RUNNING: stockfish_4,
      authstoreInfo: "",
      nextsan: null,
      oldstate: null,
      nextallOn: false,
    }
  },
  methods:{ 
    nextall: function nextall(){
      this.nextallOn = true;
      this.stopnext();
    },
    checkstate: function checkstate(state){
      var this$1$1 = this;

      if((this.oldstate === stockfish_4)||(this.oldstate === stockfish_3)){        
        if(state === stockfish_2){          
          if(this.onStopStepAndStart){
            this.onStopStepAndStart = false;
            setTimeout(function (_) {
              this$1$1.step(1);
              var index = this$1$1.getCurrentIndex();
              if(index < (this$1$1.history.length - 1)){
                this$1$1.analyze();
              }else {
                this$1$1.nextallOn = false;
                this$1$1.onStopStepAndStart = false;
              }
            }, this.nextdelay);            
          }
        }
      }

      this.oldstate = state;
    },
    stopnext: function stopnext(){
      var nextallOn = this.nextallOn;
      this.stopanalyzing();
      this.nextallOn= nextallOn;

      console.log("stopnext", this.nextallOn);

      this.onStopStepAndStart = true;
    },
    makeenginemove: function makeenginemove(ev){
      var uci = ev.target.getAttribute("uci");      
      var san = this.pos.uciToSan(uci);

      try{
        this.$refs.movetextinput.value = san;
        this.makemove();
      }catch(err){}      
    },
    infoStoreKey: function infoStoreKey(fenOpt){
      var fen = fenOpt || this.reportFen();
      var variant = this.pos.pos.rules;
      return ("analysisinfo/" + variant + "/" + fen)
    },
    mymoveShapes: function mymoveShapes(){
      var index = this.getCurrentIndex();

      if(index < (  this.history.length - 1 ) ){
        var uci = this.history[index + 1].genUci;
        var orig = uci.substring(0, 2);
        var dest = uci.substring(2, 4);

        return [
          {orig: orig, brush: "yellow"},
          {orig: dest, brush: "yellow"}
        ]
      }else {
        return []
      }
    },
    stopanalyzing: function stopanalyzing(){
      if(this.engine){
        this.engine.setcommand("stop", {});
      }      

      this.analyzing = false;
      this.nextallOn = false;
    },
    analyze: function analyze(){
      var this$1$1 = this;

      this.pos.pos.rules;

      /*if((rules !== "chess")&&(rules !== "atomic")){
        window.alert("Analysis of this variant is not supported.")
        return
      }*/

      this.analyzing = true;

      this.setUp();

      console.log("analyze", this.nextallOn);

      if(this.nextallOn){
        console.log("setting nextall timeout");
        setTimeout(function (_) {
          console.log("nextall timeout");
          this$1$1.stopnext();
        }, this.nextalltimeout);
      }
    },
    boardwheel: function boardwheel(ev){
      this.step(ev.deltaY > 0 ? -1 : 1);
    },
    setFen: function setFen(fen){
      try{
        this.pos.setFen(fen);
        return fen
      }catch(err){
        console.log(("could not set fen " + fen));
        return null
      }
    },
    buildlichessgames: function buildlichessgames(games){
      var this$1$1 = this;

      var lichessgames = games.map(function (game) { return new fetchclient__namespace.lichess.ParsedGame(game); });
      this.lichessgames = lichessgames.map(function (game, i) {
        game.index = i;
        game.lost = "";
        game.orientation = "/";
        var whiteRating = parseInt(game.decoratedWhite.split(" ")[2]);
        var blackRating = parseInt(game.decoratedBlack.split(" ")[2]);
        var myRating, oppRating;
        if(game.white == this$1$1.username){
          game.orientation = "/white";
          myRating = whiteRating;
          oppRating = blackRating;
        }
        if(game.black == this$1$1.username){
          game.orientation = "/black";
          myRating = blackRating;
          oppRating = whiteRating;
        }
        var ratingDiff = myRating - oppRating;
        var diffOpacity = 1;
        if(ratingDiff > 200) { diffOpacity = 0.8; }
        if(ratingDiff > 400) { diffOpacity = 0.6; }
        if(ratingDiff > 600) { diffOpacity = 0.4; }
        game.diffOpacity = diffOpacity;
        if((game.white == this$1$1.username)&&(game.result=="0-1")) { game.lost = " lost"; }
        if((game.black == this$1$1.username)&&(game.result=="1-0")) { game.lost = " lost"; }
        game.clicked = i === this$1$1.clickedgame ? " clickedgame" : "";        
        return game
      });
      setTimeout(function (_) {
        if(this$1$1.selectedgameid){
          var e = document.getElementById(this$1$1.selectedgameid);
          if(e){
            e.scrollIntoView({block: "center", behavior: "smooth"});          
          }
        }
      }, 0);
    },
    clicklichessgame: function clicklichessgame(ev){
      var index = parseInt(ev.target.getAttribute("index"));      
      this.clickedgame = index;
      this.allowSetup = false;
      var lichessgame = this.lichessgames[index];
      this.selectedgameid = lichessgame.id;
      localStorage.setItem("ui/selectedgameid", this.selectedgameid);
      
      this.variantchanged(null, explorerToChessops(lichessgame.variant));
      for(var i = 0, list = lichessgame.moves; i < list.length; i += 1){
        var san = list[i];

        this.makesanmove(null, san);
      }      
      this.allowSetup = true;
      if(lichessgame.white === this.username) { this.orientation = "white"; }
      if(lichessgame.black === this.username) { this.orientation = "black"; }
      setLocal("board/orientation", this.orientation);
      this.setUp();
      this.buildlichessgames(this.rawgames);
    },
    getGames: function getGames(){
      var this$1$1 = this;

      var username = this.username;      
      if(!username) { return }
      var lichessClient = new fetchclient__namespace.FetchClient(window.fetch.bind(window), {
        apiBaseUrl: 'https://lichess.org/api',
        bearer: localStorage.getItem("LICHESS_TOKEN") || undefined
      });
      var gamesOfUser = lichessClient.extend('games/user', {
        headers: {
          Accept: 'application/x-ndjson',
        },
      });
      var perfType = "bullet,blitz,rapid,classiscal";
      if(this.pos.pos.rules !== "chess"){
        perfType = chessopsToExplorer(this.pos.pos.rules);
      }      
      gamesOfUser.fetchNdJson(username, {
        urlParams: {
          max: getLocal("ui/maxgames"),
          perfType: perfType
        },
      }).then((function (games) {
        this$1$1.rawgames = games;
        this$1$1.buildlichessgames(this$1$1.rawgames);
      }).bind(this));      
    },
    clearblob: function clearblob(){
      this.$refs.settingsblob.value = "";
    },
    setlocalstorage: function setlocalstorage(){
      var this$1$1 = this;

      var entries = this.$refs.settingsblob.value.split(ENTRIES_SEP);

      this.$refs.settingsblob.value = "Setting from " + (entries.length) + " entry(s) .";

      setTimeout(function (_) {
        try{
          var entriesobj = entries.map(function (entry) { return JSON.parse(entry); });

          localStorage.clear();

          entriesobj.forEach(function (item) { return localStorage.setItem(item[0], item[1]); });

          this$1$1.$refs.settingsblob.value = "Set " + (entriesobj.length) + " items, ok . Reloading.";

          setTimeout(function (_) {
            document.location.reload();
          }, 1000);
        }catch(err){
          this$1$1.$refs.settingsblob.value = "A problem occured with setting from blob. " + err;
        }
      }, 1000);
    },
    confirm: function confirm(msg){
      var resp = window.prompt(msg + " indeed ? ( y = yes )");

      if(!resp) { return false }

      return (resp.toLowerCase() === "y")
    },
    clearlocalstorage: function clearlocalstorage(){
      if(this.confirm("Clear Local storage")){
        localStorage.clear();
        this.$refs.settingsblob.value = "Local Storage cleared. Reloading.";
        setTimeout(function (_) {
          document.location.reload();
        }, 1000);
      }else {
        this.$refs.settingsblob.value = "Clearing Local Storage canceled.";
      }
    },
    copylocalstorage: function copylocalstorage(){
      var blob = Object.entries(localStorage).map(function (entry) { return JSON.stringify(entry); }).join(ENTRIES_SEP);

      this.$refs.settingsblob.value = blob;
      this.$refs.settingsblob.select();
      document.execCommand("copy");
    },
    settings: function settings(){
      this.settingsOpen = !this.settingsOpen;
    },
    sanratingstep: function sanratingstep(san, dir, prevFen){
      var fen = this.reportFen();
      if(!fen) { return }

      var bookPosFen = prevFen ? prevFen : fen;
      var bookPosVariant = this.pos.pos.rules;

      var bookpos = new BookPosition(bookPosVariant, bookPosFen);

      bookpos.blob.variant = bookPosVariant;
      bookpos.blob.fen = bookPosFen;

      var rating = bookpos.getRating(san) + dir;

      if(rating < 0) { rating = 10; }

      if(rating > 10) { rating = 0; }

      bookpos.setRating(san, rating);

      bookpos.storeBlob();

      this.buildLegalSans();
    },
    sanratingminus: function sanratingminus(ev){
      this.sanratingstep(ev.target.getAttribute("san"), -1, ev.target.getAttribute("prevFen"));
    },
    sanratingplus: function sanratingplus(ev){
      this.sanratingstep(ev.target.getAttribute("san"), 1, ev.target.getAttribute("prevFen"));
    },
    showRandLeft: function showRandLeft(){
      var this$1$1 = this;
      
      if(this.trainOn){
        setTimeout(function (_) {
          this$1$1.$refs.traininfo.innerHTML = "<span class=\"settingupopeningpos\">Setting up opening position ( left " + (this$1$1.randLeft) + " ) ...</span>";
        }, 0); 
      }      
    },
    trainmoveplayed: function trainmoveplayed(san){
      var this$1$1 = this;

      if(this.trainOn){
        var expectedIndex = this.expectedMoves.findIndex(function (item) { return item.san == san; });       

        if(expectedIndex < 0){
          this.$refs.traininfo.innerHTML = "<span class=\"trainerror\">Not among book moves !</span>";
        }else {
          this.$refs.traininfo.innerHTML = "<div class=\"trainrankdiv\"><span class=\"trainok\">Move <span class=\"trainrank\">" + san + "</span> was <span class=\"trainrank\">Rank " + (expectedIndex + 1) + ".</span> most played.</div><div><span class=\"trainok\">Among <span class=\"trainexps\">" + (this.expectedMoves.map(function (item, i) { return ((i+1) + ". " + (item.san)); }).join(" ")) + "</span> .</span></div>";
        }

        this.trainTimeout = setTimeout(function (_) {
          this$1$1.awaitTrainMove = false;
          if(this$1$1.trainOn) { this$1$1.train(); }
          this$1$1.trainTimeout = null;
        }, 5000);
      }
    },
    train: function train(){
      this.trainOn = true;
      this.rndpos();
    },
    stoptrain: function stoptrain(){
      this.trainOn = false;
      this.awaitTrainMove = false;
      this.randLeft = 0;      
      if(this.trainTimeout) { clearTimeout(this.trainTimeout); }
      this.trainTimeout = null;
    },
    rndpos: function rndpos(){            
      this.variantchanged();
      this.disable();
      this.randLeft = 3 + Math.floor(Math.random() * 10);
      var randOrientation = this.randLeft % 2 ? "black" : "white";
      if(randOrientation != this.orientation) { this.flip(); }
      this.showRandLeft();
      this.makeWeightedrandom();
    },
    disable: function disable(){
      var cont = this.$refs.vuechessground;
      var rect = cont.getBoundingClientRect();      
      var style = this.$refs.disablediv.style;
      style.width = (rect.width - 12) + "px";
      style.height = (rect.height - 12) + "px";
    },
    enable: function enable(){
      var style = this.$refs.disablediv.style;
      style.width = "0px";
      style.height = "0px";
    },
    selectVariant: function selectVariant(variants, variant){      
      variants.forEach(function (item) {
        item.selected = item.key === variant;
      });
      setLocal("board/selectedvariant", variant);
    },
    flip: function flip(){
      this.orientation = this.orientation == "white" ? "black" : "white";
      setLocal("board/orientation", this.orientation);
      this.setUp();
    },
    openanalysis: function openanalysis(){
      var explorer = chessopsToExplorer(this.pos.pos.rules);

      var fen = this.reportFen();
      if(!fen) { return }

      var url = "https://lichess.org/analysis/" + explorer + "/" + fen;
      window.open(url, "_blank");
    },
    getCurrent: function getCurrent(){
      var fen = this.reportFen();
      if(!fen) { return this.history[0] }

      return this.history.find(function (item) { return item.fen === fen; })
    },
    getCurrentIndex: function getCurrentIndex(){
      var fen = this.reportFen();
      if(!fen) { return 0 }

      return this.history.findIndex(function (item) { return item.fen === fen; })
    },
    getBook: function getBook(){
      var this$1$1 = this;
       
      this.currentbook = null;
      this.bookmoves = [];

      var fen = this.reportFen();
      if(!fen) { return }

      requestLichessBook(
        fen,
        chessopsToExplorer(this.pos.pos.rules)
      ).then(function (result) {        
        this$1$1.currentbook = result;
        this$1$1.bookmoves = result.moves;        
        if(this$1$1.trainOn){
          if((!this$1$1.randLeft) && (!this$1$1.awaitTrainMove)){
              this$1$1.expectedMoves = this$1$1.bookmoves.map(function (bookmove) { return ({
                san: bookmove.san,
                totalPlays: bookmove.white + bookmove.draws + bookmove.black
              }); }).sort(function (a,b) { return b.totalPlays - a.totalPlays; });              
              this$1$1.$refs.traininfo.innerHTML = "<span class=\"makeyourmove\">Make your move !</span>";
              this$1$1.awaitTrainMove = true;
              this$1$1.orientation = this$1$1.getCurrent().fen.split(" ")[1] === "w" ? "white" : "black";
              setLocal("board/orientation", this$1$1.orientation);
              this$1$1.setUp(true);
            }
        }
      });
    },
    makeWeightedrandom: function makeWeightedrandom() {
      var this$1$1 = this;

      var fen = this.reportFen();
      if(!fen) { return }

      if (this.currentbook) {
        if (this.currentbook.fen === fen) {
          var selectedMove = weightedRandom(this.currentbook);

          if (!selectedMove) {
            this.randLeft = 0;

            this.trainOn = false;

            this.enable();

            return;
          }

          var san = selectedMove.san;

          this.makesanmove(null, san);

          if(this.randLeft) {
            this.randLeft--;            
          }

          if(this.trainOn && this.randLeft){
            this.showRandLeft();
            setTimeout(function (_) {
              this$1$1.makeWeightedrandom();
            }, 250);
          } else {
            this.randLeft = 0;

            this.enable();
          }
        } else {
          if(this.randLeft){
            setTimeout(function (_) {
              this$1$1.makeWeightedrandom();
            }, 250);
          } else {
            this.enable();
          }
        }
      } else {
        if(this.randLeft){
            setTimeout(function (_) {
              this$1$1.makeWeightedrandom();
            }, 250);
        } else {
          this.enable();
        }
      }
    },
    makemovecancel: function makemovecancel(){
      var this$1$1 = this;

      this.prompieces = [];
      this.prompiecesext = [];
      this.showpromotion = false;
      this.$refs.movetextinput.value = "";
      setTimeout(function (_) {
        this$1$1.setUp();
      }, 250);      
    },
    pieceToName: function pieceToName(p){
      return {
        q: "queen",
        r: "rook",
        b: "bishop",
        n: "knight",
        k: "king",
        p: "pawn"
      }[p]
    },
    pieceToStyle: function pieceToStyle(p, fen){
      var parts = fen.split(" ");
      var turn = parts[1] == "w" ? "white" : "black";
      var name = this.pieceToName(p);
      var style = "piece " + name + " " + turn;      
      return style
    },
    step: function step(dir){
      var fen = this.reportFen();      
      if(!fen) { return }

      var index = this.history.findIndex(function (item) { return item.fen === fen; });
      if(index < 0){        
        return
      }
      index += dir;
      if(index < 0) { index = 0; }
      if(index >= this.history.length) { index = this.history.length - 1; }      

      if(!this.setFen(this.history[index].fen)) { return }

      this.getSelectedHistory();
      this.setUp();
      this.prompieces = [];
      this.prompiecesext = [];

      var nextallOn = this.nextallOn;
      this.stopanalyzing();
      this.nextallOn = nextallOn;
    },
    tobegin: function tobegin(){
      this.step(-100);
    },
    back: function back(){
      this.step(-1);
    },
    forward: function forward(){
      this.step(1);
    },
    toend: function toend(){
      this.step(100);
    },
    del: function del(){
      this.back();
      var fen = this.reportFen();      
      if(!fen) { return }

      var index = this.history.findIndex(function (item) { return item.fen === fen; });
      if(index >= 0){
        this.history = this.history.slice(0, index + 1);
      }
    },
    clickhistory: function clickhistory(ev) {
      if(this.trainOn) { return window.alert("Not allowed in train mode.") }

      var fen = ev.target.getAttribute("fen");      

      if(!this.setFen(fen)) { return }

      this.getSelectedHistory();            
      var itemIndex = this.history.findIndex(function (item) { return item.isSelected; });      
      this.recordMovePlayed(this.history[itemIndex].genSan, this.history[itemIndex].genUci, itemIndex > 0 ? this.history[itemIndex - 1].fen : null, true);
    },
    reportFen: function reportFen(){
      try{
        var fen = this.pos.reportFen();
        return fen
      }catch(err){        
        console.log("could not report fen");
        return null
      }
    },
    getSelectedHistory: function getSelectedHistory(){
      var fen = this.reportFen();
      if(!fen) { return }
      for(var i = 0, list = this.history; i < list.length; i += 1) {        
        var item = list[i];

        var bookpos = new BookPosition(this.pos.pos.rules, item.prevFen);

        item.isSelected = item.fen == fen;

        item.rating = bookpos.getRating(item.genSan);

        item.selected = "historysan " +  ( item.isSelected ? "histactive" : "histpassive" ) + " " + bookpos.getClass(item.genSan);
      }
      setTimeout(function (_) {
        var e = document.getElementById(fen);
        if(e){          
          e.scrollIntoView({block: "center", behavior: "smooth"});          
        }        
      }, 0);
    },
    recordMovePlayed: function recordMovePlayed(san, uci, prevFen, dontAdd){      
      var fen = this.reportFen();
      if(!fen) { return }

      if(!dontAdd){
        var index = this.history.findIndex(function (item) { return item.fen === prevFen; });
        
        if(index < 0){                  
          this.history.push({ genSan: san, genUci: uci, prevFen: prevFen, fen: fen });        
        }else {          
          this.history = this.history.slice(0, index + 1);
          this.history.push({ genSan: san, genUci: uci, prevFen: prevFen, fen: fen });
        }
      }

      this.getSelectedHistory();      
      this.prompieces = [];
      this.prompiecesext = [];
      if(this.allowSetup) { this.setUp(); }

      var event = {
        kind: "moveplayed",
        prevFen: prevFen,
        fen: fen,
        genSan: san,
        genUci: uci,
        variant: this.pos.pos.rules,
        history: this.history,
      };

      this.$emit("moveplayed", event);

      var nextallOn = this.nextallOn;
      //this.stopanalyzing()
      this.nextallOn = nextallOn;
    },
    prompiececlicked: function prompiececlicked(ev){
      var piece = ev.target.getAttribute("piece");
      var uci = this.promuci + piece;
      var san = this.pos.uciToSan(uci);
      this.$refs.movetextinput.value = san;
      this.showpromotion = false;
    },
    makesanmove: function makesanmove(ev, san){
      this.$refs.movetextinput.value = san;
      this.makemove();
    },
    makemove: function makemove(){
      var fen = this.reportFen();
      if(!fen) { return }

      var move = this.$refs.movetextinput.value;

      this.$refs.movetextinput.value = "";

      if(move === this.nextsan){
        this.step(1);
        return
      }

      try {
        var uci = this.pos.sanToUci(move);
        this.pos.playSan(move);                
        this.recordMovePlayed(move, uci, fen);
      }catch(err){
        try{
          var san = this.pos.uciToSan(move);
          this.pos.playSan(san);
          this.recordMovePlayed(san, move, fen);          
        }catch(err){
          //window.alert(`Illegal move ${move} !`)
          return
        }
      }
    },
    variantchanged: function variantchanged(ev, setVariant){      
      var variant = setVariant || ( this.$refs.variantselect ? this.$refs.variantselect.value : this.pos.pos.rules );
      this.selectVariant(this.variants, variant);
      this.pos.setVariant(variant);      
      this.history = this.firstVariantChanged ? getLocal("board/history", []) : [];
      this.firstVariantChanged = false;
      if(this.history.length){
        var item = this.history.find(function (item) { return item.isSelected; });        

        if(!this.setFen(item.fen)) { return }

        this.setUp();
      } else {
        this.recordMovePlayed("*", "*", null);        
      }
    },
    reset: function reset(){
      this.variantchanged();
    },
    clicksan: function clicksan(ev){      
      var fen = this.reportFen();
      if(!fen) { return }

      var san = ev.target.getAttribute("san");      
      var uci = this.pos.sanToUci(san);

      if(san === this.nextsan){
        this.step(1);
      }else {
        this.pos.playSan(san);
        this.recordMovePlayed(san, uci, fen);
      }      
    },
    buildLegalSans: function buildLegalSans(){
      var this$1$1 = this;

      var fen = this.reportFen();
      if(!fen) { return }

      var bookpos = new BookPosition(this.pos.pos.rules, fen);

      var arrows = [];

      var poslegalsans = this.pos.allLegalSans();

      this.legalsans = poslegalsans.map(function (san) {
        var uci = this$1$1.pos.sanToUci(san);

        var orig = uci.substring(0, 2);
        var dest = uci.substring(2, 4);

        var nextsan = null;

        var curr = this$1$1.getCurrentIndex();

        if((curr >= 0) && (curr + 1 < this$1$1.history.length)){
          nextsan = this$1$1.history[curr + 1].genSan;
        }

        this$1$1.nextsan = nextsan;

        var sortvalue = 0;
        var klass = "legalsan";
        if(san === nextsan) {
          klass += " histsan";
          sortvalue = 1000;
        }                

        var rating = bookpos.getRating(san);

        var brush = "red";
        if(rating > 3) { brush = "blue"; }
        if(rating > 6) { brush = "green"; }

        if(rating){
          arrows.push({orig: orig, dest: dest, brush: brush});
        }

        sortvalue += 100 * rating;
        klass += " " + bookpos.getClass(san);        
        return ({
          san: san,
          klass: klass,
          rating: rating,
          sortvalue: sortvalue,
          key: this$1$1.sankey++
        })
      }).sort(function (a, b) { return a.san.localeCompare(b.san); }).sort(function (a,b) { return b.sortvalue - a.sortvalue; });

      this.board.setShapes(arrows.concat(this.mymoveShapes()));

      this.getSelectedHistory();
    },
    setUp: function setUp(skipBook){
      var this$1$1 = this;

      var fen = this.reportFen();
      if(!fen) { return }

      this.$refs.fentextinput.value = fen;
      var config = {
          fen: fen,        
          movable: { events: { after: this.movePlayed() } },
          orientation: this.orientation,
      };
      this.board = chessground.Chessground(this.$refs.board, config);      
      try{
        var lastUci = this.getCurrent().genUci;
        if(lastUci.length >= 4){
          var srcDest = [lastUci.substring(0, 2), lastUci.substring(2, 4)];
          this.board.set({lastMove: srcDest});          
        }        
      }catch(err){window.alert(("could not highlight move " + err));}
      this.buildLegalSans();
      setLocal("board/history", this.history);
      if(!skipBook) { this.getBook(); }

      if(this.analyzing){
        var multipv = parseInt(getLocal("analysis/maxmultipv"));

        var allLegalSans = this.pos.allLegalSans();
        var numLegalSans = allLegalSans.length;

        if(numLegalSans === 0){
          window.alert("No legal moves to analyze !");
          this.analyzing = false;
          return
        }

        if(numLegalSans < multipv) { multipv = numLegalSans; }

        var rules = this.pos.pos.rules;

        var variant = this.pos.pos.rules;

        if(rules == "antichess") { variant = "giveaway"; }
        if(rules == "3check") { variant = "threecheck"; }

        var payload = {
          variant: variant, 
          fen: fen,
          multipv: multipv,
        };

        console.log("payload", payload);

        if(this.engine){
          this.engine.setcommand("go", payload);
        }        
      }else {
        this.info = null;
        
        if(!skipBook) { this.authStore.getItem(this.infoStoreKey()).then(function (info) {
          if(info) { this$1$1.info = info; }
        }); }
      }      
    },
    movePlayed: function movePlayed(){
      var this$1$1 = this;

      return function (orig, dest, metadata) {
        var fen = this$1$1.reportFen();
        if(!fen) { return }

        var uci = "" + orig + dest;        
        var legals = this$1$1.pos.legalsForUci(uci);
        var num = legals.length;

        if(!num){
          //window.alert(`Illegal move ${uci} !`)
          this$1$1.$refs.movetextinput.value = "";
          this$1$1.showpromotion = false;
          this$1$1.setUp();
          return
        }

        if(num > 1){
          // handle promotion
          this$1$1.prompieces = legals.map(function (legal) { return legal.substring(4, 5); });

          var fen$1 = this$1$1.reportFen();
          if(!fen$1) { return }

          this$1$1.prompiecesext = this$1$1.prompieces.map(function (p) { return ({
            p: p,
            klass: "prompiecediv " + this$1$1.pieceToStyle(p, fen$1)              
          }); });
          this$1$1.showpromotion = true;          
          this$1$1.$refs.movetextinput.value = "Press piece !";
          this$1$1.promuci = uci;          
          return
        }

        this$1$1.$refs.movetextinput.value = "";
        this$1$1.showpromotion = false;
        var san = this$1$1.pos.uciToSan(uci);

        if(san === this$1$1.nextsan){
          this$1$1.step(1);
        }else {
          this$1$1.pos.playSan(san);        
          this$1$1.recordMovePlayed(san, uci, fen);        
        }

        this$1$1.trainmoveplayed(san);
      }
    }
  },
  mounted: function mounted(){
    var this$1$1 = this;
    
    this.authStore = new AuthStore({
      vm: this,
      prodHost: this.prodhost,
      isRemoteKey: function (key) { return key.match(/^analysisinfo/); }
    });

    this.selectedgameid = localStorage.getItem("ui/selectedgameid");
    this.variantchanged();        
    this.getGames(this.username);

    this.engine = new stockfish_1(function (info) {
      this$1$1.checkstate(info.state);

      this$1$1.info = info;

      if(this$1$1.info.state === stockfish_2) { this$1$1.enginestate = stockfish_2; }

      if(this$1$1.info.state === stockfish_4) { this$1$1.enginestate = stockfish_4; }

      if(this$1$1.info.state === stockfish_3) { this$1$1.enginestate = stockfish_3; }

      var compactInfo = {
        summary: this$1$1.info.summary
      };
      
      /*setLocal(this.infoStoreKey(this.info.analyzedfen), this.info)*/

      this$1$1.authStore.setItem(this$1$1.infoStoreKey(this$1$1.info.analyzedfen), compactInfo);

      var shapes = this$1$1.info.summary.map(function (item, i) {
        item.display = item.uci;

        try{
          var tempPos = chessops.Pos();
          tempPos.setVariant(this$1$1.pos.pos.rules);
          tempPos.setFen(this$1$1.info.analyzedfen);

          item.display = tempPos.uciToSan(item.uci);

          var line = item.pvalgebs.map(function (uci) {
            var san = tempPos.uciToSan(uci);
            tempPos.playSan(san);
            return san
          });

          item.line = line.slice(1, Math.min(line.length, 5));
        }catch(err){}

        var orig = item.uci.substring(0, 2);
        var dest = item.uci.substring(2, 4);
        var brush = "green";
        if(i > 0) { brush = "blue"; }
        if(i > 1) { brush = "yellow"; }
        if(i > 2) { brush = "red"; }        
        return {
          orig: orig, dest: dest, brush: brush
        }
      });

      this$1$1.board.setShapes(shapes.concat(this$1$1.mymoveShapes()));
    });

    console.log("engine", this.engine);

    //this.engine.sendcommandtoengine("uci\n")

    setInterval(function (_) {
      var state = this$1$1.engine.analysisinfo.state;

      this$1$1.checkstate(state);
      
      if(state === stockfish_2) { this$1$1.enginestate = stockfish_2; }
      if(state === stockfish_4) { this$1$1.enginestate = stockfish_4; }
      if(state === stockfish_3) { this$1$1.enginestate = stockfish_3; }      

      //console.log("engine state", this.enginestate)
    }, 500);
  },
  components:{
    VueCustomTooltip: __vue_component__$1,
    Labeled: vuecomps.Labeled,
    Perstext: vuecomps.Perstext,
    Perscheck: vuecomps.Perscheck,
  }
};function normalizeComponent(template, style, script, scopeId, isFunctionalTemplate, moduleIdentifier /* server only */, shadowMode, createInjector, createInjectorSSR, createInjectorShadow) {
    if (typeof shadowMode !== 'boolean') {
        createInjectorSSR = createInjector;
        createInjector = shadowMode;
        shadowMode = false;
    }
    // Vue.extend constructor export interop.
    var options = typeof script === 'function' ? script.options : script;
    // render functions
    if (template && template.render) {
        options.render = template.render;
        options.staticRenderFns = template.staticRenderFns;
        options._compiled = true;
        // functional template
        if (isFunctionalTemplate) {
            options.functional = true;
        }
    }
    // scopedId
    if (scopeId) {
        options._scopeId = scopeId;
    }
    var hook;
    if (moduleIdentifier) {
        // server build
        hook = function (context) {
            // 2.3 injection
            context =
                context || // cached call
                    (this.$vnode && this.$vnode.ssrContext) || // stateful
                    (this.parent && this.parent.$vnode && this.parent.$vnode.ssrContext); // functional
            // 2.2 with runInNewContext: true
            if (!context && typeof __VUE_SSR_CONTEXT__ !== 'undefined') {
                context = __VUE_SSR_CONTEXT__;
            }
            // inject component styles
            if (style) {
                style.call(this, createInjectorSSR(context));
            }
            // register component module identifier for async chunk inference
            if (context && context._registeredComponents) {
                context._registeredComponents.add(moduleIdentifier);
            }
        };
        // used by ssr in case component is cached and beforeCreate
        // never gets called
        options._ssrRegister = hook;
    }
    else if (style) {
        hook = shadowMode
            ? function (context) {
                style.call(this, createInjectorShadow(context, this.$root.$options.shadowRoot));
            }
            : function (context) {
                style.call(this, createInjector(context));
            };
    }
    if (hook) {
        if (options.functional) {
            // register for functional component in vue file
            var originalRender = options.render;
            options.render = function renderWithStyleInjection(h, context) {
                hook.call(context);
                return originalRender(h, context);
            };
        }
        else {
            // inject component registration as beforeCreate hook
            var existing = options.beforeCreate;
            options.beforeCreate = existing ? [].concat(existing, hook) : [hook];
        }
    }
    return script;
}/* script */
var __vue_script__ = script;
/* template */
var __vue_render__ = function () {var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;return _c('div',{staticClass:"trainvertcont"},[_vm._ssrNode(((_vm.hastraining)?("<div class=\"traincontrolsdiv\">"+((_vm.trainOn)?("<div class=\"traininfo\"></div>"):"<!---->")+" "+((!_vm.trainOn)?("<button class=\"trainbutton\">Train</button>"):"<!---->")+" "+((_vm.trainOn && !_vm.randLeft)?("<button class=\"stoptrainbutton\">Stop Training</button>"):"<!---->")+"</div>"):"<!---->")+" "),_vm._ssrNode("<div class=\"gamecont\">","</div>",[_vm._ssrNode("<div class=\"vuechessground\">","</div>",[_vm._ssrNode("<div id=\"disablediv\"></div> "),(_vm.settingsOpen)?_vm._ssrNode("<div id=\"settingsdiv\" class=\"settingsdiv\">","</div>",[_vm._ssrNode("<div>\n                 \n        <div class=\"svgbutton cross floatright\"></div></div> <div class=\"localstoragecontrols\"><div class=\"label\">Local Storage</div> <button class=\"graybutton\">Clear Blob</button> <button class=\"greenbutton\">Copy Local Storaga</button> <button class=\"yellowbutton\">Set Local Storage</button> <button class=\"redbutton\">Clear Local Storaga</button></div> <div><textarea id=\"settingsblob\"></textarea></div> "),_vm._ssrNode("<div style=\"margin-top: 5px; margin-left: 4px;\">","</div>",[_c('Labeled',{attrs:{"label":"Max games"}},[_c('Perstext',{attrs:{"id":"ui/maxgames","default":"50"}})],1),_vm._ssrNode(" "),_c('Labeled',{attrs:{"label":"Max multipv"}},[_c('Perstext',{attrs:{"id":"analysis/maxmultipv","default":"5"}})],1),_vm._ssrNode(" "),(_vm.uploadapplycompression)?_c('Labeled',{attrs:{"label":"Upload Apply Compression"}},[_c('Perscheck',{attrs:{"id":"upload/applycompression"}})],1):_vm._e()],2)],2):_vm._e(),_vm._ssrNode(" "),_vm._ssrNode("<div class=\"horizcont\">","</div>",[_vm._ssrNode("<div class=\"vertcont\">","</div>",[_vm._ssrNode("<div class=\"moveinputdiv\">","</div>",[_c('VueCustomTooltip',{attrs:{"label":"flip board"}},[(!_vm.trainOn)?_c('div',{staticClass:"svgbutton spinner",on:{"click":_vm.flip}}):_vm._e()]),_vm._ssrNode(" "),_c('VueCustomTooltip',{attrs:{"label":"move text, san or uci"}},[_c('input',{ref:"movetextinput",staticClass:"movetextinput",attrs:{"type":"text"},on:{"keyup":function($event){if(!$event.type.indexOf('key')&&_vm._k($event.keyCode,"enter",13,$event.key,"Enter")){ return null; }return _vm.makemove.apply(null, arguments)}}})]),_vm._ssrNode(" "+((_vm.showpromotion)?("<div class=\"prompiecebuttons\">"+(_vm._ssrList((_vm.prompiecesext),function(prompieceext){return ("<div"+(_vm._ssrAttr("piece",prompieceext.p))+(_vm._ssrClass(null,prompieceext.klass))+">"+_vm._ssrEscape("\n                "+_vm._s(prompieceext.p.toUpperCase())+"\n              ")+"</div>")}))+"</div>"):"<!---->")+" "),_c('VueCustomTooltip',{attrs:{"label":"make text move"}},[(!_vm.showpromotion)?_c('div',{staticClass:"svgbutton checkmark greenbutton",on:{"click":_vm.makemove}}):_vm._e()]),_vm._ssrNode(" "),_c('VueCustomTooltip',{attrs:{"label":"cancel move"}},[_c('div',{staticClass:"svgbutton cross yellowbutton",on:{"click":_vm.makemovecancel}})]),_vm._ssrNode(" "),_c('VueCustomTooltip',{attrs:{"label":"reset board"}},[(!_vm.trainOn && !_vm.showpromotion)?_c('div',{staticClass:"svgbutton exclam redbutton",on:{"click":_vm.reset}}):_vm._e()])],2),_vm._ssrNode(" <div class=\"blue merida\"><div class=\"cg-board-wrap\"></div></div> <div class=\"fendiv\"><input tytpe=\"text\" class=\"fentextinput\"></div> "),(!_vm.trainOn)?_vm._ssrNode("<div class=\"controls\">","</div>",[_c('VueCustomTooltip',{attrs:{"position":"is-bottom","label":"to begin"}},[_c('div',{staticClass:"svgbutton tobegin bluebutton",on:{"click":_vm.tobegin}})]),_vm._ssrNode(" "),_c('VueCustomTooltip',{attrs:{"position":"is-bottom","label":"back"}},[_c('div',{staticClass:"svgbutton arrowleft greenbutton",on:{"click":_vm.back}})]),_vm._ssrNode(" "),_c('VueCustomTooltip',{attrs:{"position":"is-bottom","label":"forward"}},[_c('div',{staticClass:"svgbutton arrowright greenbutton",on:{"click":_vm.forward}})]),_vm._ssrNode(" "),_c('VueCustomTooltip',{attrs:{"position":"is-bottom","label":"to end"}},[_c('div',{staticClass:"svgbutton toend bluebutton",on:{"click":_vm.toend}})]),_vm._ssrNode(" "),_c('VueCustomTooltip',{attrs:{"position":"is-bottom","label":"delete move"}},[_c('div',{staticClass:"svgbutton cross redbutton",on:{"click":_vm.del}})]),_vm._ssrNode(" "),_c('VueCustomTooltip',{attrs:{"position":"is-bottom","label":"select variant"}},[_c('select',{ref:"variantselect",on:{"change":_vm.variantchanged}},_vm._l((_vm.variants),function(variant){return _c('option',{key:variant.key,domProps:{"value":variant.key,"selected":variant.selected}},[_vm._v(_vm._s(variant.display))])}),0)]),_vm._ssrNode(" "),_c('VueCustomTooltip',{attrs:{"position":"is-bottom","label":"weighted random book move"}},[_c('div',{staticClass:"svgbutton questionmark yellowbutton",on:{"click":_vm.makeWeightedrandom}})]),_vm._ssrNode(" "),_c('VueCustomTooltip',{attrs:{"position":"is-bottom","label":"open lichess analysis"}},[_c('div',{staticClass:"svgbutton openfolder",on:{"click":_vm.openanalysis}})]),_vm._ssrNode(" "),_c('VueCustomTooltip',{attrs:{"position":"is-bottom","label":"settings"}},[_c('div',{staticClass:"svgbutton tool greenbutton",on:{"click":_vm.settings}})])],2):_vm._e()],2),_vm._ssrNode(" <div class=\"legalsans\">"+(_vm._ssrList((_vm.legalsans),function(item){return ("<div>"+((!_vm.trainOn)?("<div class=\"sancont\"><div"+(_vm._ssrAttr("san",item.san))+(_vm._ssrClass(null,item.klass))+">"+_vm._ssrEscape("\n                "+_vm._s(item.san)+"\n              ")+"</div> <div"+(_vm._ssrAttr("san",item.san))+" class=\"sanbutton arrowdown red\"></div> <div class=\"ratingnum\">"+_vm._ssrEscape("\n                "+_vm._s(item.rating < 10 ? item.rating : "!")+"\n              ")+"</div> <div"+(_vm._ssrAttr("san",item.san))+" class=\"sanbutton arrowup green\"></div></div>"):"<!---->")+"</div>")}))+"</div> <div class=\"historysans\">"+(_vm._ssrList((_vm.history.slice().reverse()),function(item){return ("<div"+(_vm._ssrAttr("id",item.fen))+" class=\"historysanoutercont\"><div class=\"historysancont\"><div"+(_vm._ssrAttr("fen",item.fen))+(_vm._ssrAttr("san",item.genSan))+(_vm._ssrClass(null,item.selected))+">"+_vm._ssrEscape("\n                "+_vm._s(item.genSan)+"          \n              ")+"</div> <div style=\"width: 5px;\"></div> "+((item.prevFen)?("<div"+(_vm._ssrAttr("san",item.genSan))+(_vm._ssrAttr("prevFen",item.prevFen))+" class=\"sanbutton arrowdown red\"></div>"):"<!---->")+" <div class=\"ratingnum\">"+_vm._ssrEscape("\n                "+_vm._s(item.prevFen ? item.rating < 10 ? item.rating : "!" : "")+"\n              ")+"</div> "+((item.prevFen)?("<div"+(_vm._ssrAttr("san",item.genSan))+(_vm._ssrAttr("prevFen",item.prevFen))+" class=\"sanbutton arrowup green\"></div>"):"<!---->")+"</div></div>")}))+"</div> <div"+(_vm._ssrClass(null,(_vm.enginestate !== _vm.ENGINE_READY) ?'bookdiv running' : 'bookdiv'))+">"+(((_vm.analyzing && _vm.info) || _vm.info)?("<div style=\"margin-bottom: 20px;\">"+((_vm.enginestate === _vm.ENGINE_RUNNING)?("<button style=\"background-color: #faa; margin-top: 5px; margin-left: 5px; padding-left: 15px; padding-right: 15px;\">Stop</button>"):"<!---->")+" "+((_vm.enginestate === _vm.ENGINE_RUNNING)?("<button style=\"background-color: #faf; margin-top: 5px; margin-left: 5px; padding-left: 15px; padding-right: 15px;\">Stop Next</button>"):"<!---->")+" "+((_vm.enginestate === _vm.ENGINE_RUNNING)?("<button style=\"background-color: #aff; margin-top: 5px; margin-left: 5px; padding-left: 15px; padding-right: 15px;\">Next All</button>"):"<!---->")+" "+((_vm.enginestate === _vm.ENGINE_STOPPING)?("<button"+(_vm._ssrAttr("disabled",true))+" style=\"background-color: #ffa; margin-top: 5px; margin-left: 5px; padding-left: 15px; padding-right: 15px;\">Stopping</button>"):"<!---->")+" "+((_vm.enginestate === _vm.ENGINE_READY)?("<button style=\"background-color: #afa; margin-top: 5px; margin-left: 5px; padding-left: 15px; padding-right: 15px;\">Analyze</button>"):"<!---->")+" <table cellpadding=\"10\" class=\"infotable\">"+(_vm._ssrList((_vm.info.summary),function(item){return ("<tr><td class=\"multipv\">"+_vm._ssrEscape("\n                  "+_vm._s(item.multipv)+".\n                ")+"</td> <td"+(_vm._ssrAttr("uci",item.uci))+(_vm._ssrClass(null,item.display === _vm.nextsan ? 'infosan next' : 'infosan'))+">"+_vm._ssrEscape("\n                  "+_vm._s(item.display)+"\n                ")+"</td> <td class=\"infoscore\">"+_vm._ssrEscape("\n                  "+_vm._s(item.scorenumerical)+"\n                ")+"</td> <td class=\"infodepth\">"+_vm._ssrEscape("\n                  "+_vm._s(item.depth)+"\n                ")+"</td></tr> <tr><td></td> <td colspan=\"3\" class=\"infoline\">"+_vm._ssrEscape("\n                  "+_vm._s(item.line ? item.line.join(" ") : "")+"\n                ")+"</td></tr>")}))+"</table></div>"):"<!---->")+" "+(((!_vm.trainOn) && (_vm.enginestate === _vm.ENGINE_READY))?("<table cellpadding=\"2\" cellspacing=\"3\"><thead><tr><td>"+((_vm.enginestate === _vm.ENGINE_READY)?("<button style=\"font-size: 9px; background-color: #afa; margin-bottom: 3px;\">Analyze</button>"):"<!---->")+"</td> <td class=\"white\">White</td> <td class=\"draw\">Draw</td> <td class=\"black\">Black</td></tr></thead> <tbody>"+(_vm._ssrList((_vm.bookmoves),function(item){return ("<tr><td class=\"bookmovesan\">"+_vm._ssrEscape("\n                  "+_vm._s(item.san)+"\n                ")+"</td> <td class=\"white\">"+_vm._ssrEscape(_vm._s(item.white))+"</td> <td class=\"draw\">"+_vm._ssrEscape(_vm._s(item.draws))+"</td> <td class=\"black\">"+_vm._ssrEscape(_vm._s(item.black))+"</td></tr>")}))+"</tbody></table>"):"<!---->")+"</div>")],2)],2),_vm._ssrNode(" "+((_vm.lichessgames.length > 0)?("<div class=\"lichessgames\">"+(_vm._ssrList((_vm.lichessgames),function(game){return ("<div"+(_vm._ssrAttr("id",game.id))+(_vm._ssrClass(null,'lichessgame ' + game.variant + game.lost + game.clicked))+(_vm._ssrStyle(null,("opacity: " + (game.diffOpacity) + ";"), null))+"><span"+(_vm._ssrAttr("index",game.index))+">"+((game.id === _vm.selectedgameid)?("<span style=\"color: #00f\">\n            *\n          </span>"):"<!---->")+" <span style=\"color: #b87\">"+_vm._ssrEscape("\n            "+_vm._s(game.index + 1)+".\n          ")+"</span>"+_vm._ssrEscape("\n          "+_vm._s(game.gameInfo)+"\n        ")+"</span> <a rel=\"noopener noreferrer\" target=\"_blank\""+(_vm._ssrAttr("href",("https://lichess.org/" + (game.id) + (game.orientation))))+" style=\"font-size: 12px;\">open at lichess</a></div>")}))+"</div>"):"<!---->"))],2)],2)};
var __vue_staticRenderFns__ = [];

  /* style */
  var __vue_inject_styles__ = undefined;
  /* scoped */
  var __vue_scope_id__ = undefined;
  /* module identifier */
  var __vue_module_identifier__ = "data-v-1490ecdf";
  /* functional template */
  var __vue_is_functional_template__ = false;
  /* style inject */
  
  /* style inject SSR */
  
  /* style inject shadow dom */
  

  
  var __vue_component__ = /*#__PURE__*/normalizeComponent(
    { render: __vue_render__, staticRenderFns: __vue_staticRenderFns__ },
    __vue_inject_styles__,
    __vue_script__,
    __vue_scope_id__,
    __vue_is_functional_template__,
    __vue_module_identifier__,
    false,
    undefined,
    undefined,
    undefined
  );// install function executed by Vue.use()
function install(Vue) {
  if (install.installed) { return; }
  install.installed = true;
  Vue.component('Vuechessground', __vue_component__);
}

// Create module definition for Vue.use()
var plugin = {
  install: install,
};

// To auto-install when vue is found
var GlobalVue = null;
if (typeof window !== 'undefined') {
  GlobalVue = window.Vue;
} else if (typeof global !== 'undefined') {
  GlobalVue = global.Vue;
}
if (GlobalVue) {
  GlobalVue.use(plugin);
}

// Inject install function into component - allows component
// to be registered via Vue.use() as well as Vue.component()
__vue_component__.install = install;

// It's possible to expose named exports when writing components that can
// also be used as directives, etc. - eg. import { RollupDemoDirective } from 'rollup-demo';
// export const RollupDemoDirective = component;
exports["default"]=__vue_component__;//# sourceMappingURL=vuechessground.ssr.js.map
