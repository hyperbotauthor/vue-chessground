export class StoreCache{
  constructor(){
    this.clear()
  }

  get empty(){    
    return !this.size
  }

  get now(){
    return new Date().getTime()
  }

  setItem(key, value){
    this.cache[key] = value
    this.lastWrite = this.now
  }

  getItem(key){
    return this.cache[key]
  }

  clear(){
    this.cache = {}
    this.lastWrite = this.now
  }

  get size(){
    return Object.keys(this.cache).length
  }
}

export class AuthStore{  
  constructor(props){
    // prodHost is the host of the production server
    // if the host of the page source is different
    // we are in development
    this.prodHost = props.prodHost || ""
    // writeDelay is the delay in ms after elapsing of which 
    // without write the buffer has to be written to remote
    this.writeDelay = props.writeDelay || 5000
    // maxWriteDelay is the maximum delay after which the buffer
    // must be written to remote
    this.maxWriteDelay = props.maxWriteDelay || 30000
    // watchInterval is the interval at which the state
    // has to be monitored
    this.watchInterval = props.watchInterval || 1000
    // isRemoteKey is a boolean function of store key
    // which should return true if the key has to be stored
    // permanently only at the remote
    this.isRemoteKey = props.isRemoteKey || ( key => false )
    // mockDelay is the simulated remote read delay in dev in ms
    this.mockDelay = props.mockDelay || 1500
    // authstoreFuncProt is the Netlify authstore function protocol
    this.authstoreFuncProt = props.authstoreFuncProt || `https:`
    // authstoreFuncPath is the Netlify authstore function path
    this.authstoreFuncPath = props.authstoreFuncPath || `.netlify/functions/authstore`
    // vm is the virtual machine using the auth store
    this.vm = props.vm || null

    this.authstoreFuncUrl = `${this.authstoreFuncProt}//${this.prodHost}/${this.authstoreFuncPath}`

    this.cache = new StoreCache()
    this.writeBuffer = new StoreCache()

    this.lastWrite = this.cache.now

    setInterval(this.watch.bind(this), this.watchInterval)

    this.setInfo(`authstore ready ${this.authstoreFuncUrl}`)
  }

  get isDev(){
    return document.location.host !== this.prodHost
  }

  setItem(key, value){
    this.cache.setItem(key, value)
    this.writeBuffer.setItem(key, value)    
  }

  getItem(key){
    return new Promise(resolve => {
      const cached = this.cache.getItem(key)

      if(typeof cached !== "undefined"){
        resolve(cached)
        return
      }

      const stored = JSON.parse(localStorage.getItem(key))

      if(stored !== null){
        this.cache.setItem(key, stored)
        this.writeBuffer.setItem(key, stored)

        if(this.isDev && this.isRemoteKey(key)){
          setTimeout(_ => {
            resolve(stored)
          }, this.mockDelay * (0.5 + Math.random()))
        }else{
          resolve(stored)
        }

        return
      }

      if(this.isDev) return

      fetch(this.authstoreFuncUrl, {
        method: "POST",
        body: JSON.stringify({
          ACTION: "get",
          DOCUMENT_ID: key,
          LICHESS_TOKEN: localStorage.getItem("LICHESS_TOKEN"),
        })
      }).then(response => response.json().then(result => {
        console.log("authstore fetched", result)
        if(result){          
          const json = JSON.parse(result.content)
          this.cache.setItem(key, json)
          resolve(json)
        }else{
          this.cache.setItem(key, null)
          resolve(null)
        }
      }))
    })
  }

  shouldWrite(){
    if(this.writeBuffer.empty) return false

    if( ( this.writeBuffer.now - this.writeBuffer.lastWrite ) > this.writeDelay ) return true

    if( ( this.writeBuffer.now - this.lastWrite ) > this.maxWriteDelay ) return true

    return false
  }

  setInfo(info){
    console.log(info)

    if(this.vm){
      this.vm["authstoreInfo"] = info
    }
  }

  watch(){    
    if(this.shouldWrite()){      
      this.lastWrite = this.cache.now

      const size = this.writeBuffer.size
      
      if(this.isDev){
        for(let key in this.writeBuffer.cache){
          localStorage.setItem(key, JSON.stringify(this.writeBuffer.cache[key]))
        }

        this.setInfo(`written ${size} item(s) at ${this.writeBuffer.now}`)

        this.writeBuffer.clear()

        return
      }

      const bulk = Object.entries(this.writeBuffer.cache).map(entry => ({
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
      }))

      console.log("bulk", bulk)

      this.setInfo(`writing ${size} item(s) at ${this.writeBuffer.now}`)

      fetch(this.authstoreFuncUrl, {
          method: "POST",
          body: JSON.stringify({
            ACTION: "bulkwrite",
            DOCUMENT: JSON.stringify(bulk),
            LICHESS_TOKEN: localStorage.getItem("LICHESS_TOKEN"),
          })
        }).then(_ => {          
          this.setInfo(`written ${size} item(s) at ${this.writeBuffer.now}`)
      })

      this.writeBuffer.clear()
    }
  }
}