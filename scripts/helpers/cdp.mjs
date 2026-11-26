export class CDP {
  constructor(socket) { this.socket=socket;this.id=0;this.pending=new Map();this.errors=[];socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=this.pending.get(m.id);this.pending.delete(m.id);if(m.error)p.reject(Error(JSON.stringify(m.error)));else p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')this.errors.push(m.params);}); }
  static async connect(url) { const socket=new WebSocket(url);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});return new CDP(socket); }
  send(method,params={}) { return new Promise((resolve,reject)=>{const id=++this.id;this.pending.set(id,{resolve,reject});this.socket.send(JSON.stringify({id,method,params}));}); }
  async evaluate(expression) {const r=await this.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
}
export const browser=await CDP.connect((await (await fetch('http://127.0.0.1:9228/json/version')).json()).webSocketDebuggerUrl);
