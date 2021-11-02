export function simpleFetch(url, params, callback) {
    params.headers = params.headers || {};
    if (params.asForm)
      params.headers["Content-Type"] = "application/x-www-form-urlencoded";
    if (params.asJson) params.headers.Accept = "application/json";
    if (params.asVndLichessV3Json) {
      params.headers.Accept = "application/vnd.lichess.v3+json";
      params.asJson = true;
    }
    if (params.asNdjson) params.headers.Accept = "application/x-ndjson";
    if (params.accessToken)
      params.headers.Authorization = "Bearer " + params.accessToken;
    if (params.server)
      api(
        "request:fetch",
        {
          url: url,
          params: params
        },
        (result) => callback(result)
      );
    else
      fetch(url, params).then(
        (response) =>
          response.text().then(
            (text) => {
              if (params.asJson || params.asNdjson) {
                try {
                  let obj;
                  if (params.asNdjson) {
                    obj = text
                      .split("\n")
                      .filter((line) => line.length)
                      .map((line) => JSON.parse(line));
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
            (err) => {
              console.log("fetch get response text error", err);
              callback({
                ok: false,
                status: "Error: Failed to get response text."
              });
            }
          ),
        (err) => {
          console.log("fetch error", err);
          callback({ ok: false, status: "Error: Failed to fetch." });
        }
      );
  }

  export function getLocal(key, deffault){
    const stored = localStorage.getItem(key)
    if(stored === null) return deffault
    try{
      const blob = JSON.parse(stored)
      return blob
    }catch(err){
      return deffault
    }
  }

  export function setLocal(key, value){
    localStorage.setItem(key, JSON.stringify(value, null, 2))
  }

const BOOK_MOVE_RATINGS = {
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
}

export class BookMove{
  constructor(san){
    this.blob = {
      san: san,
      rating: 0
    }
  }

  serialize(){
    return this.blob
  }

  deserialize(blob){
    this.blob = {
      san: blob.san,
      rating: blob.rating || 0
    }

    return this
  }

  get rating(){
    return this.blob.rating
  }

  set rating(rating){
    this.blob.rating = rating
  }

  get class(){
    return BOOK_MOVE_RATINGS[this.rating].class
  }
}

export class BookPosition{
  constructor(variant, fen){
    this.blob = {
      variant: variant,
      fen: fen,
      moves: {}
    }

    this.fromStored()
  }

  get variant(){
    return this.blob.variant
  }

  set variant(variant){
    this.blob.variant = variant
  }

  get fen(){
    return this.blob.fen
  }

  set fen(fen){
    this.blob.fen = fen
  }

  get storeKey(){
    return `bookposition/${this.variant}/${this.fen}`
  }

  getStoredBlob(){
    return getLocal(this.storeKey, this.blob)
  }

  storeBlob(){
    setLocal(this.storeKey, this.serialize())

    return this
  }

  fromStored(){
    const blob = this.getStoredBlob()

    return this.deserialize(blob)
  }

  get moves(){
    return this.blob.moves
  }

  set moves(moves){
    this.blob.moves = moves
  }

  serialize(){
    return {
      variant: this.variant,
      fen: this.fen,
      moves: Object.fromEntries(Object.entries(this.moves).map(entry => [entry[0], entry[1].serialize()]))
    }
  }

  get moves(){
    return this.blob.moves
  }

  getMove(san){
    const move = this.moves[san] || new BookMove(san)
    this.moves[san] = move
    return move
  }

  getRating(san){
    return this.getMove(san).rating
  }

  setRating(san, rating){
    this.getMove(san).rating = rating
  }

  getClass(san){
    return this.getMove(san).class
  }

  deserialize(blob){
    this.variant = blob.variant
    this.fen = blob.fen
    this.moves = Object.fromEntries(Object.entries(blob.moves).map(entry => [entry[0], new BookMove().deserialize(entry[1])]))

    return this
  }
}
