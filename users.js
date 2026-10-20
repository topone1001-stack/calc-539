const S=require('./store');
exports.load=()=>JSON.parse(JSON.stringify(S.get('users')||{}));
exports.save=u=>{S.set('users',u).catch(e=>console.error('save users failed',e.message));};
