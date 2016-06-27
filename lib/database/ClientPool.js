
var pg = require('pg');
var serial = require('serial');
var _ = require('lodash');


/* Renames postgres snake-case like fields into js camel-case:
 * eg: {this_is_a_number: 123} ==> {thisIsANumber: 123}
 */
function normalize(obj) {
  for(var field in obj) {
    if(/_/.test(field)) {
      obj[_.camelCase(field)] = obj[field];
      delete obj[field];
    }
  }
}

function normalizeRows(result) {
  if(result && result.rows && result.rows.length > 0) {
    for(var i = 0 ; i < result.rows.length ; i++) {
      normalize(result.rows[i]);
    }
  }
}

function Connection(options) {
  this.connString = options.connString;
}

Connection.prototype.getPGClient = function(callback) {
  
  pg.connect(this.connString, function(err, client, done) {
    if(err) {
      console.error(err);
    }
    callback(err, client, done);
  });

};

function TxBlock() {
  this._commands = [];
  
}

Connection.prototype.begin = function(callback) {

  
  return {

  };
}

Connection.prototype.query = function(queryString, queryArgs, callback) {
  this.getPGClient(function(err, client, releaseClient) {
    if(err) {
      releaseClient(/*remove from pool*/client);
      callback(err, undefined);
    } else {      //console.log('>>>', queryString, JSON.stringify(queryArgs));
      client.query(queryString, queryArgs, function(err, result) {
        releaseClient();
        if(err) {
          console.error(err.code, JSON.stringify(err));
        }
        normalizeRows(result);
        callback(err, result);
      });
    }
  });
}

Connection.prototype.queryTx = function(queries, callback) {
  this.getPGClient(function(err, client, releaseClient) {
    if(err) {
      releaseClient(/*remove from pool*/client);
      callback(err);
    } else {

      var SerialRunner = require('serial').SerialRunner;
      var runner = new SerialRunner();

      runner.add(query, 'BEGIN;', []);
      _.each(queries, function(queryObj) {
        runner.add(query, queryObj.string, queryObj.args);
      });
      runner.add(query, 'COMMIT;', []);

      runner.onError(function(err) {
        runner.stop();
        releaseClient();
        callback(err);
      });

      runner.run(function() {
        releaseClient();
        callback(undefined);
      });
    }
  });
}



module.exports = function(options) {
  
  var pgConnectionString = process.env.PG_CONNECTION_STRING;
  
  // "postgres://username:password@localhost/database"
  if(options && options.pgConnString) {
    pgConnectionString = options.pgConnString;
  }

  var conn = new Connection({
    connString: pgConnectionString,
    ssl: options.ssl
  });
  
  return conn;
};
