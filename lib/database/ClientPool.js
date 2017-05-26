
var pg = require('pg');
var serial = require('serial');
var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;

var types = require('pg').types
types.setTypeParser(1700, 'text', parseFloat)

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

Connection.prototype.query = function(queryString, queryArgs, callback) {
  this.getPGClient((err, client, releaseClient) => {
    if(err) {
      releaseClient(/*remove from pool*/client);
      callback(err, undefined);
    } else {
      this.directQuery(client, queryString, queryArgs, function(err, result) {
        releaseClient();
        callback(err, result);
      });
    }
  });
}

Connection.prototype.directQuery = function(client, queryString, queryArgs, callback) {
  client.query(queryString, queryArgs, function(err, result) {
    if(err) {
      console.error(err.code, JSON.stringify(err));
    }
    normalizeRows(result);
    callback(err, result);
  });
}

Connection.prototype.stream = function(queryString, queryArgs, callback) {
  let eventEmitter = new EventEmitter()
  this.getPGClient((err, client, releaseClient) => {
    if(err) {
      releaseClient(/*remove from pool*/client);
      console.error(err)
      eventEmitter.emit('error', err);
    } else {
      let query = client.query(queryString, queryArgs)
      query.on('error', (err) => {
        console.error(err.code, JSON.stringify(err));
        eventEmitter.emit('error', err);
      });
      query.on('row', (row) => {
        normalize(row);
        eventEmitter.emit('row', row);
      });
      query.on('end', (result) => {
        eventEmitter.emit('end', result);
      });
    }
  });
  return eventEmitter;
}


module.exports = function(options) {
  return new Connection(options);
};
