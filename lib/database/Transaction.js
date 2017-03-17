
function Transaction(api, DB) {
  this._privateApi = api
  this._status = 'notStarted'
  
  for(var funcName in api) {
    if(!/^(_|DB|begin)/.test(funcName)) {
      this._addFunc(funcName)
    }
  }

  this.DB = DB
}

Transaction.prototype._addFunc = function(funcName, args) {
  let tx = this
  this[funcName] = function() {
    let queryData = this._privateApi['_' + funcName].apply(this._privateApi, arguments)
    tx._startOrResumeTransaction((err, client) => {
      if(err) {
        queryData.queryResultHandler(err, null)
      } else {
        tx.DB.directQuery(client, queryData.queryString, queryData.queryArgs, queryData.queryResultHandler)
      }
    })
  }
}

Transaction.prototype._startOrResumeTransaction = function(callback) {
  if(this._client) {
    callback(null, this._client)
  } else {
    this.DB.getPGClient((err, client, releaseClient) => {
      if(err) {
        callback(err, null)
      } else {
        this._client = client
        this._releaseClient = releaseClient
        client.query('BEGIN;', [], (err) => {
          if(err) {
            releaseClient(client)
            callback(err, null)
          } else {
            this._status = 'inprogress'
            callback(null, client)
          }
        })
      }
    })
  }
}

Transaction.prototype.commit = function(callback) {
  if(this._client) {
    this._client.query('COMMIT;', [], (err) => {
      callback(err)
    })
  } else {
    callback(new Error('I am not in a state where I can commit anything. Either the TX was commited, rolled-back or no query was ever invoked.'))
  }
}

Transaction.prototype.rollback = function(callback) {
  if(this._client) {
    this._client.query('ROLLBACK;', [], (err) => {
      callback(err)
    })
  } else {
    callback(new Error('I am not in a state where I can rollback anything. Either the TX was commited, rolled-back or no query was ever invoked.'))
  }
}

module.exports = Transaction
