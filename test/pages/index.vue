<template>
  <div>
    <div v-if="local">
      Local <button v-on:click="switchh">Switch to Npm</button>
      <hr>
      <VuechessgroundLocal :uploadapplycompression="true" :username="username" :hastraining="true" v-on:moveplayed="moveplayed" />
    </div>
    <div v-else>
      Npm <button v-on:click="switchh">Switch to Local</button>
      <hr>
      <VuechessgroundNpm :uploadapplycompression="true" :username="username" :hastraining="true" v-on:moveplayed="moveplayed" />
    </div>
    <!--<iframe src="/root.html"></iframe>-->
  </div>
</template>

<script>
import VuechessgroundLocal from "../../src/index.vue"

import VuechessgroundNpm from "@publishvue/vuechessground"
//import "@publishvue/vuechessground/dist/vuechessground.css"

export default {
  components: {
    VuechessgroundLocal,
    VuechessgroundNpm
  },
  data(){
    return {
      local: true,
      username: "hyperchessbotauthor",
    }    
  },
  methods: {
    switchh(){
      this.local = !this.local
    },    
    moveplayed(ev){
      //console.log(ev)
    }
  },
  head(){
    return {
      title: "Opening Trainer",      
      /*script: [
        {          
          src: "/stockfish.js",
          defer: true,
          callback: _ => {
            console.log("callback")
            Stockfish().then(sf => {
              sf.addMessageListener(line => {
              console.log(line);
            });

            sf.postMessage('uci');
            });
          }
        }
      ]*/
    }
  },
  mounted(){    
  }
}
</script>
