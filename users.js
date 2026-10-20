const fs=require('fs'),path=require('path');const F=path.join(__dirname,'users.json');
exports.load=()=>fs.existsSync(F)?JSON.parse(fs.readFileSync(F,'utf8')):{};
exports.save=u=>{fs.writeFileSync(F,JSON.stringify(u,null,2));fs.chmodSync(F,0o600);};
