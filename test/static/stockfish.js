/*!
 * Stockfish copyright T. Romstad, M. Costalba, J. Kiiski, G. Linscott
 * and other contributors.
 *
 * Released under the GNU General Public License v3.
 *
 * Compiled to JavaScript and WebAssembly by Niklas Fiekas
 * <niklas.fiekas@backscattering.de> using Emscripten.
 *
 * https://github.com/niklasf/stockfish.wasm
 */

var Stockfish = (function() {
  var _scriptDir = typeof document !== 'undefined' && document.currentScript ? document.currentScript.src : undefined;
  if (typeof __filename !== 'undefined') _scriptDir = _scriptDir || __filename;
  return (
function(Stockfish) {
  Stockfish = Stockfish || {};


function c(){h.buffer!=k&&m(h.buffer);return aa}function n(){h.buffer!=k&&m(h.buffer);return ba}function q(){h.buffer!=k&&m(h.buffer);return ca}function r(){h.buffer!=k&&m(h.buffer);return da}function ea(){h.buffer!=k&&m(h.buffer);return fa}null;var w;w||(w=typeof Stockfish !== 'undefined' ? Stockfish : {});var ha,ia;w.ready=new Promise(function(a,b){ha=a;ia=b});
(function(){function a(){var f=e.shift();if(!b&&void 0!==f){if("quit"===f)return w.terminate();var l=w.ccall("uci_command","number",["string"],[f]);l&&e.unshift(f);g=l?2*g:1;setTimeout(a,g)}}var b=!1,d=[];w.print=function(f){0===d.length?console.log(f):setTimeout(function(){for(var l=0;l<d.length;l++)d[l](f)})};w.addMessageListener=function(f){d.push(f)};w.removeMessageListener=function(f){f=d.indexOf(f);0<=f&&d.splice(f,1)};w.terminate=function(){b=!0;x.Ca()};var e=[],g=1;w.postMessage=function(f){e.push(f)};
w.postRun=function(){w.postMessage=function(f){e.push(f);1===e.length&&a()};a()}})();
(function(){function a(){var f=e.shift();if(!b&&void 0!==f){if("quit"===f)return w.terminate();var l=w.ccall("uci_command","number",["string"],[f]);l&&e.unshift(f);g=l?2*g:1;setTimeout(a,g)}}var b=!1,d=[];w.print=function(f){0===d.length?console.log(f):setTimeout(function(){for(var l=0;l<d.length;l++)d[l](f)})};w.addMessageListener=function(f){d.push(f)};w.removeMessageListener=function(f){f=d.indexOf(f);0<=f&&d.splice(f,1)};w.terminate=function(){b=!0;x.Ca()};var e=[],g=1;w.postMessage=function(f){e.push(f)};
w.postRun=function(){w.postMessage=function(f){e.push(f);1===e.length&&a()};a()}})();var z={},A;for(A in w)w.hasOwnProperty(A)&&(z[A]=w[A]);var ja=[],ka="./this.program";function la(a,b){throw b;}var ma=!1,B=!1,C=!1;ma="object"===typeof window;B="function"===typeof importScripts;C="object"===typeof process&&"object"===typeof process.versions&&"string"===typeof process.versions.node;var D=w.ENVIRONMENT_IS_PTHREAD||!1;D&&(k=w.buffer,na=w.DYNAMIC_BASE,oa=w.DYNAMICTOP_PTR);var F="",G,H,I,J;
if(C){F=B?require("path").dirname(F)+"/":__dirname+"/";G=function(a,b){I||(I=require("fs"));J||(J=require("path"));a=J.normalize(a);return I.readFileSync(a,b?null:"utf8")};H=function(a){a=G(a,!0);a.buffer||(a=new Uint8Array(a));assert(a.buffer);return a};1<process.argv.length&&(ka=process.argv[1].replace(/\\/g,"/"));ja=process.argv.slice(2);process.on("uncaughtException",function(a){if(!(a instanceof K))throw a;});process.on("unhandledRejection",L);la=function(a){process.exit(a)};w.inspect=function(){return"[Emscripten Module object]"};
var pa;try{pa=require("worker_threads")}catch(a){throw console.error('The "worker_threads" module is not supported in this node.js build - perhaps a newer version is needed?'),a;}global.Worker=pa.Worker}else if(ma||B)B?F=self.location.href:document.currentScript&&(F=document.currentScript.src),_scriptDir&&(F=_scriptDir),0!==F.indexOf("blob:")?F=F.substr(0,F.lastIndexOf("/")+1):F="",C?(G=function(a,b){I||(I=require("fs"));J||(J=require("path"));a=J.normalize(a);return I.readFileSync(a,b?null:"utf8")},
H=function(a){a=G(a,!0);a.buffer||(a=new Uint8Array(a));assert(a.buffer);return a}):(G=function(a){var b=new XMLHttpRequest;b.open("GET",a,!1);b.send(null);return b.responseText},B&&(H=function(a){var b=new XMLHttpRequest;b.open("GET",a,!1);b.responseType="arraybuffer";b.send(null);return new Uint8Array(b.response)}));C&&"undefined"===typeof performance&&(global.performance=require("perf_hooks").performance);var qa=w.print||console.log.bind(console),M=console.warn.bind(console);
for(A in z)z.hasOwnProperty(A)&&(w[A]=z[A]);z=null;var N,noExitRuntime;"object"!==typeof WebAssembly&&L("no native wasm support detected");var h,ra=new WebAssembly.Table({initial:455,maximum:455,element:"anyfunc"}),sa,threadInfoStruct=0,selfThreadId=0,ta=!1;function assert(a,b){a||L("Assertion failed: "+b)}function ua(a){var b=w["_"+a];assert(b,"Cannot call unknown function "+a+", make sure it is exported");return b}
function va(a,b,d){d=b+d;for(var e="";!(b>=d);){var g=a[b++];if(!g)break;if(g&128){var f=a[b++]&63;if(192==(g&224))e+=String.fromCharCode((g&31)<<6|f);else{var l=a[b++]&63;g=224==(g&240)?(g&15)<<12|f<<6|l:(g&7)<<18|f<<12|l<<6|a[b++]&63;65536>g?e+=String.fromCharCode(g):(g-=65536,e+=String.fromCharCode(55296|g>>10,56320|g&1023))}}else e+=String.fromCharCode(g)}return e}function O(a){return a?va(n(),a,void 0):""}
function wa(a,b,d,e){if(0<e){e=d+e-1;for(var g=0;g<a.length;++g){var f=a.charCodeAt(g);if(55296<=f&&57343>=f){var l=a.charCodeAt(++g);f=65536+((f&1023)<<10)|l&1023}if(127>=f){if(d>=e)break;b[d++]=f}else{if(2047>=f){if(d+1>=e)break;b[d++]=192|f>>6}else{if(65535>=f){if(d+2>=e)break;b[d++]=224|f>>12}else{if(d+3>=e)break;b[d++]=240|f>>18;b[d++]=128|f>>12&63}b[d++]=128|f>>6&63}b[d++]=128|f&63}}b[d]=0}}
function xa(a){for(var b=0,d=0;d<a.length;++d){var e=a.charCodeAt(d);55296<=e&&57343>=e&&(e=65536+((e&1023)<<10)|a.charCodeAt(++d)&1023);127>=e?++b:b=2047>=e?b+2:65535>=e?b+3:b+4}b+=1;d=P(b);wa(a,c(),d,b);return d}var k,aa,ba,ca,da,fa;function m(a){k=a;w.HEAP8=aa=new Int8Array(a);w.HEAP16=new Int16Array(a);w.HEAP32=ca=new Int32Array(a);w.HEAPU8=ba=new Uint8Array(a);w.HEAPU16=new Uint16Array(a);w.HEAPU32=da=new Uint32Array(a);w.HEAPF32=new Float32Array(a);w.HEAPF64=fa=new Float64Array(a)}
var na=6338848,oa=1095040,ya=67108864;
if(D)h=w.wasmMemory,k=w.buffer;else if(h=new WebAssembly.Memory({initial:ya/65536,maximum:32768,shared:!0}),!(h.buffer instanceof SharedArrayBuffer))throw M("requested a shared WebAssembly.Memory but the returned buffer is not a SharedArrayBuffer, indicating that while the browser has SharedArrayBuffer it does not have WebAssembly threads support - you may need to set a flag"),C&&console.log("(on node you may need: --experimental-wasm-threads --experimental-wasm-bulk-memory and also use a recent version)"),Error("bad memory");
h&&(k=h.buffer);ya=k.byteLength;m(k);D||(q()[oa>>2]=na);function Q(a){for(;0<a.length;){var b=a.shift();if("function"==typeof b)b(w);else{var d=b.Ka;"number"===typeof d?void 0===b.wa?w.dynCall_v(d):w.dynCall_vi(d,b.wa):d(void 0===b.wa?null:b.wa)}}}var za=[],Aa=[],Ba=[],Ca=[],R=0,Da=null,S=null;w.preloadedImages={};w.preloadedAudios={};
function L(a){if(w.onAbort)w.onAbort(a);D&&console.error("Pthread aborting at "+Error().stack);M(a);ta=!0;a=new WebAssembly.RuntimeError("abort("+a+"). Build with -s ASSERTIONS=1 for more info.");ia(a);throw a;}function Ea(){var a=T;return String.prototype.startsWith?a.startsWith("data:application/octet-stream;base64,"):0===a.indexOf("data:application/octet-stream;base64,")}var T="stockfish.wasm";Ea()||(T=F+T);
function Fa(){try{if(H)return H(T);throw"both async and sync fetching of the wasm failed";}catch(a){L(a)}}function Ga(){return(ma||B)&&"function"===typeof fetch?fetch(T,{credentials:"same-origin"}).then(function(a){if(!a.ok)throw"failed to load wasm binary file at '"+T+"'";return a.arrayBuffer()}).catch(function(){return Fa()}):new Promise(function(a){a(Fa())})}var Ia={25215:function(a,b){setTimeout(function(){Ha(a,b)},0)},25293:function(){throw"Canceled!";}};D||Aa.push({Ka:function(){Ja()}});
var U=0,Ka=0,La=0;function V(a,b,d){U=a|0;La=b|0;Ka=d|0}w.registerPthreadPtr=V;function W(a,b){if(0>=a||a>c().length||a&1||0>b)return-28;if(0==b)return 0;2147483647<=b&&(b=Infinity);var d=Atomics.load(q(),273988),e=0;if(d==a&&Atomics.compareExchange(q(),273988,d,0)==d&&(--b,e=1,0>=b))return 1;a=Atomics.notify(q(),a>>2,b);if(0<=a)return a+e;throw"Atomics.notify returned an unexpected value "+a;}w._emscripten_futex_wake=W;
function Ma(a){if(D)throw"Internal Error! cleanupThread() can only ever be called from main application thread!";if(!a)throw"Internal Error! Null pthread_ptr in cleanupThread!";q()[a+12>>2]=0;(a=x.ra[a])&&x.ya(a.worker)}
var x={Wa:1,cb:{Ga:0,Ha:0},qa:[],sa:[],Na:function(){V(x.oa,!B,1);Na(x.oa)},Ma:function(){for(var a=0;1>a;++a)x.Da();x.oa=1095200;for(a=0;58>a;++a)r()[x.oa/4+a]=0;q()[x.oa+12>>2]=x.oa;a=x.oa+156;q()[a>>2]=a;for(a=0;128>a;++a)r()[273860+a]=0;Atomics.store(r(),x.oa+104>>2,1095440);Atomics.store(r(),x.oa+40>>2,x.oa);Atomics.store(r(),x.oa+44>>2,42)},Oa:function(){x.receiveObjectTransfer=x.Qa;x.setThreadStatus=x.Ra;x.threadCancel=x.Ta;x.threadExit=x.Ua},ra:{},Ja:[],Ra:function(){},Fa:function(){for(;0<
x.Ja.length;)x.Ja.pop()();D&&threadInfoStruct&&Oa()},Ua:function(a){var b=U|0;b&&(Atomics.store(r(),b+4>>2,a),Atomics.store(r(),b+0>>2,1),Atomics.store(r(),b+60>>2,1),Atomics.store(r(),b+64>>2,0),x.Fa(),W(b+0,2147483647),V(0,0,0),threadInfoStruct=0,D&&postMessage({cmd:"exit"}))},Ta:function(){x.Fa();Atomics.store(r(),threadInfoStruct+4>>2,-1);Atomics.store(r(),threadInfoStruct+0>>2,1);W(threadInfoStruct+0,2147483647);threadInfoStruct=selfThreadId=0;V(0,0,0);postMessage({cmd:"cancelDone"})},Ca:function(){for(var a in x.ra){var b=
x.ra[a];b&&b.worker&&x.ya(b.worker)}x.ra={};for(a=0;a<x.qa.length;++a){var d=x.qa[a];d.terminate()}x.qa=[];for(a=0;a<x.sa.length;++a)d=x.sa[a],b=d.pa,x.Ba(b),d.terminate();x.sa=[]},Ba:function(a){if(a){if(a.threadInfoStruct){var b=q()[a.threadInfoStruct+104>>2];q()[a.threadInfoStruct+104>>2]=0;X(b);X(a.threadInfoStruct)}a.threadInfoStruct=0;a.za&&a.ta&&X(a.ta);a.ta=0;a.worker&&(a.worker.pa=null)}},ya:function(a){delete x.ra[a.pa.Ia];x.qa.push(a);x.sa.splice(x.sa.indexOf(a),1);x.Ba(a.pa);a.pa=void 0},
Qa:function(){},Ea:function(a,b){a.onmessage=function(d){var e=d.data,g=e.cmd;a.pa&&(x.Aa=a.pa.threadInfoStruct);if(e.targetThread&&e.targetThread!=(U|0)){var f=x.ra[e.fb];f?f.worker.postMessage(d.data,e.transferList):console.error('Internal error! Worker sent a message "'+g+'" to target pthread '+e.targetThread+", but that thread no longer exists!")}else if("processQueuedMainThreadWork"===g)Y();else if("spawnThread"===g)Pa(d.data);else if("cleanupThread"===g)Ma(e.thread);else if("killThread"===g){d=
e.thread;if(D)throw"Internal Error! killThread() can only ever be called from main application thread!";if(!d)throw"Internal Error! Null pthread_ptr in killThread!";q()[d+12>>2]=0;d=x.ra[d];d.worker.terminate();x.Ba(d);x.sa.splice(x.sa.indexOf(d.worker),1);d.worker.pa=void 0}else if("cancelThread"===g){d=e.thread;if(D)throw"Internal Error! cancelThread() can only ever be called from main application thread!";if(!d)throw"Internal Error! Null pthread_ptr in cancelThread!";x.ra[d].worker.postMessage({cmd:"cancel"})}else"loaded"===
g?(a.loaded=!0,b&&b(a),a.xa&&(a.xa(),delete a.xa)):"print"===g?qa("Thread "+e.threadId+": "+e.text):"printErr"===g?M("Thread "+e.threadId+": "+e.text):"alert"===g?alert("Thread "+e.threadId+": "+e.text):"exit"===g?a.pa&&Atomics.load(r(),a.pa.Ia+68>>2)&&x.ya(a):"cancelDone"===g?x.ya(a):"objectTransfer"!==g&&("setimmediate"===d.data.target?a.postMessage(d.data):M("worker sent an unknown command "+g));x.Aa=void 0};a.onerror=function(d){M("pthread sent an error! "+d.filename+":"+d.lineno+": "+d.message)};
C&&(a.on("message",function(d){a.onmessage({data:d})}),a.on("error",function(d){a.onerror(d)}),a.on("exit",function(){console.log("worker exited - TODO: update the worker queue?")}));a.postMessage({cmd:"load",urlOrBlob:w.mainScriptUrlOrBlob||_scriptDir,wasmMemory:h,wasmModule:sa,DYNAMIC_BASE:na,DYNAMICTOP_PTR:oa})},Da:function(){x.qa.push(new Worker(F+"stockfish.worker.js"))},La:function(){0==x.qa.length&&(x.Da(),x.Ea(x.qa[0]));return 0<x.qa.length?x.qa.pop():null},Ya:function(a){for(a=performance.now()+
a;performance.now()<a;);}};w.establishStackSpace=function(a){Qa(a)};w.getNoExitRuntime=function(){return noExitRuntime};var Ra;Ra=C?function(){var a=process.hrtime();return 1E3*a[0]+a[1]/1E6}:D?function(){return performance.now()-w.__performance_now_clock_drift}:function(){return performance.now()};var Sa={},Ta=[null,[],[]],Ua={};function Va(a,b,d){return D?Z(2,1,a,b,d):0}function Wa(a,b,d){return D?Z(3,1,a,b,d):0}
function Xa(a,b){if(D)a=Z(4,1,a,b);else if(-1===(a|0)||0===b)a=-28;else{var d=Sa[a];d&&b===d.bb&&(Sa[a]=null,d.Xa&&X(d.eb));a=0}return a}function Ya(a,b,d){if(D)return Z(5,1,a,b,d)}
function Za(){C||B||(N||(N={}),N["Blocking on the main thread is very dangerous, see https://emscripten.org/docs/porting/pthreads.html#blocking-on-the-main-browser-thread"]||(N["Blocking on the main thread is very dangerous, see https://emscripten.org/docs/porting/pthreads.html#blocking-on-the-main-browser-thread"]=1,M("Blocking on the main thread is very dangerous, see https://emscripten.org/docs/porting/pthreads.html#blocking-on-the-main-browser-thread")))}
function $a(a,b,d){if(0>=a||a>c().length||a&1)return-28;if(B){a=Atomics.wait(q(),a>>2,b,d);if("timed-out"===a)return-73;if("not-equal"===a)return-6;if("ok"===a)return 0;throw"Atomics.wait returned an unexpected value "+a;}var e=Atomics.load(q(),a>>2);if(b!=e)return-6;b=performance.now();d=b+d;Atomics.store(q(),273988,a);for(e=a;a==e;){b=performance.now();if(b>d)return-73;Y();a=Atomics.load(q(),273988)}return 0}
function Z(a,b){for(var d=arguments.length-2,e=ab(),g=P(8*d),f=g>>3,l=0;l<d;l++)ea()[f+l]=arguments[2+l];d=bb(a,d,g,b);Qa(e);return d}var cb=[],db=[],eb={};function fb(){if(!gb){var a={USER:"web_user",LOGNAME:"web_user",PATH:"/",PWD:"/",HOME:"/home/web_user",LANG:("object"===typeof navigator&&navigator.languages&&navigator.languages[0]||"C").replace("-","_")+".UTF-8",_:ka||"./this.program"},b;for(b in eb)a[b]=eb[b];var d=[];for(b in a)d.push(b+"="+a[b]);gb=d}return gb}var gb;
function hb(a){return D?Z(6,1,a):0}function ib(a,b,d,e){if(D)return Z(7,1,a,b,d,e);a=Ua.ab(a);b=Ua.$a(a,b,d);q()[e>>2]=b;return 0}function jb(a,b,d,e,g){if(D)return Z(8,1,a,b,d,e,g)}function kb(a,b,d,e){if(D)return Z(9,1,a,b,d,e);for(var g=0,f=0;f<d;f++){for(var l=q()[b+8*f>>2],t=q()[b+(8*f+4)>>2],v=0;v<t;v++){var p=n()[l+v],u=Ta[a];0===p||10===p?((1===a?qa:M)(va(u,0)),u.length=0):u.push(p)}g+=t}q()[e>>2]=g;return 0}
function Pa(a){if(D)throw"Internal Error! spawnThread() can only ever be called from main application thread!";var b=x.La();if(void 0!==b.pa)throw"Internal error!";if(!a.ua)throw"Internal error, no pthread ptr!";x.sa.push(b);for(var d=lb(512),e=0;128>e;++e)q()[d+4*e>>2]=0;var g=a.ta+a.va;e=x.ra[a.ua]={worker:b,ta:a.ta,va:a.va,za:a.za,Ia:a.ua,threadInfoStruct:a.ua};var f=e.threadInfoStruct>>2;Atomics.store(r(),f,0);Atomics.store(r(),f+1,0);Atomics.store(r(),f+2,0);Atomics.store(r(),f+17,a.detached);
Atomics.store(r(),f+26,d);Atomics.store(r(),f+12,0);Atomics.store(r(),f+10,e.threadInfoStruct);Atomics.store(r(),f+11,42);Atomics.store(r(),f+27,a.va);Atomics.store(r(),f+21,a.va);Atomics.store(r(),f+20,g);Atomics.store(r(),f+29,g);Atomics.store(r(),f+30,a.detached);Atomics.store(r(),f+32,a.Ga);Atomics.store(r(),f+33,a.Ha);d=mb()+40;Atomics.store(r(),f+44,d);b.pa=e;var l={cmd:"run",start_routine:a.Sa,arg:a.wa,threadInfoStruct:a.ua,selfThreadId:a.ua,parentThreadId:a.Pa,stackBase:a.ta,stackSize:a.va};
b.xa=function(){l.time=performance.now();b.postMessage(l,a.Va)};b.loaded&&(b.xa(),delete b.xa)}function nb(){return U|0}w._pthread_self=nb;
function ob(a,b){if(!a)return M("pthread_join attempted on a null thread pointer!"),71;if(D&&selfThreadId==a)return M("PThread "+a+" is attempting to join to itself!"),16;if(!D&&x.oa==a)return M("Main thread "+a+" is attempting to join to itself!"),16;if(q()[a+12>>2]!==a)return M("pthread_join attempted on thread "+a+", which does not point to a valid thread, or does not exist anymore!"),71;if(Atomics.load(r(),a+68>>2))return M("Attempted to join thread "+a+", which was already detached!"),28;for(Za();;){var d=
Atomics.load(r(),a+0>>2);if(1==d)return d=Atomics.load(r(),a+4>>2),b&&(q()[b>>2]=d),Atomics.store(r(),a+68>>2,1),D?postMessage({cmd:"cleanupThread",thread:a}):Ma(a),0;if(D&&threadInfoStruct&&!Atomics.load(r(),threadInfoStruct+60>>2)&&2==Atomics.load(r(),threadInfoStruct+0>>2))throw"Canceled!";D||Y();$a(a+0,d,D?100:1)}}D?x.Oa():x.Ma();
var pb=[null,function(a,b){if(D)return Z(1,1,a,b)},Va,Wa,Xa,Ya,hb,ib,jb,kb],ub={g:function(a,b,d,e){L("Assertion failed: "+O(a)+", at: "+[b?O(b):"unknown filename",d,e?O(e):"unknown function"])},D:function(){q()[qb()>>2]=63;return-1},n:Va,r:Wa,C:Xa,s:Ya,x:function(a,b){if(a==b)postMessage({cmd:"processQueuedMainThreadWork"});else if(D)postMessage({targetThread:a,cmd:"processThreadQueue"});else{a=(a=x.ra[a])&&a.worker;if(!a)return;a.postMessage({cmd:"processThreadQueue"})}return 1},e:function(){L()},
G:function(a,b){if(0===a)a=Date.now();else if(1===a||4===a)a=Ra();else return q()[qb()>>2]=28,-1;q()[b>>2]=a/1E3|0;q()[b+4>>2]=a%1E3*1E6|0;return 0},j:function(a,b,d){db.length=0;var e;for(d>>=2;e=n()[b++];)(e=105>e)&&d&1&&d++,db.push(e?ea()[d++>>1]:q()[d]),++d;return Ia[a].apply(null,db)},A:Za,p:function(){},d:$a,f:W,b:Ra,h:function(){return La|0},y:function(){return Ka|0},v:function(a,b,d){n().copyWithin(a,b,b+d)},w:function(a,b,d){cb.length=b;d>>=3;for(var e=0;e<b;e++)cb[e]=ea()[d+e];return(0>
a?Ia[-a-1]:pb[a]).apply(null,cb)},i:function(a){a>>>=0;var b=n().length;if(a<=b||2147483648<a)return!1;for(var d=1;4>=d;d*=2){var e=b*(1+.2/d);e=Math.min(e,a+100663296);e=Math.max(16777216,a,e);0<e%65536&&(e+=65536-e%65536);a:{try{h.grow(Math.min(2147483648,e)-k.byteLength+65535>>>16);m(h.buffer);var g=1;break a}catch(f){}g=void 0}if(g)return!0}return!1},c:function(){},E:function(a,b){var d=0;fb().forEach(function(e,g){var f=b+d;g=q()[a+4*g>>2]=f;for(f=0;f<e.length;++f)c()[g++>>0]=e.charCodeAt(f);
c()[g>>0]=0;d+=e.length+1});return 0},F:function(a,b){var d=fb();q()[a>>2]=d.length;var e=0;d.forEach(function(g){e+=g.length+1});q()[b>>2]=e;return 0},k:function(a){rb(a)},l:hb,q:ib,t:jb,m:kb,u:function(){x.Na()},memory:h||w.wasmMemory,o:function(a,b,d,e){if("undefined"===typeof SharedArrayBuffer)return M("Current environment does not support SharedArrayBuffer, pthreads are not available!"),6;if(!a)return M("pthread_create called with a null thread pointer!"),28;var g=[];if(D&&0===g.length)return sb(687865856,
a,b,d,e);var f=0,l=0,t=0,v=0;if(b){var p=q()[b>>2];p+=81920;f=q()[b+8>>2];l=0!==q()[b+12>>2];if(0===q()[b+16>>2]){var u=q()[b+20>>2],E=q()[b+24>>2];t=b+20;v=b+24;var y=x.Aa?x.Aa:U|0;if(t||v)if(y)if(q()[y+12>>2]!==y)M("pthread_getschedparam attempted on thread "+y+", which does not point to a valid thread, or does not exist anymore!");else{var wb=Atomics.load(r(),y+108+20>>2);y=Atomics.load(r(),y+108+24>>2);t&&(q()[t>>2]=wb);v&&(q()[v>>2]=y)}else M("pthread_getschedparam called with a null thread pointer!");
t=q()[b+20>>2];v=q()[b+24>>2];q()[b+20>>2]=u;q()[b+24>>2]=E}else t=q()[b+20>>2],v=q()[b+24>>2]}else p=2097152;(b=0==f)?f=tb(16,p):(f-=p,assert(0<f));u=lb(232);for(E=0;58>E;++E)r()[(u>>2)+E]=0;q()[a>>2]=u;q()[u+12>>2]=u;a=u+156;q()[a>>2]=a;d={ta:f,va:p,za:b,Ga:t,Ha:v,detached:l,Sa:d,ua:u,Pa:U|0,wa:e,Va:g};D?(d.Za="spawnThread",postMessage(d,g)):Pa(d);return 0},z:function(a,b){return ob(a,b)},a:nb,B:function(){L("strftime")},table:ra};
(function(){function a(g,f){w.asm=g.exports;sa=f;if(!D){var l=x.qa.length;x.qa.forEach(function(t){x.Ea(t,function(){if(!--l&&(R--,0==R&&(null!==Da&&(clearInterval(Da),Da=null),S))){var v=S;S=null;v()}})})}}function b(g){a(g.instance,g.module)}function d(g){return Ga().then(function(f){return WebAssembly.instantiate(f,e)}).then(g,function(f){M("failed to asynchronously prepare wasm: "+f);L(f)})}var e={a:ub};D||(assert(!D,"addRunDependency cannot be used in a pthread worker"),R++);if(w.instantiateWasm)try{return w.instantiateWasm(e,
a)}catch(g){return M("Module.instantiateWasm callback failed with error: "+g),!1}(function(){if("function"!==typeof WebAssembly.instantiateStreaming||Ea()||"function"!==typeof fetch)return d(b);fetch(T,{credentials:"same-origin"}).then(function(g){return WebAssembly.instantiateStreaming(g,e).then(b,function(f){M("wasm streaming compile failed: "+f);M("falling back to ArrayBuffer instantiation");return d(b)})})})();return{}})();
var Ja=w.___wasm_call_ctors=function(){return(Ja=w.___wasm_call_ctors=w.asm.H).apply(null,arguments)};w._main=function(){return(w._main=w.asm.I).apply(null,arguments)};var lb=w._malloc=function(){return(lb=w._malloc=w.asm.J).apply(null,arguments)},X=w._free=function(){return(X=w._free=w.asm.K).apply(null,arguments)};w._uci_command=function(){return(w._uci_command=w.asm.L).apply(null,arguments)};
var qb=w.___errno_location=function(){return(qb=w.___errno_location=w.asm.M).apply(null,arguments)},mb=w._emscripten_get_global_libc=function(){return(mb=w._emscripten_get_global_libc=w.asm.N).apply(null,arguments)};w.___em_js__initPthreadsJS=function(){return(w.___em_js__initPthreadsJS=w.asm.O).apply(null,arguments)};
var ab=w.stackSave=function(){return(ab=w.stackSave=w.asm.P).apply(null,arguments)},Qa=w.stackRestore=function(){return(Qa=w.stackRestore=w.asm.Q).apply(null,arguments)},P=w.stackAlloc=function(){return(P=w.stackAlloc=w.asm.R).apply(null,arguments)},tb=w._memalign=function(){return(tb=w._memalign=w.asm.S).apply(null,arguments)};w._emscripten_main_browser_thread_id=function(){return(w._emscripten_main_browser_thread_id=w.asm.T).apply(null,arguments)};
var Oa=w.___pthread_tsd_run_dtors=function(){return(Oa=w.___pthread_tsd_run_dtors=w.asm.U).apply(null,arguments)},Y=w._emscripten_main_thread_process_queued_calls=function(){return(Y=w._emscripten_main_thread_process_queued_calls=w.asm.V).apply(null,arguments)};w._emscripten_current_thread_process_queued_calls=function(){return(w._emscripten_current_thread_process_queued_calls=w.asm.W).apply(null,arguments)};
var Na=w._emscripten_register_main_browser_thread_id=function(){return(Na=w._emscripten_register_main_browser_thread_id=w.asm.X).apply(null,arguments)},Ha=w._do_emscripten_dispatch_to_thread=function(){return(Ha=w._do_emscripten_dispatch_to_thread=w.asm.Y).apply(null,arguments)};w._emscripten_async_run_in_main_thread=function(){return(w._emscripten_async_run_in_main_thread=w.asm.Z).apply(null,arguments)};
w._emscripten_sync_run_in_main_thread=function(){return(w._emscripten_sync_run_in_main_thread=w.asm._).apply(null,arguments)};w._emscripten_sync_run_in_main_thread_0=function(){return(w._emscripten_sync_run_in_main_thread_0=w.asm.$).apply(null,arguments)};w._emscripten_sync_run_in_main_thread_1=function(){return(w._emscripten_sync_run_in_main_thread_1=w.asm.aa).apply(null,arguments)};
w._emscripten_sync_run_in_main_thread_2=function(){return(w._emscripten_sync_run_in_main_thread_2=w.asm.ba).apply(null,arguments)};w._emscripten_sync_run_in_main_thread_xprintf_varargs=function(){return(w._emscripten_sync_run_in_main_thread_xprintf_varargs=w.asm.ca).apply(null,arguments)};w._emscripten_sync_run_in_main_thread_3=function(){return(w._emscripten_sync_run_in_main_thread_3=w.asm.da).apply(null,arguments)};
var sb=w._emscripten_sync_run_in_main_thread_4=function(){return(sb=w._emscripten_sync_run_in_main_thread_4=w.asm.ea).apply(null,arguments)};w._emscripten_sync_run_in_main_thread_5=function(){return(w._emscripten_sync_run_in_main_thread_5=w.asm.fa).apply(null,arguments)};w._emscripten_sync_run_in_main_thread_6=function(){return(w._emscripten_sync_run_in_main_thread_6=w.asm.ga).apply(null,arguments)};
w._emscripten_sync_run_in_main_thread_7=function(){return(w._emscripten_sync_run_in_main_thread_7=w.asm.ha).apply(null,arguments)};var bb=w._emscripten_run_in_main_runtime_thread_js=function(){return(bb=w._emscripten_run_in_main_runtime_thread_js=w.asm.ia).apply(null,arguments)};w.__emscripten_call_on_thread=function(){return(w.__emscripten_call_on_thread=w.asm.ja).apply(null,arguments)};w._emscripten_tls_init=function(){return(w._emscripten_tls_init=w.asm.ka).apply(null,arguments)};
w.dynCall_vi=function(){return(w.dynCall_vi=w.asm.la).apply(null,arguments)};w.dynCall_ii=function(){return(w.dynCall_ii=w.asm.ma).apply(null,arguments)};w.dynCall_v=function(){return(w.dynCall_v=w.asm.na).apply(null,arguments)};
w.ccall=function(a,b,d,e){var g={string:function(p){var u=0;if(null!==p&&void 0!==p&&0!==p){var E=(p.length<<2)+1,y=u=P(E);wa(p,n(),y,E)}return u},array:function(p){var u=P(p.length);c().set(p,u);return u}},f=ua(a),l=[];a=0;if(e)for(var t=0;t<e.length;t++){var v=g[d[t]];v?(0===a&&(a=ab()),l[t]=v(e[t])):l[t]=e[t]}d=f.apply(null,l);d=function(p){return"string"===b?O(p):"boolean"===b?!!p:p}(d);0!==a&&Qa(a);return d};w.PThread=x;w.PThread=x;w._pthread_self=nb;w.wasmMemory=h;w.ExitStatus=K;var vb;
function K(a){this.name="ExitStatus";this.message="Program terminated with exit("+a+")";this.status=a}S=function xb(){vb||yb();vb||(S=xb)};
function yb(a){a=a||ja;if(!(0<R||(D||Q(za),0<R||vb||(vb=!0,w.calledRun=!0,ta)))){Q(Aa);D||Q(Ba);ha(w);if(w.onRuntimeInitialized)w.onRuntimeInitialized();if(zb){var b=w._main;a=a||[];var d=a.length+1,e=P(4*(d+1));q()[e>>2]=xa(ka);for(var g=1;g<d;g++)q()[(e>>2)+g]=xa(a[g-1]);q()[(e>>2)+d]=0;try{var f=b(d,e);rb(f,!0)}catch(l){l instanceof K||("unwind"==l?noExitRuntime=!0:((b=l)&&"object"===typeof l&&l.stack&&(b=[l,l.stack]),M("exception thrown: "+b),la(1,l)))}finally{}}if(!D){if(w.postRun)for("function"==
typeof w.postRun&&(w.postRun=[w.postRun]);w.postRun.length;)b=w.postRun.shift(),Ca.unshift(b);Q(Ca)}}}w.run=yb;function rb(a,b){b&&noExitRuntime&&0===a||(noExitRuntime||(x.Ca(),ta=!0),la(a,new K(a)))}var zb=!0;D||(noExitRuntime=!0);D?ha(w):yb();


  return Stockfish.ready
}
);
})();
if (typeof exports === 'object' && typeof module === 'object')
      module.exports = Stockfish;
    else if (typeof define === 'function' && define['amd'])
      define([], function() { return Stockfish; });
    else if (typeof exports === 'object')
      exports["Stockfish"] = Stockfish;
    