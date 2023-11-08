chcp 65001
call svn update
call npm install typescript -g
call npm run build
node ./dist/index.js