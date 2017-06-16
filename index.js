const commandLineArgs = require('command-line-args');
var csv = require('csv-parse');
var fs = require('fs');
const { exec } = require('child_process');

// TODO MPs werden nicht ordentlich hinzugefügt (?)

var	sbxStoreReading = fs.readFileSync("storeReading.snip.js").toString();


function initBLK() {
	var StromDAONode = require("stromdao-businessobject");
	var node = new StromDAONode.Node({external_id:"blk",testMode:true}); 
	node.mpsetfactory().then(function(mpsf) {
			mpsf.build().then(function(o) {
					node.storage.setItemSync("mpset",o);
					console.log("Build MPSet",o);
					node.stromkontoproxyfactory().then(function(sf) {				
						sf.build().then(function(o) {
							node.storage.setItemSync("stromkonto",o);
							console.log("Build Stromkonto",o);
							var stromkonto=o;
							node.clearingfactory().then(function(sf) {									
									sf.build(stromkonto).then(function(o) {							
										node.storage.setItemSync("clearing",o);	
										console.log("Build Clearing",o);
										var clearing=o;
										node.stromkontoproxy(stromkonto).then(function(sf) {
												sf.modifySender(clearing,true).then(function(o) {							
													process.exit(0);						
												});	
										});	
									});	
							});	
						});
					});
					
			});
	});	
}



function processCSVFile(fname) {
	var input = fs.readFileSync(fname);
	csv(input, {comment: '#',delimiter:',',from:2}, function(err, rows){
		for(var i=0;i<rows.length;i++) {				
				exec("node storeReading.snip.js -m "+rows[i][0]+" -r "+rows[i][1]);
		}
	});
}

function importMP(mps,idx) {
	if(idx>=mps.length) return;
	
	var StromDAONode = require("stromdao-businessobject");
	var node = new StromDAONode.Node({external_id:mps[idx][0],testMode:true}); 			
	
	var mpset=node.storage.getItemSync("mpset");			
	node.mpset(mpset).then(function(ms) {	
			ms.addMeterPoint(mps[idx][1]).then(function(o) {
				console.log("Added MP",mps[idx][0],mps[idx][1]);
				 idx++
				 importMP(mps,idx);					 
			});
	});
	
}
function importMPs(fname) {
	var input = fs.readFileSync(fname);
	csv(input, {comment: '#',delimiter:',',from:2}, function(err, rows){
		
		for(var i=0;i<rows.length;i++) {
				var StromDAONode = require("stromdao-businessobject");
				var address_node = new StromDAONode.Node({external_id:rows[i][0],testMode:true}); 
				rows[i][1]=address_node.wallet.address;
		}
		importMP(rows,0);				
	});

}

function printStromkonto(address) {
	var StromDAONode = require("stromdao-businessobject");
	var node = new StromDAONode.Node({external_id:"blk",testMode:true}); 
	var stromkonto_sc=node.storage.getItemSync("stromkonto");
	node.stromkonto(stromkonto_sc).then(function(stromkonto) {
			stromkonto.balancesHaben(address).then(function(o) {
			console.log("Haben",o);					
			});
			stromkonto.balancesSoll(address).then(function(o) {
			console.log("Soll",o);					
			});
	});
}

function clearTransactions(tx_cache) {
	var StromDAONode = require("stromdao-businessobject");
	var node = new StromDAONode.Node({external_id:"blk",testMode:true}); 
	node.clearing(clearing).then(function(c) {
			c.clear(tx_cache).then(function(o) {							
							console.log("Cleared",o);						
			});	
	});	
		
}
function settle(settlement) {
	var StromDAONode = require("stromdao-businessobject");
	var node = new StromDAONode.Node({external_id:"blk",testMode:true}); 
	console.log("Settle",settlement);
	node.settlement(settlement).then(function(s) {
		console.log("Start Settle");
			s.settle().then(function(o) {
					process.exit(0);
			});
	});	
}
function processDeltas(first,second) {
	var StromDAONode = require("stromdao-businessobject");
	var node = new StromDAONode.Node({external_id:"blk",testMode:true}); 
	var mpset=node.storage.getItemSync("mpset");	
	node.mprdecoratefactory().then(function(mprd) {
		mprd.build(mpset,first,second).then(function(mprd) {
			node.settlementfactory().then(function(sf) {
					sf.build(mpset,mprd,mprd,true).then(function(o) {							
						console.log("Created new Settlement",o);
						var settlement=o;
						node.settlement(settlement).then(function(mprd) {
							mprd.txcache().then(function(o) {
								console.log("With TX Cache in ",o);
								settle(settlement);
							});							
						});														
					});	
			});	
		});
	});
	
}
function storeMPR() {
	var StromDAONode = require("stromdao-businessobject");
	var node = new StromDAONode.Node({external_id:"blk",testMode:true}); 
	var mpset=node.storage.getItemSync("mpset");
	node.mprsetfactory().then(function(mpsf) {
						
						mpsf.build(mpset,node.options.defaultReading).then(function(o) {
							console.log("RETURN BUIKD");
							if(node.storage.getItemSync("mprset")!=o) {
								var old_mprset=node.storage.getItemSync("mprset");
								if((typeof old_mprset != "undefined")&&(old_mprset!=null)) {
									console.log("Processing Deltas of ",old_mprset,o);
									node.storage.setItemSync("mprset",o);
									processDeltas(old_mprset,o);									
								} else {
									node.storage.setItemSync("mprset",o);
									console.log("Saved snapshot of readings to MPRset (first set)",o);
									process.exit(0);
								}
							} else {
								
							}
						});							
	});		
}

const optionDefinitions = [
  { name: 'file', alias: 'f', type: String },
  { name: 'transactions', alias: 't', type: String },
   { name: 'address', alias: 'a', type: String },
  { name: 'cmd', type: String, multiple: false, defaultOption: true }
]

const options = commandLineArgs(optionDefinitions);

var StromDAONode = require("stromdao-businessobject");
var node = new StromDAONode.Node({external_id:"blk",testMode:true}); 
var mpset=node.storage.getItemSync("mpset");
var stromkonto=node.storage.getItemSync("stromkonto");
var clearing=node.storage.getItemSync("clearing");

if((typeof mpset =="undefined")||(mpset==null)) {
	console.log("Initializing");
	initBLK();	
} else {
	console.log("BLK",node.wallet.address);
	console.log("Meter Point Set:",mpset);
	console.log("Balance (Stromkonto):",stromkonto);
	console.log("Clearing:",clearing);
	if(options.cmd == "add") {
			importMPs(options.file);
	}
	if(options.cmd == "read") {
		if(typeof options.file != "undefined") {			
			processCSVFile(options.file);	
		}
	}
	if(options.cmd == "settle") {
			storeMPR();
	}
	if(options.cmd == "clear") {
			clearTransactions(options.transactions);
	}
	if(options.cmd == "print") {
			printStromkonto(options.address);	
	}
}
//
// Use or Create MPSet
// StoreReadings
// Ensure MPSet to be filled

