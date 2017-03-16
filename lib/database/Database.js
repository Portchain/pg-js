

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
  
  var DB = require('./ClientPool.js')(options);

  api.DB = DB
  
  var files = wrench.readdirSyncRecursive(options.queryDirectory);


  
  var definitionFiles = {};
  _.each(files, function(file) {
    if(isJSONQueryDefinitionFile(file)) {
      var filePath = path.resolve(options.queryDirectory, file);
      var queryDefinition = readJSONQueryDefinitionFile(filePath);
      buildAPIFunction(api, queryDefinition, DB);
    } else if(isSQLQueryDefinitionFile(file)) {
      var filePath = path.resolve(options.queryDirectory, file);
      var queryDefinition = readSQLQueryDefinitionFile(filePath);
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

function isJSONQueryDefinitionFile(filePath) {
  return /.*\.query.json$/.test(filePath);
}
function isSQLQueryDefinitionFile(filePath) {
  return /.*\.query.sql$/.test(filePath);
}

function readJSONQueryDefinitionFile(filePath) {
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

function readSQLQueryDefinitionFile(filePath) {
  var fileContent = fs.readFileSync(filePath, 'utf8');
  var ids = fileContent.match(/\$[0-9]+/g)
  args = []
  if(ids) {
    ids = ids.map((id) => {
      return parseInt(id.substring(1), 10)
    })
    let maxId = _.max(ids)
    for(let i = 0 ; i < maxId ; i++) {
      args.push({ type: '*' })
    }
  }
  var def = {
    id: /([^\/]+)\.query\.sql$/gi.exec(filePath)[1],
    args: args,
    query: fileContent
  }
  return def
}

function isArrayOfArrays(val) {
  let result =  _.isArray(val) && val.length > 0 && _.isArray(val[0])
  return result
}

function aggregateMultiInsertParams(rows) {
  const params = []
  const valueClauses = []
  rows.forEach(row => {
    const valueClause = []
    row.forEach(p => {
      params.push(p)
      valueClause.push('$' + params.length)
    })
    valueClauses.push('(' + valueClause.join(', ') + ')')
  })
  
  return {
    valueClauses: valueClauses.join(','),
    params: params
  }
}

function buildAPIFunction(api, qryDef, DB) {
  
  if(_.isString(qryDef.query)) {
    qryDef.queryString = qryDef.query
  } else {
    qryDef.queryString = qryDef.query.join(' ');
  }
  
  api[qryDef.id] = function() {
    var queryArgs;
    var queryString = qryDef.queryString
    if(qryDef.args.length === 1 && isArrayOfArrays(arguments[0])) {
      var multiInsertData = aggregateMultiInsertParams(arguments[0])
      queryString = queryString.replace(/VALUES\s+\$1/i, 'VALUES ' + multiInsertData.valueClauses)
      queryArgs = multiInsertData.params
    } else {
      queryArgs = [];
      for(var i = 0 ; i < qryDef.args.length ; i++) {
        queryArgs.push(arguments[i]);
      }
    }
    var callback = arguments[qryDef.args.length];
    if(!callback) {
      throw new Error('Missing callback for call to DB.' + qryDef.id);
    }
    var queryResultHandler = buildQueryResultHandler(qryDef, callback);
    
    DB.query(queryString, queryArgs, queryResultHandler);
  }
}

function buildQueryResultHandler(qryDef, callback) {
  assert.ok(callback);
  assert.equal(typeof callback, 'function');
  return function(err, queryResult) {
    if(err) {
      console.error('Failed to execute query', qryDef.queryString)
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
        callback(undefined, queryResult.rows || []);
      }
    }
  }
}


module.exports = read;
