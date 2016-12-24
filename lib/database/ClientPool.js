
var pg = require('pg');
var serial = require('serial');
var _ = require('lodash');


/* Renames postgres snake-case like fields into js camel-case:
 * eg: {this_is_a_number: 123} ==> {thisIsANumber: 123}
 */
function normalize(obj) {
  for(var field in obj) {
    if(obj[field] && typeof obj[field] === 'object' ||
       obj[field] instanceof Array) {
      normalize(obj[field])
    }
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
  this._pool = new pg.Pool(options);

  this._pool.on('error', function (err, client) {
    console.error('idle client error', err.message, err.stack)
  })
}

Connection.prototype.getPGClient = function(callback) {
  
  return this._pool.connect(function(err, client, done) {
    if(err) {
      console.error(err);
    }
    callback(err, client, done);
  });

};

function TxBlock() {
  this._commands = [];
}

Connection.prototype.query = function(queryString, queryArgs, callback) {
  this.getPGClient(function(err, client, releaseClient) {
    if(err) {
      releaseClient(/*remove from pool*/client);
      callback(err, undefined);
    } else {
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
  return new Connection(options);
};
