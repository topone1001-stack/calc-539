const bcrypt=require('bcryptjs'),U=require('./users');
const [u,p]=process.argv.slice(2);if(!u||!p){console.error('用法: node add-user.js <帳號> <密碼>');process.exit(1);}
if(p.length<8){console.error('密碼至少 8 字元');process.exit(1);}
require('./store').init().then(async()=>{const users=U.load();users[u]={hash:bcrypt.hashSync(p,12)};U.save(users);console.log('已新增/更新使用者:',u);});
