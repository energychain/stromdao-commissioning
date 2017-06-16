const commandLineArgs = require('command-line-args');


const optionDefinitions = [
  { name: 'mpid', alias: 'm', type: String },
  { name: 'reading', alias: 'r', type: String },  
]

const options = commandLineArgs(optionDefinitions);

var StromDAONode = require("stromdao-businessobject");
var node = new StromDAONode.Node({external_id:options.mpid,testMode:true}); 
node.mpr(node.options.defaultReading).then(function(mpr) {	
		mpr.storeReading(options.reading).then(function(o) {	
			console.log("Reading with Hash",options.mpid,node.wallet.address);					
					node.storage.setItemSync(""+node.wallet.address,options.mpid);
					if((typeof approval =="undefined")||(approval==null)) {
						//	addMeterToMeterset(node.wallet.address,mpid);
							
					}
		});
});
