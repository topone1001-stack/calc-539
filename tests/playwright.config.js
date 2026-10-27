// 執行：cd tests && npx playwright test   （需要 ../ADMIN_PASSWORD.txt 或環境變數 CALC_ADMIN_PW）
module.exports={testDir:'.',timeout:15*60e3,workers:1,reporter:[['list']],
 use:{actionTimeout:10000,navigationTimeout:20000,baseURL:process.env.CALC_URL||'https://calc-539.onrender.com',launchOptions:{executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox']}},
 projects:[{name:'phone',use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}},{name:'pc',use:{viewport:{width:1440,height:900}}}]};
