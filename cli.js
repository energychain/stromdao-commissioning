const commandLineArgs = require('command-line-args');
var csv = require('csv-parse');
var fs = require('fs');
const { exec } = require('child_process');

const optionDefinitions = [
  { name: 'init', alias: 'i', type: Boolean },
  { name: 'settle', alias: 's', type: String },
  { name: 'clearing', alias: 'c', type: String },
  { name: 'file', alias: 'F', type: String },
  { name: 'meterpoint', alias: 'M', type: String },
  { name: 'address', alias: 'A', type: String },
  { name: 'bravo', alias: 'B', type: String },
  { name: 'extid', alias: 'E', type: String },
  { name: 'delta', alias: 'd', type: Boolean },
  { name: 'add', alias: 'a', type: Boolean },
  { name: 'autoclear',type: Boolean },
  { name: 'capture',type: Boolean },  
  { name: 'next',type: Boolean },  
  { name: 'snapshot', type: Boolean },
  { name: 'txcache', type: String },
  { name: 'Reading', alias: 'R', type: Number },
   { name: 'comenergy', type: Number },
  { name: 'reading', alias: 'r', type: Boolean },
  { name: 'mpid', type: String, multiple: false, defaultOption: true }
]

const options = commandLineArgs(optionDefinitions);
var mpid=options.mpid;

var StromDAONode = require("stromdao-businessobject");
var node = new StromDAONode.Node({external_id:options.mpid,testMode:true}); 

console.log("Starting as",options.mpid,node.wallet.address);
if(options.next) {
	var c=node.storage.getItemSync("continue");
	if((typeof c!="undefined")&&(c.length>0)) {
		
		node.storage.setItemSync("continue","");
		cmdo={};
		console.log("=>Continue with:",c);									
		exec(c,cmdo,(error, stdout, stderr) => {
		  if (error) {
			console.error(`exec error: ${error}`);
			return;
		  }					
		  console.log(stdout);	
		  process.exit(0);			 
		});
	}
}
if(options.init) {
console.log("=>Init");
node.mpsetfactory().then(function(mpsf) {
			mpsf.build().then(function(o) {
					node.storage.setItemSync(mpid+"mpset",o);
					console.log("Build MPSet",o);
					node.stromkontoproxyfactory().then(function(sf) {				
						sf.build().then(function(o) {
							node.storage.setItemSync(mpid+"stromkonto",o);
							console.log("Build Stromkonto",o);
							var stromkonto=o;
							node.clearingfactory().then(function(sf) {									
									sf.build(stromkonto).then(function(o) {							
										node.storage.setItemSync(mpid+"clearing",o);	
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
var mpset=node.storage.getItemSync(mpid+"mpset");
var stromkonto=node.storage.getItemSync(mpid+"stromkonto");
var clearing=node.storage.getItemSync(mpid+"clearing");

console.log("- MPSet:",mpset);
console.log("- Stromkonto:",stromkonto);
console.log("- Clearing:",clearing);
console.log("");
if(typeof options.add !="undefined") {
		console.log("=>Add Meterpoint");
		if(typeof options.file!="undefined") {
				var input = fs.readFileSync(options.file);
				csv(input, {comment: '#',delimiter:',',from:2}, function(err, rows){
					for(var i=0;i<rows.length;i++) {
						exec("node cli.js "+options.mpid+" -a -M "+rows[i][0]+"");		
						//console.log("node cli.js "+options.mpid+" -a -M "+rows[i][0]+"");		
					}
				});
		} 
		
		if(typeof options.meterpoint!="undefined") {			
			var node = new StromDAONode.Node({external_id:options.meterpoint,testMode:true}); 
			options.address=node.wallet.address;			
		}
		if(typeof options.extid!="undefined") {
			options.meterpoint=options.extid;
		}
		if(typeof options.address!="undefined") {
			node.storage.setItemSync("mp_"+options.meterpoint,options.address);
			node.storage.setItemSync("a_"+options.address,options.meterpoint);
			node.mpset(mpset).then(function(ms) {	
				ms.addMeterPoint(options.address).then(function(o) {
					console.log("Added Meterpoint",options.meterpoint,options.address);
					process.exit(0);				 
				});
			});
		}
} else
if(typeof options.snapshot !="undefined") {
	console.log("=>Snapshot");
	node.mprsetfactory().then(function(mpsf) {			
		mpsf.build(mpset,node.options.defaultReading).then(function(o) {
			console.log("Snapshot:",o);
			var lastDelta = node.storage.getItemSync(mpid+"_lastSnapshot");
			node.storage.setItemSync(mpid+"_lastSnapshot",o);
			if((typeof options.autoclear =="undefined")||(typeof lastDelta =="undefined")) {		
				console.log("Continue with:","node cli.js "+options.mpid+" --delta --address "+lastDelta+" --bravo "+o+"");	
				node.storage.setItemSync("continue","node cli.js "+options.mpid+" --delta --address "+lastDelta+" --bravo "+o+"");					
				process.exit(0);
			} else {
				cmdo={};
				exec("node cli.js "+options.mpid+" --delta --address "+lastDelta+" --bravo "+o+" --comenergy "+options.comenergy+"",cmdo,(error, stdout, stderr) => {
				  if (error) {
					console.error(`exec error: ${error}`);
					return;
				  }					
				  console.log(stdout);	
				  process.exit(0);			 
				});
	
				//process.exit(0);
			}
		});
	});				
}  else
if(typeof options.delta != "undefined") {
	console.log("=>Delta");	
		node.mprdecoratefactory().then(function(mprdf) {	
			mprdf.build(mpset,options.address,options.bravo).then(function(mprd) {
					if(mprd==options.bravo) {
							console.log("TX FAIL");
							console.log("Continue with:","node cli.js "+options.mpid+" --delta --address "+options.address+" --bravo "+options.bravo+"");	
							node.storage.setItemSync("continue","node cli.js "+options.mpid+" --delta --address "+options.address+" --bravo "+options.bravo+"");	
							process.exit(0);
					}
					console.log("Decorator:",mprd);	
					node.storage.setItemSync("decorator",mprd);												
					if(typeof options.autoclear =="undefined") {		
						console.log("Continue with","node cli.js "+options.mpid+" --capture --address "+mprd+"");		
						node.storage.setItemSync("continue","node cli.js "+options.mpid+" --capture --address "+mprd+"");				
						process.exit(0);
					} else {
						cmdo={};
							
						exec("node cli.js "+options.mpid+" --capture --address "+mprd+"",cmdo,(error, stdout, stderr) => {
						  if (error) {
							console.error(`exec error: ${error}`);
							return;
						  }					
						  console.log(stdout);	
						  process.exit(0);			 
						});
					}
			});
	});
} else
if(typeof options.comenergy != "undefined") {
	console.log("=>Decorate");
	if(typeof node.storage.getItemSync("decorator")=="undefined") {
			console.log("Missing Decorator");
			process.exit(1);
	}
	node.mprdecorate(node.storage.getItemSync("decorator")).then(function(mprd) {
		mprd.ChargeEnergy(options.comenergy).then(function(o) {
		console.log("Decorated",	options.comenergy);
		});
	});	
} else
if(typeof options.capture !="undefined") {
	console.log("=>Capture");
		node.settlementfactory().then(function(sf) {
			sf.build(mpset,true).then(function(o) {	
				if(o==options.address) {
						console.log("TX FAIL");
						console.log("Continue with","node cli.js "+options.mpid+" --capture --address "+options.address+"");		
						node.storage.setItemSync("continue","node cli.js "+options.mpid+" --capture --address "+options.address+"");	
						process.exit(0);
				}						
				console.log("Settlement:",o);
				var settlement=o;
				
				if(typeof options.autoclear =="undefined") {	
					node.storage.setItemSync("continue","node cli.js "+options.mpid+" --settle "+o+" --address "+options.address);
					console.log("Continue with:","node cli.js "+options.mpid+" --settle "+o+" --address "+options.address);							
					process.exit(0);
				} else {
					cmdo={};
						
					exec("node cli.js "+options.mpid+" --settle "+o+" --address "+options.address+"",cmdo,(error, stdout, stderr) => {
					  if (error) {
						console.error(`exec error: ${error}`);
						return;
					  }					
					  console.log(stdout);	
					  process.exit(0);			 
					});
				}
			});
	});
} else
if(typeof options.settle !="undefined") {
	console.log("=>Settlement");
	node.settlement(options.settle).then(function(s) {				
		s.settle(options.address).then(function(o) {
			console.log("Settled",o);			
					if(typeof options.autoclear =="undefined") {		
						console.log("Continue with:","node cli.js "+options.mpid+" --txcache "+options.settle+"");	
						node.storage.setItemSync("continue","node cli.js "+options.mpid+" --txcache "+options.settle+"");					
						process.exit(0);
					} else {
																	
						cmdo={};
									
						exec("node cli.js "+options.mpid+" --txcache "+options.settle+" ",cmdo,(error, stdout, stderr) => {
						  if (error) {
							console.error(`exec error: ${error}`);
							return;
						  }					
						  console.log(stdout);	
						  process.exit(0);			 
						});
					}			
			});									
	});
} else 
if(typeof options.txcache != "undefined") {
	console.log("=>TXCache");
	node.settlement(options.txcache).then(function(s) {
		s.txcache().then(function(txc) {
			console.log("TX Cache:",txc);
					if(typeof options.autoclear =="undefined") {		
						console.log("Continue with:","node cli.js "+options.mpid+" --clearing "+txc+"");	
						node.storage.setItemSync("continue","node cli.js "+options.mpid+" --clearing "+txc+"");					
						process.exit(0);
					} else {
																	
						cmdo={};
									
						exec("node cli.js "+options.mpid+" --clearing "+o+" ",cmdo,(error, stdout, stderr) => {
						  if (error) {
							console.error(`exec error: ${error}`);
							return;
						  }					
						  console.log(stdout);	
						  process.exit(0);			 
						});
					}
		});
	});
} else 	
if(typeof options.clearing !="undefined") {
	console.log("=>Clearing");
	node.clearing(clearing).then(function(c) {
			c.clear(options.clearing).then(function(o) {							
							console.log("Cleared",o);						
			});	
	});	
} else
if(typeof options.reading !="undefined") {
	console.log("=>Store Reading");
	if(typeof options.file!="undefined") {
		var input = fs.readFileSync(options.file);
				csv(input, {comment: '#',delimiter:',',from:2}, function(err, rows){
					for(var i=0;i<rows.length;i++) {
						exec("node cli.js "+rows[i][0]+" -r -R "+rows[i][1]+"");								
					}
		});
	} else {
		node.mpr(node.options.defaultReading).then(function(mpr) {	
		mpr.storeReading(options.Reading).then(function(o) {	
			console.log("Store Reading",options.mpid,node.wallet.address);										
			});
		});
	}	
}


