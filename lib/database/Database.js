

var fs       = require('fs');
var path     = require('path');
var _        = require('lodash');
var wrench   = require('wrench');
var assert   = require('assert');
var jsonLint = require('jsonlint');

var logger   = require('../logger/')();

/**
 * This file reads JSON configuration files for SQL
 * queries and generates an easy to use JS API.
 *
 * @args options:
 *   - queryDirectory: the absolute path to the dircetory containing the query definitions.
 *
 * See the tests for examples
 */

function read(options) {

  var api = {};

  validateOptions(options);
  
  var DB = require('./ClientPool.js')({pgConnString: options.pgConnString});
  
  var files = wrench.readdirSyncRecursive(options.queryDirectory);

  var definitionFiles = {};
  _.each(files, function(file) {
    if(isQueryDefinitionFile(file)) {
      var filePath = path.resolve(options.queryDirectory, file);
      var queryDefinition = readQueryDefinitionFile(filePath);
      buildAPIFunction(api, queryDefinition, DB);
    }
  });

  return api;
  
}

function validateOptions(options) {
  if(!_.isString(options.queryDirectory)) {
    throw new Error("queryDirectory is a mandatory option");
  }
}

function isQueryDefinitionFile(filePath) {
  return /.*\.query.json$/.test(filePath);
}

function readQueryDefinitionFile(filePath) {
  var fileContent = fs.readFileSync(filePath, 'utf8');
  try {
    // jsonlint gives an error that points to the actual json syntax error
    return jsonLint.parse(fileContent);
  } catch(err) {
    var jsonDetails = err.message;
    message = 'Could not parse JSON file at ['+filePath+']';
    message += '\n'
    message += jsonDetails;
    err = new Error(message);
    throw err;
  }
}

function buildAPIFunction(api, qryDef, DB) {
  api[qryDef.id] = function() {
    var queryArgs = [];
    for(var i = 0 ; i < qryDef.args.length ; i++) {
      queryArgs.push(arguments[i]);
    }
    var callback = arguments[qryDef.args.length];
    if(!callback) {
      throw new Error('Missing callback for call to DB.' + qryDef.id);
    }
    var queryResultHandler = buildQueryResultHandler(qryDef, callback);
    var queryString = qryDef.query.join(' ');
    
    DB.query(queryString, queryArgs, queryResultHandler);
  }
}

function buildQueryResultHandler(qryDef, callback) {
  assert.ok(callback);
  assert.equal(typeof callback, 'function');
  return function(err, queryResult) {
    if(err) {
      console.error('Failed to execute query', qryDef.query.join(' '))
      callback(err, undefined);
    } else {
      var rows = queryResult.rows || [];
      if(qryDef.returns && qryDef.returns.uniqueResult) {
        if(rows.length > 1) {
          logger.warn('Unique result API query returned multiple rows ['+qryDef.id+']'); 
          callback(undefined, rows[0]);
        } else if(rows.length === 1) {
          callback(undefined, rows[0]);
        } else {
          callback(undefined, undefined);
        }
      } else {
        callback(undefined, results.rows || []);
      }
    }
  }
}


module.exports = read;
