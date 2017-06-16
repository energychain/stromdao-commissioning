rm -Rf .node-persist/
node cli.js 1337 -i
node cli.js 1337 -a -F reading_1.csv
sleep 5
node cli.js 1337 -r -F reading_1.csv
sleep 5
node cli.js 1337 --snapshot 
sleep 5
node cli.js 1337 -r -F reading_2.csv
sleep 5
node cli.js 1337 --snapshot 
sleep 5
node cli.js 1337 --next
sleep 5
node cli.js 1337 --next
sleep 5
node cli.js 1337 --next
sleep 5
node cli.js 1337 --next
sleep 5
node cli.js 1337 --next
sleep 5
node cli.js 1337 --next
sleep 5
