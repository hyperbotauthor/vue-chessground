export default function({res}){
  res?.setHeader("Cross-Origin-Embedder-Policy", "require-corp")
}